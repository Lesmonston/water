#!/usr/bin/env bash
# CLEAN_DEEP_TREE against the pre-M2 source: put the base commit's packages/junk-clean/src under the H1
# tests and run only clean_report_volume in its own process. The recursive version should overflow the
# 256 KiB stack and kill the test process (exit code, not a test failure). Restores src afterwards.
# usage: h1-deep-old.sh <log name> [<source commit, default base 3f907897>]
set -u
C=/f/new/smaltalk/water; T=$C/.worktrees/accept-w5-h1-cases; LOG=$C/.local/w5-accept/logs/$1; SRC=${2:-3f9078972d7f958fad6bfd42e68f022dd659539e}
cd $T || exit 2
[ -z "$(git status --porcelain)" ] || { echo "tree not clean"; exit 2; }
git checkout "$SRC" -- packages/junk-clean/src
RU="$(cygpath "$USERPROFILE")/.cargo/bin/rustup.exe"; RUSTC=$("$RU" which rustc --toolchain 1.95.0 | tr -d "\r"); CARGO=$("$RU" which cargo --toolchain 1.95.0 | tr -d "\r"); export PATH="$(dirname "$(cygpath "$RUSTC")"):$PATH"
env RUSTUP_TOOLCHAIN=1.95.0 RUSTC="$RUSTC" CARGO_HOME=$T/.local/w2-cargo-home CARGO_TARGET_DIR=$T/.local/w2-target CARGO_BUILD_JOBS=1 CARGO_NET_OFFLINE=true CARGO_TERM_COLOR=never TEMP=$T/.local/w2-tmp TMP=$T/.local/w2-tmp \
  "$CARGO" test --offline --locked --manifest-path packages/junk-clean/Cargo.toml --test clean_v1 -- clean_report_volume --exact --test-threads=1 --nocapture > "$LOG" 2>&1
rc=$?
git checkout HEAD -- packages/junk-clean/src
echo "rc=$rc source=$SRC status after restore: '$(git status --porcelain)'" | tee -a "$LOG"
grep -E "^test |test result|overflow|STATUS_|exit code|error: test failed|CLEAN_DEEP_TREE|panicked" "$LOG" | head -20
