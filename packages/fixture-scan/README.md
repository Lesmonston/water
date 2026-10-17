# Controlled fixture scan

`water-scan` 0.1.0 implements the frozen `water.scan-lab.v1` protocol in an independent Rust 1.95 workspace. It uses the accepted local `water-contracts` types and the existing locked serde dependencies.

```rust,ignore
use water_scan::fixture_v1::{open_fixture_run, scan_fixture, ScanOptions, CancelToken};
let run = open_fixture_run("run-<id-from-the-frozen-preparer>")?;
let facts = scan_fixture(&run, &ScanOptions::new(16, 128, 1024)?, &CancelToken::new())?;
```

Only runs created by the frozen fixture preparer under this compiled worktree's `.local/fixture-lab/` are supported. The library has no arbitrary-root parameter, environment root override, CLI, write operation, or cleanup operation. The marker is validated directly from bounded original JSON, including duplicate/unknown fields and required nullable fields. Absolute marker paths are descriptive data; scope paths come from the embedded frozen definitions. Nodes and scanner plans never generate filesystem facts or automatic fault/cancellation behavior.

The public default entry assembles `NativeIo` and `NoopObserver`. All traversal uses private path tokens, no-follow metadata, and bounded directory batches. The native adapter independently rechecks ancestors before listing directories. Names are sorted by encoded bytes, unrepresentable names never receive IO tokens, and global budgets include failed inspections. Cancellation clones share one monotonic atomic state and take priority over the next operation's limits. Successfully completed scopes retain their coverage.

Facts keep overlapping scopes and hardlink paths separate. Only ordinary files have logical lengths; allocated space and reclaimable totals are not inferred. Windows identity is always unknown. macOS has a source implementation using dev/ino/nlink, but has not been built or run in this Windows delivery. This stationary synthetic laboratory does not establish production race safety or authorization for real user directories.

The only production content read is the marker, limited to 65536 bytes with a 65537-byte read cap. No ordinary file payload is opened. Tests use the helper's existing index and read-only NativeIo wrappers; only the frozen preparer can create physical fixtures. Injected permission, batch and root-change faults demonstrate propagation, not real ACL failures or race resistance. Snapshot equality establishes unchanged content, separately from the IO traces and source audit establishing the content-read boundary.

Run the task's focused `scripts/scan-lab-check.mjs --task WATER-W1-F --mode <mode>` from the assigned worktree. The exact six tests and final fmt/test/clippy/metadata/bridge gates are defined by the authoritative ticket and SPEC. Evidence and limitations are in `docs/dispatch/reports/WATER-W1-F-REPORT.md` in this worktree; submission is subject to controller acceptance.
