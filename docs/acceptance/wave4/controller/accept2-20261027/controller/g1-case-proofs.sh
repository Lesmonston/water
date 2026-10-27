#!/usr/bin/env bash
# Prove the round-2 controller cases discriminate: run them on the round-1 source (b593f0be)
# and under the targeted mutants in g1-case-mutants.json. Every run restores src from HEAD.
set -u
C=/f/new/smaltalk/water; T=$C/.worktrees/accept2-w4-g1; K=$C/.local/w4-accept2
for spec in "r1-races:controller_r" "r1-100k:controller_100k"; do
  name=${spec%%:*}; filt=${spec#*:}
  ( cd $T && git checkout b593f0be -- packages/junk-clean/src ) || exit 2
  echo "== $name (round-1 src, filter $filt)"; bash $K/g1-cases-mutated.sh g1-proof-$name.txt $filt
done
for label in m1 m2 m3; do
  filt=$(node -e 'const m=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).find(x=>x.label===process.argv[2]);const fs=require("fs"),p=process.argv[3];const s=fs.readFileSync(p,"utf8");if(s.split(m.old).length!==2)process.exit(3);fs.writeFileSync(p,s.replace(m.old,m.new));console.log(m.filter)' $K/g1-case-mutants.json $label $T/packages/junk-clean/src/native_windows.rs) || { echo "$label anchor"; exit 2; }
  echo "== $label (filter $filt)"; bash $K/g1-cases-mutated.sh g1-proof-$label.txt $filt
done
( cd $T && echo "final status: '$(git status --porcelain)'" && sha256sum packages/junk-clean/src/native_windows.rs )
