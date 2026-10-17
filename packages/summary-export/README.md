# water-summary-export

In-memory whitelist summary of a validated `water.scan.v1` report. The public
API is `water_summary_export::v1` and follows
[`contracts/summary-export-v1/SPEC.md`](../../contracts/summary-export-v1/SPEC.md).

`summarize_json` passes the original text to `water_contracts::v1::parse_report`.
`summarize_report` calls `water_contracts::v1::validate_report` before counting.
Dropped identifiers and free text are still validated. Counts are array lengths
and per-finding risk and category buckets. `totals` is copied from the source
report and is not a sum of finding sizes.

Removing direct identifiers and free text does not make the summary unlinkable.
Exact byte totals and the distribution of counts can still correlate a report.
This crate does not call the result anonymous or safe to publish. It does not
write a file, scan a disk, upload anything, or draw a UI.

The package is its own Cargo workspace and is not a member of the root
workspace. Run the assigned controller helper from the worktree root. The
`export_v1` target has exactly five tests and reads only frozen synthetic
fixtures.

The implementation is tested on Windows. macOS execution is unverified.
