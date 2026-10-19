# Native session v1

Trusted Rust API and a one-shot Windows development CLI connecting actual S
selection, P registration, R bounded metadata scanning, and E/H/Q projections.
The API accepts the frozen A/P/S/R types and returns a private serializable
`SessionCapture`; it has no arbitrary-path scan or caller-supplied wire input.

`capture_session` uses `NoopObserver`. `capture_session_with_observer` forwards
the actual R observer. Both open S first, including when R's token is already
cancelled. Only `SelectedScope.root_path()` supplies R's root. A private guard
revokes this call's registration after success, error, or observer unwind; R
manages its own attempt. Existing host registrations remain usable.

Picker cancellation produces `selection=cancelled` and no snapshots. A confirmed
selection produces one real R report, including a pre-cancelled scan. The wire
retains `native_scope_metadata`, actual option limits, real E/H/Q values, unknown
totals and protection reasons. Q's compact string is preserved exactly. The
envelope excludes native identities, capabilities, absolute roots and the full R
sidecar. Private immutable wire fields prevent callers constructing a capture.
The same `to_json` serializer enforces the inclusive 64 MiB envelope and 16 MiB Q
string bounds before return and at the public serialization boundary.

The sole CLI argument is the trusted local initial directory for S. Fixed scope
and session IDs are `native-scope-cli` / `native-session-cli`; capacity is 4 and
scan budgets are 8 / 10000 / 256. Success writes one compact UTF-8 object and LF,
with empty stderr. Missing/extra arguments exit 64; other failures exit 2 with
only the fixed error Display and LF. Output I/O errors do not unwrap or panic.
There is no budget flag, file-output option, environment fallback or test mode.

Validation uses the ticket's `scripts/native-host-check.mjs --task WATER-W1-V`
gates, Rust 1.95/MSVC, a private offline cache and target, jobs=1. The five tests
exercise real picker windows under the frozen driver, real independent P/R/E/H/Q
comparisons, cancellation/unwind, registry errors, strict wire, compiler privacy
rejections with a positive control, and actual CLI argument errors. The bridge
checks the actual CLI's confirmed/cancelled output. Only the factory index and
metadata of the frozen 60 literal / 74 logical byte fixtures are used by Rust;
ordinary payloads are not read and nothing is cleaned.

This is Windows controlled validation. Real user scopes, hostile races, natural
gesture authentication, macOS, desktop packaging and the V-to-W launcher chain
require controller acceptance. Completed means coverage within the declared
policy, not complete disk coverage. Output retains correlatable structure and
does not claim anonymity or authorize deletion.
