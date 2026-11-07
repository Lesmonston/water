// Controller acceptance manifest for wave 11 N2-N8: same task contracts, private trees at the submitted HEADs.
// Usage (repo root): node .local/w12-accept/make-manifest.mjs '{"n4":"<head>",...}'
// Merges with tasks already in the acceptance manifest, so tickets can be accepted one at a time.
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
const m=JSON.parse(readFileSync('docs/dispatch/wave12/manifest.json','utf8'));
const out='.local/w12-accept/manifest.json',old=existsSync(out)?JSON.parse(readFileSync(out,'utf8')).tasks:[];
const heads=JSON.parse(process.argv[2]);
const fresh=m.tasks.filter(t=>heads[t.slot.replace('w12-','')]).map(t=>{const slot=t.slot.replace('w12-','');const ev='docs/acceptance/wave12/controller/accept-20261107/'+slot+'/';
 return {...t,id:'WATER-W12-ACCEPT-'+slot.toUpperCase(),acceptsTask:t.id,acceptsHead:heads[slot],worktree:'F:/new/smaltalk/water/.worktrees/accept-w12-'+slot,branch:'controller/accept-w12-'+slot,evidenceDir:ev,allowedPrefixes:[...t.allowedPrefixes,ev],status:'CONTROLLER_ACCEPTANCE'};});
const tasks=[...old.filter(t=>!fresh.some(f=>f.id===t.id)),...fresh].sort((a,b)=>a.id.localeCompare(b.id));
writeFileSync(out,JSON.stringify({...m,wave:'water-wave12-controller-acceptance',status:'CONTROLLER_ACCEPTANCE',tasks},null,2)+'\n');
console.log(tasks.map(t=>t.id+' '+t.acceptsHead+' base '+t.baseCommit.slice(0,8)).join('\n'));
