#!/usr/bin/env bash
# Controller check of the wave 12 base before tagging: the executor interface (journal_error, SkipReason::JournalFailed)
# lands with no behaviour change. fmt, clippy -D warnings and the full tests for the executor and the service, then the
# host build check (it compiles the service). Offline, one job, one cargo at a time. Timing-only failures may be rerun.
R=F:/new/smaltalk/water
CARGO=/c/Users/37310/.rustup/toolchains/1.95.0-x86_64-pc-windows-msvc/bin/cargo.exe
export RUSTUP_TOOLCHAIN=1.95.0 CARGO_HOME=$R/.worktrees/accept-w11-n3/.local/w2-cargo-home CARGO_BUILD_JOBS=1 CARGO_NET_OFFLINE=true CARGO_TERM_COLOR=never
export CARGO_TARGET_DIR=$R/.local/w12-prep/base-target
export PATH=/c/Users/37310/.rustup/toolchains/1.95.0-x86_64-pc-windows-msvc/bin:$PATH
for p in junk-clean water-service; do
  M=$R/packages/$p/Cargo.toml
  "$CARGO" fmt --manifest-path $M -- --check >/dev/null 2>&1; echo "$p fmt rc=$?"
  "$CARGO" clippy -q --offline --locked --manifest-path $M --all-targets -- -D warnings 2>&1 | tail -3; echo "$p clippy rc=${PIPESTATUS[0]}"
  "$CARGO" test --offline --locked --manifest-path $M 2>&1 | grep -E "^test result|panicked|error\[" | head -20; echo "$p test rc=${PIPESTATUS[0]}"
done
echo BASE-CHECK-DONE
