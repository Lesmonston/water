// Controller process boundary around the unchanged real W launcher.
import assert from 'node:assert/strict';
import {resolve,join} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
const controller=resolve(fileURLToPath(new URL('../../',import.meta.url)));
const tree=join(controller,'.worktrees/integration-vw-20261019');
assert(process.send && resolve('.')===tree && process.argv.length===2);
let running;
const timer=setTimeout(()=>{process.exitCode=1;process.disconnect();},80000);
process.on('message',async message=>{
  if(message?.action!=='close') return;
  try {await running?.close();process.send({closed:true});}
  finally {clearTimeout(timer);process.disconnect();}
});
try {
  const {launchNative}=await import(pathToFileURL(join(tree,'prototypes/native-review/launch.mjs')));
  running=await launchNative({initialDirectory:join(controller,'.local/native-walk-fixtures/batch-v1/root')});
  process.send({url:running.url});
} catch(error) {process.send({error:error.message});clearTimeout(timer);process.exitCode=2;process.disconnect();}
