import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {captureProjectDependencies} from './project-wave-dependencies.mjs';
import {assertReviewInput} from '../prototypes/native-review/model.mjs';
export function projectBaseline(ctx){
 const source=JSON.parse(readFileSync(join(ctx.root,'contracts/project-session-v1/CASES.json')));assert.equal(source.cases.length,7);for(const e of source.cases)assertReviewInput(e.bundle);
 if(ctx.task.id==='WATER-W1-AA'){
  const c=captureProjectDependencies(ctx);assert.deepEqual(c.data.cases,source.cases.slice(0,6));return{actual_P_R_E_H_Q_Z:true,actual_X_shared_token:true,fixtureIndex:c.fixtureIndex,fixtureSha256:c.fixtureSha256,literalPayloadBytes:c.literalPayloadBytes,systemNativeDialogs:0,newProductTested:false};
 }
 assert.equal(ctx.task.id,'WATER-W1-AB');const replay=JSON.parse(ctx.command(process.execPath,['scripts/acceptance/project-host-driver.mjs','replay'],180000));assert.equal(replay.status,'passed');assert.equal(replay.systemNativeDialogs,0);assert.equal(replay.completed.length,4);
 const platform=JSON.parse(ctx.command(process.execPath,['scripts/acceptance/project-platform-probe.mjs'],180000));assert.equal(platform.status,'passed');assert.equal(platform.downloads.length,2);return{replay,platform,physicalFixtureAccess:false,systemNativeDialogs:0,newProductTested:false};
}
