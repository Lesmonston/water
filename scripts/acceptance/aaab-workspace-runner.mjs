// Controller invokes the unchanged AB fixed launcher; only close IPC is added.
import assert from 'node:assert/strict';
import {join,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const controller=resolve(fileURLToPath(new URL('../../',import.meta.url))),tree=join(controller,'.worktrees/integration-aaab-addendum-20261022');
assert(process.send&&resolve('.')===tree&&process.argv.length===2);
const {launchProjectWorkspace}=await import(pathToFileURL(join(tree,'prototypes/project-workspace/launch.mjs')));
let running;process.on('message',async m=>{if(m?.action==='close'){await running?.close();process.send({closed:true});process.disconnect();}});
try{running=await launchProjectWorkspace({initialDirectory:join(tree,'.local/root-marker-fixtures/batch-v1/good')});process.send({url:running.url});}catch(e){process.send({error:e.message});process.exitCode=2;process.disconnect();}
