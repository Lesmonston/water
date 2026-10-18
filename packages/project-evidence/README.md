# Project evidence v1

`water-project-evidence` is an independent Rust workspace. It derives filename
observations from in-memory scan facts after the real `water-scan-report`
assembler has strictly validated the original JSON text and report context.

```rust,ignore
use water_project_evidence::v1::{analyze_json, to_json};

let evidence = analyze_json(raw_facts, &report_context)?;
let encoded = to_json(&evidence)?;
```

The four exact, case-sensitive basenames are `package.json`,
`package-lock.json`, `pyproject.toml`, and `requirements.txt`. Only ordinary file
entries produce candidates. Matching directories, links, and other entries are
counted as exclusions. Candidate order and finding IDs follow every source
entry, including non-candidates, across scopes. Parents retain the original
relative path spelling; a root marker has an empty parent string.

Every candidate remains `filename_only`, `display_only`, and `protected`.
Format, tool version, and project membership are unverified. Partial and
cancelled observations retain their source coverage. A filename does not prove
that a project exists, that a tool is installed, or that anything is removable.

The output includes the complete validated source facts and unchanged source
totals. It does not change existing reports, classification, risks, or capacity
estimates. The full sidecar contains relative identifiers and is not an
anonymized export; serialization does not authorize uploading it.

`ProjectEvidence` and its nested structures are immutable through the public
API and implement `Debug`, `Clone`, `PartialEq`, and `Serialize`. Construction
requires `analyze_json`; there is no `Default`, `Deserialize`, arbitrary-value
constructor, or mutable getter. `AnalysisError::Source` retains G's complete
error and identical display text. Other errors display exactly
`OutputTooLarge at /analysis` or `SerializationFailed at /analysis`.
Both public functions enforce the complete UTF-8 output limit of 33,554,432
bytes; oversized output is rejected without truncation. G enforces its own
8 MiB input and report limits first.

The production code performs no filesystem, environment, network, clock,
process, logging, CLI, IPC, or cache operations. Derivation after G validation
visits entries once and examines their path bytes; it does not compare every
pair of paths. This package does not expand default tool paths or grant access
to any directory.

Verification uses only frozen synthetic JSON, the five named tests in
`tests/evidence_v1.rs`, and `scripts/evidence-batch-check.mjs --task WATER-W1-L`.
The dedicated helper provides offline dependencies, jobs=1, bounded commands,
full red/restoration evidence, and the final real G/public API bridge. Windows
execution and synthetic `macos` context values do not verify macOS filesystem
behavior, real user scopes, UI integration, or deletion.
