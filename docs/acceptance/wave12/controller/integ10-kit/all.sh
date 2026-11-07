#!/usr/bin/env bash
# Tenth integration in one command, stopping at the first failure:
#   1. move the two integration trees to new branches at the tested commit and write the override manifests;
#   2. the gates part by part, one cargo tree at a time (exec, rules, ui in tree A; host in tree B; then the service);
#   3. native --final (one Flick window, fixture only)            -- opens a window
#   4. the folder picker in real dialogs                           -- opens dialogs
#   5. release build, installer and portable zip, release smoke   -- opens a window
#   6. read-only recheck of D: and F:\Mirasim-A with the release  -- opens a window, reads real data read-only
#   7. archive every part.
# Tell the user before running it (steps 3-6 open windows). Usage: bash .local/w12-integ10/all.sh <tested commit>
# Native retry after the gates passed on the same commit: INTEG10_HOST_PARTS=host,host2 FROM=native bash all.sh <commit>
# runs host2's lock, check and test, then its one window, and carries on from there (the archive covers every part).
set -u
R=/f/new/smaltalk/water; K=$R/.local/w12-integ10; H=${1:?tested commit}; cd $R || exit 2
log() { echo "[$(date -u +%H:%M:%S)] $*" | tee -a $K/logs/all.txt; }
fail() { log "STOP: $*"; exit 1; }
mkdir -p $K/logs
[ -z "$(git diff --name-only 3d8bec11 $H -- packages/junk-scan packages/cleanup-manifest packages/dup-finder packages/process-scan packages/installed-apps)" ] || fail "scan/decl/dup/process/apps changed since the ninth check; add them to the parts"
for t in a b; do W=.worktrees/integ-w8$t
  [ -z "$(git -C $W status --porcelain)" ] || fail "tree $t not clean"
  git -C $W checkout -q -B controller/integ10-$t $H || fail "checkout $t"; done
node $K/make-manifests.mjs $H >> $K/logs/all.txt || fail "manifests"
step() { local part=$1; shift; bash $K/run.sh $part "$@" | tee -a $K/logs/all.txt | grep -qE "rc=([1-9]|null)" && fail "$part $*"; return 0; }
PARTS=${INTEG10_HOST_PARTS:-host}; HOST=${PARTS##*,}
if [ "${FROM:-}" = native ]; then
  log "resume at native with $HOST (gates passed earlier on $H)"; step $HOST lock check test
else
step exec lock check test real:final
step rules lock check test real:final
step ui check test browser
step $HOST lock check test
step svc lock check test real:final
fi
log "gates done"
step $HOST native:final
log "native done"
bash $K/picker-real.sh > $K/logs/picker-real.txt 2>&1; grep -q "driver rc=0" $K/logs/picker-real.txt || fail "picker"
grep -c "title=Flick - Select a read-only directory" $K/logs/picker-real.txt | xargs -I{} sh -c 'echo "picker dialogs titled Flick: {}"' | tee -a $K/logs/all.txt
bash $K/build-release.sh > $K/logs/release.txt 2>&1 || fail "release build"
S=$(git rev-parse --short=8 $H); REL=$R/.local/release/flick-0.1.0-$S
powershell.exe -NoProfile -ExecutionPolicy Bypass -File packaging/windows/build.ps1 -Exe "$(cygpath -w $REL/flick.exe)" -Version 0.1.0 -OutDir "$(cygpath -w $REL/dist)" >> $K/logs/release.txt 2>&1 || fail "installer"
STAMP=$(date -u +%Y%m%dT%H%M%SZ); mkdir -p $K/release-smoke-$STAMP
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/acceptance/w4-g6-second-instance.ps1 -Exe "$(cygpath -w $REL/flick.exe)" -DataDir "$(cygpath -w $K/release-smoke-$STAMP)\\data" -EvidencePrefix "$(cygpath -w $K)\\release-$STAMP" -Title Flick >> $K/logs/release.txt 2>&1 || fail "release smoke"
log "release $REL done"
RUN=$K/real/$STAMP; mkdir -p $RUN/data $RUN/out
powershell.exe -NoProfile -Command "\$s=[ordered]@{settings_version='water.settings.v1';categories=[ordered]@{agent_tool=\$true;browser=\$true;system_temp=\$true;app_leftover=\$true;dev_cache=\$true;crash_log=\$true;gpu_system=\$true};custom_roots=@([ordered]@{root_id='mirasim-a';path='F:\\Mirasim-A';added_at=(Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')})}; [IO.File]::WriteAllText('$(cygpath -w $RUN/data)\\settings.json', (\$s | ConvertTo-Json -Depth 5), (New-Object Text.UTF8Encoding(\$false)))" || fail "recheck settings"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$(cygpath -w $K/tools/m35-close-observe.ps1)" -Exe "$(cygpath -w $REL/flick.exe)" -DataDir "$(cygpath -w $RUN/data)" -OutDir "$(cygpath -w $RUN/out)" -StepsPath "$(cygpath -w $K/tools/steps-real.json)" -Title Flick > $K/logs/recheck.txt 2>&1 || fail "recheck"
node $K/tools/summarize.cjs $RUN $RUN/summary.json > /dev/null || fail "summary"
log "recheck $STAMP done"
for p in exec rules ui svc; do step $p archive; done; for p in ${PARTS//,/ }; do step $p archive; done
log "ALL DONE tested=$H release=$REL recheck=$STAMP"
