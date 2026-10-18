// Runs only a supplied focused Rust test/probe executable; UI actions target its PID.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {resolve} from 'node:path';
const [binary,...args]=process.argv.slice(2);assert(binary&&/\.exe$/i.test(binary));
const child=spawn(binary,args,{stdio:['ignore','pipe','pipe'],windowsHide:false});let stdout='',stderr='',line='',actions=0,fault,chain=Promise.resolve();const timer=setTimeout(()=>{fault=new Error('Controlled picker test timeout');child.kill();},170000);
child.stdout.on('data',b=>{stdout+=b;process.stdout.write(b);});
child.stderr.on('data',b=>{stderr+=b;process.stderr.write(b);line+=b;let at;while((at=line.indexOf('\n'))>=0){const s=line.slice(0,at).trim();line=line.slice(at+1);const m=/^WATER_PICKER_CASE (cancel|select)$/.exec(s);if(m)chain=chain.then(()=>new Promise((ok,bad)=>{const a=spawn('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',resolve('scripts/picker-ui-action.ps1'),'-TestProcessId',String(child.pid),'-Action',m[1]],{windowsHide:true,stdio:['ignore','pipe','pipe']});const t=setTimeout(()=>a.kill(),20000);let output='';a.stdout.on('data',b=>{output+=b;process.stderr.write(b);});a.stderr.on('data',b=>process.stderr.write(b));a.on('error',bad);a.on('close',code=>{clearTimeout(t);if(code!==0||!output.includes('WATER_UI_ACTION'))bad(new Error('Controlled UI action failed'));else{actions++;ok();}});})).catch(e=>{fault=e;child.kill();});}});
child.on('error',e=>{fault=e;});const code=await new Promise(ok=>child.on('close',ok));await chain;clearTimeout(timer);assert(!fault,fault?.message);assert(actions>=2,'Need actual cancel and select actions');assert(!/Controlled picker (?:test timeout|window not found)/.test(stderr));process.exitCode=code??1;
