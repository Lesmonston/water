// Additive freeze over all old locks and current verified product code.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {existsSync,lstatSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
const json=p=>JSON.parse(readFileSync(p,'utf8').replace(/^\ufeff/,'')),hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const old=json('contracts/native-review-addendum-v1/freeze.lock.json'),inheritedLocks=[...old.inheritedLocks,'contracts/native-review-addendum-v1/freeze.lock.json'];
const prior=new Map();for(const p of inheritedLocks)for(const f of json(p).files){assert.equal(hash(f.path),f.sha256,f.path);if(prior.has(f.path))assert.equal(prior.get(f.path),f.sha256);prior.set(f.path,f.sha256);}assert.equal(prior.size,341);
const paths=new Set(inheritedLocks);
function visit(dir){for(const e of readdirSync(dir,{withFileTypes:true})){assert(!e.isSymbolicLink());const p=dir+'/'+e.name;if(e.isDirectory())visit(p);else if(!p.endsWith('/freeze.lock.json'))paths.add(p);}}
for(const dir of ['contracts/interactive-host-v1','contracts/live-workspace-v1','contracts/root-marker-v1','contracts/interactive-batch-v1'])visit(dir);
const git=spawnSync('git',['-c','core.hooksPath=NUL','ls-files','-z','--','packages','prototypes','crates'],{encoding:'utf8',windowsHide:true});assert.equal(git.status,0);
for(const p of git.stdout.split('\0').filter(Boolean))paths.add(p);
for(const p of ['Cargo.toml','Cargo.lock','docs/decisions/ADR-015-interactive-host-and-consented-marker-reader.md','docs/M1-INTERACTIVE-WAVE-PLAN-20261019.md','docs/dispatch/W1-INTERACTIVE-WORKER-RULES.md','scripts/interactive-wave-check.mjs','scripts/interactive-wave-baseline.mjs','scripts/interactive-wave-fixtures.mjs','scripts/acceptance/prepare-interactive-wave.mjs','scripts/acceptance/freeze-interactive-wave.mjs','scripts/acceptance/register-interactive-wave.mjs','scripts/acceptance/interactive-dependency-probe.rs','scripts/acceptance/root-marker-abi-probe.rs','scripts/acceptance/interactive-host-replay.mjs','scripts/acceptance/interactive-host-driver.mjs',...['x','y','z'].map(s=>'docs/acceptance/wave1/'+s+'/.gitattributes')])paths.add(p);
for(const p of paths)assert(lstatSync(p).isFile()&&!lstatSync(p).isSymbolicLink());
const lock='contracts/interactive-batch-v1/freeze.lock.json';assert(!existsSync(lock));
const files=[...paths].sort().map(path=>({path,sha256:hash(path)})),uniqueFiles=new Set([...prior.keys(),...paths]).size;
writeFileSync(lock,JSON.stringify({freeze_version:'water.interactive-batch.freeze.v1',inheritedLocks,inheritedUniqueFiles:341,uniqueFiles,files},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({entries:files.length,inheritedLocks:inheritedLocks.length,inheritedUnique:341,uniqueFiles}));
