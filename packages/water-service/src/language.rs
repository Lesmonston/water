//! Shared formatting and the explicit fallback for records saved before bilingual text.
#![forbid(unsafe_code)]

use serde_json::Value;

pub(crate) fn error(code: &str) -> &'static str {
    match code {
        "busy" => "Another task is running. Please wait.",
        "stale" => "Results are out of date. Check again before cleaning.",
        "invalid" => "The selection cannot be cleaned. Please select again.",
        "not_found" => "This record could not be found. Check again.",
        "cancelled" => "Cancelled.",
        _ => "The Flick service is temporarily unavailable.",
    }
}

/// Only used on persisted data: never translate old user-visible text on read.
pub(crate) fn legacy(value: &mut Value) {
    match value {
        Value::Object(map) => {
            let missing = map
                .iter()
                .filter_map(|(key, value)| {
                    let en = if let Some(stem) = key.strip_suffix("_zh") {
                        format!("{stem}_en")
                    } else if key == "copy_text" {
                        "copy_text_en".into()
                    } else {
                        return None;
                    };
                    (!map.contains_key(&en)).then(|| (en, value.clone()))
                })
                .collect::<Vec<_>>();
            map.extend(missing);
            for value in map.values_mut() {
                legacy(value);
            }
        }
        Value::Array(values) => values.iter_mut().for_each(legacy),
        _ => {}
    }
}

pub(crate) fn number(n: impl ToString) -> String {
    let s = n.to_string();
    let (sign, digits) = s.strip_prefix('-').map_or(("", s.as_str()), |s| ("-", s));
    let (whole, fraction) = digits
        .split_once('.')
        .map_or((digits, ""), |(a, _)| (a, &digits[a.len()..]));
    let mut out = sign.to_owned();
    for (i, c) in whole.chars().enumerate() {
        if i > 0 && (whole.len() - i).is_multiple_of(3) {
            out.push(',');
        }
        out.push(c);
    }
    out.push_str(fraction);
    out
}

pub(crate) fn count(n: impl ToString, one: &str, many: &str) -> String {
    let s = n.to_string();
    format!("{} {}", number(&s), if s == "1" { one } else { many })
}

pub(crate) fn list(values: &[String]) -> String {
    match values {
        [] => String::new(),
        [one] => one.clone(),
        [rest @ .., last] => format!("{} and {last}", rest.join(", ")),
    }
}

pub(crate) fn date(month: u32, day: u32) -> String {
    if !(1..=12).contains(&month) || !(1..=31).contains(&day) {
        return "Unknown date".into();
    }
    let month = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ]
    .get(month.saturating_sub(1) as usize)
    .copied()
    .unwrap_or("Unknown date");
    format!("{month} {day}")
}

pub(crate) fn stamp(value: &str, reference: &str, with_time: bool) -> String {
    let raw = if value.len() == 10 {
        format!("{value}T00:00:00Z")
    } else {
        value.into()
    };
    let Some(at) = crate::util::parse_time(&raw) else {
        return "Unknown date".into();
    };
    let [year, month, day, hour, minute, _] = crate::util::parts(at);
    let reference_year = crate::util::parse_time(reference).map(|at| crate::util::parts(at)[0]);
    let mut out = date(u32::from(month), u32::from(day));
    if reference_year != Some(year) {
        out.push_str(&format!(", {year}"));
    }
    if with_time {
        out.push_str(&format!(", {hour:02}:{minute:02} UTC"));
    }
    out
}

pub(crate) fn local_date(at: std::time::SystemTime, platform: &dyn crate::Platform) -> String {
    let local_year = |at| {
        let [year, month, _, _, _, _] = crate::util::parts(at);
        let (local_month, _) = platform.local_date(at);
        i32::from(year)
            + if month == 12 && local_month == 1 {
                1
            } else if month == 1 && local_month == 12 {
                -1
            } else {
                0
            }
    };
    let (month, day) = platform.local_date(at);
    let mut out = date(month, day);
    let year = local_year(at);
    if year != local_year(platform.now()) {
        out.push_str(&format!(", {year}"));
    }
    out
}
