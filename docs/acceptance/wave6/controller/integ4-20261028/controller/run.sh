#!/usr/bin/env bash
# Fourth main-line integration check (wave 6 merged). Trees: A = .worktrees/integ-w6a (d, ui, rules, svc), B = .worktrees/integ-w6b (host).
# usage: run.sh <d|ui|rules|svc|host> <mode>[:final] ...   (one gate run per mode, sequential)
part=$1; shift
K=F:/new/smaltalk/water/.local/w6-integ4
case $part in
  d|ui|rules) tree=a; gate=checkup-wave-check.mjs; export WATER_W2_SELFTEST_MANIFEST=$K/checkup-manifest.json;;
  svc)        tree=a; gate=desktop-wave-check.mjs; export WATER_W3_OVERRIDE_MANIFEST=$K/desktop-manifest.json;;
  host)       tree=b; gate=desktop-wave-check.mjs; export WATER_W3_OVERRIDE_MANIFEST=$K/desktop-manifest.json;;
  *) exit 2;;
esac
cd /f/new/smaltalk/water/.worktrees/integ-w6$tree || exit 2
id=WATER-W6-ACCEPT-INTEG4-$(echo $part | tr a-z A-Z)
mkdir -p /f/new/smaltalk/water/.local/w6-integ4/logs
for m in "$@"; do
  mode=${m%%:*}; fin=""; [ "$m" != "$mode" ] && fin="--final"
  out=$(node F:/new/smaltalk/water/scripts/$gate --task $id --mode $mode $fin 2>&1); rc=$?
  echo "$part $m rc=$rc $(echo "$out" | tail -1 | cut -c1-400)" | tee -a /f/new/smaltalk/water/.local/w6-integ4/logs/integ.txt
done
