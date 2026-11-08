#![forbid(unsafe_code)]

use std::fmt;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ScanError {
    InvalidPlan,
    InvalidResult,
    Native,
    Unsupported,
}

impl fmt::Display for ScanError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(match self {
            Self::InvalidPlan => "invalid plan",
            Self::InvalidResult => "invalid result",
            Self::Native => "native",
            Self::Unsupported => "unsupported",
        })
    }
}

impl std::error::Error for ScanError {}
