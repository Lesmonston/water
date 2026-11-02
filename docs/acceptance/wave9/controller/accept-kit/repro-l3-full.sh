#!/usr/bin/env bash
# Reproduce the L3 c1 crash outside the gate: mutate, run service_clean_flow with output, restore exact bytes.
T=/f/new/smaltalk/water/.worktrees/accept-w9-l3
F=packages/water-service/src/service.rs
cd "$T" || exit 2
before=$(sha256sum "$F" | cut -c1-64)
node -e "const fs=require('fs');const f=process.argv[1];const s=fs.readFileSync(f,'utf8');const a='at.checked_sub(Duration::from_secs(86_400))?';if(s.split(a).length!==2)process.exit(3);fs.writeFileSync(f,s.replace(a,'at.checked_sub(Duration::from_secs(3_600))?'))" "$F" || exit 3
export CARGO_HOME="$T/.local/w3-cargo-home" CARGO_TARGET_DIR="$T/.local/w3-target" RUST_BACKTRACE=1
"/c/Users/37310/.rustup/toolchains/1.95.0-x86_64-pc-windows-msvc/bin/cargo.exe" test --offline --locked -j 1 --manifest-path packages/water-service/Cargo.toml --test service_v1 -- --test-threads=1 > /f/new/smaltalk/water/.local/w9-accept/logs/repro-l3-c1-full.txt 2>&1
echo "cargo exit $?"
git -c core.hooksPath=NUL checkout -- "$F"
after=$(sha256sum "$F" | cut -c1-64)
echo "restored $([ "$before" = "$after" ] && echo exact || echo MISMATCH) $after"
grep -n "panicked\|overflow\|SERVICE_\|test service_clean_flow\|error\|abort\|thread '" /f/new/smaltalk/water/.local/w9-accept/logs/repro-l3-c1-full.txt | head -20
