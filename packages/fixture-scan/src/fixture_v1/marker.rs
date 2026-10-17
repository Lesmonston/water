use super::*;
use serde::{Deserialize, Deserializer};
use std::fs::{self, File};
use std::io::Read;
use std::path::Path;

const MARKER: &str = ".water-fixture-run.json";
const LIMIT: u64 = 65536;
const CASES: &str = include_str!("../../../../contracts/fixture-lab-v1/cases.json");

// deserialize_with disables serde's implicit missing-Option default while allowing null.
fn nullable<'de, D, T>(deserializer: D) -> Result<Option<T>, D::Error>
where
    D: Deserializer<'de>,
    T: Deserialize<'de>,
{
    Option::<T>::deserialize(deserializer)
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Marker {
    fixture_version: String,
    case_id: String,
    run_id: String,
    run_root: String,
    status: String,
    scopes: Vec<MarkerScope>,
    nodes: Vec<MarkerNode>,
    canaries: Vec<Canary>,
    scanner_plan: Plan,
    scanner_executed: bool,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct MarkerScope {
    scope_id: String,
    path: String,
    absolute_path: String,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct MarkerNode {
    path: String,
    kind: String,
    status: String,
    #[serde(deserialize_with = "nullable")]
    error_code: Option<String>,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Canary {
    path: String,
    bytes: u64,
    sha256: String,
}
#[derive(Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
struct Plan {
    max_depth: u32,
    max_entries: u32,
    #[serde(deserialize_with = "nullable")]
    cancel_after_entries: Option<u32>,
    faults: Vec<PlannedFault>,
    expected_issue_codes: Vec<String>,
}
#[derive(Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
struct PlannedFault {
    operation: String,
    path: String,
    code: String,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Definitions {
    fixture_version: String,
    cases: Vec<Definition>,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Definition {
    case_id: String,
    description: String,
    nodes: Vec<DefinitionNode>,
    scopes: Vec<DefinitionScope>,
    canaries: Vec<String>,
    scanner_plan: Plan,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct DefinitionNode {
    kind: String,
    path: String,
    #[serde(deserialize_with = "nullable")]
    content: Option<String>,
    #[serde(deserialize_with = "nullable")]
    target: Option<String>,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct DefinitionScope {
    scope_id: String,
    path: String,
}

fn invalid() -> ScanError {
    ScanError {
        code: ScanErrorCode::InvalidMarker,
        field: "/marker",
    }
}
fn unsafe_root() -> ScanError {
    ScanError {
        code: ScanErrorCode::UnsafeRoot,
        field: "/run_root",
    }
}
fn marker_io(error: std::io::Error) -> ScanError {
    if error.kind() == std::io::ErrorKind::NotFound {
        invalid()
    } else {
        ScanError {
            code: ScanErrorCode::IoError,
            field: "/marker",
        }
    }
}
fn absolute_shape(value: &str) -> bool {
    !value.contains('\0') && Path::new(value).is_absolute()
}

fn validated_marker(bytes: &[u8], run_id: &str) -> Result<Definition, ScanError> {
    // Parse the original bytes: Value would erase duplicate object keys.
    let marker: Marker = serde_json::from_slice(bytes).map_err(|_| invalid())?;
    let definitions: Definitions = serde_json::from_str(CASES).map_err(|_| invalid())?;
    let definition = definitions
        .cases
        .into_iter()
        .find(|c| c.case_id == marker.case_id)
        .ok_or_else(invalid)?;
    if marker.fixture_version != definitions.fixture_version
        || marker.run_id != run_id
        || marker.scanner_executed
        || !absolute_shape(&marker.run_root)
        || marker.scanner_plan != definition.scanner_plan
        || definition.description.is_empty()
        || marker.scopes.len() != definition.scopes.len()
        || marker.nodes.len() != definition.nodes.len()
        || marker.canaries.len() != definition.canaries.len()
    {
        return Err(invalid());
    }
    for (actual, expected) in marker.scopes.iter().zip(&definition.scopes) {
        if actual.scope_id != expected.scope_id
            || actual.path != expected.path
            || !absolute_shape(&actual.absolute_path)
        {
            return Err(invalid());
        }
    }
    let mut unsupported = false;
    for (actual, expected) in marker.nodes.iter().zip(&definition.nodes) {
        // Definition content/target are trusted compile-time declarations, never disk facts.
        let _ = (&expected.content, &expected.target);
        if actual.path != expected.path || actual.kind != expected.kind {
            return Err(invalid());
        }
        match actual.status.as_str() {
            "created" if actual.error_code.is_none() => {}
            "unsupported"
                if ["hardlink", "symlink_dir", "junction_dir"].contains(&actual.kind.as_str()) =>
            {
                let code = actual.error_code.as_deref().ok_or_else(invalid)?;
                let ordinary =
                    ["EPERM", "EACCES", "ENOSYS", "ENOTSUP", "EOPNOTSUPP"].contains(&code);
                let platform = !cfg!(target_os = "windows")
                    && actual.kind == "junction_dir"
                    && code == "PLATFORM_UNSUPPORTED";
                if !ordinary && !platform {
                    return Err(invalid());
                }
                unsupported = true;
            }
            _ => return Err(invalid()),
        }
    }
    if marker.status != if unsupported { "partial" } else { "complete" } {
        return Err(invalid());
    }
    for (actual, expected) in marker.canaries.iter().zip(&definition.canaries) {
        if &actual.path != expected
            || actual.bytes > LIMIT
            || actual.sha256.len() != 64
            || !actual
                .sha256
                .bytes()
                .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
        {
            return Err(invalid());
        }
    }
    Ok(definition)
}

pub fn open_fixture_run(run_id: &str) -> Result<FixtureRun, ScanError> {
    let suffix = run_id.strip_prefix("run-").unwrap_or("");
    if suffix.is_empty()
        || suffix.len() > 48
        || !suffix.as_bytes()[0].is_ascii_lowercase() && !suffix.as_bytes()[0].is_ascii_digit()
        || !suffix
            .bytes()
            .all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'-')
    {
        return Err(ScanError {
            code: ScanErrorCode::InvalidRunId,
            field: "/run_id",
        });
    }
    if !cfg!(any(target_os = "windows", target_os = "macos")) {
        return Err(ScanError {
            code: ScanErrorCode::Unsupported,
            field: "/run_root",
        });
    }
    let worktree = Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .and_then(Path::parent)
        .ok_or_else(unsafe_root)?;
    let lab = worktree.join(".local").join("fixture-lab");
    let root = lab.join(run_id);
    native::directories(&root).map_err(|_| unsafe_root())?;
    // Component containment follows no-follow validation, independently of lexical checks.
    if root.parent() != Some(lab.as_path())
        || root.strip_prefix(&lab).ok().map(|p| p.components().count()) != Some(1)
    {
        return Err(unsafe_root());
    }
    let marker_path = root.join(MARKER);
    let metadata = fs::symlink_metadata(&marker_path).map_err(marker_io)?;
    if native::is_link(&metadata) || !metadata.is_file() || metadata.len() > LIMIT {
        return Err(invalid());
    }
    let mut bytes = Vec::new();
    File::open(&marker_path)
        .map_err(marker_io)?
        .take(LIMIT + 1)
        .read_to_end(&mut bytes)
        .map_err(marker_io)?;
    if bytes.len() > LIMIT as usize {
        return Err(invalid());
    }
    let definition = validated_marker(&bytes, run_id)?;
    let mut scopes = Vec::new();
    for scope in definition.scopes {
        let relative = RelativePath::new(scope.path).map_err(|_| invalid())?;
        let path = root.join(relative.as_str());
        let guards = native::directories(&path).map_err(|_| unsafe_root())?;
        if !path.starts_with(&root) || path == root {
            return Err(unsafe_root());
        }
        scopes.push(Scope {
            id: OpaqueId::new(scope.scope_id).map_err(|_| invalid())?,
            relative,
            guards: Arc::new(guards),
        });
    }
    Ok(FixtureRun {
        run_id: run_id.to_owned(),
        case_id: definition.case_id,
        root,
        scopes,
    })
}
