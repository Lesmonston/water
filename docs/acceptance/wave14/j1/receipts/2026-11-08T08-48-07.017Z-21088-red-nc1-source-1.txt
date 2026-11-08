#![forbid(unsafe_code)]
use crate::error::ScanError;
use crate::model::{ScanExtras, SpaceOverview};
use crate::util::{is_proper_ancestor, path_eq, validate_abs_path};

fn normalize(path: &str) -> Option<String> {
    let path = path.replace('/', "\\");
    let bytes = path.as_bytes();
    if bytes.len() < 3 || !bytes[0].is_ascii_alphabetic() || bytes[1] != b':' || bytes[2] != b'\\' {
        return None;
    }
    let mut parts = Vec::new();
    for p in path[3..].split('\\') {
        match p {
            "" | "." => {}
            ".." => {
                parts.pop()?;
            }
            _ => parts.push(p),
        }
    }
    let value = if parts.is_empty() {
        path[..3].to_string()
    } else {
        format!("{}{}", &path[..3], parts.join("\\"))
    };
    validate_abs_path(&value).ok()?;
    Some(value)
}

pub(crate) fn decode_reparse(link: &str, data: &[u8]) -> Option<(String, Option<String>)> {
    let u16_at = |i: usize| {
        data.get(i..i + 2)
            .map(|v| u16::from_le_bytes([v[0], v[1]]) as usize)
    };
    let tag = u32::from_le_bytes(data.get(..4)?.try_into().ok()?);
    let declared = u16_at(4)?.checked_add(8)?;
    if declared > data.len() {
        return None;
    }
    let (tag_name, start, relative) = match tag {
        0xa0000003 => ("junction", 16, false),
        0xa000000c => (
            "symlink",
            20,
            u32::from_le_bytes(data.get(16..20)?.try_into().ok()?) & 1 != 0,
        ),
        _ => return None,
    };
    let offset = u16_at(8)?;
    let length = u16_at(10)?;
    if offset % 2 != 0 || length % 2 != 0 {
        return None;
    }
    let from = start + offset;
    let end = from.checked_add(length)?;
    if end > declared {
        return None;
    }
    let units = data
        .get(from..end)?
        .chunks_exact(2)
        .map(|v| u16::from_le_bytes([v[0], v[1]]))
        .collect::<Vec<_>>();
    let raw = String::from_utf16(&units).ok()?;
    let raw = raw.strip_prefix("\\??\\").unwrap_or(&raw);
    let target = if relative {
        link.rsplit_once('\\')
            .and_then(|(parent, _)| normalize(&format!("{parent}\\{raw}")))
    } else {
        normalize(raw)
    };
    Some((tag_name.to_string(), target))
}

pub(crate) fn resolve_junctions(extras: &mut ScanExtras) {
    for index in 0..extras.junctions.len() {
        let mut seen = std::collections::HashSet::new();
        seen.insert(extras.junctions[index].path.to_ascii_lowercase());
        let mut current = extras.junctions[index].target.clone();
        for depth in 0..=8 {
            let Some(path) = &current else { break };
            if !seen.insert(path.to_ascii_lowercase()) {
                current = None;
                break;
            }
            let next = extras
                .junctions
                .iter()
                .filter(|j| path_eq(&j.path, path) || is_proper_ancestor(&j.path, path))
                .max_by_key(|j| j.path.len());
            let Some(next) = next else { break };
            if depth == 8 {
                current = None;
                break;
            }
            current = next.target.as_ref().and_then(|target| {
                let suffix = &path[next.path.len()..];
                if suffix.is_empty() {
                    Some(target.clone())
                } else {
                    normalize(&format!("{}{suffix}", target.trim_end_matches('\\')))
                }
            });
        }
        extras.junctions[index].final_target = current;
    }
    extras
        .junctions
        .sort_by_key(|j| j.path.to_ascii_lowercase());
}

pub fn extras_to_json(extras: &ScanExtras) -> String {
    crate::model::to_json(extras).unwrap_or_else(|_| "{}".into())
}
pub fn extras_from_json(text: &str) -> Result<ScanExtras, ScanError> {
    let extras: ScanExtras = crate::model::from_json(text)?;
    if extras.extras_version != "water.scan-extras.v1" {
        return Err(ScanError::InvalidResult);
    }
    Ok(extras)
}
pub fn overview_to_json(overview: &SpaceOverview) -> String {
    crate::model::to_json(overview).unwrap_or_else(|_| "{}".into())
}
pub fn overview_from_json(text: &str) -> Result<SpaceOverview, ScanError> {
    let overview: SpaceOverview = crate::model::from_json(text)?;
    if overview.overview_version != "water.space-overview.v1" {
        return Err(ScanError::InvalidResult);
    }
    Ok(overview)
}
