// Unchanged Y fixed launcher boundary; only controller close IPC is exposed.
import assert from 'node:assert/strict';
import {join,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const controller=resolve(fileURLToPath(new URL('../../',import.meta.url))),tree=join(controller,'.worktrees/integration-xyz-20261019');
assert(process.send&&resolve('.')===tree&&process.argv.length===2);
const {launchWorkspace}=await import(pathToFileURL(join(tree,'prototypes/live-workspace/launch.mjs')));
let running;process.on('message',async m=>{if(m?.action==='close'){await running?.close();process.send({closed:true});process.disconnect();}});
try{running=await launchWorkspace({initialDirectory:join(tree,'.local/native-walk-fixtures/batch-v1/root')});process.send({url:running.url});}catch(e){process.send({error:e.message});process.exitCode=2;process.disconnect();}
