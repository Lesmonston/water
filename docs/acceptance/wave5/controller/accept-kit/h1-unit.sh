#!/usr/bin/env bash
# Run a controller unit file (crate-internal snapshot/delete cases) as a #[cfg(test)] module of junk-clean
# in the separate H1 cases tree, with the gate's toolchain and the tree's private cargo home and target.
# usage: h1-unit.sh <log name> <unit file under scripts/acceptance> [<source commit for packages/junk-clean/src, default HEAD>] [test filter]
# Restores the whole src directory from HEAD afterwards and checks the tree is clean.
set -u
C=/f/new/smaltalk/water; T=$C/.worktrees/accept-w5-h1-cases; P=$T/packages/junk-clean; LOG=$C/.local/w5-accept/logs/$1
UNIT=$2; SRC=${3:-HEAD}
cd $T || exit 2
[ -z "$(git status --porcelain)" ] || { echo "tree not clean"; exit 2; }
[ "$SRC" = HEAD ] || git checkout "$SRC" -- packages/junk-clean/src
cp $C/scripts/acceptance/$UNIT $P/src/controller_unit.rs
printf '\n#[cfg(test)]\nmod controller_unit;\n' >> $P/src/lib.rs
RU="$(cygpath "$USERPROFILE")/.cargo/bin/rustup.exe"; RUSTC=$("$RU" which rustc --toolchain 1.95.0 | tr -d "\r"); CARGO=$("$RU" which cargo --toolchain 1.95.0 | tr -d "\r"); export PATH="$(dirname "$(cygpath "$RUSTC")"):$PATH"
env RUSTUP_TOOLCHAIN=1.95.0 RUSTC="$RUSTC" CARGO_HOME=$T/.local/w2-cargo-home CARGO_TARGET_DIR=$T/.local/w2-target CARGO_BUILD_JOBS=1 CARGO_NET_OFFLINE=true CARGO_TERM_COLOR=never TEMP=$T/.local/w2-tmp TMP=$T/.local/w2-tmp \
  "$CARGO" test --offline --locked --manifest-path packages/junk-clean/Cargo.toml --lib -- ${4:-} --test-threads=1 --nocapture > "$LOG" 2>&1
rc=$?
rm -f $P/src/controller_unit.rs; git checkout HEAD -- packages/junk-clean/src
echo "rc=$rc unit=$UNIT source=$SRC status after restore: '$(git status --porcelain)'" | tee -a "$LOG"
grep -E "^test |test result|CONTROLLER|panicked|error(\[|:)" "$LOG" | head -60
