# water-junk-clean

Windows cleanup executor for the frozen checkup-v1 MODEL/CLEAN contracts. The independent
workspace uses Rust 1.95, serde/serde_json only, and has no binary, examples, process launches,
network access, environment lookup, or GUI. All filesystem operations and the five permitted
Win32 APIs are confined to `src/native_windows.rs`.

`CleanPlan::from_json` rejects invalid plans before filesystem access. Public Rust plan fields
support backend integration; `execute` validates their shape again and independently enforces
containment, hard guards and protected overlaps, including protection added after parsing.
Pass a trusted backend plan, `ItemGuard`, a journal writer, `StopFlag`, `CleanObserver`, and
the evaluation time to `execute`. The host owns user consent and must never expose this API
as an arbitrary-path WebView command. `identity_of`, `volume_free_bytes` and `report_to_json`
provide the other frozen entry points.

Each item gets an intent/result JSONL pair (including skips). `write_all` plus `flush` must
succeed before any deletion; errors abort execution immediately. A result-journal failure can
occur after deletion and returns `CleanError::Journal`, so the caller must preserve the prior
intent. The host's `Write::flush` implementation determines crash durability; an ordinary
`File::flush` alone does not promise power-loss durability. The disk-journal test also syncs
and rereads its synthetic journal. Observer callbacks run only after result flush.

Metadata traversal never reads file contents. Identity is volume serial plus FileIdInfo's
128-bit ID from a no-follow attribute handle. Every path level is checked, including ancestors
of root; root/item reparse points are rejected. Nested reparse points are unlinked without
enumerating their targets. Regular readonly files get one permission-clearing retry. Removal
is iterative postorder with cancellation checks between entries. A failure leaves remaining
objects in place and contributes to failed_entries. Incomplete residual observations report
zero freed bytes conservatively. Freed bytes are logical file lengths, not unique physical
allocation or the measured change in disk free space.

The implementation repeats checks after guard callbacks and intent flush, and checks the
root/item chain between deletions. Path-based standard-library removals do **not** provide an
atomic guarantee against hostile concurrent ancestor/child replacement. Production races,
real user data, UI consent wiring and macOS are not verified by this ticket. Non-Windows
native APIs return Unsupported; there is no real-data test mode.

The five tests in `tests/clean_v1.rs` exclusively create random `fixture-*` directories under
this worktree's `.local/w2-d-fixtures/`. Cleanup verifies the exact absolute parent/name and
does not follow links; it removes only that test's newly-created directory. Junction targets,
locked files, journals and replacements are all synthetic children of that same directory.
The frozen controller entry point runs offline, jobs=1 and a private Cargo/target/temp setup:

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W2-D --mode check
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W2-D --mode test
```

Use the ticket's three negative-control and final/archive steps before submitting. These are
implementation proofs only; independent controller review is still required for VERIFIED.
