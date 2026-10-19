// Preserve the real attachment before closing the private browser context.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdirSync,mkdtempSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {openPrivateBrowser} from './native-vw-private-browser.mjs';
const root=resolve('.'),tree=join(root,'.worktrees/y'),out=join(root,'.local/interactive-wave-preflight-20261019/private-download');mkdirSync(out,{recursive:true});
const {startServer}=await import(pathToFileURL(join(tree,'prototypes/native-review/server.mjs')));
const bundle=JSON.parse(readFileSync(join(tree,'contracts/interactive-host-v1/CASES.json'))).cases[0].bundle;
let server,browser;const record={startedAt:new Date().toISOString(),reason:'Baseline platform default-context attachment no longer exists after browser closure; independently recapture, do not reconstruct bytes',systemNativeDialogs:0,newProductsRun:false};
try {
 server=await startServer({bundle});browser=await openPrivateBrowser();await browser.goto(server.url);await browser.waitFor('document.body.dataset.ready === "true"');
 const dir=mkdtempSync(join(tree,'.local/browser-lab/interactive-private-download-'));await browser.downloadDirectory(dir);await browser.click('#download');
 const until=Date.now()+10000;let names=[];while(Date.now()<until){names=readdirSync(dir);if(names.length&&!names.some(n=>n.endsWith('.crdownload')))break;await new Promise(ok=>setTimeout(ok,30));}
 assert.deepEqual(names,['water-report-1.json']);const source=join(dir,names[0]),bytes=readFileSync(source);assert.deepEqual(bytes,Buffer.from(bundle.snapshots[0].redacted_json));
 const preserved=join(out,'actual-downloaded-q.json');writeFileSync(preserved,bytes,{flag:'wx'});assert.deepEqual(readFileSync(preserved),bytes);
 Object.assign(record,{status:'passed',actualWServer:true,privateBrowserContext:true,actualMouseClick:true,downloadSource:source,preserved,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
}catch(e){record.status='failed';record.error=e.stack;process.exitCode=1;}
finally{await browser?.close();await server?.close();record.endedAt=new Date().toISOString();writeFileSync(join(out,'result.json'),JSON.stringify(record,null,2)+'\n');console.log(JSON.stringify(record));}
