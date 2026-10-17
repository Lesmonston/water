# Controlled lab session

`water-lab-session` composes the existing F scanner, G report assembler, A
contract round trip, E view projection and H summary in one trusted Rust call.
The public API is in `water_lab_session::v1`; its frozen specification is
[Lab Session v1](../../contracts/lab-session-v1/SPEC.md).

`inspect_fixture(run_id, scan_id, options, cancel)` uses `NativeIo` and
`NoopObserver`. `inspect_fixture_with_io` accepts a trusted backend adapter and
observer, forwarding the caller's options and shared cancellation token to F.
The `run_id` selects only a frozen synthetic run under this checkout's
`.local/fixture-lab`; `scan_id` is a report declaration, not a filesystem grant.

The returned `SessionSnapshot` has private fields and read-only getters for
complete source facts, validated report, view and summary. Its six-field wire
format uses `water.lab-session.v1` and `controlled_fixture_metadata`. `to_json`
and the inspection entry points enforce a 16 MiB UTF-8 snapshot limit without
truncation. F's partial and cancelled facts remain successful snapshots.

Every stage has a fixed error code and field; errors do not include the input,
physical paths or underlying error text. Scope labels are `Synthetic ` followed
by their IDs. Their `UserSelected` origin is only the synthetic experiment's
declaration. All findings remain unknown and protected; sizes, identities,
coverage and issue provenance retain their upstream meanings. Totals remain
unknown. The snapshot contains relative identifiers and is not a redacted
export. Only its `summary` member uses H's restricted field set; that member
does not promise anonymity either.

The crate itself performs no file, environment, network, clock or process IO.
Filesystem access is delegated to F's existing controlled entry points, with
ordinary payloads unopened. Pre-cancellation prevents scanning IO after F's
marker/root checks. It does not imply that opening the run performs zero IO.
The package supplies no arbitrary-root interface, classification, deduplicated
capacity, cleanup, UI, IPC or export-file writer.

This package is an independent workspace with seven explicit dependencies and
one integration-test target. Tests read only the helper's verified index and
frozen synthetic runs. Run the ticket's focused gates from the J checkout:

```powershell
node scripts/session-batch-check.mjs --task WATER-W1-J --mode suite
node scripts/session-batch-check.mjs --task WATER-W1-J --mode bridge
```

The five tests cover native composition, shared cancellation and progress,
bounded/error behavior, identity and protection, and the snapshot wire format.
The controller bridge independently compares 13 real J results with the
existing F/G/A/E/H pipeline. This ticket's runtime evidence covers Windows;
macOS, real user scopes, production races and the J-to-K page connection need
separate acceptance. The current fixtures do not exercise an oversized
snapshot, serialization failure or the downstream stages' unreachable error
branches; their mappings and bounds are checked in source review.
