use std::fmt;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RulesError {
    pub code: &'static str,
    pub path: String,
}

impl RulesError {
    pub(crate) fn new(code: &'static str, path: impl Into<String>) -> Self {
        Self {
            code,
            path: path.into(),
        }
    }
}

impl fmt::Display for RulesError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(formatter, "{} at {}", self.code, self.path)
    }
}

impl std::error::Error for RulesError {}
