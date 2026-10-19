use crate::{HostError, HostEvent};
use std::collections::HashSet;
use water_contracts::v1::OpaqueId;
use water_native_scan::v1::CancelToken;

#[derive(Debug, Clone)]
pub struct NativeJob {
    job_id: OpaqueId,
    cancel: CancelToken,
}

impl NativeJob {
    pub fn job_id(&self) -> &OpaqueId {
        &self.job_id
    }
    pub fn cancel_token(&self) -> &CancelToken {
        &self.cancel
    }
    pub fn accepted(&self) -> HostEvent {
        HostEvent::accepted(self.job_id.clone())
    }
}

#[derive(Debug, Default)]
pub struct HostState {
    used: HashSet<OpaqueId>,
    active: Option<NativeJob>,
    visited: u32,
    recorded: u32,
    closing: bool,
}

impl HostState {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn start(&mut self, job_id: OpaqueId) -> Result<NativeJob, HostError> {
        if self.closing || self.active.is_some() {
            return Err(HostError::Busy);
        }
        if self.used.contains(&job_id) {
            return Err(HostError::ReusedJobId);
        }
        if self.used.len() >= 32 {
            return Err(HostError::JobLimit);
        }
        let job = NativeJob {
            job_id: job_id.clone(),
            cancel: CancelToken::new(),
        };
        self.used.insert(job_id);
        self.active = Some(job.clone());
        self.visited = 0;
        self.recorded = 0;
        Ok(job)
    }

    pub fn cancel(&mut self, job_id: &OpaqueId) -> Result<HostEvent, HostError> {
        let job = self
            .active
            .as_ref()
            .filter(|job| job.job_id == *job_id)
            .ok_or(HostError::UnknownJob)?;
        job.cancel.cancel();
        Ok(HostEvent::cancel_ack(job_id.clone()))
    }

    pub fn progress(
        &mut self,
        job_id: &OpaqueId,
        visited: u32,
        recorded: u32,
    ) -> Option<HostEvent> {
        if self.active.as_ref()?.job_id != *job_id
            || visited > 10000
            || recorded > visited
            || visited < self.visited
            || recorded < self.recorded
        {
            return None;
        }
        self.visited = visited;
        self.recorded = recorded;
        Some(HostEvent::progress(job_id.clone(), visited, recorded))
    }

    pub fn finish(&mut self, job_id: &OpaqueId) -> Result<(), HostError> {
        if self.active.as_ref().is_none_or(|job| job.job_id != *job_id) {
            return Err(HostError::UnknownJob);
        }
        self.active = None;
        Ok(())
    }

    /// A cancellation request leaves an open native picker open until its user acts.
    pub fn shutdown(&mut self) -> bool {
        self.closing = true;
        if let Some(job) = &self.active {
            job.cancel.cancel();
        }
        self.is_stopped()
    }

    pub fn is_stopped(&self) -> bool {
        self.closing && self.active.is_none()
    }
}
