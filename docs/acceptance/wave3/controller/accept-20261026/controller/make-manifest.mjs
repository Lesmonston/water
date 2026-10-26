// Controller acceptance manifest for wave 3: same task contracts, private trees at the submitted HEADs.
// Usage (repo root): node .local/w3-accept/make-manifest.mjs '{"f2":"<head>"}'
import {readFileSync,writeFileSync} from 'node:fs';
const m=JSON.parse(readFileSync('docs/dispatch/wave3/manifest.json','utf8'));
const heads=JSON.parse(process.argv[2]);
const tasks=m.tasks.filter(t=>heads[t.slot.replace('w3-','')]).map(t=>{const slot=t.slot.replace('w3-','');const ev='docs/acceptance/wave3/controller/accept-20261026/'+slot+'/';
 return {...t,id:'WATER-W3-ACCEPT-'+slot.toUpperCase(),acceptsTask:t.id,acceptsHead:heads[slot],worktree:'F:/new/smaltalk/water/.worktrees/accept-w3-'+slot,branch:'controller/accept-w3-'+slot,evidenceDir:ev,allowedPrefixes:[...t.allowedPrefixes,ev],status:'CONTROLLER_ACCEPTANCE'};});
writeFileSync('.local/w3-accept/manifest.json',JSON.stringify({...m,wave:'water-wave3-desktop-controller-acceptance',status:'CONTROLLER_ACCEPTANCE',tasks},null,2)+'\n');
console.log(tasks.map(t=>t.id+' '+t.acceptsHead+' base '+t.baseCommit.slice(0,8)).join('\n'));
