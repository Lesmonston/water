#!/usr/bin/env bash
# Eleventh integration in one command, stopping at the first failure:
#   1. move the two integration trees to new branches at the tested commit and write the override manifests;
#   2. the gates part by part, one cargo tree at a time (scan, rules, ui in tree A; host in tree B; then the service);
#   3. native --final (one Flick window, fixture only, with the wave 13 skip round)   -- opens a window
#   4. release build, installer and portable zip, release smoke                     -- opens a window
#   5. read-only recheck of D: and F:\Mirasim-A with the release (same as the 9th and 10th) -- opens a window, reads real data
#   6. read-only common-locations checkup (C:) with the release, then common-check.cjs   -- opens a window, reads real data
#   7. archive every part.
# The folder picker, executor, declarations, duplicates, process and installed-apps packages changed only in README.md
# (process-scan also in its test data, tested 4/4 then) since the tenth check's 0daabda2, so its results stand for them.
# Tell the user before running it (steps 3-6 open windows). Usage: bash .local/w13-integ11/all.sh <tested commit>
# Native retry after the gates passed on the same commit: INTEG11_HOST_PARTS=host,host2 FROM=native bash all.sh <commit>
set -u
R=/f/new/smaltalk/water; K=$R/.local/w13-integ11; H=${1:?tested commit}; cd $R || exit 2
log() { echo "[$(date -u +%H:%M:%S)] $*" | tee -a $K/logs/all.txt; }
fail() { log "STOP: $*"; exit 1; }
mkdir -p $K/logs
CHANGED=$(git diff --name-only 0daabda2 $H -- packages/junk-clean packages/cleanup-manifest packages/dup-finder packages/process-scan packages/installed-apps packages/native-picker packages/native-root packages/scope-registry | grep -v '/README.md$' | grep -v '^packages/process-scan/tests/')
[ -z "$CHANGED" ] || fail "changed since the tenth check, add them to the parts: $CHANGED"
for t in a b; do W=.worktrees/integ-w8$t
  [ -z "$(git -C $W status --porcelain)" ] || fail "tree $t not clean"
  git -C $W checkout -q -B controller/integ11-$t $H || fail "checkout $t"; done
node $K/make-manifests.mjs $H >> $K/logs/all.txt || fail "manifests"
step() { local part=$1; shift; bash $K/run.sh $part "$@" | tee -a $K/logs/all.txt | grep -qE "rc=([1-9]|null)" && fail "$part $*"; return 0; }
PARTS=${INTEG11_HOST_PARTS:-host}; HOST=${PARTS##*,}
if [ "${FROM:-}" = native ]; then
  log "resume at native with $HOST (gates passed earlier on $H)"; step $HOST lock check test
else
step scan lock check test real:final
step rules lock check test real:final
step ui check test browser
step $HOST lock check test
step svc lock check test real:final
fi
log "gates done"
step $HOST native:final
log "native done"
bash $K/build-release.sh > $K/logs/release.txt 2>&1 || fail "release build"
S=$(git rev-parse --short=8 $H); REL=$R/.local/release/flick-0.1.0-$S
powershell.exe -NoProfile -ExecutionPolicy Bypass -File packaging/windows/build.ps1 -Exe "$(cygpath -w $REL/flick.exe)" -Version 0.1.0 -OutDir "$(cygpath -w $REL/dist)" >> $K/logs/release.txt 2>&1 || fail "installer"
(cd $REL/dist && sha256sum -c SHA256SUMS.txt) >> $K/logs/release.txt 2>&1 || fail "SHA256SUMS check"
STAMP=$(date -u +%Y%m%dT%H%M%SZ); mkdir -p $K/release-smoke-$STAMP
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/acceptance/w4-g6-second-instance.ps1 -Exe "$(cygpath -w $REL/flick.exe)" -DataDir "$(cygpath -w $K/release-smoke-$STAMP)\\data" -EvidencePrefix "$(cygpath -w $K)\\release-$STAMP" -Title Flick >> $K/logs/release.txt 2>&1 || fail "release smoke"
log "release $REL done"
observe() { powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$(cygpath -w $K/tools/m35-close-observe.ps1)" -Exe "$(cygpath -w $REL/flick.exe)" -DataDir "$(cygpath -w $1/data)" -OutDir "$(cygpath -w $1/out)" -StepsPath "$(cygpath -w $2)" -Title Flick; }
RUN=$K/real/$STAMP; mkdir -p $RUN/out
node $K/tools/write-settings.mjs "$(cygpath -w $RUN/data)" mirasim-a 'F:\Mirasim-A' >> $K/logs/all.txt || fail "recheck settings"
observe $RUN $K/tools/steps-real.json > $K/logs/recheck.txt 2>&1 || fail "recheck"
node $K/tools/summarize.cjs $RUN $RUN/summary.json > /dev/null || fail "summary"
log "recheck $STAMP done"
CSTAMP=$(date -u +%Y%m%dT%H%M%SZ); CRUN=$K/real-common/$CSTAMP; mkdir -p $CRUN/out
node $K/tools/write-settings.mjs "$(cygpath -w $CRUN/data)" >> $K/logs/all.txt || fail "common settings"
observe $CRUN $K/tools/steps-common.json > $K/logs/recheck-common.txt 2>&1 || fail "common recheck"
node $K/tools/summarize.cjs $CRUN $CRUN/summary.json > /dev/null || fail "common summary"
node $K/tools/common-check.cjs $CRUN $R/.local/w12-integ10/real-common/20261107T154823Z $CRUN/common-check.json | tee -a $K/logs/all.txt || fail "common check"
node -e "const r=require(process.argv[1]);process.exit(r.junctions.items_referenced_by_hidden_system===0?0:1)" "$(cygpath -w $CRUN/common-check.json)" || fail "items still referenced by hidden+system junctions"
log "common recheck $CSTAMP done"
for p in scan rules ui svc; do step $p archive; done; for p in ${PARTS//,/ }; do step $p archive; done
log "ALL DONE tested=$H release=$REL recheck=$STAMP common=$CSTAMP"
