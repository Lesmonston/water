// Copy the AA->AD joint evidence by original bytes into the tracked acceptance folder with an index.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {copyFileSync,existsSync,mkdirSync,readFileSync,readdirSync,statSync,writeFileSync} from 'node:fs';
import {join,relative,resolve,sep} from 'node:path';
const root=resolve('.'),source=join(root,'.local/checks/controller-aaad-20261026'),target=join(root,'docs/acceptance/wave1/controller/w1-aaad-joint-20261026'),hash=b=>createHash('sha256').update(b).digest('hex');
assert(!existsSync(join(target,'ARCHIVE.json')),'Archive already written');mkdirSync(join(target,'controller'),{recursive:true});mkdirSync(join(target,'scripts'),{recursive:true});
const entries=[];
const add=(from,to)=>{const b=readFileSync(from);assert(statSync(from).isFile());copyFileSync(from,to);assert.equal(hash(readFileSync(to)),hash(b));entries.push({source:relative(root,from).split(sep).join('/'),archive:relative(root,to).split(sep).join('/'),bytes:b.length,sha256:hash(b)});};
for(const name of readdirSync(source).sort())add(join(source,name),join(target,'controller',name));
for(const name of ['prepare-aaad-joint.mjs','check-aaad-joint.mjs','aaad-workspace-runner.mjs','aaad-picker-action.ps1','aaad-watch-exit.ps1','archive-aaad-joint.mjs'])add(join(root,'scripts/acceptance',name),join(target,'scripts',name));
const index={archive_version:'water.controller-archive.v1',createdAt:new Date().toISOString(),scope:'Real AA -> AB/AD joint acceptance 2026-10-26; excludes cache, binaries, Chrome profile and fixture payload',files:entries.length,bytes:entries.reduce((n,e)=>n+e.bytes,0),entries};
writeFileSync(join(target,'ARCHIVE.json'),JSON.stringify(index,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({files:index.files,bytes:index.bytes}));
