#!/usr/bin/env bash
# usage: run.sh <g5|g6|g7> <mode> [<mode> ...]   (mode may be "test:final" etc.)
# G5/G7 use checkup-wave-check.mjs (WATER_W2_SELFTEST_MANIFEST); G6 uses desktop-wave-check.mjs (WATER_W3_OVERRIDE_MANIFEST).
slot=$1; shift; S=$(echo $slot | tr a-z A-Z)
cd /f/new/smaltalk/water/.worktrees/accept-w4-$slot || exit 2
M=F:/new/smaltalk/water/.local/w4-accept-m2/manifest.json
if [ "$slot" = g6 ]; then gate=desktop-wave-check.mjs; export WATER_W3_OVERRIDE_MANIFEST=$M; else gate=checkup-wave-check.mjs; export WATER_W2_SELFTEST_MANIFEST=$M; fi
mkdir -p /f/new/smaltalk/water/.local/w4-accept-m2/logs
for m in "$@"; do
  mode=${m%%:*}; fin=""; [ "$m" != "$mode" ] && fin="--final"
  out=$(node F:/new/smaltalk/water/scripts/$gate --task WATER-W4-ACCEPT-$S --mode $mode $fin 2>&1); rc=$?
  echo "$slot $m rc=$rc $(echo "$out" | tail -1 | cut -c1-400)" | tee -a /f/new/smaltalk/water/.local/w4-accept-m2/logs/$slot-1.txt
done
