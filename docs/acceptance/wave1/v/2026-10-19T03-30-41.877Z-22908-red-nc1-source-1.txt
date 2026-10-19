//! One trusted local initial-directory argument; S supplies the scan root.
#![forbid(unsafe_code)]

use std::{io::Write, process::ExitCode};
use water_contracts::v1::OpaqueId;
use water_native_picker::v1::PickerOptions;
use water_native_scan::v1::{CancelToken, ScanOptions};
use water_native_session::v1::{SessionError, capture_session, to_json};
use water_scope_registry::v1::Registry;

fn run(initial: &std::ffi::OsStr) -> Result<String, SessionError> {
    let initial = initial.to_str().ok_or(SessionError::InvalidArguments)?;
    let picker = PickerOptions::new(initial).map_err(SessionError::Picker)?;
    let scope_id = OpaqueId::new("native-scope-cli").map_err(SessionError::Projection)?;
    let session_id = OpaqueId::new("native-session-cli").map_err(SessionError::Projection)?;
    let mut registry = Registry::new(4).map_err(SessionError::Registry)?;
    let options = ScanOptions::new(8, 10000, 256).map_err(SessionError::Scan)?;
    let capture = capture_session(
        &mut registry,
        &scope_id,
        &session_id,
        &picker,
        &options,
        &CancelToken::new(),
    )?;
    to_json(&capture)
}

fn fail(error: SessionError, code: u8) -> ExitCode {
    let _ = writeln!(std::io::stderr().lock(), "{error}");
    ExitCode::from(code)
}

fn main() -> ExitCode {
    let mut arguments = std::env::args_os().skip(1);
    let Some(initial) = arguments.next() else {
        return fail(SessionError::InvalidArguments, 64);
    };
    if arguments.next().is_some() {
        return fail(SessionError::InvalidArguments, 64);
    }
    match run(&initial) {
        Ok(mut output) => {
            output.push('\n');
            let mut stdout = std::io::stdout().lock();
            if stdout
                .write_all(output.as_bytes())
                .and_then(|()| stdout.flush())
                .is_err()
            {
                return fail(SessionError::SerializationFailed, 2);
            }
            ExitCode::SUCCESS
        }
        Err(error) => fail(error, 2),
    }
}
