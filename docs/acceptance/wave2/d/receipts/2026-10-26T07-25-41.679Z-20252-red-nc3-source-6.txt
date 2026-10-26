#![forbid(unsafe_code)]

use crate::CleanError;

pub(crate) fn validate(s: &str) -> Result<(), CleanError> {
    let b = s.as_bytes();
    if b.len() < 3
        || !b[0].is_ascii_alphabetic()
        || b[1] != b':'
        || b[2] != b'\\'
        || s.contains('/')
        || s.chars().any(|c| c.is_control())
    {
        return Err(CleanError::InvalidPlan);
    }
    // The drive root is the sole trailing-separator exception (MODEL guards/volumes).
    if b.len() == 3 {
        return Ok(());
    }
    for part in s[3..].split('\\') {
        let stem = part.split('.').next().unwrap_or("").to_ascii_uppercase();
        let reserved = matches!(
            stem.as_str(),
            "CON" | "PRN" | "AUX" | "NUL" | "CONIN$" | "CONOUT$"
        ) || ["COM", "LPT"].iter().any(|prefix| {
            stem.strip_prefix(prefix).is_some_and(|n| {
                matches!(
                    n,
                    "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "¹" | "²" | "³"
                )
            })
        });
        if part.is_empty()
            || part == "."
            || part == ".."
            || part.ends_with(['.', ' '])
            || part.contains([':', '*', '?', '"', '<', '>', '|'])
            || reserved
        {
            return Err(CleanError::InvalidPlan);
        }
    }
    Ok(())
}

pub(crate) fn contains(parent: &str, child: &str) -> bool {
    let a = parent.trim_end_matches('\\');
    child.eq_ignore_ascii_case(a)
        || (child.len() > a.len()
            && child
                .get(..a.len())
                .is_some_and(|s| s.eq_ignore_ascii_case(a))
            && child.as_bytes()[a.len()] == b'\\')
}

pub(crate) fn strictly_contains(parent: &str, child: &str) -> bool {
    !parent.eq_ignore_ascii_case(child) && contains(parent, child)
}
pub(crate) fn overlaps(a: &str, b: &str) -> bool {
    contains(a, b) || contains(b, a)
}
pub(crate) fn volume(p: &str) -> String {
    p[..3].to_ascii_uppercase()
}
