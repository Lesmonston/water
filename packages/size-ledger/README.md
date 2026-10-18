# Size ledger v1

`water-size-ledger` is an independent Rust workspace for pure, in-memory analysis
of a single metadata observation set. Its public API is
`v1::analyze_json(&str, &water_scan_report::v1::ReportContext)` and
`v1::to_json(&SizeLedger)`. The output and its nested fields are private and
serialize to the frozen `water.size-ledger.v1` wire shape.

The original JSON first passes through real G `assemble_json`, including its
strict duplicate-key validation and A report validation. Source errors retain
their original code, field and Display text inside `AnalysisError::Source`.
Complete validated facts and source totals are cloned into the sidecar. The
sidecar contains relative identifiers and is not a redacted export.

Only recorded files contribute logical lengths. Sums use checked `u128`
arithmetic and serialize as decimal strings, including sums above `u64::MAX`.
Known Unix identities group by `(device, inode)` within this call. Groups and
their references preserve first observation order; distinct length and link
count values sort numerically. Conflicting groups expose no representative
length or exact deduplicated sum. Unknown identities remain separate entries.

`observed_set_identity_complete` describes the recorded files only.
`scope_coverage_complete` separately describes the source completion status.
An empty observation set can be identity complete even when a scan was
cancelled. File identity deduplication does not establish allocated volume
space or possible deletion savings; those two output fields stay null.

There is no filesystem access, content reading, identity collection, environment
access, network, clock, process, cache, CLI or mutation of previous reports.
Windows observations retain Unknown identities. Synthetic Unix fields test the
algorithm; macOS collection and filesystem behavior remain unverified.

The test target is `tests/ledger_v1.rs`, with exactly five top-level tests.
It checks all 15 frozen complete goldens, all 11 source errors, public wire
serialization, precision, conflicts, coverage, input/context preservation and
independent repeated calls. Run only the assigned task helper from this tree:

```powershell
node scripts/evidence-batch-check.mjs --task WATER-W1-M --mode suite
```

The immutable output is checked for serializability and a 32 MiB UTF-8 limit
before return and again by `to_json`. The bounded fixtures do not exercise an
output above that limit or a serialization failure. Those branches require
source review; no public constructor exists to forge an output for tests.
