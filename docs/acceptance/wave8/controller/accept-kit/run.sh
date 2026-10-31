#!/usr/bin/env bash
# usage: run.sh <k1..k6> <mode> [<mode> ...]   (mode may be "test:final" etc.)
# K4/K5 use desktop-wave-check.mjs (WATER_W3_OVERRIDE_MANIFEST); K1/K2/K3/K6 use checkup-wave-check.mjs (WATER_W2_SELFTEST_MANIFEST).
slot=$1; shift; S=$(echo $slot | tr a-z A-Z)
cd /f/new/smaltalk/water/.worktrees/accept-w8-$slot || exit 2
M=F:/new/smaltalk/water/.local/w8-accept/manifest.json
case $slot in k4|k5) gate=desktop-wave-check.mjs; export WATER_W3_OVERRIDE_MANIFEST=$M;; *) gate=checkup-wave-check.mjs; export WATER_W2_SELFTEST_MANIFEST=$M;; esac
mkdir -p /f/new/smaltalk/water/.local/w8-accept/logs
for m in "$@"; do
  mode=${m%%:*}; fin=""; [ "$m" != "$mode" ] && fin="--final"
  out=$(node F:/new/smaltalk/water/scripts/$gate --task WATER-W8-ACCEPT-$S --mode $mode $fin 2>&1); rc=$?
  echo "$slot $m rc=$rc $(echo "$out" | tail -1 | cut -c1-400)" | tee -a /f/new/smaltalk/water/.local/w8-accept/logs/$slot-1.txt
done
