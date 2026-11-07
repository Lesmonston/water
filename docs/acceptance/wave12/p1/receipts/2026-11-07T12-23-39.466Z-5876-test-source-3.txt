#![forbid(unsafe_code)]

use std::{os::windows::process::CommandExt, process::Command};
use water_junk_clean::list_quarantines;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Discover drive metadata only, without new native functions in the executor.
    // The subprocess output stays private; the smoke result uses anonymous indices.
    let system_root = std::env::var_os("SystemRoot").unwrap_or_else(|| "C:\\Windows".into());
    let powershell = format!(
        "{}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
        system_root.to_string_lossy().trim_end_matches(['\\', '/'])
    );
    let output = Command::new(powershell)
        .args([
            "-NoProfile", "-NonInteractive", "-Command",
            "$ErrorActionPreference='Stop'; [System.IO.DriveInfo]::GetDrives() | Where-Object { $_.DriveType -eq [System.IO.DriveType]::Fixed } | ForEach-Object { $_.Name }",
        ])
        .creation_flags(0x0800_0000) // CREATE_NO_WINDOW
        .output()?;
    if !output.status.success() {
        return Err("fixed-drive metadata query failed".into());
    }
    let mut drives = Vec::new();
    for drive in std::str::from_utf8(&output.stdout)?.lines() {
        let drive = drive.trim();
        if drive.len() != 3
            || !drive.as_bytes()[0].is_ascii_alphabetic()
            || drive.as_bytes()[1] != b':'
            || drive.as_bytes()[2] != b'\\'
        {
            return Err("invalid drive".into());
        }
        drives.push(drive.to_ascii_uppercase());
    }
    drives.sort();
    drives.dedup();
    if drives.is_empty() {
        return Err("no fixed drives discovered".into());
    }
    let mut roots = Vec::new();
    for name in [".flick-quarantine", ".water-quarantine"] {
        let (mut absent, mut present, mut unavailable, mut quarantines) = (0u64, 0u64, 0u64, 0u64);
        let mut volumes = Vec::new();
        for (index, drive) in drives.iter().enumerate() {
            let list = list_quarantines(&format!("{drive}{name}"))?;
            match list.state.as_str() {
                "absent" => absent += 1,
                "present" => present += 1,
                "unavailable" => unavailable += 1,
                _ => return Err("invalid quarantine state".into()),
            }
            quarantines += list.quarantines.len() as u64;
            volumes.push(serde_json::json!({"volume_index":index + 1, "state":list.state, "quarantines":list.quarantines.len()}));
        }
        roots.push(serde_json::json!({"name":name, "absent":absent, "present":present, "unavailable":unavailable, "quarantines":quarantines, "volumes":volumes}));
    }
    println!(
        "{}",
        serde_json::json!({"fixed_drives":drives.len(), "checked":drives.len() * roots.len(), "roots":roots})
    );
    Ok(())
}
