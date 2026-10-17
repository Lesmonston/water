# water-contracts

Frozen `water.scan.v1` DTOs, lossless decimal byte strings, JSON serialization
and validation. The public API is in `water_contracts::v1` and follows
[`contracts/v1/SEMANTICS.md`](../../contracts/v1/SEMANTICS.md).

Use `parse_report` for JSON input, `validate_report` for constructed DTOs, and
`to_json` for validated compact JSON. Direct Serde deserialization checks the
wire types and required fields; it does not perform cross-report validation.
Both JSON entry points enforce an 8 MiB limit. Errors contain codes and field
locations without echoing input values.

All operations use memory only. Relative paths and opaque IDs are data, not
filesystem access or cleanup authorization. This crate contains no scanner,
filesystem traversal, process execution, network access or deletion interface.
Protected ancestor validation indexes protected paths per scope and uses binary
search instead of comparing every pair of findings.

Run the assigned controller helper from the worktree root, using the commands
in WATER-W1-A. The `contract_v1` integration target has exactly five tests and
consumes the frozen synthetic fixtures; it never reads user directories.

The implementation is tested on Windows. macOS execution is unverified.
