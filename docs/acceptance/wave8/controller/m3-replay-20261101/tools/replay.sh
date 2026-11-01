#!/usr/bin/env bash
# Controller-only 10-29 replay (handoff 12 §4.3) in integration tree A; same toolchain and cache as the service gate.
# usage: replay.sh build | replay.sh <fixture|real|drive> <args...>   (output JSON on stdout)
set -u
T=/f/new/smaltalk/water/.worktrees/integ-w8a; L=$T/.local
cd $T || exit 2
RU="$(cygpath "$USERPROFILE")/.cargo/bin/rustup.exe"; RUSTC=$("$RU" which rustc --toolchain 1.95.0 | tr -d "\r"); CARGO=$("$RU" which cargo --toolchain 1.95.0 | tr -d "\r")
export RUSTUP_TOOLCHAIN=1.95.0 RUSTC="$RUSTC" CARGO_HOME=$L/w3-cargo-home CARGO_TARGET_DIR=$L/w3-target CARGO_BUILD_JOBS=4 CARGO_NET_OFFLINE=true CARGO_TERM_COLOR=never TEMP=$L/w3-tmp TMP=$L/w3-tmp
if [ "$1" = build ]; then exec "$CARGO" build --offline --locked --manifest-path packages/water-service/Cargo.toml --example m3_replay; fi
exec "$L/w3-target/debug/examples/m3_replay.exe" "$@"
