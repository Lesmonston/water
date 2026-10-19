// Isolated browser context for one controller session; original helper unchanged.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {openBrowser} from '../browser-lab.mjs';
const delay=ms=>new Promise(ok=>setTimeout(ok,ms));
export async function openPrivateBrowser() {
  const processBrowser=await openBrowser();let ws,context,counter=0,session;
  const pending=new Map();
  const close=async()=>{
    if(ws?.readyState===WebSocket.OPEN) {
      try {if(context) await send('Target.disposeBrowserContext',{browserContextId:context});} catch {}
      ws.close();
    }
    for(const p of pending.values()) {clearTimeout(p.timer);p.bad(new Error('Browser closed'));}
    pending.clear();await processBrowser.close();
  };
  const send=(method,params={},sessionId)=>new Promise((ok,bad)=>{
    const id=++counter,timer=setTimeout(()=>{pending.delete(id);bad(new Error('CDP timeout: '+method));},10000);
    pending.set(id,{ok,bad,timer});ws.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));
  });
  try {
    const [port,endpoint]=readFileSync(join(processBrowser.profile,'DevToolsActivePort'),'utf8').trim().split(/\r?\n/);
    assert(/^\d+$/.test(port)&&/^\/devtools\/browser\/[a-zA-Z0-9-]+$/.test(endpoint));
    ws=new WebSocket(`ws://127.0.0.1:${port}${endpoint}`);
    await new Promise((ok,bad)=>{ws.addEventListener('open',ok,{once:true});ws.addEventListener('error',bad,{once:true});});
    ws.addEventListener('message',event=>{
      const m=JSON.parse(event.data),p=pending.get(m.id);if(!p) return;
      pending.delete(m.id);clearTimeout(p.timer);m.error?p.bad(new Error(m.error.message)):p.ok(m.result??{});
    });
    context=(await send('Target.createBrowserContext',{disposeOnDetach:true})).browserContextId;
    const {targetId}=await send('Target.createTarget',{url:'about:blank',browserContextId:context});
    session=(await send('Target.attachToTarget',{targetId,flatten:true})).sessionId;
    const page=(method,params)=>send(method,params,session);
    await page('Runtime.enable');await page('Page.enable');
    const evaluate=async expression=>{
      const r=await page('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});
      assert(!r.exceptionDetails,'Browser expression threw');return r.result.value;
    };
    return {close,evaluate,send:page,profile:processBrowser.profile,
      downloadDirectory:dir=>send('Browser.setDownloadBehavior',{behavior:'allow',browserContextId:context,downloadPath:dir,eventsEnabled:true}),
      async goto(url) {assert.equal(new URL(url).hostname,'127.0.0.1');assert(!(await page('Page.navigate',{url})).errorText);},
      async waitFor(expression) {const until=Date.now()+10000;while(Date.now()<until) {if(await evaluate(expression)) return;await delay(25);}throw new Error('Browser condition timed out');},
      async size(width,height) {await page('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});},
      async screenshot() {return Buffer.from((await page('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data,'base64');},
      async click(selector) {
        const point=await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
        await page('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...point});
        await page('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...point});
      }};
  } catch(e) {await close();throw e;}
}
