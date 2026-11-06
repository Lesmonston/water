#!/usr/bin/env bash
# Seventh main-line integration check (wave 10 merged). Trees: A = .worktrees/integ-w8a (every package and the UI), B = .worktrees/integ-w8b (host).
# usage: run.sh <exec|process|rules|scan|decl|dup|apps|ui|svc|host> <mode>[:final] ...   (one gate run per mode, sequential)
part=$1; shift
K=F:/new/smaltalk/water/.local/w10-integ7
case $part in
  exec|process|rules|scan|decl|dup|apps|ui) tree=a; gate=checkup-wave-check.mjs; export WATER_W2_SELFTEST_MANIFEST=$K/checkup-manifest.json;;
  svc)  tree=a; gate=desktop-wave-check.mjs; export WATER_W3_OVERRIDE_MANIFEST=$K/desktop-manifest.json;;
  host) tree=b; gate=desktop-wave-check.mjs; export WATER_W3_OVERRIDE_MANIFEST=$K/desktop-manifest.json;;
  *) exit 2;;
esac
cd /f/new/smaltalk/water/.worktrees/integ-w8$tree || exit 2
id=WATER-W10-ACCEPT-INTEG7-$(echo $part | tr a-z A-Z)
mkdir -p $K/logs
for m in "$@"; do
  mode=${m%%:*}; fin=""; [ "$m" != "$mode" ] && fin="--final"
  out=$(node F:/new/smaltalk/water/scripts/$gate --task $id --mode $mode $fin 2>&1); rc=$?
  echo "$part $m rc=$rc $(echo "$out" | tail -1 | cut -c1-400)" | tee -a $K/logs/integ.txt
done
