#![forbid(unsafe_code)]

use crate::error::ScanError;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

pub fn validate_abs_path(path: &str) -> Result<(), ScanError> {
    let bytes = path.as_bytes();
    if bytes.len() < 3 || !bytes[0].is_ascii_alphabetic() || bytes[1] != b':' || bytes[2] != b'\\' {
        return Err(ScanError::InvalidPlan);
    }
    if path.contains('/') || path.starts_with("\\\\") {
        return Err(ScanError::InvalidPlan);
    }
    if path.ends_with('\\') && path.len() != 3 {
        return Err(ScanError::InvalidPlan);
    }
    if let Some(rest) = path.get(3..).filter(|rest| !rest.is_empty()) {
        for segment in rest.split('\\') {
            if segment.is_empty() || segment == "." || segment == ".." {
                return Err(ScanError::InvalidPlan);
            }
        }
    }
    Ok(())
}

pub fn path_eq(left: &str, right: &str) -> bool {
    left.eq_ignore_ascii_case(right)
}

/// Byte-wise, ASCII case-insensitive; never slices `&str`, so non-ASCII names are safe.
pub fn is_proper_ancestor(ancestor: &str, descendant: &str) -> bool {
    if path_eq(ancestor, descendant) {
        return false;
    }
    let mut prefix = ancestor.as_bytes().to_vec();
    if prefix.last() != Some(&b'\\') {
        prefix.push(b'\\');
    }
    let d = descendant.as_bytes();
    d.len() >= prefix.len() && d[..prefix.len()].eq_ignore_ascii_case(&prefix)
}

pub fn child_path(parent: &str, name: &str) -> String {
    if parent.ends_with('\\') {
        format!("{parent}{name}")
    } else {
        format!("{parent}\\{name}")
    }
}

pub fn file_name(path: &str) -> &str {
    path.rsplit('\\').next().unwrap_or(path)
}

pub fn format_bytes(n: u64) -> String {
    n.to_string()
}

pub fn parse_i128(s: &str) -> Result<i128, ScanError> {
    s.parse().map_err(|_| ScanError::InvalidResult)
}

pub fn format_i128(n: i128) -> String {
    n.to_string()
}

pub fn format_rfc3339(time: SystemTime) -> String {
    let secs = time
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    let days = (secs / 86400) as i64;
    let rem = secs % 86400;
    let hour = rem / 3600;
    let minute = (rem % 3600) / 60;
    let second = rem % 60;
    let (year, month, day) = civil_from_days(days);
    format!("{year:04}-{month:02}-{day:02}T{hour:02}:{minute:02}:{second:02}Z")
}

pub fn parse_rfc3339(text: &str) -> Result<SystemTime, ScanError> {
    let bytes = text.as_bytes();
    if bytes.len() != 20
        || bytes[4] != b'-'
        || bytes[7] != b'-'
        || bytes[10] != b'T'
        || bytes[13] != b':'
        || bytes[16] != b':'
        || bytes[19] != b'Z'
    {
        return Err(ScanError::InvalidResult);
    }
    let year = parse_n(&bytes[0..4])?;
    let month = parse_n(&bytes[5..7])?;
    let day = parse_n(&bytes[8..10])?;
    let hour = parse_n(&bytes[11..13])?;
    let minute = parse_n(&bytes[14..16])?;
    let second = parse_n(&bytes[17..19])?;
    if !(1..=12).contains(&month)
        || !(1..=31).contains(&day)
        || hour > 23
        || minute > 59
        || second > 59
    {
        return Err(ScanError::InvalidResult);
    }
    let days = days_from_civil(year as i32, month, day)?;
    let secs = (days as u64)
        .saturating_mul(86400)
        .saturating_add(hour as u64 * 3600)
        .saturating_add(minute as u64 * 60)
        .saturating_add(second as u64);
    Ok(UNIX_EPOCH + Duration::from_secs(secs))
}

fn parse_n(bytes: &[u8]) -> Result<u32, ScanError> {
    let mut n = 0u32;
    for b in bytes {
        if !b.is_ascii_digit() {
            return Err(ScanError::InvalidResult);
        }
        n = n * 10 + u32::from(b - b'0');
    }
    Ok(n)
}

fn civil_from_days(z: i64) -> (i32, u32, u32) {
    let z = z + 719_468;
    let era = if z >= 0 { z } else { z - 146_096 } / 146_097;
    let doe = (z - era * 146_097) as u64;
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let y = yoe as i64 + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let y = if m <= 2 { y + 1 } else { y };
    (y as i32, m as u32, d as u32)
}

fn days_from_civil(year: i32, month: u32, day: u32) -> Result<i64, ScanError> {
    let y = if month <= 2 {
        i64::from(year) - 1
    } else {
        i64::from(year)
    };
    let m = if month <= 2 {
        i64::from(month) + 9
    } else {
        i64::from(month) - 3
    };
    let era = if y >= 0 { y } else { y - 399 } / 400;
    let yoe = (y - era * 400) as u64;
    let doy = (153 * m + 2) / 5 + i64::from(day) - 1;
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy as u64;
    Ok(era * 146_097 + doe as i64 - 719_468)
}

pub fn clamp_time(time: SystemTime) -> SystemTime {
    if time.duration_since(UNIX_EPOCH).is_err() {
        UNIX_EPOCH
    } else {
        time
    }
}
