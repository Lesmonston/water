//! Persistent native-session host. Its input, job state, and output are bounded.
#![forbid(unsafe_code)]

mod request;
mod runtime;
mod state;
mod wire;

pub use request::{FrameError, HostRequest, MAX_REQUEST_BYTES, decode_request, read_request};
pub use runtime::run;
pub use state::{HostState, NativeJob};
pub use wire::{HostError, HostEvent, MAX_EVENT_BYTES};
