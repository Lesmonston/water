#!/usr/bin/env bash
# Controller acceptance for wave 11, one cargo tree at a time:
# lock, check --final, real --final (N2: native --final last), then the replayed ticket controls and controller mutations ending in test --final.
cd /f/new/smaltalk/water || exit 2
for s in "$@"; do
  echo "=== $s $(date -u +%FT%TZ)"
  case $s in
    n2) bash .local/w11-accept/run.sh "$s" lock check:final;;
    *) bash .local/w11-accept/run.sh "$s" lock check:final real:final;;
  esac
  node .local/w11-accept/controls.mjs "$s"
  echo "=== $s done rc=$? $(date -u +%FT%TZ)"
done
echo SEQ-DONE
