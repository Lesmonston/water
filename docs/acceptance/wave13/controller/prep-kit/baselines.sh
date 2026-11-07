#!/usr/bin/env bash
# Wave 13 pre-dispatch baselines: each task's checker in its own worktree, mode baseline (HEAD, clean tree, cache and
# frozen inputs; no product build). Receipts are copied to docs/acceptance/wave13/controller/preflight-20261108/<slot>/.
R=/f/new/smaltalk/water
for x in "$@"; do
  case $x in s1) gate=desktop-wave-check.mjs;; *) gate=checkup-wave-check.mjs;; esac
  X=$(echo $x | tr a-z A-Z)
  out=$(cd $R/.worktrees/w13-$x && node F:/new/smaltalk/water/scripts/$gate --task WATER-W13-$X --mode baseline 2>&1); rc=$?
  echo "$x baseline rc=$rc $(echo "$out" | tail -1 | cut -c1-300)"
  D=$R/docs/acceptance/wave13/controller/preflight-20261108/$x; mkdir -p $D
  S=$R/.worktrees/w13-$x/.local/checks/WATER-W13-$X
  for f in $(ls $S 2>/dev/null | grep baseline); do cp $S/$f $D/; done
done
