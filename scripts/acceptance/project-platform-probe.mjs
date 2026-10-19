// Existing W + original Z wire attachment platform probe; not new AB UI.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createHash} from 'node:crypto';
import {mkdirSync,mkdtempSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {startServer} from '../../prototypes/native-review/server.mjs';
import {openPrivateBrowser} from './native-vw-private-browser.mjs';
const root=resolve('.'),cases=JSON.parse(readFileSync('contracts/project-session-v1/CASES.json')).cases,chosen=cases[1],out=join(root,'.local/checks/project-platform');mkdirSync(out,{recursive:true});
const stamp=new Date().toISOString().replaceAll(':','-')+'-'+process.pid,result={startedAt:new Date().toISOString(),systemNativeDialogs:0,newAAABProductsUsed:false,downloads:[]};
const body=Buffer.from(chosen.marker.observation_json);let browser,review,server;
try{
 review=await startServer({bundle:chosen.bundle});server=createServer((req,res)=>{if(req.url==='/'){res.writeHead(200,{'Content-Type':'text/html;charset=utf-8'});res.end('<!doctype html><title>Controller evidence attachment platform probe</title><a id="evidence" href="/evidence.json">Download structural evidence</a>');}else if(req.url==='/evidence.json'){res.writeHead(200,{'Content-Type':'application/json;charset=utf-8','Content-Disposition':'attachment; filename="water-project-evidence.json"','Content-Length':body.length});res.end(body);}else{res.writeHead(404);res.end();}});await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 browser=await openPrivateBrowser();const lab=join(root,'.local/browser-lab');
 for(const[name,url,selector,expected]of[['water-project-evidence.json','http://127.0.0.1:'+server.address().port,'#evidence',body],['water-report-1.json',review.url,'#download',Buffer.from(chosen.bundle.snapshots[0].redacted_json)]]){
  await browser.goto(url);await browser.waitFor('Boolean(document.querySelector('+JSON.stringify(selector)+')?.getAttribute("href"))');if(selector==='#download')await browser.waitFor('document.body.dataset.ready === "true"');const dir=mkdtempSync(join(lab,'project-probe-download-'));await browser.downloadDirectory(dir);await browser.click(selector);let files=[];const until=Date.now()+8000;
  while(Date.now()<until){files=readdirSync(dir);if(files.length&&!files.some(n=>n.endsWith('.crdownload')))break;await new Promise(ok=>setTimeout(ok,30));}assert.deepEqual(files,[name]);const source=join(dir,name),bytes=readFileSync(source);assert.deepEqual(bytes,expected);const preserved=join(out,stamp+'-'+name);writeFileSync(preserved,bytes,{flag:'wx'});result.downloads.push({source,preserved,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),actualMouseClick:true});
 }result.status='passed';
}catch(e){result.status='failed';result.error=e.stack;process.exitCode=1;}
finally{await browser?.close();await review?.close();if(server)await new Promise(ok=>server.close(ok));result.endedAt=new Date().toISOString();const receipt=join(out,stamp+'-result.json');writeFileSync(receipt,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({...result,receipt}));}
