#!/usr/bin/env bash
# Controller release build of the Water desktop host for daily use, in integration tree B (host) at main.
# Same toolchain, offline cache and mirror arguments as desktop-wave-check.mjs (host kind); 4 jobs instead of 1.
set -u
T=/f/new/smaltalk/water/.worktrees/integ-w6b; LOG=/f/new/smaltalk/water/.local/w6-integ4/logs/release-build.txt
cd $T || exit 2
[ -z "$(git status --porcelain)" ] || { echo "tree not clean"; exit 2; }
RU="$(cygpath "$USERPROFILE")/.cargo/bin/rustup.exe"; RUSTC=$("$RU" which rustc --toolchain 1.95.0 | tr -d ""); CARGO=$("$RU" which cargo --toolchain 1.95.0 | tr -d ""); export PATH="$(dirname "$(cygpath "$RUSTC")"):$PATH"
MIRROR=$(node -e 'console.log(require("F:/new/smaltalk/water/contracts/desktop-bootstrap-mirror-v1/MIRROR.json").cargoArguments.map(a=>JSON.stringify(a)).join(" "))')
eval "set -- $MIRROR"
L=$T/.local
start=$(date +%s)
env RUSTUP_TOOLCHAIN=1.95.0 RUSTC="$RUSTC" RUSTDOC="$(dirname "$RUSTC")/rustdoc.exe" CARGO_HOME=$L/w3-cargo-home CARGO_TARGET_DIR=$L/w3-target CARGO_BUILD_JOBS=4 CARGO_NET_OFFLINE=true CARGO_TERM_COLOR=never TEMP=$L/w3-tmp TMP=$L/w3-tmp TMPDIR=$L/w3-tmp \
  "$CARGO" "$@" build --offline --locked --release --manifest-path apps/water/host/Cargo.toml --bin water > "$LOG" 2>&1
rc=$?
echo "rc=$rc seconds=$(( $(date +%s) - start )) head=$(git rev-parse HEAD) status='$(git status --porcelain)'" | tee -a "$LOG"
tail -3 "$LOG"
