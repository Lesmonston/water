#!/usr/bin/env bash
# Round 3: prove the controller race cases still discriminate on the addendum 02 source, under the
# targeted mutants in g1-case-mutants.json (m4 is new for addendum 02 item 1). Every run restores src.
set -u
C=/f/new/smaltalk/water; T=$C/.worktrees/accept3-w4-g1; K=$C/.local/w4-accept3
for label in m1 m2 m3 m4; do
  filt=$(node -e 'const m=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).find(x=>x.label===process.argv[2]);const fs=require("fs"),p=process.argv[3];const s=fs.readFileSync(p,"utf8");if(s.split(m.old).length!==2)process.exit(3);fs.writeFileSync(p,s.replace(m.old,m.new));console.log(m.filter)' $K/g1-case-mutants.json $label $T/packages/junk-clean/src/native_windows.rs) || { echo "$label anchor"; exit 2; }
  echo "== $label (filter $filt)"; bash $K/g1-cases-mutated.sh g1-proof-$label.txt $filt
done
( cd $T && echo "final status: '$(git status --porcelain)'" && sha256sum packages/junk-clean/src/native_windows.rs )
