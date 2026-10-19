// Additive exact freeze: preserve all old physical locks and Git identities.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {existsSync,lstatSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex'),json=p=>JSON.parse(readFileSync(p));
function git(args,input){const r=spawnSync('git',['-c','core.hooksPath=NUL',...args],{encoding:input===undefined?'utf8':null,input,windowsHide:true,maxBuffer:64*1024*1024});assert.equal(r.status,0,String(r.stderr));return input===undefined?r.stdout.trim():r.stdout;}
const previous='contracts/interactive-batch-v1/freeze-r2.lock.json',old=json(previous),inheritedLocks=[...old.inheritedLocks,previous],prior=new Set(),objects=new Map();
for(const p of inheritedLocks){const l=json(p);for(const f of l.files){assert.equal(hash(f.path),f.sha256,f.path);prior.add(f.path);}for(const f of l.gitObjects??[]){assert.equal(git(['hash-object','--path='+f.path,f.path]),f.objectId);objects.set(f.path,f.objectId);prior.add(f.path);}}
assert.equal(prior.size,426);const paths=new Set(inheritedLocks);
function visit(dir){for(const e of readdirSync(dir,{withFileTypes:true})){assert(!e.isSymbolicLink());const p=dir+'/'+e.name;if(e.isDirectory())visit(p);else if(!p.endsWith('/freeze.lock.json'))paths.add(p);}}
for(const p of['contracts/project-session-v1','contracts/project-workspace-v1','contracts/project-batch-v1'])visit(p);
const products=git(['ls-files','-z','--','packages','prototypes','crates']).split('\0').filter(Boolean);
for(const p of products)paths.add(p);
// Y's new .gitattributes is an existing text file whose self-checkout EOL differs.
const attr='prototypes/live-workspace/.gitattributes';objects.set(attr,git(['rev-parse','HEAD:'+attr]));
for(const p of['Cargo.toml','Cargo.lock','docs/decisions/ADR-016-consented-project-session.md','docs/M1-PROJECT-CONSENT-PLAN-20261019.md','docs/dispatch/W1-PROJECT-WORKER-RULES.md','scripts/project-wave-check.mjs','scripts/project-wave-fixtures.mjs','scripts/project-wave-dependencies.mjs','scripts/project-wave-baseline.mjs','scripts/acceptance/prepare-project-wave.mjs','scripts/acceptance/prepare-project-check.mjs','scripts/acceptance/register-project-wave.mjs','scripts/acceptance/freeze-project-wave.mjs','scripts/acceptance/capture-project-inputs.mjs','scripts/acceptance/project-dependency-capture.rs','scripts/acceptance/project-host-replay.mjs','scripts/acceptance/project-host-driver.mjs','scripts/acceptance/project-platform-probe.mjs','scripts/acceptance/native-vw-private-browser.mjs','scripts/browser-lab.mjs',...['aa','ab'].map(s=>'docs/acceptance/wave1/'+s+'/.gitattributes')])paths.add(p);
for(const p of objects.keys())paths.delete(p);
const files=[...paths].sort().map(path=>{assert(lstatSync(path).isFile()&&!lstatSync(path).isSymbolicLink());return{path,sha256:hash(path)};});
const gitObjects=[...objects].sort().map(([path,objectId])=>({path,objectId})),uniqueFiles=new Set([...prior,...paths,...objects.keys()]).size;
const lock='contracts/project-batch-v1/freeze.lock.json';assert(!existsSync(lock));writeFileSync(lock,JSON.stringify({freeze_version:'water.project-batch.freeze.v1',inheritedLocks,inheritedUniqueFiles:426,uniqueFiles,files,gitObjects},null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({physicalEntries:files.length,gitObjects:gitObjects.length,inheritedLocks:inheritedLocks.length,inheritedUnique:426,uniqueFiles}));
