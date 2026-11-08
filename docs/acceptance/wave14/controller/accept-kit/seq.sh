#!/usr/bin/env bash
# Controller acceptance for wave 13, one cargo tree at a time:
# lock, check --final, real --final, then the replayed ticket controls and controller mutations ending in test --final.
cd /f/new/smaltalk/water || exit 2
for s in "$@"; do
  echo "=== $s $(date -u +%FT%TZ)"
  case $s in
    *) bash .local/w14-accept/run.sh "$s" lock check:final real:final;;
  esac
  node .local/w14-accept/controls.mjs "$s"
  echo "=== $s done rc=$? $(date -u +%FT%TZ)"
done
echo SEQ-DONE
