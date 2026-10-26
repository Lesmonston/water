#!/usr/bin/env bash
# usage: run.sh <slot> <mode> [<mode> ...]   (mode may be "test:final" etc.)
slot=$1; shift; S=$(echo $slot | tr a-z A-Z)
if [ "$slot" = d2 ]; then cd /f/new/smaltalk/water/.local/w2-accept/d-tree/.worktrees/w2-d || exit 2; else cd /f/new/smaltalk/water/.worktrees/accept-w2-$slot || exit 2; fi
export WATER_W2_SELFTEST_MANIFEST=F:/new/smaltalk/water/.local/w2-accept/manifest.json
for m in "$@"; do
  mode=${m%%:*}; fin=""; [ "$m" != "$mode" ] && fin="--final"
  out=$(node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W2-ACCEPT-$S --mode $mode $fin 2>&1); rc=$?
  echo "$slot $m rc=$rc $(echo "$out" | tail -1 | cut -c1-400)"
done
