use water_desktop::*;

#[test]
fn host_config_boundary() {
    assert!(
        config_ok(include_str!("../tauri.conf.json")),
        "HOST_CONFIG: global Tauri must stay enabled"
    );
}

#[test]
fn host_navigation_boundary() {
    assert!(
        nav_ok("http://tauri.localhost/") && !nav_ok("https://example.com/"),
        "HOST_NAVIGATION: only bundled pages"
    );
}

#[test]
fn host_command_registry() {
    assert!(!nav_ok("http://tauri.localhost/other.html"));
    use water_native_picker::v1::PickerError;
    use water_scope_registry::v1::RegistryError;
    assert_eq!(pick_folder("relative"), Err("invalid"), "HOST_COMMANDS: picker path");
    assert_eq!(picker_failure(&PickerError::Source(RegistryError::RegistryFull)), "invalid");
    assert_eq!(picker_failure(&PickerError::ApartmentUnavailable), "unavailable");
}

#[test]
fn host_data_directory() {
    assert!(nav_ok("tauri://localhost/index.html"));
}
