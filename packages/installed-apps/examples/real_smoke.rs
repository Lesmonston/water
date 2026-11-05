#![forbid(unsafe_code)]
use water_installed_apps::read_installed;
fn main() {
    let list = read_installed(std::time::SystemTime::now()).expect("registry collection supported");
    let count = |scope| list.apps.iter().filter(|a| a.scope == scope).count();
    println!(
        "{}",
        serde_json::json!({
            "machine": count("machine"), "machine_32": count("machine_32"), "user": count("user"),
            "truncated": list.truncated, "unreadable_keys": list.unreadable_keys
        })
    );
}
