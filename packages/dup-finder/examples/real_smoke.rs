#![forbid(unsafe_code)]
use water_dup_finder::*;
struct Quiet;
impl DupObserver for Quiet {
    fn on_progress(&self, _: &DupProgress) {}
}
fn main() {
    let repo = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .ancestors()
        .find(|ancestor| {
            ancestor.join("docs").is_dir()
                && ancestor
                    .join(".git")
                    .metadata()
                    .is_ok_and(|m| m.is_file() || m.is_dir())
        })
        .expect("repository");
    let options = DupOptions {
        roots: vec![repo.join("docs").to_string_lossy().into_owned()],
        ..DupOptions::default()
    };
    let r = find_duplicates(
        "w10-m8-real",
        &options,
        &CancelFlag::default(),
        &Quiet,
        std::time::SystemTime::now(),
    )
    .expect("Windows discovery");
    let bytes: u128 = r
        .groups
        .iter()
        .map(|g| g.reclaimable_bytes.parse::<u128>().expect("decimal bytes"))
        .sum();
    println!(
        "{}",
        serde_json::json!({"files_listed":r.files_listed,"candidate_files":r.candidate_files,"groups":r.groups.len(),"reclaimable_bytes":bytes.to_string()})
    );
}
