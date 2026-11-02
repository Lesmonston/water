#!/usr/bin/env bash
# Controller-only F1/F2 recheck (wave 9 plan §2.3) in integration tree A; same toolchain and cache as the service gate.
# usage: replay.sh install | build | restore | <location|fixture> <data_dir> <root> | trends <data_dir>   (run output JSON on stdout)
# install copies tools/m3_close.rs into the tree and registers it; restore removes it, so the tree is clean again.
set -u
T=/f/new/smaltalk/water/.worktrees/integ-w8a; L=$T/.local; K=/f/new/smaltalk/water/.local/w9-integ6
cd $T || exit 2
case $1 in
  install)
    [ -z "$(git status --porcelain)" ] || { echo "tree not clean"; exit 2; }
    cp $K/tools/m3_close.rs packages/water-service/examples/m3_close.rs
    printf '\n[[example]]\nname = "m3_close"\npath = "examples/m3_close.rs"\n' >> packages/water-service/Cargo.toml
    git status --porcelain; exit 0;;
  restore)
    rm packages/water-service/examples/m3_close.rs && git restore packages/water-service/Cargo.toml
    git status --porcelain; git log --oneline -1; exit 0;;
esac
RU="$(cygpath "$USERPROFILE")/.cargo/bin/rustup.exe"; RUSTC=$("$RU" which rustc --toolchain 1.95.0 | tr -d "\r"); CARGO=$("$RU" which cargo --toolchain 1.95.0 | tr -d "\r")
export RUSTUP_TOOLCHAIN=1.95.0 RUSTC="$RUSTC" CARGO_HOME=$L/w3-cargo-home CARGO_TARGET_DIR=$L/w3-target CARGO_BUILD_JOBS=4 CARGO_NET_OFFLINE=true CARGO_TERM_COLOR=never TEMP=$L/w3-tmp TMP=$L/w3-tmp
if [ "$1" = build ]; then exec "$CARGO" build --offline --locked --manifest-path packages/water-service/Cargo.toml --example m3_close; fi
exec "$L/w3-target/debug/examples/m3_close.exe" "$@"
