#!/usr/bin/env bash
# Wave 12 pre-dispatch baselines: each task's checker in its own worktree, mode baseline (HEAD, clean tree, cache and
# frozen inputs; no product build). Receipts are copied to docs/acceptance/wave12/controller/preflight-20261107/<slot>/.
R=/f/new/smaltalk/water
for n in "$@"; do
  case $n in 2|3) gate=desktop-wave-check.mjs;; *) gate=checkup-wave-check.mjs;; esac
  out=$(cd $R/.worktrees/w12-p$n && node F:/new/smaltalk/water/scripts/$gate --task WATER-W12-P$n --mode baseline 2>&1); rc=$?
  echo "p$n baseline rc=$rc $(echo "$out" | tail -1 | cut -c1-300)"
  D=$R/docs/acceptance/wave12/controller/preflight-20261107/p$n; mkdir -p $D
  S=$R/.worktrees/w12-p$n/.local/checks/WATER-W12-P$n
  for f in $(ls $S 2>/dev/null | grep baseline); do cp $S/$f $D/; done
done
