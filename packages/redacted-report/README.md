# water-redacted-report

Pure in-memory structural redaction of an A `water.scan.v1` report. The public
entry points are `water_redacted_report::v1::{redact_json, redact_report, to_json}`;
the frozen specification is
[Redacted Report v1](../../contracts/redacted-report-v1/SPEC.md).

The JSON entry validates the original raw text through A. The DTO entry validates
the complete source, including fields that will be removed, and calls the actual
H `summarize_report`. It constructs private, typed output with nine top-level
fields. Scope and finding aliases use local input order; finding and issue scope
associations follow the validated source IDs. Evidence retains code/source,
references retain state/project count, and sizes retain A's exact decimal strings
and nulls. H totals remain source totals, independent of finding sums.

Source identifiers, paths, labels, tool text, rule versions, evidence summaries,
and issue messages are absent. No hash or reverse dictionary is retained. Aliases
are local and can coincide with source strings. Exact counts, sizes, order and
associations still permit correlation; `anonymity_guaranteed` is always false.
This output makes no anonymity or safe-publication promise.

Both redact entries check the same inclusive 16,777,216-byte UTF-8 output limit
as `to_json`. Errors preserve A's code/field, or expose only the fixed export
error message. Output has private fields, no deserialization/default constructor,
and no mutable access. It supports Debug, Clone, PartialEq and Serialize.

This package owns an independent workspace and lockfile, with only the four
specified direct dependencies. Production performs no filesystem, environment,
network, scanning, UI, IPC, upload or export-file operations. It has no P or L/M
integration. The only test target is `redaction_v1`; use the assigned Q helper
from the worktree root. Windows checks and evidence are recorded in the Q task
report. macOS execution and desktop file export require separate acceptance.
