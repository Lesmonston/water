#!/usr/bin/env bash
# After merging M7 (service) and M6 (UI) into main: run the service tests and the UI unit tests on the merged tree, offline, one job.
R=F:/new/smaltalk/water
CARGO=/c/Users/37310/.rustup/toolchains/1.95.0-x86_64-pc-windows-msvc/bin/cargo.exe
export RUSTUP_TOOLCHAIN=1.95.0 CARGO_HOME=$R/.worktrees/accept-w10-m7/.local/w3-cargo-home CARGO_BUILD_JOBS=1 CARGO_NET_OFFLINE=true CARGO_TERM_COLOR=never
export CARGO_TARGET_DIR=$R/.local/w10-accept/integ-target
git -C $R log -1 --format="main %h %s"
"$CARGO" test -q --offline --locked --manifest-path $R/packages/water-service/Cargo.toml --test service_v1 -- --test-threads=1 2>&1 | grep -E "^test result|error|FAILED|panicked" | head -12
echo "water-service rc=${PIPESTATUS[0]}"
node --test --test-reporter=tap $R/apps/water/ui/tests/unit.test.mjs 2>&1 | grep -E "^# (tests|pass|fail)|not ok" | head -12
echo "ui unit rc=${PIPESTATUS[0]}"
