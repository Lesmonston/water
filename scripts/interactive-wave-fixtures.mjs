// Frozen bounded factories only; no deletion/cleanup/real-user inputs.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync,linkSync,lstatSync,mkdirSync,readFileSync,readdirSync,realpathSync,symlinkSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {prepareNativeWalkFixtures} from './prepare-native-walk-fixtures.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
export function prepareInteractiveFixtures(ctx) {
  if(ctx.task.id==='WATER-W1-X') return prepareNativeWalkFixtures({...ctx,task:{...ctx.task,id:'WATER-W1-R'}});
  assert.equal(ctx.task.id,'WATER-W1-Z');
  const d=JSON.parse(readFileSync(join(ctx.root,'contracts/root-marker-v1/FIXTURES.json')));
  const parent=ctx.local('.local/root-marker-fixtures'),base=join(parent,'batch-v1'),indexPath=join(parent,'index.json');
  const payloads=new Map([
    ['good/package.json',Buffer.from(d.good_raw)],['invalid/package.json',Buffer.from(d.invalid_utf8)],
    ['malformed/package.json',Buffer.from(d.malformed_raw)],['exact/package.json',Buffer.from('{}'+' '.repeat(d.cap-2))],
    ['oversize/package.json',Buffer.from('{}'+' '.repeat(d.cap-1))],['other/package.json',Buffer.from('{}')],
    ['trap/private.json',Buffer.from('{"name":"FAKE_OUTSIDE_CANARY"}')],
  ]);
  if(!existsSync(indexPath)) {
    assert(!existsSync(base),'Partial fixture retained; controller review required');mkdirSync(base);
    for(const dir of d.directories) mkdirSync(join(base,dir));
    for(const [p,bytes] of payloads) writeFileSync(join(base,p),bytes,{flag:'wx'});
    mkdirSync(join(base,'directory/package.json'));linkSync(join(base,'trap/private.json'),join(base,'hardlink/package.json'));
    symlinkSync(join(base,'trap'),join(base,'link/package.json'),'junction');
    const files=[...payloads].map(([path,b])=>({path,bytes:b.length,sha256:hash(b)}));
    writeFileSync(indexPath,JSON.stringify({fixture_version:d.version,base,roots:Object.fromEntries(d.directories.map(n=>[n,join(base,n)])),files,literal_payload_bytes:files.reduce((n,f)=>n+f.bytes,0),cap:d.cap},null,2)+'\n',{flag:'wx'});
  }
  const raw=readFileSync(indexPath),index=JSON.parse(raw);assert.equal(index.base,base);assert.equal(index.fixture_version,d.version);
  assert.deepEqual(readdirSync(base).sort(),[...d.directories].sort());
  assert.equal(index.files.length,payloads.size);
  for(const name of d.directories) {assert.equal(index.roots[name],join(base,name));assert(lstatSync(index.roots[name]).isDirectory()&&!lstatSync(index.roots[name]).isSymbolicLink());ctx.within(ctx.root,index.roots[name]);}
  for(const [p,expected] of payloads) {assert(lstatSync(join(base,p)).isFile()&&!lstatSync(join(base,p)).isSymbolicLink());assert.deepEqual(readFileSync(join(base,p)),expected);const f=index.files.find(f=>f.path===p);assert(f&&f.bytes===expected.length&&f.sha256===hash(expected));}
  assert.equal(lstatSync(join(base,'hardlink/package.json')).nlink,2);assert.equal(lstatSync(join(base,'trap/private.json')).nlink,2);
  assert(lstatSync(join(base,'link/package.json')).isSymbolicLink());assert.equal(realpathSync(join(base,'link/package.json')),index.roots.trap);
  assert(lstatSync(join(base,'directory/package.json')).isDirectory());assert.deepEqual(readdirSync(index.roots.missing),[]);
  for(const n of d.directories.filter(n=>n!=='missing'))assert.deepEqual(readdirSync(index.roots[n]),[n==='trap'?'private.json':'package.json']);
  assert(index.literal_payload_bytes<1048576);return{index,indexPath,sha256:hash(raw)};
}
