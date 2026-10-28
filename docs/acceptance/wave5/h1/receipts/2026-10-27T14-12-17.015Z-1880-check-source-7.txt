#![forbid(unsafe_code)]

use crate::CleanError;
use std::time::{SystemTime, UNIX_EPOCH};

// Proleptic Gregorian conversion, with the epoch shifted to March 0000.
pub(crate) fn format(time: SystemTime) -> Result<String, CleanError> {
    let seconds: i64 = match time.duration_since(UNIX_EPOCH) {
        Ok(d) => i64::try_from(d.as_secs()).map_err(|_| CleanError::Native)?,
        Err(e) => {
            -i64::try_from(e.duration().as_secs()).map_err(|_| CleanError::Native)?
                - i64::from(e.duration().subsec_nanos() > 0)
        }
    };
    let days = seconds.div_euclid(86400);
    let z = days + 719468;
    let era = z.div_euclid(146097);
    let doe = z - era * 146097;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let mut year = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let day = doy - (153 * mp + 2) / 5 + 1;
    let month = mp + if mp < 10 { 3 } else { -9 };
    year += i64::from(month <= 2);
    if !(1..=9999).contains(&year) {
        return Err(CleanError::Native);
    }
    let tod = seconds.rem_euclid(86400);
    Ok(format!(
        "{year:04}-{month:02}-{day:02}T{:02}:{:02}:{:02}Z",
        tod / 3600,
        tod / 60 % 60,
        tod % 60
    ))
}

pub(crate) fn valid(s: &str) -> bool {
    let b = s.as_bytes();
    if b.len() != 20
        || b[4] != b'-'
        || b[7] != b'-'
        || b[10] != b'T'
        || b[13] != b':'
        || b[16] != b':'
        || b[19] != b'Z'
        || b.iter()
            .enumerate()
            .any(|(i, c)| ![4, 7, 10, 13, 16, 19].contains(&i) && !c.is_ascii_digit())
    {
        return false;
    }
    let number = |range: std::ops::Range<usize>| s[range].parse::<u32>().unwrap_or(u32::MAX);
    let y = number(0..4);
    let m = number(5..7);
    let d = number(8..10);
    let leap = y.is_multiple_of(4) && (!y.is_multiple_of(100) || y.is_multiple_of(400));
    let days = match m {
        2 => {
            if leap {
                29
            } else {
                28
            }
        }
        4 | 6 | 9 | 11 => 30,
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        _ => 0,
    };
    y > 0 && d > 0 && d <= days && number(11..13) < 24 && number(14..16) < 60 && number(17..19) < 60
}
