#!/usr/bin/env bash
# N1 (UI) acceptance: check --final, the three replayed ticket controls ending in test --final, then browser --final.
cd /f/new/smaltalk/water || exit 2
echo "=== n1 $(date -u +%FT%TZ)"
bash .local/w11-accept/run.sh n1 check:final
node .local/w11-accept/controls.mjs n1
bash .local/w11-accept/run.sh n1 browser:final
echo "=== n1 done $(date -u +%FT%TZ)"
