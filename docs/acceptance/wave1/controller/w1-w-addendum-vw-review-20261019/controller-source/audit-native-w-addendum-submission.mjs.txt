// Read-only receipt audit. Never launches the native producer or a browser.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdirSync, readFileSync, readdirSync, writeFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {proofAudit} from '../scope-export-proof.mjs';

const root = resolve('.'), tree = join(root, '.worktrees/w');
const submitted = 'df9255b73e1037eda7599098de900bb4705f5921';
const implementation = '020cd89cd592471836cca8fa5d263176348b2165';
const previous = 'b65902d8f702bf34097adffd7fbaa7daddabe934';
const json = p => JSON.parse(readFileSync(p, 'utf8'));
const hash = b => createHash('sha256').update(b).digest('hex');
const task = json('docs/dispatch/wave1/manifest.json').tasks.find(t => t.id === 'WATER-W1-W');
const addendum = task.addendum01, prefix = addendum.evidencePrefix;
const output = join(root, '.local/checks/controller-w-addendum-20261019');
mkdirSync(output, {recursive:true});
function git(args, encoding = 'utf8', input) {
  const r = spawnSync('git', ['-c', 'core.hooksPath=NUL', '-c', 'core.fsmonitor=false', ...args],
    {cwd:tree, encoding, input, windowsHide:true, timeout:30000, maxBuffer:96*1024*1024});
  assert(!r.error && r.status === 0, String(r.stderr));
  return encoding ? r.stdout.trim() : r.stdout;
}
function sourceState(state, dir, commit) {
  for (const f of state.files) {
    const bytes = readFileSync(join(dir, f.snapshot));
    assert.equal(hash(bytes), f.sha256, f.path);
    if (commit) assert.deepEqual(bytes, git(['show', commit + ':' + f.path], null), f.path);
  }
  const digest = list => hash(Buffer.from(JSON.stringify(list.map(({path,sha256}) => ({path,sha256})))));
  assert.equal(state.productionHash, digest(state.files.filter(f => !f.test)));
  assert.equal(state.testHash, digest(state.files.filter(f => f.test)));
}
function archive(path) {
  const a = json(join(tree,path));
  assert.equal(a.totalFiles,a.entries.length);
  const batch = git(['cat-file','--batch'],null,a.entries.map(f=>submitted+':'+f.archive+'\n').join(''));
  let cursor=0, total=0;
  for (const f of a.entries) {
    assert(f.archive.startsWith('docs/acceptance/wave1/w/') && !f.archive.includes('..'));
    assert((f.source.startsWith('.local/checks/WATER-W1-W/') || f.source.startsWith('.local/checks/WATER-W1-W-ADDENDUM-01/') || f.source.startsWith('.local/browser-lab/')) && !f.source.includes('..'));
    const bytes=readFileSync(join(tree,f.archive));
    assert.deepEqual(bytes,readFileSync(join(tree,f.source)),f.archive);
    assert.equal(bytes.length,f.bytes); assert.equal(hash(bytes),f.sha256);
    const end=batch.indexOf(10,cursor), n=Number(batch.subarray(cursor,end).toString().split(' ')[2]);
    assert(Number.isInteger(n)); assert.deepEqual(batch.subarray(end+1,end+1+n),bytes,f.archive+': committed');
    cursor=end+2+n; total+=n;
  }
  assert.equal(cursor,batch.length); assert.equal(total,a.totalBytes);
  return {files:a.totalFiles,bytes:total,indexSha256:hash(readFileSync(join(tree,path)))};
}
const result={startedAt:new Date().toISOString(),submitted,implementation,previous,systemNativeDialogsLaunched:0,physicalFixtureAccess:false};
try {
  assert.equal(git(['rev-parse','HEAD']),submitted); assert.equal(git(['branch','--show-current']),task.branch);
  assert.equal(git(['status','--porcelain','--untracked-files=all']),'');
  for (const sha of [task.baseCommit,previous,implementation]) git(['merge-base','--is-ancestor',sha,submitted]);
  assert.equal(git(['rev-parse',submitted+'^']),implementation);
  const changed=git(['diff','--name-only','-z',previous,submitted]).split('\0').filter(Boolean);
  const products=['prototypes/native-review/model.mjs','prototypes/native-review/tests/model.test.mjs'];
  for (const p of changed) assert(products.includes(p)||p===addendum.report||p.startsWith(prefix),p);
  assert.deepEqual(git(['diff','--name-only','-z',previous,implementation]).split('\0').filter(Boolean).sort(),products.sort());
  for (const line of git(['diff','--numstat',previous,implementation]).split('\n')) assert.equal(line.split('\t')[1],'0','Original assertions must remain');
  for (const p of git(['diff','--name-only','-z',implementation,submitted]).split('\0').filter(Boolean)) assert(p===addendum.report||p.startsWith(prefix),p);
  result.changedPaths=changed.length;
  result.originalArchive=archive('docs/acceptance/wave1/w/ARCHIVE.json');
  result.addendumArchive=archive(prefix+'ARCHIVE.json');
  const lock=json(addendum.contractLock), frozen=new Map();
  assert.equal(hash(readFileSync(addendum.contractLock)),addendum.lockSha256);
  for(const p of lock.inheritedLocks) for(const f of json(p).files) frozen.set(f.path,f.sha256);
  assert.equal(frozen.size,336);
  for(const dir of [root,tree]) for(const [p,expected] of frozen) assert.equal(hash(readFileSync(join(dir,p))),expected,p);
  for(const f of lock.files) {assert.equal(hash(readFileSync(join(root,f.path))),f.sha256); frozen.set(f.path,f.sha256);}
  assert.equal(frozen.size,341); result.frozenFiles=frozen.size;
  for(const f of lock.preservedSubmissionFiles) assert.equal(hash(readFileSync(join(tree,f.path))),f.sha256,f.path);
  const wrapper=join(tree,'.local/checks/WATER-W1-W-ADDENDUM-01'), original=join(tree,'.local/checks/WATER-W1-W');
  const records=dir=>readdirSync(dir).filter(n=>n.endsWith('-result.json')).map(file=>({file,data:json(join(dir,file))}));
  const archivedWrapperSources=new Set(json(join(tree,prefix+'ARCHIVE.json')).entries.map(e=>e.source));
  const all=records(wrapper).filter(r=>archivedWrapperSources.has('.local/checks/WATER-W1-W-ADDENDUM-01/'+r.file)), originals=records(original);
  const finals=[];
  for(const mode of ['check','test','browser']) {
    const matches=all.filter(({data:r})=>r.finalGate&&r.mode===mode&&r.status==='passed'&&r.before?.head===implementation);
    assert.equal(matches.length,1,mode);const f=matches[0],r=f.data;
    assert.deepEqual(r.before,{head:implementation,status:''});assert.deepEqual(r.after,r.before);assert.equal(r.error,null);
    sourceState(r.sourceState,wrapper,implementation);
    assert.equal(r.budgetProbe.failures.length,0);assert.equal(r.budgetProbe.observations.length,12);
    const red=json(join(wrapper,r.budgetProof.red)), green=json(join(wrapper,r.budgetProof.restored));
    sourceState(red.sourceState,wrapper);sourceState(green.sourceState,wrapper,implementation);
    assert.equal(red.mode,'red-budget');assert.equal(red.status,'passed');assert(red.observedExpectedFailure);
    assert.equal(red.sourceState.testHash,r.sourceState.testHash);assert.notEqual(red.sourceState.productionHash,r.sourceState.productionHash);
    assert.equal(red.budgetProbe.failures.length,12);assert.equal(green.budgetProbe.failures.length,0);
    assert.equal(green.mode,'suite');assert(Date.parse(green.startedAt)>Date.parse(red.endedAt));
    for(const s of red.sourceState.files) if(s.path!=='prototypes/native-review/model.mjs') {
      const good=r.sourceState.files.find(g=>g.path===s.path); assert.equal(s.sha256,good.sha256,s.path+': budget negative scope');
    }
    const old=originals.filter(({data:r})=>r.finalGate&&r.mode===mode&&r.status==='passed'&&r.before?.head===implementation);
    assert.equal(old.length,1);sourceState(old[0].data.sourceState,original,implementation);
    const proof={};proofAudit({output:original,record:proof},old[0].data.sourceState);
    assert.deepEqual(proof.proofAudit,old[0].data.proofAudit);
    for(const p of proof.proofAudit) {
      const bad=json(join(original,p.red)), restored=json(join(original,p.restored));
      const logs=bad.commands.filter(c=>c.log).map(c=>readFileSync(join(original,c.log),'utf8')).join('\n');
      assert(logs.includes(task.proofTargets[p.label]));
      assert.deepEqual([...logs.matchAll(/^# Subtest: (.+)\r?$/gm)].map(m=>m[1]).sort(),[...task.expectedTests,...task.expectedBrowserTests].sort());
      assert(logs.includes('# skipped 0'));assert(!/CDP timeout|download timed out|SyntaxError|ERR_MODULE_NOT_FOUND/.test(logs));
      sourceState(restored.sourceState,original,implementation);
    }
    finals.push({mode,wrapper:f.file,original:old[0].file,budgetProof:r.budgetProof,proofAudit:proof.proofAudit});
  }
  result.finals=finals;
  result.expectedBudgetRedRuns=all.filter(({data:r})=>r.mode==='red-budget'&&r.status==='passed').length;
  result.wrapperRuns=all.length;result.wrapperFailures=all.filter(({data:r})=>r.status!=='passed').map(r=>r.file);
  assert.equal(result.wrapperRuns,17);assert.equal(result.wrapperFailures.length,0);
  result.status='passed';
} catch(error) {result.status='failed';result.error=error.stack;process.exitCode=1;}
result.endedAt=new Date().toISOString();
const receipt=join(output,new Date().toISOString().replaceAll(':','-')+'-'+process.pid+'-evidence-audit.json');
writeFileSync(receipt,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({...result,receipt}));
