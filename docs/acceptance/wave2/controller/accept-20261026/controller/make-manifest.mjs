// Controller acceptance manifest: same task contracts, private trees at the submitted HEADs.
import {readFileSync,writeFileSync} from 'node:fs';
const m=JSON.parse(readFileSync('docs/dispatch/wave2/manifest.json','utf8'));
const heads=JSON.parse(process.argv[2]);
const tasks=m.tasks.map(t=>{const slot=t.slot.replace('w2-','');const ev='docs/acceptance/wave2/controller/accept-20261026/'+slot+'/';
 return {...t,id:'WATER-W2-ACCEPT-'+slot.toUpperCase(),acceptsTask:t.id,acceptsHead:heads[slot],worktree:'F:/new/smaltalk/water/.worktrees/accept-w2-'+slot,branch:'controller/accept-w2-'+slot,evidenceDir:ev,allowedPrefixes:[...t.allowedPrefixes,ev],status:'CONTROLLER_ACCEPTANCE'};});
writeFileSync('.local/w2-accept/manifest.json',JSON.stringify({...m,wave:'water-wave2-checkup-controller-acceptance',status:'CONTROLLER_ACCEPTANCE',tasks},null,2)+'\n');
console.log(tasks.map(t=>t.id+' '+t.acceptsHead+' base '+t.baseCommit.slice(0,8)).join('\n'));
