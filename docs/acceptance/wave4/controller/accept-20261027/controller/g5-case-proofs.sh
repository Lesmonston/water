#!/usr/bin/env bash
# Prove each G5 change is guarded by a controller case: mutate one site of the submitted source
# (g5-case-mutants.json), run the matching controller cases, expect a failure; g5-unit.sh restores src.
set -u
C=/f/new/smaltalk/water; T=$C/.worktrees/accept-w4-g5; K=$C/.local/w4-accept-m2
for label in u1 u2 u3 u4 u5; do
  filt=$(node -e 'const m=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).find(x=>x.label===process.argv[2]);const fs=require("fs"),p=process.argv[3];const s=fs.readFileSync(p,"utf8");if(s.split(m.old).length!==2)process.exit(3);fs.writeFileSync(p,s.replace(m.old,m.new));console.log(m.filter)' $K/g5-case-mutants.json $label $T/packages/junk-clean/src/native_windows.rs) || { echo "$label anchor"; exit 2; }
  echo "== $label (filter $filt)"; bash $K/g5-unit.sh g5-proof-$label.txt mutated $filt
done
( cd $T && echo "final status: '$(git status --porcelain)'" && sha256sum packages/junk-clean/src/native_windows.rs )
