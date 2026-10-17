# water-scan-report

In-memory assembly of frozen `water.scan-lab.v1` facts into a
`water.scan-report.v1` bundle. The public API is `water_scan_report::v1`
and follows [`contracts/scan-report-v1/SPEC.md`](../../contracts/scan-report-v1/SPEC.md).

`assemble_json` reads the original JSON text. It does not open paths, query
the environment, or call the scan crate. Every finding stays `unknown` and
`protected`. Totals stay unavailable. `source_facts` keeps the validated fact
values, including kind, depth, identity, and issue origin. The caller-supplied
context is a report declaration, not permission to touch a filesystem.

The package is its own Cargo workspace and is not a member of the root
workspace. Run the assigned controller helper from the worktree root. The
`report_v1` target has exactly five tests and reads only frozen synthetic
fixtures.

The implementation is tested on Windows. macOS execution is unverified.
Synthetic macOS fields are protocol values, not measured macOS I/O.
