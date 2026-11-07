#![forbid(unsafe_code)]

use crate::Identity;

pub(crate) fn second_root(first: Option<&str>, candidate: &str) -> bool {
    first.is_some_and(|root| !root.eq_ignore_ascii_case(candidate))
}

pub(crate) fn source_matches(actual: Option<&Identity>, expected: &Identity) -> bool {
    actual == Some(expected)
}
