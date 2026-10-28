#!/usr/bin/env bash
# Run the wave 4 controller integration cases (scripts/acceptance/w4-g1-controller-cases.rs) against the
# H1 source in the separate H1 cases tree; then restore Cargo.toml and remove the copied test.
# usage: [CASES=<file under scripts/acceptance>] h1-cases.sh <log name> [test name filter]
set -u
C=/f/new/smaltalk/water; T=$C/.worktrees/accept-w5-h1-cases; P=$T/packages/junk-clean; LOG=$C/.local/w5-accept/logs/$1
cd $T || exit 2
[ -n "${ALLOW_DIRTY:-}" ] || [ -z "$(git status --porcelain)" ] || { echo "tree not clean"; exit 2; }
cp $C/scripts/acceptance/${CASES:-w4-g1-controller-cases.rs} $P/tests/controller_cases.rs
printf '\n[[test]]\nname = "controller_cases"\npath = "tests/controller_cases.rs"\n' >> $P/Cargo.toml
RU="$(cygpath "$USERPROFILE")/.cargo/bin/rustup.exe"; RUSTC=$("$RU" which rustc --toolchain 1.95.0 | tr -d "\r"); CARGO=$("$RU" which cargo --toolchain 1.95.0 | tr -d "\r"); export PATH="$(dirname "$(cygpath "$RUSTC")"):$PATH"
env RUSTUP_TOOLCHAIN=1.95.0 RUSTC="$RUSTC" CARGO_HOME=$T/.local/w2-cargo-home CARGO_TARGET_DIR=$T/.local/w2-target CARGO_BUILD_JOBS=1 CARGO_NET_OFFLINE=true CARGO_TERM_COLOR=never TEMP=$T/.local/w2-tmp TMP=$T/.local/w2-tmp \
  "$CARGO" test --offline --locked --manifest-path packages/junk-clean/Cargo.toml --test controller_cases -- ${2:-} --test-threads=1 --nocapture > "$LOG" 2>&1
rc=$?
git checkout -- packages/junk-clean/Cargo.toml; rm -f $P/tests/controller_cases.rs
echo "rc=$rc status after restore: '$(git status --porcelain)'" | tee -a "$LOG"
grep -E "^test |test result|CONTROLLER|panicked" "$LOG" | head -40
