#!/usr/bin/env bash
# Controller fix 11-07 (user: "总控直接改"): the native picker title says Flick.
# Compile-level check on main, offline, one job, private target: fmt, clippy -D warnings, tests built but not run
# (running them opens real folder dialogs; that is left to the ninth integration's real-window pass).
R=F:/new/smaltalk/water
CARGO=/c/Users/37310/.rustup/toolchains/1.95.0-x86_64-pc-windows-msvc/bin/cargo.exe
export RUSTUP_TOOLCHAIN=1.95.0 CARGO_HOME=$R/.worktrees/accept-w11-n3/.local/w2-cargo-home CARGO_BUILD_JOBS=1 CARGO_NET_OFFLINE=true CARGO_TERM_COLOR=never
export CARGO_TARGET_DIR=$R/.local/w11-accept/picker-target
export PATH=/c/Users/37310/.rustup/toolchains/1.95.0-x86_64-pc-windows-msvc/bin:$PATH  # cargo-fmt and cargo-clippy, as the checkers do
M=$R/packages/native-picker/Cargo.toml
"$CARGO" fmt --manifest-path $M -- --check; echo "fmt rc=$?"
"$CARGO" clippy -q --offline --locked --manifest-path $M --all-targets -- -D warnings 2>&1 | tail -5; echo "clippy rc=${PIPESTATUS[0]}"
"$CARGO" test -q --offline --locked --manifest-path $M --no-run 2>&1 | tail -3; echo "test-build rc=${PIPESTATUS[0]}"
grep -c '"Flick - Select a read-only directory"' $R/packages/native-picker/src/native_windows.rs
