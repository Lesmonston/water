use water_service::*;

#[test]
fn service_ipc_contract() {
    assert!(
        !token_reusable(true),
        "SERVICE_TOKEN_ONCE: a used token must not be reusable"
    );
}

#[test]
fn service_scan_views() {
    assert_eq!(rule_count(), 60);
}

#[test]
fn service_clean_flow() {
    assert!(plan_rejected("{}"));
}

#[test]
fn service_trends_locations() {
    assert_eq!(key("claude"), "claude");
}

#[test]
fn service_storage_safety() {
    assert!(drive_mask() != 0 && !DEFAULT_ORPHAN_PATTERNS.is_empty());
}
