// Frozen bounded fixture preparation for N only. No cleanup, ACL, or arbitrary target.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync,lstatSync,mkdirSync,readFileSync,realpathSync,symlinkSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
const hash=b=>createHash('sha256').update(b).digest('hex');
export function prepareNativeFixtures(ctx){
 assert.equal(ctx.task.id,'WATER-W1-N');assert.equal(process.platform,'win32');
 const parent=ctx.local('.local/native-root-fixtures'),base=join(parent,'batch-v1'),indexPath=join(parent,'index.json');
 if(!existsSync(indexPath)){
  assert(!existsSync(base),'Partial old batch retained; controller must review, do not recreate');mkdirSync(base);
  for(const p of ['normal-a','normal-a/nested','normal-b','trap-target'])mkdirSync(join(base,p));
  const files=[['normal-a/nested/leaf.txt','WATER-N leaf\n'],['trap-target/sentinel.txt','WATER-N trap retained\n']];
  for(const [p,text]of files)writeFileSync(join(base,p),text,{flag:'wx'});
  symlinkSync(join(base,'trap-target'),join(base,'final-junction'),'junction');
  symlinkSync(join(base,'trap-target'),join(base,'normal-a/ancestor-junction'),'junction');
  const index={fixture_version:'water.native-root-fixtures.v1',base,normal_a:join(base,'normal-a'),normal_b:join(base,'normal-b'),nested:join(base,'normal-a/nested'),file:join(base,'normal-a/nested/leaf.txt'),missing:join(base,'normal-a/not-created'),final_reparse:join(base,'final-junction'),ancestor_reparse:join(base,'normal-a/ancestor-junction'),ancestor_child:join(base,'normal-a/ancestor-junction/sentinel.txt'),trap:join(base,'trap-target'),files:files.map(([p,text])=>({path:join(base,p),sha256:hash(Buffer.from(text)),bytes:Buffer.byteLength(text)})),content_bytes:files.reduce((n,[,t])=>n+Buffer.byteLength(t),0)};
  writeFileSync(indexPath,JSON.stringify(index,null,2)+'\n',{flag:'wx'});
 }
 const bytes=readFileSync(indexPath),index=JSON.parse(bytes);assert.equal(index.fixture_version,'water.native-root-fixtures.v1');assert.equal(index.base,base);assert.equal(index.content_bytes,35);assert(index.files.length===2);
 for(const [key,path]of Object.entries({normal_a:'normal-a',normal_b:'normal-b',nested:'normal-a/nested',file:'normal-a/nested/leaf.txt',missing:'normal-a/not-created',final_reparse:'final-junction',ancestor_reparse:'normal-a/ancestor-junction',ancestor_child:'normal-a/ancestor-junction/sentinel.txt',trap:'trap-target'}))assert.equal(index[key],join(base,path));
 assert.deepEqual(index.files.map(f=>f.path),['normal-a/nested/leaf.txt','trap-target/sentinel.txt'].map(p=>join(base,p)));
 for(const p of [base,index.normal_a,index.normal_b,index.nested,index.trap]){assert(lstatSync(p).isDirectory()&&!lstatSync(p).isSymbolicLink());ctx.within(ctx.root,p);}
 for(const p of [index.final_reparse,index.ancestor_reparse]){assert(lstatSync(p).isSymbolicLink());assert.equal(realpathSync(p).toLowerCase(),realpathSync(index.trap).toLowerCase());}
 assert(!existsSync(index.missing));for(const f of index.files){assert(lstatSync(f.path).isFile()&&!lstatSync(f.path).isSymbolicLink());assert.equal(hash(readFileSync(f.path)),f.sha256);}
 return {index,indexPath,sha256:hash(bytes)};
}
