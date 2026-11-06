#!/usr/bin/env bash
# After merging bundle A (M1 rules + M2 scan) into main: run both packages' tests on the merged tree, offline, one job.
R=F:/new/smaltalk/water
CARGO=/c/Users/37310/.rustup/toolchains/1.95.0-x86_64-pc-windows-msvc/bin/cargo.exe
export RUSTUP_TOOLCHAIN=1.95.0 CARGO_HOME=$R/.worktrees/accept-w10-m2/.local/w2-cargo-home CARGO_BUILD_JOBS=1 CARGO_NET_OFFLINE=true CARGO_TERM_COLOR=never
export CARGO_TARGET_DIR=$R/.local/w10-accept/integ-target
for p in junk-rules junk-scan; do
  "$CARGO" test -q --offline --locked --manifest-path $R/packages/$p/Cargo.toml 2>&1 | grep -E "^test result|error|FAILED|panicked" | head -12
  echo "$p rc=${PIPESTATUS[0]}"
done
