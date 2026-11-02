// Controller design tool: render each mockup screen at full size with a private headless Chrome.
// Serves only the design folder on 127.0.0.1 and writes PNGs into <design folder>/previews/.
// Usage: node scripts/design/render-mockup-previews.mjs [screen,screen,...] [design folder, default docs/design/water-ui-v1]
import {createServer} from 'node:http';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {openPrivateBrowser} from '../acceptance/native-vw-private-browser.mjs';
const root=resolve(process.argv[3]??'docs/design/water-ui-v1'),out=join(root,'previews');mkdirSync(out,{recursive:true});
const types={'.html':'text/html; charset=utf-8','.css':'text/css'};
const server=createServer((req,res)=>{const name=new URL(req.url,'http://x').pathname.replace(/^\/+/,'')||'mockup.html';if(!/^[a-z0-9.-]+$/.test(name)){res.writeHead(404).end();return;}try{const body=readFileSync(join(root,name));res.writeHead(200,{'content-type':types[name.slice(name.lastIndexOf('.'))]??'application/octet-stream'}).end(body);}catch{res.writeHead(404).end();}});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const url='http://127.0.0.1:'+server.address().port+'/mockup.html';
const browser=await openPrivateBrowser();
try{
  await browser.size(1300,900);
  for(const s of (process.argv[2]??'home,scan,results,detail,confirm,done,trends,locations').split(',')){
    await browser.goto(url+'?s='+s);await browser.waitFor('document.readyState==="complete"');await new Promise(r=>setTimeout(r,900));
    writeFileSync(join(out,s+'.png'),await browser.screenshot());console.log('wrote',s);
  }
}finally{await browser.close();server.close();}
