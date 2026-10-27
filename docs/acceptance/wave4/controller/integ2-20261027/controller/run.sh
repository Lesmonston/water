#!/usr/bin/env bash
# Main-line integration check after G5-G7 (tree .worktrees/integ-w4b at main).
# usage: run.sh <d|ui|svc|host> <mode>[:final] ...   (one gate run per mode, sequential)
# Service and host share .local/w3-cargo-home in one tree: run the host first so its full offline cache is copied.
part=$1; shift
cd /f/new/smaltalk/water/.worktrees/integ-w4b || exit 2
K=F:/new/smaltalk/water/.local/w4-integ2
case $part in
  d|ui)     gate=checkup-wave-check.mjs; export WATER_W2_SELFTEST_MANIFEST=$K/checkup-manifest.json;;
  svc|host) gate=desktop-wave-check.mjs; export WATER_W3_OVERRIDE_MANIFEST=$K/desktop-manifest.json;;
  *) exit 2;;
esac
id=WATER-W4-ACCEPT-INTEG2-$(echo $part | tr a-z A-Z)
mkdir -p /f/new/smaltalk/water/.local/w4-integ2/logs
for m in "$@"; do
  mode=${m%%:*}; fin=""; [ "$m" != "$mode" ] && fin="--final"
  out=$(node F:/new/smaltalk/water/scripts/$gate --task $id --mode $mode $fin 2>&1); rc=$?
  echo "$part $m rc=$rc $(echo "$out" | tail -1 | cut -c1-400)" | tee -a /f/new/smaltalk/water/.local/w4-integ2/logs/integ.txt
done
