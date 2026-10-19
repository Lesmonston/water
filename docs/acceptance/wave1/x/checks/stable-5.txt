use serde::Serialize;
use serde_json::Value;
use std::fmt;
use water_contracts::v1::OpaqueId;

pub const MAX_EVENT_BYTES: usize = 67_109_888;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
pub enum HostError {
    InvalidRequest,
    Busy,
    ReusedJobId,
    UnknownJob,
    JobLimit,
    NativeFailure,
}

impl fmt::Display for HostError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str("Host unavailable.")
    }
}

impl std::error::Error for HostError {}

#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct HostEvent {
    version: &'static str,
    #[serde(flatten)]
    payload: Payload,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
enum Payload {
    Ready,
    Accepted {
        job_id: OpaqueId,
    },
    Progress {
        job_id: OpaqueId,
        visited_entries: u32,
        recorded_entries: u32,
    },
    CancelAck {
        job_id: OpaqueId,
        applied: bool,
    },
    Result {
        job_id: OpaqueId,
        bundle: Value,
    },
    Failure {
        job_id: Option<OpaqueId>,
        code: HostError,
    },
    Stopped,
}

impl HostEvent {
    fn new(payload: Payload) -> Self {
        Self {
            version: "water.interactive-host.v1",
            payload,
        }
    }

    pub fn ready() -> Self {
        Self::new(Payload::Ready)
    }

    pub fn stopped() -> Self {
        Self::new(Payload::Stopped)
    }

    pub fn failure(job_id: Option<OpaqueId>, code: HostError) -> Self {
        Self::new(Payload::Failure { job_id, code })
    }

    pub(crate) fn accepted(job_id: OpaqueId) -> Self {
        Self::new(Payload::Accepted { job_id })
    }

    pub(crate) fn cancel_ack(job_id: OpaqueId) -> Self {
        Self::new(Payload::CancelAck {
            job_id,
            applied: true,
        })
    }

    pub(crate) fn progress(job_id: OpaqueId, visited_entries: u32, recorded_entries: u32) -> Self {
        Self::new(Payload::Progress {
            job_id,
            visited_entries,
            recorded_entries,
        })
    }

    // Only the real V capture path can construct result events.
    pub(crate) fn result(job_id: OpaqueId, bundle: Value) -> Self {
        Self::new(Payload::Result { job_id, bundle })
    }

    pub fn to_line(&self) -> Result<Vec<u8>, HostError> {
        let mut bytes = serde_json::to_vec(self).map_err(|_| HostError::NativeFailure)?;
        if bytes.len() + 1 > MAX_EVENT_BYTES {
            return Err(HostError::NativeFailure);
        }
        bytes.push(b'\n');
        Ok(bytes)
    }
}
