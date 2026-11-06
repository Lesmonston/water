# water-junk-clean

Windows handle-based cleanup and quarantine executor. This independent Rust 1.95 workspace
uses only serde/serde_json. Production src has no GUI, network, process launch, environment
lookup or file-content read. Unsafe filesystem code is confined to src/native_windows.rs.

execute revalidates a trusted backend CleanPlan, deletes selected entries and writes an
intent/result journal. PlanItem.unlocked_paths permits at most four explicitly protected
ancestors for that item only. Other protection spellings, internal identities and hard guards
remain effective. Protection identities are captured once per run, so retargeting an alias
cannot erase an existing protection. The host owns user consent; arbitrary WebView paths
must never reach this API.

quarantine performs same-volume handle-relative rename into
.water-quarantine/<id>/<original path without drive>. It never copies across volumes or
replaces an existing destination. Moves do not free space. This crate writes only the caller's
journal; the service retains quarantine records. restore checks identity, rebuilds missing
plain parents, refuses reparse parents and existing destinations, and supports a same-volume
alternate path beside the original. Only empty quarantine skeleton directories are removed.

purge uses iterative postorder traversal. Relative opens support DOS device names, trailing
dots/spaces and long paths. Name-surrogate links are unlinked without entering their targets;
other reparse points remain protected. Locked/inaccessible entries are reported individually,
including an occupied quarantine directory itself. Stop is checked between entries and before
removing the empty quarantine root. Remaining totals are complete; sorted root-cause leftovers
are capped at 200. Progress runs after handles close, every 256 removals and at completion.

list_quarantines observes direct valid ID directories and reports absent/present/unavailable.
inspect reads metadata without following links and flags odd names, long paths, read-only
attributes, non-name-surrogate reparse points and inaccessible entries. Its hints are capped
at 200 independently of full counts. Five JSON helpers serialize these reports. Filesystem
entry points return Unsupported outside Windows; macOS has not been validated.

The ten native functions are CreateFileW, GetFileInformationByHandleEx,
SetFileInformationByHandle, GetVolumeInformationByHandleW, GetDiskFreeSpaceExW, CloseHandle,
NtOpenFile, NtCreateFile, NtSetInformationFile and RtlNtStatusToDosError. NtCreateFile is used
only by create_dir_at, with FILE_CREATE and directory/no-follow options. NtSetInformationFile
is used only by rename_at, class 10, with a parent handle, one name segment and replacement
disabled. SetFileInformationByHandle uses only deletion classes 4 and 21. No path rename exists.

Quarantine IDs also reject DOS device names (case-insensitive) before directory creation.
Failed or skipped moves remove only empty directories created by that move, after checking
their identities; existing skeletons remain. Purge can empty an occupied child directory
through a non-DELETE handle and retain only that directory as in_use. Exclusive/DELETE-handle
occupation of a batch is reported as a root in_use leftover. Final residual inspection retains
the verified original directory handle so replacing its public name cannot discard a partial
report or redirect the residual walk. Inaccessible subtrees remain reported as root causes.

Freed bytes count successful ordinary-file deletions using size and link count read from the
same handle immediately before deletion. Data retained through another hard link is excluded.
This is distinct from allocation and the volume-free-space delta. Journal writes and flushes
must succeed before mutation; the caller's flush implementation determines crash durability.
A failure after mutation can still require reconciliation using the durable journal.

All 11 tests are in tests/clean_v1.rs; the original six assertions remain intact. Deletion tests
create private random fixtures under this worktree's .local, validate the ownership boundary,
and remove only their own new directory. The contract has one narrow cross-volume TEMP
exception; same-volume TEMP is reported as not applicable. The real_smoke example only observes
the system drive and repository drive, deduplicates them, and prints aggregate states/counts
without drive letters, paths or names. It never moves, restores or deletes real data.

Use the controller-owned WATER-W10-M10 gate for lock/check/test/real, negative controls,
final checks and archival before submission. Independent controller review is still required.
