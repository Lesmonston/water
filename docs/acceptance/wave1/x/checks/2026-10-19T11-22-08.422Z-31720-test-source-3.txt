use crate::{FrameError, HostError, HostEvent, HostRequest, HostState, NativeJob, read_request};
use serde_json::Value;
use std::{
    io::{self, Write},
    panic::{AssertUnwindSafe, catch_unwind},
    sync::mpsc::{self, SyncSender},
    thread::{self, JoinHandle},
};
use water_contracts::v1::OpaqueId;
use water_native_picker::v1::PickerOptions;
use water_native_scan::v1::{ScanObserver, ScanOptions, ScanProgress};
use water_native_session::v1::{capture_session_with_observer, to_json};
use water_scope_registry::v1::Registry;

enum Message {
    Request(HostRequest),
    InvalidRequest,
    End {
        failed: bool,
    },
    Progress {
        job_id: OpaqueId,
        visited: u32,
        recorded: u32,
    },
    Finished {
        job_id: OpaqueId,
        result: Result<Value, HostError>,
    },
}

struct Observer {
    job_id: OpaqueId,
    sender: SyncSender<Message>,
}

impl ScanObserver for Observer {
    fn on_entry(&self, progress: &ScanProgress) {
        if progress.scan_id == self.job_id && progress.scope_id.as_str() == "interactive-scope" {
            let _ = self.sender.send(Message::Progress {
                job_id: self.job_id.clone(),
                visited: progress.visited_entries,
                recorded: progress.recorded_entries,
            });
        }
    }
}

fn capture(
    initial: &str,
    job: &NativeJob,
    sender: SyncSender<Message>,
) -> Result<Value, HostError> {
    // All native selection and registry capabilities are created and dropped here.
    let mut registry = Registry::new(1).map_err(|_| HostError::NativeFailure)?;
    let picker = PickerOptions::new(initial).map_err(|_| HostError::NativeFailure)?;
    let options = ScanOptions::new(8, 10000, 256).map_err(|_| HostError::NativeFailure)?;
    let scope_id = OpaqueId::new("interactive-scope").map_err(|_| HostError::NativeFailure)?;
    let observer = Observer {
        job_id: job.job_id().clone(),
        sender,
    };
    let captured = capture_session_with_observer(
        &mut registry,
        &scope_id,
        job.job_id(),
        &picker,
        &options,
        job.cancel_token(),
        &observer,
    )
    .map_err(|_| HostError::NativeFailure)?;
    // Preserve V's object and Q's original string; no report or projection is built here.
    let json = to_json(&captured).map_err(|_| HostError::NativeFailure)?;
    serde_json::from_str(&json).map_err(|_| HostError::NativeFailure)
}

fn input(sender: SyncSender<Message>) {
    let stdin = io::stdin();
    let mut reader = stdin.lock();
    loop {
        let message = match read_request(&mut reader) {
            Ok(Some(request)) => Message::Request(request),
            Ok(None) => Message::End { failed: false },
            Err(FrameError::InvalidRequest) => Message::InvalidRequest,
            Err(_) => Message::End { failed: true },
        };
        let end = matches!(
            message,
            Message::End { .. } | Message::Request(HostRequest::Shutdown)
        );
        if sender.send(message).is_err() || end {
            break;
        }
    }
}

fn emit(output: &mut impl Write, event: HostEvent) -> Result<(), HostError> {
    output
        .write_all(&event.to_line()?)
        .and_then(|()| output.flush())
        .map_err(|_| HostError::NativeFailure)
}

/// Run the fixed stdin/stdout host. The caller supplies only S's initial directory.
pub fn run(initial: String) -> Result<(), HostError> {
    let (sender, receiver) = mpsc::sync_channel(64);
    let mut state = HostState::new();
    let stdout = io::stdout();
    let mut output = stdout.lock();
    emit(&mut output, HostEvent::ready())?;
    let input_sender = sender.clone();
    let input_thread = thread::Builder::new()
        .name("host-input".into())
        .spawn(move || input(input_sender))
        .map_err(|_| HostError::NativeFailure)?;
    let mut worker: Option<JoinHandle<()>> = None;
    let mut stream_failed = false;
    let outcome = (|| {
        while !state.is_stopped() {
            let message = receiver.recv().map_err(|_| HostError::NativeFailure)?;
            match message {
                Message::Request(HostRequest::Start { job_id }) => {
                    match state.start(job_id.clone()) {
                        Err(code) => emit(&mut output, HostEvent::failure(Some(job_id), code))?,
                        Ok(job) => {
                            emit(&mut output, job.accepted())?;
                            let initial = initial.clone();
                            let sender = sender.clone();
                            match thread::Builder::new().name("host-native".into()).spawn(
                                move || {
                                    let result = catch_unwind(AssertUnwindSafe(|| {
                                        capture(&initial, &job, sender.clone())
                                    }))
                                    .unwrap_or(Err(HostError::NativeFailure));
                                    let _ = sender.send(Message::Finished {
                                        job_id: job.job_id().clone(),
                                        result,
                                    });
                                },
                            ) {
                                Ok(handle) => worker = Some(handle),
                                Err(_) => {
                                    state.finish(&job_id)?;
                                    emit(
                                        &mut output,
                                        HostEvent::failure(Some(job_id), HostError::NativeFailure),
                                    )?;
                                }
                            }
                        }
                    }
                }
                Message::Request(HostRequest::Cancel { job_id }) => {
                    let event = state
                        .cancel(&job_id)
                        .unwrap_or_else(|code| HostEvent::failure(Some(job_id), code));
                    emit(&mut output, event)?;
                }
                Message::Request(HostRequest::Shutdown) => {
                    state.shutdown();
                }
                Message::InvalidRequest => emit(
                    &mut output,
                    HostEvent::failure(None, HostError::InvalidRequest),
                )?,
                Message::End { failed } => {
                    stream_failed = failed;
                    if failed {
                        emit(
                            &mut output,
                            HostEvent::failure(None, HostError::InvalidRequest),
                        )?;
                    }
                    state.shutdown();
                }
                Message::Progress {
                    job_id,
                    visited,
                    recorded,
                } => {
                    if let Some(event) = state.progress(&job_id, visited, recorded) {
                        emit(&mut output, event)?;
                    }
                }
                Message::Finished { job_id, result } => {
                    if let Some(handle) = worker.take() {
                        let _ = handle.join();
                    }
                    state.finish(&job_id)?;
                    let event = match result {
                        Ok(bundle) => HostEvent::result(job_id, bundle),
                        Err(code) => HostEvent::failure(Some(job_id), code),
                    };
                    emit(&mut output, event)?;
                }
            }
        }
        emit(&mut output, HostEvent::stopped())?;
        if stream_failed {
            Err(HostError::NativeFailure)
        } else {
            Ok(())
        }
    })();
    // On output failure disconnect first, so a bounded sender cannot block cleanup.
    drop(receiver);
    state.shutdown();
    if let Some(handle) = worker {
        let _ = handle.join();
    }
    if input_thread.is_finished() {
        let _ = input_thread.join();
    }
    outcome
}
