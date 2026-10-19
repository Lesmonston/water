// Controller-only pre-dispatch revision. Preserve v1 lock/helper; no old products.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const old=JSON.parse(readFileSync('contracts/interactive-batch-v1/freeze.lock.json'));
const out='.local/interactive-wave-preflight-20261019/initial-freeze-failures';mkdirSync(out,{recursive:true});
// Reproduce the already observed pre-audit failure for a file-backed raw record.
for(const lane of ['X','Y','Z']) {
 const r=spawnSync(process.execPath,['scripts/interactive-wave-check.mjs','--task','WATER-W1-'+lane,'--mode','baseline'],{cwd:'.worktrees/'+lane.toLowerCase(),encoding:'utf8',windowsHide:true,timeout:10000});
 assert.equal(r.status,1);assert(r.stderr.includes('Frozen file changed: docs/acceptance/wave1/x/.gitattributes'));
 writeFileSync(out+'/'+lane+'.log',JSON.stringify({phase:'explicit zero-window reproduction after first observed failure',lane,exitCode:r.status})+'\n--- stdout ---\n'+r.stdout+'\n--- stderr ---\n'+r.stderr);
}
for(const s of ['x','y','z']) {const path='docs/acceptance/wave1/'+s+'/.gitattributes';const b=readFileSync(path,'utf8');writeFileSync(path,'.gitattributes text eol=lf\n'+b);}
let helper=readFileSync('scripts/interactive-wave-check.mjs','utf8');
helper=helper.replace("let fault,fixture;","let fault,fixture;\nfunction checkoutObjects(){const lock=JSON.parse(readFileSync(join(ctx.controller,task.contractLock)));for(const f of lock.gitObjects??[])assert.equal(ctx.git(['hash-object','--path='+f.path,f.path]),f.objectId,'Verified legacy Git content changed: '+f.path);}");
assert(helper.includes('function checkoutObjects()'));
helper=helper.replace(" assert.equal(process.platform,'win32');"," checkoutObjects();\n assert.equal(process.platform,'win32');");
helper=helper.replace('ctx.finish(fault);','try{checkoutObjects();}catch(e){fault??=e;}\nctx.finish(fault);');
writeFileSync('scripts/interactive-wave-check-r2.mjs',helper);
const objectPaths=['prototypes/evidence-reader/index.html','prototypes/evidence-reader/styles.css','prototypes/scan-review/index.html','prototypes/scan-review/styles.css'];
const gitObjects=objectPaths.map(path=>{const r=spawnSync('git',['-c','core.hooksPath=NUL','rev-parse','HEAD:'+path],{encoding:'utf8',windowsHide:true});assert.equal(r.status,0);return{path,objectId:r.stdout.trim()};});
const paths=new Set(old.files.map(f=>f.path).filter(p=>!objectPaths.includes(p)));
for(const p of ['contracts/interactive-batch-v1/freeze.lock.json','scripts/interactive-wave-check-r2.mjs','scripts/acceptance/revise-interactive-preflight.mjs','docs/dispatch/wave1/INTERACTIVE-PREFLIGHT-ERRATUM-01-20261019.md'])paths.add(p);
const prior=new Set();for(const p of old.inheritedLocks)for(const f of JSON.parse(readFileSync(p)).files)prior.add(f.path);assert.equal(prior.size,341);
const files=[...paths].sort().map(path=>({path,sha256:hash(readFileSync(path))}));
const uniqueFiles=new Set([...prior,...paths,...objectPaths]).size;
writeFileSync('contracts/interactive-batch-v1/freeze-r2.lock.json',JSON.stringify({freeze_version:'water.interactive-batch.freeze.r2',supersedes:{commit:'8e73790dc11d01593cbc92772eab429f4b42e468',lock:'contracts/interactive-batch-v1/freeze.lock.json',reason:'Pre-dispatch checkout EOL mismatch; zero product/UI execution'},inheritedLocks:old.inheritedLocks,inheritedUniqueFiles:341,uniqueFiles,files,gitObjects},null,2)+'\n');
for(const p of ['docs/dispatch/wave1/manifest.json','docs/dispatch/registry.json']) {const d=JSON.parse(readFileSync(p));for(const t of d.tasks.filter(t=>['WATER-W1-X','WATER-W1-Y','WATER-W1-Z'].includes(t.id))) {t.contractLock='contracts/interactive-batch-v1/freeze-r2.lock.json';t.helper='scripts/interactive-wave-check-r2.mjs';t.preflightErratum='docs/dispatch/wave1/INTERACTIVE-PREFLIGHT-ERRATUM-01-20261019.md';}writeFileSync(p,JSON.stringify(d,null,2)+'\n');}
console.log(JSON.stringify({uniqueFiles,physicalEntries:files.length,gitObjects:gitObjects.length,inheritedLocks:old.inheritedLocks.length,oldLocksChanged:false,oldProductsChanged:false,preflightStatus:'DRAFT'}));
