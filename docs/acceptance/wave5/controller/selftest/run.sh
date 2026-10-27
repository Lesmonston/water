#!/usr/bin/env bash
# usage: run.sh <mode>[:final] ...   (wave 5 gate self-test of the fixture clean loop)
cd /f/new/smaltalk/water/.worktrees/w5-selftest-h3 || exit 2
export WATER_W3_OVERRIDE_MANIFEST=F:/new/smaltalk/water/.local/w5-selftest/manifest.json
mkdir -p /f/new/smaltalk/water/.local/w5-selftest/logs
for m in "$@"; do
  mode=${m%%:*}; fin=""; [ "$m" != "$mode" ] && fin="--final"
  out=$(node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W5-SELFTEST-H3 --mode $mode $fin 2>&1); rc=$?
  echo "h3 $m rc=$rc $(echo "$out" | tail -1 | cut -c1-400)" | tee -a /f/new/smaltalk/water/.local/w5-selftest/logs/h3.txt
done
