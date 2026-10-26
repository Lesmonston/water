# water-process-scan

Read-only Windows process snapshot for Water checkup v1. The crate lists
running processes, decides whether a junk item is in use, and finds orphan
agent helper processes after their parent has exited.

Command lines stay in memory on `ProcessSnapshot` and are dropped with it.
They are never written to JSON, `Debug` output, logs, or evidence. The
crate does not terminate, suspend, or inject into any process.

Public entry points are `snapshot`, `ProcessSnapshot::{summary, running,
references_path}`, `summary_to_json`, `in_use`, `orphans`, and
`DEFAULT_ORPHAN_PATTERNS`. FFI lives only in `src/native_windows.rs`.

An unknown process creation time is `created_at: null` (never 1601). A
child counts as a descendant only when it was not created before its parent;
when either time is unknown, PID reuse is treated as not proven. The same rule
backs `orphans` and `ProcessSummary::descendant_pids`.

Windows x64 only for a live snapshot; other targets return `ProcError::Unsupported`.
macOS is unverified.

The assigned test target is `tests/process_v1.rs` (`process_v1`). Run the
wave-2 helper from the worktree root:

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W2-C --mode test
```
