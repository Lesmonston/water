#![forbid(unsafe_code)]

use water_junk_clean::list_quarantines;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let system = std::env::var("SystemDrive")?;
    let manifest = env!("CARGO_MANIFEST_DIR");
    let repository = manifest.get(..2).ok_or("invalid manifest drive")?;
    let mut drives = vec![system.to_ascii_uppercase(), repository.to_ascii_uppercase()];
    for drive in &drives {
        if drive.len() != 2
            || !drive.as_bytes()[0].is_ascii_alphabetic()
            || drive.as_bytes()[1] != b':'
        {
            return Err("invalid drive".into());
        }
    }
    drives.sort();
    drives.dedup();
    let (mut absent, mut present, mut unavailable, mut quarantines) = (0u64, 0u64, 0u64, 0u64);
    for drive in &drives {
        let list = list_quarantines(&format!("{drive}\\.water-quarantine"))?;
        match list.state.as_str() {
            "absent" => absent += 1,
            "present" => present += 1,
            "unavailable" => unavailable += 1,
            _ => return Err("invalid quarantine state".into()),
        }
        quarantines += list.quarantines.len() as u64;
    }
    println!(
        "{}",
        serde_json::json!({"checked":drives.len(), "absent":absent, "present":present, "unavailable":unavailable, "quarantines":quarantines})
    );
    Ok(())
}
