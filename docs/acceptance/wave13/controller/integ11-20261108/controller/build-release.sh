#!/usr/bin/env bash
# Controller release build of the Flick desktop host (wave 13 integration 11), in integration tree B (host) at the tested commit.
# Same toolchain, offline cache and mirror arguments as desktop-wave-check.mjs (host kind); 4 jobs instead of 1.
# The binary is flick (W11-N2); copies it to .local/release/flick-0.1.0-<short sha>/flick.exe and records its sha256 and size.
set -u
T=/f/new/smaltalk/water/.worktrees/integ-w8b; LOG=/f/new/smaltalk/water/.local/w13-integ11/logs/release-build.txt
cd $T || exit 2
[ -z "$(git status --porcelain)" ] || { echo "tree not clean"; exit 2; }
RU="$(cygpath "$USERPROFILE")/.cargo/bin/rustup.exe"; RUSTC=$("$RU" which rustc --toolchain 1.95.0 | tr -d "\r"); CARGO=$("$RU" which cargo --toolchain 1.95.0 | tr -d "\r"); export PATH="$(dirname "$(cygpath "$RUSTC")"):$PATH"
MIRROR=$(node -e 'console.log(require("F:/new/smaltalk/water/contracts/desktop-bootstrap-mirror-v1/MIRROR.json").cargoArguments.map(a=>JSON.stringify(a)).join(" "))')
eval "set -- $MIRROR"
L=$T/.local
start=$(date +%s)
env RUSTUP_TOOLCHAIN=1.95.0 RUSTC="$RUSTC" RUSTDOC="$(dirname "$RUSTC")/rustdoc.exe" CARGO_HOME=$L/w3-cargo-home CARGO_TARGET_DIR=$L/w3-target CARGO_BUILD_JOBS=4 CARGO_NET_OFFLINE=true CARGO_TERM_COLOR=never TEMP=$L/w3-tmp TMP=$L/w3-tmp TMPDIR=$L/w3-tmp \
  "$CARGO" "$@" build --offline --locked --release --manifest-path apps/water/host/Cargo.toml --bin flick > "$LOG" 2>&1
rc=$?
echo "rc=$rc seconds=$(( $(date +%s) - start )) head=$(git rev-parse HEAD) status='$(git status --porcelain)'" | tee -a "$LOG"
tail -3 "$LOG"
[ $rc -eq 0 ] || exit $rc
OUT=/f/new/smaltalk/water/.local/release/flick-0.1.0-$(git rev-parse --short=8 HEAD)
[ -e "$OUT" ] && { echo "release folder exists: $OUT"; exit 2; }
mkdir -p "$OUT" && cp $L/w3-target/release/flick.exe "$OUT/flick.exe"
echo "release $OUT/flick.exe sha256=$(sha256sum "$OUT/flick.exe" | cut -d' ' -f1) bytes=$(stat -c %s "$OUT/flick.exe")" | tee -a "$LOG"
