#!/usr/bin/env bash
# Controller pre-dispatch check for N8: the service tests on main after N3, N5 and N6 merged (4e411896), offline, one job.
# Timing-only failures may be rerun (user 11-06).
R=F:/new/smaltalk/water
CARGO=/c/Users/37310/.rustup/toolchains/1.95.0-x86_64-pc-windows-msvc/bin/cargo.exe
export RUSTUP_TOOLCHAIN=1.95.0 CARGO_HOME=$R/.worktrees/accept-w11-n3/.local/w2-cargo-home CARGO_BUILD_JOBS=1 CARGO_NET_OFFLINE=true CARGO_TERM_COLOR=never
export CARGO_TARGET_DIR=$R/.local/w11-accept/integ-target
export PATH=/c/Users/37310/.rustup/toolchains/1.95.0-x86_64-pc-windows-msvc/bin:$PATH
"$CARGO" test --offline --locked --manifest-path $R/packages/water-service/Cargo.toml 2>&1 | grep -E "^test |^test result|error\[|panicked|FAILED" | head -40
echo "service rc=${PIPESTATUS[0]}"
