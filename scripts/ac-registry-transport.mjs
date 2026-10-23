// AC environment support: bounded raw CONNECT tunnels to official Cargo hosts.
// This is not a registry mirror, TLS terminator, certificate override or cache.
import assert from 'node:assert/strict';
import {createServer,connect} from 'node:net';
const hosts=new Set(['index.crates.io','static.crates.io','crates.io']);
export async function openRegistryTransport({useExistingLocalProxy=false}={}){
 assert.equal(typeof useExistingLocalProxy,'boolean');
 const events=[],clients=new Set(),upstreams=new Set(),queue=[];let active=0,closed=false;
 const stats={startedAt:new Date().toISOString(),accepted:0,denied:0,connected:0,failed:0,maximumActive:0,clientBytes:0,serverBytes:0,TLSIntercepted:false,TLSVerificationDisabled:false,registryReplaced:false,globalSettingsChanged:false};
 function remove(item){const i=queue.indexOf(item);if(i>=0)queue.splice(i,1);clearTimeout(item.timer);}
 function pump(){while(!closed&&active<3&&queue.length){const item=queue.shift();clearTimeout(item.timer);if(item.client.destroyed)continue;start(item);}}
 function start({client,host,extra}){
  active++;stats.maximumActive=Math.max(stats.maximumActive,active);let released=false;
  const event={host,port:443,startedAt:new Date().toISOString(),connectionMode:useExistingLocalProxy?'existing-local-http-proxy':'ipv4-direct',existingProxy:useExistingLocalProxy?'http://127.0.0.1:7897':null};events.push(event);
  const upstream=connect(useExistingLocalProxy?{host:'127.0.0.1',port:7897,family:4}:{host,port:443,family:4});upstreams.add(upstream);upstream.setTimeout(useExistingLocalProxy?180000:30000);client.setTimeout(useExistingLocalProxy?180000:30000);
  const release=()=>{if(released)return;released=true;active--;upstreams.delete(upstream);upstream.destroy();client.destroy();pump();};
  const ready=extraUpstream=>{stats.connected++;event.connectedAt=new Date().toISOString();client.write('HTTP/1.1 200 Connection Established\r\n\r\n');if(extra.length)upstream.write(extra);if(extraUpstream?.length)client.write(extraUpstream);client.pipe(upstream);upstream.pipe(client);client.resume();};
  upstream.once('connect',()=>{if(!useExistingLocalProxy)return ready();let response=Buffer.alloc(0);const onHeader=b=>{response=Buffer.concat([response,b]);const end=response.indexOf('\r\n\r\n');if(end<0){if(response.length>8192){event.error='upstream_proxy_header_limit';stats.failed++;release();}return;}upstream.off('data',onHeader);if(end>8192||!/^HTTP\/1\.[01] 200(?: |\r)/.test(response.subarray(0,end).toString('latin1'))){event.error='upstream_proxy_rejected_connect';stats.failed++;release();return;}ready(response.subarray(end+4));};upstream.on('data',onHeader);upstream.write('CONNECT '+host+':443 HTTP/1.1\r\nHost: '+host+':443\r\nProxy-Connection: Keep-Alive\r\n\r\n');});
  upstream.on('data',b=>{stats.serverBytes+=b.length;});client.on('data',b=>{stats.clientBytes+=b.length;});
  upstream.once('error',e=>{stats.failed++;event.error=e.code??'network_error';release();});upstream.once('timeout',()=>{stats.failed++;event.error='upstream_idle_timeout';release();});upstream.once('close',()=>{event.endedAt=new Date().toISOString();release();});client.once('close',release);client.once('error',release);if(!useExistingLocalProxy)client.resume();
 }
 const server=createServer(client=>{
  clients.add(client);client.once('close',()=>clients.delete(client));client.setTimeout(30000,()=>client.destroy());client.on('error',()=>{});let bytes=Buffer.alloc(0),finished=false;
  const deny=()=>{if(finished)return;finished=true;stats.denied++;client.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\nContent-Length: 0\r\n\r\n');};
  function header(b){bytes=Buffer.concat([bytes,b]);const end=bytes.indexOf('\r\n\r\n');if(end<0){if(bytes.length>8192)deny();return;}if(end>8192)return deny();const lines=bytes.subarray(0,end).toString('latin1').split('\r\n'),m=/^CONNECT ([a-z0-9.-]+):443 HTTP\/1\.[01]$/.exec(lines[0]);if(!m||!hosts.has(m[1])||lines.some(s=>/[^\x20-\x7e]/.test(s)))return deny();const hostHeaders=lines.slice(1).filter(s=>/^host:/i.test(s));if(hostHeaders.length!==1||hostHeaders[0].slice(5).trim()!==m[1]+':443')return deny();finished=true;stats.accepted++;client.off('data',header);client.pause();const item={client,host:m[1],extra:bytes.subarray(end+4)};if(queue.length>=16){stats.denied++;return client.end('HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\nContent-Length: 0\r\n\r\n');}item.timer=setTimeout(()=>{remove(item);client.destroy();},25000);queue.push(item);client.once('close',()=>remove(item));pump();}
  client.on('data',header);
 });
 await new Promise((ok,bad)=>{server.once('error',bad);server.listen(0,'127.0.0.1',()=>{server.off('error',bad);ok();});});const address=server.address();assert(address&&typeof address==='object');
 let closing;return{url:'http://127.0.0.1:'+address.port,stats,events,close(){closing??=new Promise(ok=>{closed=true;for(const item of queue){clearTimeout(item.timer);item.client.destroy();}queue.length=0;for(const s of clients)s.destroy();for(const s of upstreams)s.destroy();server.close(()=>{stats.endedAt=new Date().toISOString();stats.remainingClients=clients.size;stats.remainingUpstreams=upstreams.size;ok();});});return closing;}};
}
