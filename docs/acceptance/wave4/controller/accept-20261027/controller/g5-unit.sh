#!/usr/bin/env bash
# Run the controller G5 cases (scripts/acceptance/w4-g5-controller-unit.rs) as a #[cfg(test)] module of
# junk-clean in the G5 acceptance tree, with the gate's toolchain, cargo home and target.
# usage: g5-unit.sh <log name> [<source commit for packages/junk-clean/src, default HEAD; "mutated" = as left in the tree>] [test filter]
# Restores the whole src directory from HEAD afterwards and checks the tree is clean.
set -u
T=/f/new/smaltalk/water/.worktrees/accept-w4-g5; P=$T/packages/junk-clean; LOG=/f/new/smaltalk/water/.local/w4-accept-m2/logs/$1
SRC=${2:-HEAD}
cd $T || exit 2
if [ "$SRC" != mutated ]; then
  [ -z "$(git status --porcelain)" ] || { echo "tree not clean"; exit 2; }
  [ "$SRC" = HEAD ] || git checkout "$SRC" -- packages/junk-clean/src
fi
cp /f/new/smaltalk/water/scripts/acceptance/w4-g5-controller-unit.rs $P/src/controller_unit.rs
printf '\n#[cfg(test)]\nmod controller_unit;\n' >> $P/src/lib.rs
RU="$(cygpath "$USERPROFILE")/.cargo/bin/rustup.exe"; RUSTC=$("$RU" which rustc --toolchain 1.95.0 | tr -d ""); CARGO=$("$RU" which cargo --toolchain 1.95.0 | tr -d ""); export PATH="$(dirname "$(cygpath "$RUSTC")"):$PATH"
env RUSTUP_TOOLCHAIN=1.95.0 RUSTC="$RUSTC" CARGO_HOME=$T/.local/w2-cargo-home CARGO_TARGET_DIR=$T/.local/w2-target CARGO_BUILD_JOBS=1 CARGO_NET_OFFLINE=true CARGO_TERM_COLOR=never TEMP=$T/.local/w2-tmp TMP=$T/.local/w2-tmp \
  "$CARGO" test --offline --locked --manifest-path packages/junk-clean/Cargo.toml --lib -- ${3:-} --test-threads=1 --nocapture > "$LOG" 2>&1
rc=$?
rm -f $P/src/controller_unit.rs; git checkout HEAD -- packages/junk-clean/src
echo "rc=$rc source=$SRC status after restore: '$(git status --porcelain)'" | tee -a "$LOG"
grep -E "^test |test result|CONTROLLER|panicked" "$LOG" | head -40
