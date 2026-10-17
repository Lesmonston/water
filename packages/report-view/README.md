# water-report-view

In-memory projection from a validated `water.scan.v1` report to
`water.report-view.v1`. The public API is `water_report_view::v1` and follows
[`contracts/report-view-v1/SPEC.md`](../../contracts/report-view-v1/SPEC.md).

`project_json` calls `water_contracts::v1::parse_report` on the original text.
`project_report` calls `water_contracts::v1::validate_report` before copying
fields. Source status, evidence, protection, and totals stay as given. Byte
counts stay decimal strings. This crate does not scan, classify, export, or
authorize cleanup.

The package is its own Cargo workspace and is not a member of the root
workspace. Run the assigned controller helper from the worktree root. The
`view_v1` target has exactly five tests and reads only frozen synthetic
fixtures.

The implementation is tested on Windows. macOS execution is unverified.
