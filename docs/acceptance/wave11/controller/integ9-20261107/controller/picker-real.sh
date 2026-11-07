#!/usr/bin/env bash
# Ninth integration: the folder picker in real dialogs (controller title fix f36975c9). Runs the native-picker
# tests in tree A at the tested commit through scripts/picker-test-driver.mjs, which answers each dialog with
# scripts/picker-ui-action.ps1 (it prints the dialog title). Opens real folder dialogs owned by the test process.
R=F:/new/smaltalk/water; A=$R/.worktrees/integ-w8a; K=$R/.local/w11-integ9
CARGO=/c/Users/37310/.rustup/toolchains/1.95.0-x86_64-pc-windows-msvc/bin/cargo.exe
export RUSTUP_TOOLCHAIN=1.95.0 CARGO_HOME=$R/.worktrees/accept-w11-n3/.local/w2-cargo-home CARGO_BUILD_JOBS=1 CARGO_NET_OFFLINE=true CARGO_TERM_COLOR=never
export CARGO_TARGET_DIR=$K/picker-target
export PATH=/c/Users/37310/.rustup/toolchains/1.95.0-x86_64-pc-windows-msvc/bin:$PATH
cd $A || exit 2
[ -z "$(git status --porcelain)" ] || { echo "tree not clean"; exit 2; }
echo "head $(git rev-parse HEAD)"
grep -c '"Flick - Select a read-only directory"' packages/native-picker/src/native_windows.rs
INDEX=$(node $K/picker-fixtures.mjs) || exit 2
exe=$("$CARGO" test -q --offline --locked --manifest-path packages/native-picker/Cargo.toml --test picker_v1 --no-run --message-format=json 2>/dev/null \
  | node -e 'let s="";process.stdin.on("data",b=>s+=b).on("end",()=>{const m=s.split(/\r?\n/).filter(Boolean).map(l=>JSON.parse(l)).find(m=>m.reason==="compiler-artifact"&&m.target.name==="picker_v1"&&m.executable);console.log(m?m.executable:"")})')
[ -n "$exe" ] || { echo "picker_v1 test binary not built"; exit 2; }
echo "exe $exe"
WATER_PICKER_INDEX="$INDEX" node scripts/picker-test-driver.mjs "$exe" --test-threads=1 --format pretty --nocapture
echo "driver rc=$?"
