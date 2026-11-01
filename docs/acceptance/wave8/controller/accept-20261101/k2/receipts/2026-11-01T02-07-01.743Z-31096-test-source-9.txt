use crate::error::RulesError;
use serde_json::{Map, Value};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum KnownFolder {
    UserProfile,
    LocalAppData,
    RoamingAppData,
    UserTemp,
    SystemTemp,
    Windows,
    ProgramData,
    Downloads,
}

pub const KNOWN_FOLDER_ORDER: [KnownFolder; 8] = [
    KnownFolder::UserProfile,
    KnownFolder::LocalAppData,
    KnownFolder::RoamingAppData,
    KnownFolder::UserTemp,
    KnownFolder::SystemTemp,
    KnownFolder::Windows,
    KnownFolder::ProgramData,
    KnownFolder::Downloads,
];

impl KnownFolder {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::UserProfile => "user_profile",
            Self::LocalAppData => "local_app_data",
            Self::RoamingAppData => "roaming_app_data",
            Self::UserTemp => "user_temp",
            Self::SystemTemp => "system_temp",
            Self::Windows => "windows",
            Self::ProgramData => "program_data",
            Self::Downloads => "downloads",
        }
    }

    pub fn parse(name: &str) -> Option<Self> {
        Some(match name {
            "user_profile" => Self::UserProfile,
            "local_app_data" => Self::LocalAppData,
            "roaming_app_data" => Self::RoamingAppData,
            "user_temp" => Self::UserTemp,
            "system_temp" => Self::SystemTemp,
            "windows" => Self::Windows,
            "program_data" => Self::ProgramData,
            "downloads" => Self::Downloads,
            _ => return None,
        })
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Level {
    Recommended,
    Confirm,
    Advisory,
    Protected,
}

impl Level {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Recommended => "recommended",
            Self::Confirm => "confirm",
            Self::Advisory => "advisory",
            Self::Protected => "protected",
        }
    }

    pub fn parse(name: &str) -> Option<Self> {
        Some(match name {
            "recommended" => Self::Recommended,
            "confirm" => Self::Confirm,
            "advisory" => Self::Advisory,
            "protected" => Self::Protected,
            _ => return None,
        })
    }

    pub fn is_cleanable(self) -> bool {
        matches!(self, Self::Recommended | Self::Confirm)
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Category {
    AgentTool,
    Browser,
    SystemTemp,
    AppLeftover,
    DevCache,
    CrashLog,
    GpuSystem,
    Custom,
}

impl Category {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::AgentTool => "agent_tool",
            Self::Browser => "browser",
            Self::SystemTemp => "system_temp",
            Self::AppLeftover => "app_leftover",
            Self::DevCache => "dev_cache",
            Self::CrashLog => "crash_log",
            Self::GpuSystem => "gpu_system",
            Self::Custom => "custom",
        }
    }

    pub fn parse(name: &str) -> Option<Self> {
        Some(match name {
            "agent_tool" => Self::AgentTool,
            "browser" => Self::Browser,
            "system_temp" => Self::SystemTemp,
            "app_leftover" => Self::AppLeftover,
            "dev_cache" => Self::DevCache,
            "crash_log" => Self::CrashLog,
            "gpu_system" => Self::GpuSystem,
            "custom" => Self::Custom,
            _ => return None,
        })
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ItemType {
    Dir,
    File,
    Any,
}

impl ItemType {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Dir => "dir",
            Self::File => "file",
            Self::Any => "any",
        }
    }

    pub fn parse(name: &str) -> Option<Self> {
        Some(match name {
            "dir" => Self::Dir,
            "file" => Self::File,
            "any" => Self::Any,
            _ => return None,
        })
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Growth {
    OneOff,
    Slow,
    LeakProne,
}

impl Growth {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::OneOff => "one_off",
            Self::Slow => "slow",
            Self::LeakProne => "leak_prone",
        }
    }

    pub fn parse(name: &str) -> Option<Self> {
        Some(match name {
            "one_off" => Self::OneOff,
            "slow" => Self::Slow,
            "leak_prone" => Self::LeakProne,
            _ => return None,
        })
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum InUseMode {
    None,
    ProcessRunning,
    CmdlineReferencesItem,
    RunsFromOrReferencesItem,
}

impl InUseMode {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::None => "none",
            Self::ProcessRunning => "process_running",
            Self::CmdlineReferencesItem => "cmdline_references_item",
            Self::RunsFromOrReferencesItem => "runs_from_or_references_item",
        }
    }

    pub fn parse(name: &str) -> Option<Self> {
        Some(match name {
            "none" => Self::None,
            "process_running" => Self::ProcessRunning,
            "cmdline_references_item" => Self::CmdlineReferencesItem,
            "runs_from_or_references_item" => Self::RunsFromOrReferencesItem,
            _ => return None,
        })
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct InUse {
    pub mode: InUseMode,
    pub processes: Vec<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SourceKind {
    LocalObservation,
    OfficialDoc,
    Skill,
}

impl SourceKind {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::LocalObservation => "local_observation",
            Self::OfficialDoc => "official_doc",
            Self::Skill => "skill",
        }
    }

    pub fn parse(name: &str) -> Option<Self> {
        Some(match name {
            "local_observation" => Self::LocalObservation,
            "official_doc" => Self::OfficialDoc,
            "skill" => Self::Skill,
            _ => return None,
        })
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Marker {
    File {
        name: String,
        min_bytes: u64,
        max_bytes: u64,
    },
    ChildrenAll {
        names: Vec<String>,
    },
    DirName {
        names: Vec<String>,
    },
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Locator {
    Pattern {
        base: KnownFolder,
        segments: Vec<String>,
    },
    Marker {
        marker: Marker,
        max_depth: u32,
    },
    Discovery {
        base: KnownFolder,
    },
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum MatchSpec {
    Pattern {
        base: String,
        segments: Vec<String>,
    },
    Marker {
        root: String,
        marker: Marker,
        max_depth: u32,
    },
    Discovery {
        root: String,
    },
}

pub(crate) fn has_wildcard(segment: &str) -> bool {
    segment
        .bytes()
        .any(|byte| matches!(byte, b'*' | b'?' | b'#'))
}

pub(crate) fn valid_segment(segment: &str) -> bool {
    !segment.is_empty() && segment != "." && segment != ".." && !segment.contains(['\\', '/', ':'])
}

pub(crate) fn valid_entry_name(name: &str) -> bool {
    valid_segment(name)
}

pub(crate) fn object<'a>(
    value: &'a Value,
    path: &str,
) -> Result<&'a Map<String, Value>, RulesError> {
    value
        .as_object()
        .ok_or_else(|| RulesError::new("RULES_INVALID_SHAPE", path))
}

pub(crate) fn expect_keys(
    map: &Map<String, Value>,
    allowed: &[&str],
    path: &str,
) -> Result<(), RulesError> {
    if map
        .keys()
        .any(|key| allowed.iter().all(|allowed| *allowed != key))
    {
        return Err(RulesError::new("RULES_UNKNOWN_KEY", path));
    }
    Ok(())
}

pub(crate) fn field<'a>(
    map: &'a Map<String, Value>,
    key: &str,
    path: &str,
) -> Result<&'a Value, RulesError> {
    map.get(key)
        .ok_or_else(|| RulesError::new("RULES_MISSING_FIELD", format!("{path}/{key}")))
}

pub(crate) fn as_str<'a>(value: &'a Value, path: &str) -> Result<&'a str, RulesError> {
    value
        .as_str()
        .ok_or_else(|| RulesError::new("RULES_INVALID_TEXT", path))
}

pub(crate) fn as_u64(value: &Value, path: &str) -> Result<u64, RulesError> {
    value
        .as_u64()
        .ok_or_else(|| RulesError::new("RULES_INVALID_NUMBER", path))
}

pub(crate) fn bounded_u32(
    value: &Value,
    min: u32,
    max: u32,
    path: &str,
) -> Result<u32, RulesError> {
    let number = as_u64(value, path)?;
    if number < u64::from(min) || number > u64::from(max) {
        return Err(RulesError::new("RULES_INVALID_NUMBER", path));
    }
    Ok(number as u32)
}

pub(crate) fn char_len(text: &str) -> usize {
    text.chars().count()
}

pub(crate) fn require_chars(
    text: &str,
    min: usize,
    max: usize,
    path: &str,
) -> Result<(), RulesError> {
    let len = char_len(text);
    if len < min || len > max {
        return Err(RulesError::new("RULES_INVALID_TEXT", path));
    }
    Ok(())
}

pub(crate) fn valid_rule_id(value: &str) -> bool {
    let len = value.len();
    (3..=48).contains(&len)
        && value
            .bytes()
            .all(|byte| byte.is_ascii_lowercase() || byte.is_ascii_digit() || byte == b'-')
}

pub(crate) fn valid_root_id(value: &str) -> bool {
    let len = value.len();
    (1..=32).contains(&len)
        && value
            .bytes()
            .all(|byte| byte.is_ascii_lowercase() || byte.is_ascii_digit() || byte == b'-')
}

pub(crate) fn valid_process_name(value: &str) -> bool {
    let bytes = value.as_bytes();
    bytes.len() >= 5
        && bytes.ends_with(b".exe")
        && bytes[..bytes.len() - 4].iter().all(|byte| {
            byte.is_ascii_lowercase() || byte.is_ascii_digit() || matches!(byte, b'-' | b'_' | b'.')
        })
}

pub(crate) fn valid_date(value: &str) -> bool {
    let bytes = value.as_bytes();
    if !(bytes.len() == 10
        && bytes[4] == b'-'
        && bytes[7] == b'-'
        && bytes[0..4].iter().all(u8::is_ascii_digit)
        && bytes[5..7].iter().all(u8::is_ascii_digit)
        && bytes[8..10].iter().all(u8::is_ascii_digit))
    {
        return false;
    }
    let number = |range: std::ops::Range<usize>| {
        bytes[range]
            .iter()
            .fold(0u32, |acc, byte| acc * 10 + u32::from(byte - b'0'))
    };
    let year = number(0..4);
    let month = number(5..7);
    let day = number(8..10);
    let leap = (year % 4 == 0 && year % 100 != 0) || year % 400 == 0;
    let days_in_month = match month {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        2 if leap => 29,
        2 => 28,
        _ => return false,
    };
    (1..=days_in_month).contains(&day)
}

pub(crate) fn valid_data_version(value: &str) -> bool {
    let Some((date, rest)) = value.split_once('.') else {
        return false;
    };
    valid_date(date) && !rest.is_empty() && rest.bytes().all(|byte| byte.is_ascii_digit())
}

pub(crate) fn valid_created_at(value: &str) -> bool {
    let bytes = value.as_bytes();
    bytes.len() == 20
        && bytes[4] == b'-'
        && bytes[7] == b'-'
        && bytes[10] == b'T'
        && bytes[13] == b':'
        && bytes[16] == b':'
        && bytes[19] == b'Z'
        && bytes[0..4].iter().all(u8::is_ascii_digit)
        && bytes[5..7].iter().all(u8::is_ascii_digit)
        && bytes[8..10].iter().all(u8::is_ascii_digit)
        && bytes[11..13].iter().all(u8::is_ascii_digit)
        && bytes[14..16].iter().all(u8::is_ascii_digit)
        && bytes[17..19].iter().all(u8::is_ascii_digit)
}

pub(crate) fn is_drive_root(path: &str) -> bool {
    let bytes = path.as_bytes();
    bytes.len() == 3 && bytes[0].is_ascii_alphabetic() && bytes[1] == b':' && bytes[2] == b'\\'
}

pub(crate) fn drive_root_of(path: &str) -> Option<String> {
    let bytes = path.as_bytes();
    if bytes.len() >= 3 && bytes[0].is_ascii_alphabetic() && bytes[1] == b':' && bytes[2] == b'\\' {
        Some(format!("{}:\\", bytes[0] as char))
    } else {
        None
    }
}

pub(crate) fn valid_abs_path(path: &str, allow_drive_root: bool) -> bool {
    if path.contains('/') || path.starts_with("\\\\") {
        return false;
    }
    if is_drive_root(path) {
        return allow_drive_root;
    }
    let bytes = path.as_bytes();
    if bytes.len() < 4
        || !bytes[0].is_ascii_alphabetic()
        || bytes[1] != b':'
        || bytes[2] != b'\\'
        || path.ends_with('\\')
    {
        return false;
    }
    path[3..]
        .split('\\')
        .all(|segment| !segment.is_empty() && segment != "." && segment != "..")
}

pub(crate) fn valid_https_url(value: &str) -> bool {
    value.starts_with("https://") && value.len() >= 12 && !value.contains([' ', '\t', '\r', '\n'])
}

pub(crate) fn locator_key(locator: &Locator) -> String {
    match locator {
        Locator::Pattern { base, segments } => format!(
            "pattern:{}:{}",
            base.as_str(),
            segments
                .iter()
                .map(|segment| segment.to_ascii_lowercase())
                .collect::<Vec<_>>()
                .join("\u{1f}")
        ),
        Locator::Discovery { base } => format!("discovery:{}", base.as_str()),
        Locator::Marker { marker, max_depth } => match marker {
            Marker::File {
                name,
                min_bytes,
                max_bytes,
            } => format!(
                "marker:file:{}:{min_bytes}:{max_bytes}:{max_depth}",
                name.to_ascii_lowercase()
            ),
            Marker::ChildrenAll { names } => {
                format!("marker:children_all:{}:{max_depth}", joined_names(names))
            }
            Marker::DirName { names } => {
                format!("marker:dir_name:{}:{max_depth}", joined_names(names))
            }
        },
    }
}

fn joined_names(names: &[String]) -> String {
    names
        .iter()
        .map(|name| name.to_ascii_lowercase())
        .collect::<Vec<_>>()
        .join("\u{1f}")
}

/// Addendum 01 rule: literal vs literal compares ASCII case-insensitively;
/// exactly one wildcard side is matched as a MODEL segment pattern against
/// the other side's literal text; two wildcard sides may always overlap.
pub(crate) fn segments_may_overlap(cleanable: &str, protected: &str) -> bool {
    match (has_wildcard(cleanable), has_wildcard(protected)) {
        (false, false) => cleanable.eq_ignore_ascii_case(protected),
        (true, false) => segment_pattern_matches(cleanable, protected),
        (false, true) => segment_pattern_matches(protected, cleanable),
        (true, true) => true,
    }
}

/// MODEL segment syntax: `*` zero or more characters, `?` exactly one
/// character, `#` one or more ASCII digits, other characters literal and
/// ASCII case-insensitive.
pub(crate) fn segment_pattern_matches(pattern: &str, text: &str) -> bool {
    let pattern: Vec<char> = pattern.chars().collect();
    let text: Vec<char> = text.chars().collect();
    glob_match(&pattern, &text)
}

fn glob_match(pattern: &[char], text: &[char]) -> bool {
    let Some((&head, rest)) = pattern.split_first() else {
        return text.is_empty();
    };
    match head {
        '*' => (0..=text.len()).any(|skip| glob_match(rest, &text[skip..])),
        '?' => !text.is_empty() && glob_match(rest, &text[1..]),
        '#' => {
            let digits = text.iter().take_while(|ch| ch.is_ascii_digit()).count();
            (1..=digits).any(|used| glob_match(rest, &text[used..]))
        }
        literal => text.split_first().is_some_and(|(first, tail)| {
            first.eq_ignore_ascii_case(&literal) && glob_match(rest, tail)
        }),
    }
}
