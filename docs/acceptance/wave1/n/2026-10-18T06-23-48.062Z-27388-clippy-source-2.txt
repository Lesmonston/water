//! Pure spelling checks, independent of host platform and filesystem state.
#![deny(unsafe_code)]

use crate::v1::RootError;

pub(crate) fn validate(path: &str) -> Result<(), RootError> {
    let bytes = path.as_bytes();
    if bytes.len() < 4
        || !bytes[0].is_ascii_alphabetic()
        || bytes[1] != b':'
        || !matches!(bytes[2], b'/' | b'\\')
        || path.encode_utf16().count() > 240
        || path.chars().any(|c| c <= '\u{1f}' || c == '\u{7f}')
    {
        return Err(RootError::InvalidPath);
    }
    // The first three bytes are ASCII after the checks above, so slicing is safe.
    for segment in path[3..].split(['/', '\\']) {
        if segment.is_empty()
            || matches!(segment, "." | "..")
            || segment.ends_with(['.', ' '])
            || segment.contains([':', '<', '>', '"', '|', '?', '*'])
            || reserved(segment)
        {
            return Err(RootError::InvalidPath);
        }
    }
    Ok(())
}

fn reserved(segment: &str) -> bool {
    let stem = segment
        .split('.')
        .next()
        .unwrap_or("")
        .trim_end_matches(' ');
    let upper = stem.to_ascii_uppercase();
    if matches!(
        upper.as_str(),
        "CON" | "PRN" | "AUX" | "NUL" | "CONIN$" | "CONOUT$"
    ) {
        return true;
    }
    let suffix = upper
        .strip_prefix("COM")
        .or_else(|| upper.strip_prefix("LPT"));
    matches!(
        suffix,
        Some("1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "¹" | "²" | "³")
    )
}
