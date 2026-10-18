#![forbid(unsafe_code)]

use std::{env, fs, path::Path};
use water_contracts::v1::OpaqueId;
use water_native_root::v1::{self as native, RootError, RootObservation};
use water_scope_registry::v1::{PendingSelection, RegisteredScope, Registry, RegistryError};

struct Fixtures {
    a: String,
    b: String,
    nested: String,
    alias: String,
    reparse: String,
}

impl Fixtures {
    fn load() -> Self {
        // Read only the frozen prepare tool's index. No directory enumeration or writes.
        let root = Path::new(env!("CARGO_MANIFEST_DIR"))
            .parent()
            .unwrap()
            .parent()
            .unwrap();
        let expected_index = root.join(".local/scope-fixtures/index.json");
        let index_path = env::var("WATER_SCOPE_FIXTURE_INDEX").unwrap();
        assert_eq!(Path::new(&index_path), expected_index);
        let index = fs::read_to_string(expected_index).unwrap();
        assert!(index.contains("\"fixture_version\": \"water.scope-fixtures.v1\""));
        assert!(index.contains("\"ordinary_file_count\": 0"));
        assert!(index.contains("\"content_bytes\": 0"));
        let base = root.join(".local/scope-fixtures/batch-v1");
        let a = base.join("root-a").to_str().unwrap().to_owned();
        let b = base.join("root-b").to_str().unwrap().to_owned();
        let nested = base.join("root-a/nested").to_str().unwrap().to_owned();
        let alias = a.replace('\\', "/");
        let reparse = base.join("root-junction").to_str().unwrap().to_owned();
        // The fixed index contains only ASCII path spellings, with backslashes escaped.
        for (key, value) in [
            ("normal_a", &a),
            ("normal_b", &b),
            ("nested", &nested),
            ("alias", &alias),
            ("reparse", &reparse),
        ] {
            let windows_value = if key == "alias" {
                value.clone()
            } else {
                value.replace('/', "\\")
            };
            let encoded = windows_value.replace('\\', "\\\\");
            assert!(index.contains(&format!("\"{key}\": \"{encoded}\"")));
        }
        Self {
            a,
            b,
            nested,
            alias,
            reparse,
        }
    }
}

fn id(value: &str) -> OpaqueId {
    OpaqueId::new(value).unwrap()
}

fn prepared(registry: &mut Registry, name: &str, path: &str) -> PendingSelection {
    registry
        .prepare(&id(name), path)
        .unwrap_or_else(|error| panic!("P_BEHAVIOR: prepare must retain a pending lease: {error}"))
}

fn registered(registry: &mut Registry, name: &str, path: &str) -> RegisteredScope {
    let pending = prepared(registry, name, path);
    registry.confirm(&pending).unwrap()
}

fn expect_error<T>(result: Result<T, RegistryError>, expected: RegistryError, label: &str) {
    // T deliberately need not implement Debug (capabilities must not implement it).
    assert_eq!(result.err(), Some(expected), "{label}");
}

fn no_authority(observation: &RootObservation, scope_id: &OpaqueId) {
    assert_eq!(observation.root_version(), "water.native-root.v1");
    assert_eq!(observation.scope_id(), scope_id);
    assert_eq!(observation.platform(), "windows");
    assert_eq!(observation.object_kind(), "directory");
    assert!(observation.read_only());
    assert!(!observation.reparse_point());
    assert!(!observation.authorization_granted());
    assert!(!observation.traversal_allowed());
    assert!(!observation.race_protection_verified());
    assert_eq!(observation.identity().kind(), "windows_file_id_128");
    let volume = observation.identity().volume_serial();
    assert_eq!(volume.parse::<u64>().unwrap().to_string(), volume);
    let file = observation.identity().file_id();
    assert_eq!(file.len(), 32);
    assert!(
        file.bytes()
            .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
    );
}

#[test]
fn registry_registration() {
    let f = Fixtures::load();
    for capacity in [0, 17, usize::MAX] {
        expect_error(
            Registry::new(capacity),
            RegistryError::InvalidCapacity,
            "capacity",
        );
    }
    assert!(Registry::new(16).unwrap().is_empty());

    let mut one = Registry::new(1).unwrap();
    assert_eq!(one.len(), 0);
    let pending = prepared(&mut one, "one", &f.a);
    assert_eq!(pending.scope_id(), &id("one"));
    assert!(!one.is_empty());
    assert_eq!(one.len(), 1);
    // Full precedes duplicate ID, duplicate identity and native path validation.
    for (name, path) in [
        ("one", "relative"),
        ("two", f.alias.as_str()),
        ("two", f.b.as_str()),
    ] {
        expect_error(
            one.prepare(&id(name), path),
            RegistryError::RegistryFull,
            "full first",
        );
    }
    let scope = one.confirm(&pending).unwrap();
    expect_error(
        one.prepare(&id("one"), &f.b),
        RegistryError::RegistryFull,
        "confirmed counts",
    );
    let permit = one.begin_scan(&scope).unwrap();
    expect_error(
        one.prepare(&id("two"), &f.b),
        RegistryError::RegistryFull,
        "active counts",
    );
    one.check_permit(&permit).unwrap();
    one.revoke(&scope).unwrap();
    assert!(one.is_empty());

    let mut registry = Registry::new(3).unwrap();
    for path in ["relative", "F:/", "F:/forbidden/../segment"] {
        expect_error(
            registry.prepare(&id("bad"), path),
            RegistryError::Native(RootError::InvalidPath),
            "native lexical error",
        );
        assert_eq!(registry.len(), 0);
    }
    expect_error(
        registry.prepare(&id("junction"), &f.reparse),
        RegistryError::Native(RootError::ReparsePoint),
        "native reparse error",
    );
    assert!(registry.is_empty());
    let a = prepared(&mut registry, "a", &f.a);
    expect_error(
        registry.prepare(&id("a"), "relative"),
        RegistryError::DuplicateScope,
        "duplicate before native",
    );
    expect_error(
        registry.prepare(&id("a"), &f.b),
        RegistryError::DuplicateScope,
        "duplicate ID on different root",
    );
    let mixed = f.alias.replacen("/batch-v1/", "\\batch-v1/", 1);
    for path in [&f.a, &f.alias, &mixed] {
        expect_error(
            registry.prepare(&id("alias"), path),
            RegistryError::DuplicateRoot,
            "pending root alias",
        );
        assert_eq!(registry.len(), 1);
    }
    let b = prepared(&mut registry, "b", &f.b);
    let nested = prepared(&mut registry, "nested", &f.nested);
    assert_eq!(registry.len(), 3);
    let oa = registry.preview(&a).unwrap();
    let ob = registry.preview(&b).unwrap();
    let on = registry.preview(&nested).unwrap();
    assert_ne!(oa.identity(), ob.identity());
    assert_ne!(oa.identity(), on.identity());
    assert_ne!(ob.identity(), on.identity());
    // Ancestor/descendant overlap is allowed, rather than claimed to be excluded.
    registry.decline(&nested).unwrap();
    registry.decline(&b).unwrap();
    let scope_a = registry.confirm(&a).unwrap();
    expect_error(
        registry.prepare(&id("alias"), &f.alias),
        RegistryError::DuplicateRoot,
        "confirmed root alias",
    );
    let permit_a = registry.begin_scan(&scope_a).unwrap();
    expect_error(
        registry.prepare(&id("alias"), &mixed),
        RegistryError::DuplicateRoot,
        "active root alias",
    );
    expect_error(
        registry.prepare(&id("a"), &f.b),
        RegistryError::DuplicateScope,
        "active ID",
    );
    assert_eq!(registry.check_permit(&permit_a).unwrap(), oa);
    registry.revoke(&scope_a).unwrap();
    assert!(registry.is_empty());
}

#[test]
fn registry_confirmation() {
    let f = Fixtures::load();
    let mut registry = Registry::new(2).unwrap();
    let declined = prepared(&mut registry, "reuse", &f.a);
    let observation = registry.preview(&declined).unwrap();
    assert_eq!(observation, registry.preview(&declined).unwrap());
    no_authority(&observation, &id("reuse"));
    registry.decline(&declined).unwrap();
    assert!(registry.is_empty());
    expect_error(
        registry.decline(&declined),
        RegistryError::InvalidCapability,
        "decline replay",
    );
    expect_error(
        registry.preview(&declined),
        RegistryError::InvalidCapability,
        "removed pending preview",
    );
    expect_error(
        registry.confirm(&declined),
        RegistryError::InvalidCapability,
        "removed pending confirm",
    );

    let pending = prepared(&mut registry, "reuse", &f.a);
    expect_error(
        registry.confirm(&declined),
        RegistryError::InvalidCapability,
        "old registration after ID reuse",
    );
    assert_eq!(registry.preview(&pending).unwrap(), observation);
    let scope = registry.confirm(&pending).unwrap();
    assert_eq!(scope.scope_id(), &id("reuse"));
    expect_error(
        registry.confirm(&pending),
        RegistryError::WrongState,
        "confirm twice",
    );
    expect_error(
        registry.preview(&pending),
        RegistryError::WrongState,
        "preview confirmed",
    );
    expect_error(
        registry.decline(&pending),
        RegistryError::WrongState,
        "decline confirmed",
    );
    assert_eq!(registry.len(), 1);
    expect_error(
        registry.cancel(&scope),
        RegistryError::WrongState,
        "cancel confirmed",
    );
    let permit = registry.begin_scan(&scope).unwrap();
    expect_error(
        registry.confirm(&pending),
        RegistryError::WrongState,
        "confirm active",
    );
    expect_error(
        registry.preview(&pending),
        RegistryError::WrongState,
        "preview active",
    );
    expect_error(
        registry.decline(&pending),
        RegistryError::WrongState,
        "decline active",
    );
    assert_eq!(registry.check_permit(&permit).unwrap(), observation);
    registry.finish(&permit).unwrap();
    expect_error(
        registry.confirm(&pending),
        RegistryError::WrongState,
        "finish never restores pending",
    );
    registry.revoke(&scope).unwrap();
    expect_error(
        registry.preview(&pending),
        RegistryError::InvalidCapability,
        "revoked pending",
    );
    assert!(registry.is_empty());
}

#[test]
fn registry_permits_and_replay() {
    let f = Fixtures::load();
    let mut registry = Registry::new(2).unwrap();
    let a = registered(&mut registry, "a", &f.a);
    let b = registered(&mut registry, "b", &f.b);
    let first = registry.begin_scan(&a).unwrap();
    assert_eq!(first.scope_id(), a.scope_id());
    let observed = registry.check_permit(&first).unwrap();
    expect_error(
        registry.begin_scan(&a),
        RegistryError::WrongState,
        "P_SINGLE_ACTIVE: second permit must be refused",
    );
    assert_eq!(registry.check_permit(&first).unwrap(), observed);
    expect_error(
        registry.cancel(&b),
        RegistryError::WrongState,
        "other scope is not active",
    );
    assert_eq!(registry.check_permit(&first).unwrap(), observed);
    let other = registry.begin_scan(&b).unwrap();
    registry.finish(&first).unwrap();
    expect_error(
        registry.finish(&first),
        RegistryError::InvalidCapability,
        "finish replay",
    );
    expect_error(
        registry.check_permit(&first),
        RegistryError::InvalidCapability,
        "finished permit",
    );
    let second = registry.begin_scan(&a).unwrap();
    expect_error(
        registry.check_permit(&first),
        RegistryError::InvalidCapability,
        "old attempt check",
    );
    expect_error(
        registry.finish(&first),
        RegistryError::InvalidCapability,
        "old attempt finish",
    );
    registry.check_permit(&second).unwrap();
    registry.cancel(&a).unwrap();
    expect_error(
        registry.check_permit(&second),
        RegistryError::InvalidCapability,
        "cancel invalidates permit",
    );
    expect_error(
        registry.finish(&second),
        RegistryError::InvalidCapability,
        "cancel invalidates finish",
    );
    expect_error(
        registry.cancel(&a),
        RegistryError::WrongState,
        "cancel replay",
    );
    let third = registry.begin_scan(&a).unwrap();
    expect_error(
        registry.finish(&second),
        RegistryError::InvalidCapability,
        "cancelled old attempt cannot finish new one",
    );
    assert_eq!(registry.check_permit(&third).unwrap(), observed);
    registry.check_permit(&other).unwrap();
    registry.revoke(&a).unwrap();
    registry.check_permit(&other).unwrap();
    registry.finish(&other).unwrap();
    registry.revoke(&b).unwrap();
    assert!(registry.is_empty());
}

#[test]
fn registry_revocation_and_owner() {
    let f = Fixtures::load();
    let mut a = Registry::new(2).unwrap();
    let mut b = Registry::new(2).unwrap();
    let pa = prepared(&mut a, "same", &f.a);
    let pb = prepared(&mut b, "same", &f.a);
    expect_error(
        a.preview(&pb),
        RegistryError::InvalidCapability,
        "P_OWNER_BOUND: foreign pending",
    );
    expect_error(
        a.confirm(&pb),
        RegistryError::InvalidCapability,
        "foreign confirm",
    );
    expect_error(
        a.decline(&pb),
        RegistryError::InvalidCapability,
        "foreign decline",
    );
    assert_eq!(a.len(), 1);
    assert_eq!(b.len(), 1);
    let sa = a.confirm(&pa).unwrap();
    let sb = b.confirm(&pb).unwrap();
    expect_error(
        b.begin_scan(&sa),
        RegistryError::InvalidCapability,
        "P_OWNER_BOUND: same ID and root do not grant ownership",
    );
    let permit_a = a.begin_scan(&sa).unwrap();
    let permit_b = b.begin_scan(&sb).unwrap();
    expect_error(
        a.check_permit(&permit_b),
        RegistryError::InvalidCapability,
        "foreign permit check",
    );
    expect_error(
        a.finish(&permit_b),
        RegistryError::InvalidCapability,
        "foreign permit finish",
    );
    expect_error(
        a.cancel(&sb),
        RegistryError::InvalidCapability,
        "foreign cancel",
    );
    expect_error(
        a.revoke(&sb),
        RegistryError::InvalidCapability,
        "foreign revoke",
    );
    a.check_permit(&permit_a).unwrap();
    b.check_permit(&permit_b).unwrap();

    let second_scope = registered(&mut a, "other", &f.b);
    let second_permit = a.begin_scan(&second_scope).unwrap();
    a.revoke(&sa).unwrap();
    expect_error(
        a.check_permit(&permit_a),
        RegistryError::InvalidCapability,
        "P_REVOKED: revoke must remove active registration and attempt",
    );
    assert_eq!(a.len(), 1);
    expect_error(
        a.finish(&permit_a),
        RegistryError::InvalidCapability,
        "revoked finish",
    );
    expect_error(
        a.begin_scan(&sa),
        RegistryError::InvalidCapability,
        "revoked begin",
    );
    expect_error(
        a.cancel(&sa),
        RegistryError::InvalidCapability,
        "revoked cancel",
    );
    expect_error(
        a.revoke(&sa),
        RegistryError::InvalidCapability,
        "revoke replay",
    );
    expect_error(
        a.confirm(&pa),
        RegistryError::InvalidCapability,
        "revoked confirm",
    );
    expect_error(
        a.decline(&pa),
        RegistryError::InvalidCapability,
        "revoked decline",
    );
    a.check_permit(&second_permit).unwrap();
    b.check_permit(&permit_b).unwrap();

    let next_pending = prepared(&mut a, "same", &f.a);
    expect_error(
        a.preview(&pa),
        RegistryError::InvalidCapability,
        "old pending cannot revive with ID",
    );
    expect_error(
        a.confirm(&pa),
        RegistryError::InvalidCapability,
        "old confirmation cannot revive with ID",
    );
    expect_error(
        a.decline(&pa),
        RegistryError::InvalidCapability,
        "old decline cannot remove replacement",
    );
    let next_scope = a.confirm(&next_pending).unwrap();
    expect_error(
        a.begin_scan(&sa),
        RegistryError::InvalidCapability,
        "P_OWNER_BOUND: stale registration on same owner",
    );
    let next_permit = a.begin_scan(&next_scope).unwrap();
    expect_error(
        a.check_permit(&permit_a),
        RegistryError::InvalidCapability,
        "stale permit cannot revive with ID",
    );
    expect_error(
        a.finish(&permit_a),
        RegistryError::InvalidCapability,
        "stale finish cannot affect replacement",
    );
    expect_error(
        a.cancel(&sa),
        RegistryError::InvalidCapability,
        "stale cancel cannot affect replacement",
    );
    expect_error(
        a.revoke(&sa),
        RegistryError::InvalidCapability,
        "stale revoke cannot affect replacement",
    );
    a.check_permit(&next_permit).unwrap();
    a.check_permit(&second_permit).unwrap();
    b.check_permit(&permit_b).unwrap();
    a.revoke(&next_scope).unwrap();
    a.cancel(&second_scope).unwrap();
    a.revoke(&second_scope).unwrap();
    assert!(a.is_empty());
    b.cancel(&sb).unwrap();
    b.revoke(&sb).unwrap();

    // Retained capabilities keep their identities alive after the registry drops.
    let mut replacement = Registry::new(1).unwrap();
    let replacement_scope = registered(&mut replacement, "same", &f.a);
    drop(a);
    expect_error(
        replacement.begin_scan(&sa),
        RegistryError::InvalidCapability,
        "dropped owner",
    );
    expect_error(
        replacement.check_permit(&next_permit),
        RegistryError::InvalidCapability,
        "dropped owner's permit",
    );
    replacement.revoke(&replacement_scope).unwrap();
}

#[test]
fn registry_public_native_bridge() {
    let f = Fixtures::load();
    let scope_id = id("public-bridge");
    let direct = native::open_directory(&scope_id, &f.a).unwrap();
    let mut registry = Registry::new(2).unwrap();
    let pending = prepared(&mut registry, "public-bridge", &f.a);
    let preview = registry.preview(&pending).unwrap();
    assert_eq!(&preview, direct.observation());
    assert_eq!(preview, direct.refresh().unwrap());
    no_authority(&preview, &scope_id);
    expect_error(
        registry.prepare(&id("bad"), "relative"),
        RegistryError::Native(RootError::InvalidPath),
        "original N path error",
    );
    expect_error(
        registry.prepare(&id("link"), &f.reparse),
        RegistryError::Native(RootError::ReparsePoint),
        "original N reparse error",
    );
    assert_eq!(registry.len(), 1);
    let scope = registry.confirm(&pending).unwrap();
    let permit = registry.begin_scan(&scope).unwrap();
    let observed = registry.check_permit(&permit).unwrap();
    assert_eq!(observed, preview);
    no_authority(&observed, &scope_id);
    registry.finish(&permit).unwrap();
    let cancelled = registry.begin_scan(&scope).unwrap();
    registry.cancel(&scope).unwrap();
    expect_error(
        registry.check_permit(&cancelled),
        RegistryError::InvalidCapability,
        "public cancellation",
    );
    let revoked = registry.begin_scan(&scope).unwrap();
    registry.revoke(&scope).unwrap();
    expect_error(
        registry.check_permit(&revoked),
        RegistryError::InvalidCapability,
        "public revocation",
    );
    assert!(registry.is_empty());

    for error in [
        RegistryError::InvalidCapacity,
        RegistryError::RegistryFull,
        RegistryError::DuplicateScope,
        RegistryError::DuplicateRoot,
        RegistryError::InvalidCapability,
        RegistryError::WrongState,
        RegistryError::RootChanged,
    ] {
        assert_eq!(error.to_string(), format!("{error:?}"));
        assert_eq!(error.clone(), error);
        let _: &dyn std::error::Error = &error;
    }
    for error in [
        RootError::InvalidPath,
        RootError::UnsupportedPlatform,
        RootError::UnsupportedVolume,
        RootError::ReparsePoint,
        RootError::NotDirectory,
        RootError::MetadataUnavailable,
        RootError::OpenFailed,
        RootError::IdentityUnavailable,
        RootError::SerializationFailed,
    ] {
        let wrapped = RegistryError::Native(error.clone());
        assert_eq!(wrapped.to_string(), error.to_string());
        assert_eq!(wrapped.clone(), RegistryError::Native(error));
    }
}
