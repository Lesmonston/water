#![forbid(unsafe_code)]
use serde_json::json;
use water_cleanup_manifest::{FILE_NAME, read_git_link, read_manifest};
fn main() {
    let repo = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .ancestors()
        .nth(4)
        .expect("repository");
    let mut counts = [0u64; 3];
    for entry in std::fs::read_dir(repo.join(".worktrees"))
        .expect("worktrees")
        .flatten()
    {
        if entry
            .file_type()
            .is_ok_and(|t| t.is_dir() && !t.is_symlink())
        {
            let link = read_git_link(&entry.path().to_string_lossy());
            counts[match link.state.as_str() {
                "valid" => 0,
                "detached" => 1,
                _ => 2,
            }] += 1;
        }
    }
    let path = repo.join(FILE_NAME);
    let manifest = if std::fs::symlink_metadata(&path).is_ok() {
        let loaded = read_manifest(&path.to_string_lossy());
        json!({"present":true,"valid":loaded.manifest.is_some(),
            "entries":loaded.manifest.as_ref().map_or(0,|m|m.disposable.len()),
            "hash_prefix":loaded.hash.as_ref().map(|h|&h[..8])})
    } else {
        json!({"present":false})
    };
    println!(
        "{}",
        json!({"valid":counts[0],"detached":counts[1],"invalid":counts[2],"manifest":manifest})
    );
}
