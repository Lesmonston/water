#!/usr/bin/env bash
# Alternate old (f50da264) and new (68f90263) M2 real smoke on one plan, warm cache; print timings only.
W=F:/new/smaltalk/water/.worktrees
CARGO=/c/Users/37310/.rustup/toolchains/1.95.0-x86_64-pc-windows-msvc/bin/cargo.exe
PLAN='F:\new\smaltalk\water\.worktrees\accept-w10-m2\.local\w2-real\2026-11-05T15-25-07.125Z-32608-real-plan.json'
export RUSTUP_TOOLCHAIN=1.95.0 CARGO_HOME=$W/accept-w10-m2/.local/w2-cargo-home CARGO_BUILD_JOBS=1 CARGO_NET_OFFLINE=true CARGO_TERM_COLOR=never
OUT=F:/new/smaltalk/water/.local/w10-accept/logs/m2-timing
mkdir -p $OUT
run() { # $1 label, $2 tree
  local t=$W/$2
  CARGO_TARGET_DIR=$t/.local/w2-target "$CARGO" run -q --offline --locked --manifest-path $t/packages/junk-scan/Cargo.toml --example real_smoke -- "$PLAN" > $OUT/$1.json 2> $OUT/$1.err
  echo "$1 rc=$? $(grep -oE '"(elapsed_ms|visited_entries|status)":("[a-z]+"|[0-9]+)' $OUT/$1.json | tr '\n' ' ')"
}
CARGO_TARGET_DIR=$W/tmp-m2-old/.local/w2-target "$CARGO" build -q --offline --locked --manifest-path $W/tmp-m2-old/packages/junk-scan/Cargo.toml --example real_smoke 2>&1 | tail -3
CARGO_TARGET_DIR=$W/accept-w10-m2/.local/w2-target "$CARGO" build -q --offline --locked --manifest-path $W/accept-w10-m2/packages/junk-scan/Cargo.toml --example real_smoke 2>&1 | tail -3
run old1 tmp-m2-old
run new1 accept-w10-m2
run old2 tmp-m2-old
run new2 accept-w10-m2
