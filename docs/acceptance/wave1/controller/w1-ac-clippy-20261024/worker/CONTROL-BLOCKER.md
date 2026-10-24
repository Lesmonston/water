# Final check blocker: Cargo external-subcommand configuration forwarding

Status: observed final check failure; proposed controller correction below is **not applied or executed**.
Product/source SHA remains eb7f80178191e233068015bbc26dc9798ac8cb22.

Observed at 2026-10-24T03:46:28.381Z-29680-check:

- The gate's freeze/scope/proof audits and offline Windows metadata passed. It recognized both exact-byte negative-control restores. Before/after Git status was clean at the same SHA.
- `cargo fmt ... -- --check` returned 0.
- The actual logged command was `cargo <eight mirror config arguments> clippy --offline --locked --manifest-path apps/desktop-preview/Cargo.toml --all-targets -- -D warnings`. It exited 101 before linting, reporting no matching `version_check` in the crates.io index, required by locked cookie 0.18.2.
- The private mirror index entry, version_check 0.9.5 source manifest and 15554-byte crate package all exist. The package SHA is 0b928f33d975fc6ad9f86c8f283853ad26bdd5b10b7f1542aa2fa15e2289105a and matches the existing Cargo.lock. The legacy official cache has no version_check index entry. No bytes were copied between caches.
- The same lock/mirror cache passed the full three-test build and both restored greens. This failure is not missing mirror download evidence and is not a product behavior-red or negative control.

Primary-source inspection (read 2026-10-24):

1. [Cargo at rust-1.95.0, cli.rs](https://raw.githubusercontent.com/rust-lang/cargo/rust-1.95.0/src/bin/cargo/cli.rs), external execution branch lines 491–499: it forwards the subcommand's arguments to an external command; options consumed before the subcommand are separate. No upstream code was run or copied into the product.
2. [Clippy at Rust 1.95.0, main.rs](https://raw.githubusercontent.com/rust-lang/rust/1.95.0/src/tools/clippy/src/main.rs), lines 47–48, 58–80, 104–117: it consumes the arguments it receives and starts Cargo check using those arguments. Parent-only Cargo configuration is not reconstructed there.

Inference from these sources plus the exact logged failure/cache state: prepending the per-command source replacement before `clippy` configures the outer Cargo invocation but does not forward it to Clippy's inner Cargo check. The inner offline command consequently selects the unprepared canonical cache. No process trace of the failed inner command was captured, so this is identified as a source-supported root-cause inference, not an independently rerun fix verification.

Minimum numbered controller revision:

- Forward the same frozen mirror arguments **after** the external `clippy` subcommand and before `--`, preserving offline/locked/all-targets/deny-warnings, versions, lock, private paths and budgets. Builtin Cargo commands can retain their current routing. A concrete candidate is in CONTROL-FIX-PROPOSAL.txt; it has not been applied or tested.
- Freeze and audit the corrected controller entry through the project's numbered supplement process, defining the original worker's resume SHA and evidence rules. Do not require a clean first-start resume at the now-historical ef0b7c4 baseline, reset the tree or overwrite old evidence.
- Then rerun the affected final check at the same product bytes and continue the remaining final gates under the revised authorization. Any retry must be recorded as a new final attempt, not replace this failure. Decide explicitly whether existing behavior/negative proof can be reused; current bytes and proof snapshots are retained for that review.

No direct alternative clippy command, environment/dependencies retry, final test or native gate was run after this failure. No persistent Cargo config, registry/cache alias, proxy/network change or helper edit was used. Native reservation does not exist; all static window/chooser/pixel budgets used remain zero. This handoff stops at BLOCKED, not SUBMITTED/VERIFIED.
