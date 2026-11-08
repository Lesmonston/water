#!/usr/bin/env bash
# Eleventh main-line integration check (wave 13 merged). Trees: A = .worktrees/integ-w8a (packages and the UI), B = .worktrees/integ-w8b (host).
# usage: run.sh <scan|rules|ui|svc|host> <mode>[:final] ...   (one gate run per mode, sequential)
part=$1; shift
K=F:/new/smaltalk/water/.local/w13-integ11
case $part in
  scan|rules|ui) tree=a; gate=checkup-wave-check.mjs; export WATER_W2_SELFTEST_MANIFEST=$K/checkup-manifest.json;;
  svc)  tree=a; gate=desktop-wave-check.mjs; export WATER_W3_OVERRIDE_MANIFEST=$K/desktop-manifest.json;;
  host|host[0-9]) tree=b; gate=desktop-wave-check.mjs; export WATER_W3_OVERRIDE_MANIFEST=$K/desktop-manifest.json;;
  *) exit 2;;
esac
cd /f/new/smaltalk/water/.worktrees/integ-w8$tree || exit 2
id=WATER-W13-ACCEPT-INTEG11-$(echo $part | tr a-z A-Z)
mkdir -p $K/logs
for m in "$@"; do
  mode=${m%%:*}; fin=""; [ "$m" != "$mode" ] && fin="--final"
  out=$(node F:/new/smaltalk/water/scripts/$gate --task $id --mode $mode $fin 2>&1); rc=$?
  echo "$part $m rc=$rc $(echo "$out" | tail -1 | cut -c1-400)" | tee -a $K/logs/integ.txt
done
