// Controller acceptance manifest for wave 7 (M3 fixes) J1-J4: same task contracts, private trees at the submitted HEADs.
// Usage (repo root): node .local/w7-accept/make-manifest.mjs '{"j1":"<head>",...}'
// Merges with tasks already in the acceptance manifest, so tickets can be accepted one at a time.
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
const m=JSON.parse(readFileSync('docs/dispatch/wave7/manifest.json','utf8'));
const out='.local/w7-accept/manifest.json',old=existsSync(out)?JSON.parse(readFileSync(out,'utf8')).tasks:[];
const heads=JSON.parse(process.argv[2]);
const fresh=m.tasks.filter(t=>heads[t.slot.replace('w7-','')]).map(t=>{const slot=t.slot.replace('w7-','');const ev='docs/acceptance/wave7/controller/accept-20261029/'+slot+'/';
 return {...t,id:'WATER-W7-ACCEPT-'+slot.toUpperCase(),acceptsTask:t.id,acceptsHead:heads[slot],worktree:'F:/new/smaltalk/water/.worktrees/accept-w7-'+slot,branch:'controller/accept-w7-'+slot,evidenceDir:ev,allowedPrefixes:[...t.allowedPrefixes,ev],status:'CONTROLLER_ACCEPTANCE'};});
const tasks=[...old.filter(t=>!fresh.some(f=>f.id===t.id)),...fresh].sort((a,b)=>a.id.localeCompare(b.id));
writeFileSync(out,JSON.stringify({...m,wave:'water-wave7-m3-fix-controller-acceptance',status:'CONTROLLER_ACCEPTANCE',tasks},null,2)+'\n');
console.log(tasks.map(t=>t.id+' '+t.acceptsHead+' base '+t.baseCommit.slice(0,8)).join('\n'));
