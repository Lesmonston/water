// Additive controller gates. The original R helper/lock/fixtures remain unchanged.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {setup} from './parallel-next-common.mjs';
import {rustEnvironment} from './next-core-runtime.mjs';
const modes=['resume','lock','fmt','test','suite','clippy','metadata','bridge','red-behavior','red-nc1','red-nc2','red-nc3'];
const ctx=setup(['WATER-W1-R'],modes);let fault;
try{const overlay=JSON.parse(readFileSync(join(ctx.controller,'contracts/native-scan-addendum-v1/freeze.lock.json'),'utf8'));for(const f of overlay.files)assert.equal(createHash('sha256').update(readFileSync(join(ctx.root,f.path))).digest('hex'),f.sha256,f.path);assert.equal(readFileSync(join(ctx.root,'contracts/native-scan-addendum-v1/freeze.lock.json'),'utf8'),JSON.stringify(overlay,null,2)+'\n');
if(ctx.mode==='resume'){assert.equal(ctx.record.before.head,ctx.task.addendum01.resumeCommit);assert.equal(ctx.record.before.status,'');assert(!ctx.task.newProductTestsRun);assert(!existsSync(join(ctx.root,ctx.task.outputRoot)));}
ctx.command(process.execPath,['scripts/native-scan-check.mjs','--task','WATER-W1-R','--mode',ctx.mode==='resume'?'fixtures':ctx.mode,...(ctx.finalGate?['--final']:[])],180000);
if(ctx.mode==='resume'||ctx.mode==='bridge'){const rust=rustEnvironment(ctx),product=ctx.mode==='bridge';const artifacts=rust.build(product?'packages/native-scan/Cargo.toml':'packages/redacted-report/Cargo.toml',product?'water-native-scan':'water-redacted-report',product?['water_native_scan','water_scope_registry','water_redacted_report','water_contracts','serde_json']:['water_redacted_report','water_contracts','serde_json']);const name=product?'native_scan_addendum_bridge':'native_scan_addendum_probe',bin=join(rust.tmp,ctx.stamp+'-'+name+'.exe');ctx.command(rust.rustc,['--edition=2024','--crate-name',name,'scripts/acceptance/'+name.replaceAll('_','-')+'.rs','-L','dependency='+rust.deps,...artifacts.flatMap(a=>['--extern',a.crate+'='+a.filename]),'-o',bin],180000);ctx.env.WATER_NATIVE_WALK_INDEX=join(ctx.root,'.local/native-walk-fixtures/index.json');ctx.record.addendumProof=JSON.parse(ctx.command(bin,[],180000));}
}catch(e){fault=e;}ctx.finish(fault);
