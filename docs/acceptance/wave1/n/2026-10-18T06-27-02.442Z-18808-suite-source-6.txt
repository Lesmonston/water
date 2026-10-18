#![deny(unsafe_code)]

use serde::Deserialize;
use serde_json::{Value, json};
use water_contracts::v1::OpaqueId;
use water_native_root::v1::{self, DirectoryLease, RootError, RootObservation};

#[derive(Deserialize)]
struct Fixtures {
    fixture_version: String,
    normal_a: String,
    normal_b: String,
    nested: String,
    file: String,
    missing: String,
    final_reparse: String,
    ancestor_reparse: String,
    ancestor_child: String,
}

fn fixtures() -> Fixtures {
    // The only content read is the frozen prepare tool's index, never a fixture file.
    let path = std::env::var("WATER_NATIVE_ROOT_FIXTURE_INDEX").expect("fixture index environment");
    let index = std::fs::read_to_string(path).expect("read frozen fixture index");
    let f: Fixtures = serde_json::from_str(&index).expect("fixture index JSON");
    assert_eq!(f.fixture_version, "water.native-root-fixtures.v1");
    f
}

fn scope() -> OpaqueId {
    OpaqueId::new("scope-native-tests").unwrap()
}

fn open(path: &str) -> DirectoryLease {
    v1::open_directory(&scope(), path)
        .unwrap_or_else(|error| panic!("N_BEHAVIOR: valid native directory rejected: {error}"))
}

fn wire(observation: &RootObservation) -> Value {
    serde_json::from_str(&v1::to_json(observation).unwrap()).unwrap()
}

fn authority(observation: &RootObservation) {
    assert!(
        !observation.authorization_granted()
            && !observation.traversal_allowed()
            && !observation.race_protection_verified(),
        "N_NO_AUTHORITY: observation must never grant authority or verify races"
    );
    let value = wire(observation);
    for key in [
        "authorization_granted",
        "traversal_allowed",
        "race_protection_verified",
    ] {
        assert_eq!(value[key], false, "N_NO_AUTHORITY: {key}");
    }
}

#[test]
fn root_path_validation() {
    let valid = [
        "C:/alpha",
        r"z:\alpha\beta",
        r"F:/alpha\beta/gamma",
        "C:/项目/😀",
        "C:/e\u{301}",
        "C:/é",
        "C:/COM0/COM10/LPT0/LPT10",
        "C:/CONSOLE/NULx/auxiliary",
        "C:/a b/.hidden/..named",
        "C:/CONIN$x/COM⁴/ＣＯＮ",
        "C:/a\u{85}b",
    ];
    for path in valid {
        assert_eq!(v1::validate_windows_path(path), Ok(()), "{path:?}");
    }
    let mut invalid = vec![
        "",
        "C:/",
        r"C:\",
        "C:",
        "relative",
        "C:relative",
        "/a",
        r"\a",
        "1:/a",
        "é:/a",
        "CC:/a",
        r"\\server\share\a",
        "//server/share/a",
        r"\\?\C:\a",
        r"\\.\C:\a",
        "C://a",
        r"C:\\a",
        r"C:/a\/b",
        "C:/a/",
        "C:/a\\",
        "C:/a//b",
        "C:/.",
        "C:/..",
        "C:/a/./b",
        "C:/a/../b",
        "C:/a.",
        "C:/a ",
        "C:/a./b",
        "C:/a /b",
        "C:/a:stream",
        "C:/a:b/c",
        "C:/a<b",
        "C:/a>b",
        "C:/a\"b",
        "C:/a|b",
        "C:/a?b",
        "C:/a*b",
    ]
    .into_iter()
    .map(str::to_owned)
    .collect::<Vec<_>>();
    for ch in ('\u{0}'..='\u{1f}').chain(std::iter::once('\u{7f}')) {
        invalid.push(format!("C:/a{ch}b"));
    }
    for name in ["CON", "PRN", "AUX", "NUL", "CONIN$", "CONOUT$"]
        .into_iter()
        .map(str::to_owned)
        .chain((1..=9).flat_map(|n| [format!("COM{n}"), format!("LPT{n}")]))
        .chain(
            ['¹', '²', '³']
                .into_iter()
                .flat_map(|n| [format!("COM{n}"), format!("LPT{n}")]),
        )
    {
        for suffix in ["", ".txt", " .txt", "..txt"] {
            invalid.push(format!("C:/{}{}", name.to_ascii_lowercase(), suffix));
            invalid.push(format!("C:/{name}{suffix}/child"));
        }
    }
    let max = format!("C:/{}", "a".repeat(237));
    let max_unicode = format!("C:/{}a", "😀".repeat(118));
    for path in [&max, &max_unicode] {
        assert_eq!(path.encode_utf16().count(), 240);
        assert_eq!(v1::validate_windows_path(path), Ok(()));
        invalid.push(format!("{path}b"));
    }
    for path in invalid {
        assert_eq!(
            v1::validate_windows_path(&path),
            Err(RootError::InvalidPath),
            "{path:?}"
        );
        // Invalid spelling must win before volume, metadata, open, or platform checks.
        assert!(
            matches!(
                v1::open_directory(&scope(), &path),
                Err(RootError::InvalidPath)
            ),
            "{path:?}"
        );
    }
    #[cfg(not(windows))]
    assert!(matches!(
        v1::open_directory(&scope(), "C:/valid"),
        Err(RootError::UnsupportedPlatform)
    ));
}

#[test]
fn root_native_identity() {
    let f = fixtures();
    let a = open(&f.normal_a);
    let second_a = open(&f.normal_a);
    let b = open(&f.normal_b);
    let nested = open(&f.nested);
    assert_eq!(
        a.observation().identity(),
        second_a.observation().identity(),
        "N_IDENTITY_HANDLE: repeated open"
    );
    assert_ne!(
        a.observation().identity(),
        b.observation().identity(),
        "N_IDENTITY_HANDLE: two directories must differ"
    );
    assert_ne!(
        a.observation().identity(),
        nested.observation().identity(),
        "N_IDENTITY_HANDLE: nested directory must differ"
    );
    assert_ne!(
        b.observation().identity(),
        nested.observation().identity(),
        "N_IDENTITY_HANDLE: B versus nested"
    );
    for lease in [&a, &second_a, &b, &nested] {
        assert_eq!(
            lease.observation(),
            &lease.refresh().unwrap(),
            "N_IDENTITY_HANDLE: same live handle refresh"
        );
        let identity = lease.observation().identity();
        assert_eq!(identity.kind(), "windows_file_id_128");
        assert_eq!(
            identity.volume_serial().parse::<u64>().unwrap().to_string(),
            identity.volume_serial()
        );
        assert_eq!(identity.file_id().len(), 32);
        assert!(
            identity
                .file_id()
                .bytes()
                .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
        );
        authority(lease.observation());
    }
    let mixed = f.normal_a.replace('\\', "/");
    assert_eq!(
        open(&mixed).observation().identity(),
        a.observation().identity()
    );
    let other_scope = OpaqueId::new("scope-other").unwrap();
    let other = v1::open_directory(&other_scope, &f.normal_a).unwrap();
    assert_eq!(other.observation().scope_id(), &other_scope);
    assert_eq!(other.refresh().unwrap().scope_id(), &other_scope);
    assert_eq!(other.observation().identity(), a.observation().identity());
}

#[test]
fn root_reparse_boundaries() {
    let f = fixtures();
    for path in [&f.final_reparse, &f.ancestor_reparse, &f.ancestor_child] {
        assert!(
            matches!(
                v1::open_directory(&scope(), path),
                Err(RootError::ReparsePoint)
            ),
            "N_REPARSE_ROOT: junction or junction ancestor must be rejected"
        );
    }
    assert!(matches!(
        v1::open_directory(&scope(), &f.file),
        Err(RootError::NotDirectory)
    ));
    assert!(matches!(
        v1::open_directory(&scope(), &f.missing),
        Err(RootError::MetadataUnavailable)
    ));
    // This syntactically valid descendant hits the existing ordinary file ancestor first.
    assert!(matches!(
        v1::open_directory(&scope(), &format!("{}/child", f.file)),
        Err(RootError::NotDirectory)
    ));
    assert_eq!(
        open(&f.nested).observation(),
        &open(&f.nested).refresh().unwrap()
    );
}

#[test]
fn root_observation_wire() {
    let f = fixtures();
    let lease = open(&f.normal_a);
    let o = lease.observation();
    authority(o);
    assert_eq!(o.root_version(), "water.native-root.v1");
    assert_eq!(o.scope_id(), &scope());
    assert_eq!(o.platform(), "windows");
    assert_eq!(o.object_kind(), "directory");
    assert!(o.read_only());
    assert!(!o.reparse_point());
    let expected = json!({
        "root_version": "water.native-root.v1", "scope_id": scope().as_str(),
        "platform": "windows", "object_kind": "directory", "read_only": true,
        "identity": {"kind": "windows_file_id_128", "volume_serial": o.identity().volume_serial(), "file_id": o.identity().file_id()},
        "reparse_point": false, "authorization_granted": false,
        "traversal_allowed": false, "race_protection_verified": false
    });
    assert_eq!(wire(o), expected);
    assert_eq!(wire(&lease.refresh().unwrap()), expected);
    assert_eq!(serde_json::to_value(o.clone()).unwrap(), expected);
    let text = v1::to_json(o).unwrap();
    assert!(!text.contains(&f.normal_a));
    assert!(!text.contains("handle"));
    assert_eq!(expected.as_object().unwrap().len(), 10);
    assert_eq!(expected["identity"].as_object().unwrap().len(), 3);
}

#[test]
fn root_lifetime_and_errors() {
    let f = fixtures();
    let retained = {
        let lease = open(&f.normal_a);
        lease.observation().clone()
    };
    for _ in 0..64 {
        let lease = open(&f.normal_a);
        assert_eq!(&retained, lease.observation());
        assert_eq!(retained, lease.refresh().unwrap());
        drop(lease); // File's RAII is also reviewed in source; no handle-count FFI.
    }
    assert_eq!(wire(&retained), wire(open(&f.normal_a).observation()));
    assert!(std::mem::needs_drop::<DirectoryLease>());
    for (error, name) in [
        (RootError::InvalidPath, "InvalidPath"),
        (RootError::UnsupportedPlatform, "UnsupportedPlatform"),
        (RootError::UnsupportedVolume, "UnsupportedVolume"),
        (RootError::ReparsePoint, "ReparsePoint"),
        (RootError::NotDirectory, "NotDirectory"),
        (RootError::MetadataUnavailable, "MetadataUnavailable"),
        (RootError::OpenFailed, "OpenFailed"),
        (RootError::IdentityUnavailable, "IdentityUnavailable"),
        (RootError::SerializationFailed, "SerializationFailed"),
    ] {
        assert_eq!(format!("{error:?}"), name);
        assert_eq!(error.to_string(), name);
        assert_eq!(error.clone(), error);
        assert!(std::error::Error::source(&error).is_none());
    }
    for (path, expected) in [
        (f.file, RootError::NotDirectory),
        (f.missing, RootError::MetadataUnavailable),
        (f.final_reparse, RootError::ReparsePoint),
    ] {
        let error = match v1::open_directory(&scope(), &path) {
            Err(error) => error,
            Ok(_) => panic!("unexpected successful open"),
        };
        assert_eq!(error, expected);
        assert_eq!(error.to_string(), format!("{expected:?}"));
        assert!(!error.to_string().contains(&path));
    }
}
