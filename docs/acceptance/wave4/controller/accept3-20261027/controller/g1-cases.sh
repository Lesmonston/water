#!/usr/bin/env bash
# Run the controller synthetic cases (scripts/acceptance/w4-g1-controller-cases.rs) in the G1 acceptance tree,
# with the gate's own toolchain, cargo home and target; then restore Cargo.toml and remove the copied test.
# usage: g1-cases.sh <log name> [test name filter]
set -u
T=/f/new/smaltalk/water/.worktrees/accept3-w4-g1; P=$T/packages/junk-clean; LOG=/f/new/smaltalk/water/.local/w4-accept3/logs/$1
cd $T || exit 2
[ -z "$(git status --porcelain)" ] || { echo "tree not clean"; exit 2; }
cp /f/new/smaltalk/water/scripts/acceptance/w4-g1-controller-cases.rs $P/tests/controller_cases.rs
printf '\n[[test]]\nname = "controller_cases"\npath = "tests/controller_cases.rs"\n' >> $P/Cargo.toml
RU="$(cygpath "$USERPROFILE")/.cargo/bin/rustup.exe"; RUSTC=$("$RU" which rustc --toolchain 1.95.0 | tr -d ""); CARGO=$("$RU" which cargo --toolchain 1.95.0 | tr -d ""); export PATH="$(dirname "$(cygpath "$RUSTC")"):$PATH"
env RUSTUP_TOOLCHAIN=1.95.0 RUSTC="$RUSTC" CARGO_HOME=$T/.local/w2-cargo-home CARGO_TARGET_DIR=$T/.local/w2-target CARGO_BUILD_JOBS=1 CARGO_NET_OFFLINE=true CARGO_TERM_COLOR=never TEMP=$T/.local/w2-tmp TMP=$T/.local/w2-tmp \
  "$CARGO" test --offline --locked --manifest-path packages/junk-clean/Cargo.toml --test controller_cases -- ${2:-} --test-threads=1 --nocapture > "$LOG" 2>&1
rc=$?
git checkout -- packages/junk-clean/Cargo.toml; rm -f $P/tests/controller_cases.rs
echo "rc=$rc status after restore: '$(git status --porcelain)'" | tee -a "$LOG"
grep -E "^test |test result|CONTROLLER|panicked" "$LOG" | head -30
