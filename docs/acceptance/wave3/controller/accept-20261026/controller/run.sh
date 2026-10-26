#!/usr/bin/env bash
# usage: run.sh <slot> <mode> [<mode> ...]   (mode may be "test:final" etc.)
slot=$1; shift; S=$(echo $slot | tr a-z A-Z)
cd /f/new/smaltalk/water/.worktrees/accept-w3-$slot || exit 2
export WATER_W3_OVERRIDE_MANIFEST=F:/new/smaltalk/water/.local/w3-accept/manifest.json
mkdir -p /f/new/smaltalk/water/.local/w3-accept/logs
for m in "$@"; do
  mode=${m%%:*}; fin=""; [ "$m" != "$mode" ] && fin="--final"
  out=$(node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W3-ACCEPT-$S --mode $mode $fin 2>&1); rc=$?
  echo "$slot $m rc=$rc $(echo "$out" | tail -1 | cut -c1-400)" | tee -a /f/new/smaltalk/water/.local/w3-accept/logs/$slot-1.txt
done
