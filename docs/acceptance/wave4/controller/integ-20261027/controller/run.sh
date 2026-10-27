#!/usr/bin/env bash
# Main-line integration check after wave 4 (tree .worktrees/integ-w4 at main).
# usage: run.sh <d|ui|svc|host> <mode>[:final] ...   (one gate run per mode, sequential)
part=$1; shift
cd /f/new/smaltalk/water/.worktrees/integ-w4 || exit 2
K=F:/new/smaltalk/water/.local/w4-integ
case $part in
  d)    gate=checkup-wave-check.mjs; id=WATER-W4-ACCEPT-INTEG-D;    export WATER_W2_SELFTEST_MANIFEST=$K/checkup-manifest.json;;
  ui)   gate=checkup-wave-check.mjs; id=WATER-W4-ACCEPT-INTEG-UI;   export WATER_W2_SELFTEST_MANIFEST=$K/checkup-manifest.json;;
  svc)  gate=desktop-wave-check.mjs; id=WATER-W4-ACCEPT-INTEG-SVC;  export WATER_W3_OVERRIDE_MANIFEST=$K/service-manifest.json;;
  host) gate=desktop-wave-check.mjs; id=WATER-W4-ACCEPT-INTEG-HOST; export WATER_W3_OVERRIDE_MANIFEST=$K/host-manifest.json;;
  *) exit 2;;
esac
for m in "$@"; do
  mode=${m%%:*}; fin=""; [ "$m" != "$mode" ] && fin="--final"
  out=$(node F:/new/smaltalk/water/scripts/$gate --task $id --mode $mode $fin 2>&1); rc=$?
  echo "$part $m rc=$rc $(echo "$out" | tail -1 | cut -c1-400)" | tee -a /f/new/smaltalk/water/.local/w4-integ/logs/integ.txt
done
