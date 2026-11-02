#!/usr/bin/env bash
# usage: run.sh <l1..l4> <mode> [<mode> ...]   (mode may be "test:final" etc.)
# L3 uses desktop-wave-check.mjs (WATER_W3_OVERRIDE_MANIFEST); L1, L2, L4 use checkup-wave-check.mjs (WATER_W2_SELFTEST_MANIFEST).
slot=$1; shift; S=$(echo $slot | tr a-z A-Z)
cd /f/new/smaltalk/water/.worktrees/accept-w9-$slot || exit 2
M=F:/new/smaltalk/water/.local/w9-accept/manifest.json
case $slot in l3) gate=desktop-wave-check.mjs; export WATER_W3_OVERRIDE_MANIFEST=$M;; *) gate=checkup-wave-check.mjs; export WATER_W2_SELFTEST_MANIFEST=$M;; esac
mkdir -p /f/new/smaltalk/water/.local/w9-accept/logs
for m in "$@"; do
  mode=${m%%:*}; fin=""; [ "$m" != "$mode" ] && fin="--final"
  out=$(node F:/new/smaltalk/water/scripts/$gate --task WATER-W9-ACCEPT-$S --mode $mode $fin 2>&1); rc=$?
  echo "$slot $m rc=$rc $(echo "$out" | tail -1 | cut -c1-400)" | tee -a /f/new/smaltalk/water/.local/w9-accept/logs/$slot-1.txt
done
