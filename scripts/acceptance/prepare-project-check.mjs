// Derive a new batch gate; the old frozen helper remains byte-for-byte unchanged.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
let code=readFileSync('scripts/interactive-wave-check-r2.mjs','utf8');
function change(old,next){assert(code.includes(old),'Missing old helper shape '+old);code=code.replace(old,next);}
change('// X/Y/Z focused gates.','// AA/AB focused gates.');
change("import {prepareInteractiveFixtures} from './interactive-wave-fixtures.mjs';","import {prepareProjectFixtures} from './project-wave-fixtures.mjs';");
change("import {interactiveBaseline} from './interactive-wave-baseline.mjs';","import {projectBaseline} from './project-wave-baseline.mjs';");
change("setup(['WATER-W1-X','WATER-W1-Y','WATER-W1-Z'],modes)","setup(['WATER-W1-AA','WATER-W1-AB'],modes)");
change("lane=task.id.slice(-1),node=lane==='Y'","lane=task.id.slice(-2),node=lane==='AB'");
change("function checkoutObjects(){const lock=JSON.parse(readFileSync(join(ctx.controller,task.contractLock)));for(const f of lock.gitObjects??[])assert.equal(ctx.git(['hash-object','--path='+f.path,f.path]),f.objectId,'Verified legacy Git content changed: '+f.path);}","function checkoutObjects(){const lock=JSON.parse(readFileSync(join(ctx.controller,task.contractLock)));for(const l of [...lock.inheritedLocks.map(p=>JSON.parse(readFileSync(join(ctx.controller,p)))),lock])for(const f of l.gitObjects??[])assert.equal(ctx.git(['hash-object','--path='+f.path,f.path]),f.objectId,'Verified legacy Git content changed: '+f.path);}");
change('record.baseline=interactiveBaseline(ctx)','record.baseline=projectBaseline(ctx)');
code=code.replaceAll('prepareInteractiveFixtures(ctx)','prepareProjectFixtures(ctx)');
change("env[lane==='X'?'WATER_NATIVE_WALK_INDEX':'WATER_MARKER_INDEX']=fixture.indexPath","env.WATER_MARKER_INDEX=fixture.indexPath");
change("assert.equal(pkg.targets.length,lane==='X'?3:2)","assert.equal(pkg.targets.length,3)");
change("...(lane==='X'?[['water-scan-host',task.outputRoot+'/src/main.rs','bin']]:[])","['water-project-session',task.outputRoot+'/src/main.rs','bin']");
change("if(lane==='X')assert(readFileSync", "assert(readFileSync");
change("attrs.includes(lane==='X'?'#![forbid(unsafe_code)]':'#![deny(unsafe_code)]')","attrs.includes('#![forbid(unsafe_code)]')");
change("'*.mjs text eol=lf\\n*.html text eol=lf\\n*.css text eol=lf\\n'","'.gitattributes text eol=lf\\n*.mjs text eol=lf\\n*.html text eol=lf\\n*.css text eol=lf\\n'");
change("mode==='native'||(lane==='X'&&mode==='red-nc2')","mode==='native'");
change("assert.equal(lane,'X');const estimate=mode==='native'?3:1;","assert.equal(lane,'AA');const estimate=4;");
change("'--bin','water-scan-host'","'--bin','water-project-session'");
change("['scripts/acceptance/interactive-host-driver.mjs',mode==='native'?'native':'native-cancel']","['scripts/acceptance/project-host-driver.mjs','native']");
change('record.nativeDialogs=summary.nativeDialogs;assert.equal(summary.nativeDialogs,mode===\'native\'?3:1)','record.nativeDialogs=summary.systemNativeDialogs;assert.equal(summary.systemNativeDialogs,4)');
code=code.replaceAll('live-workspace-1440x1000.png','project-workspace-1440x1000.png').replaceAll('live-workspace-900x800.png','project-workspace-900x800.png').replaceAll('live-workspace-cancel.png','project-workspace-cancel.png');
writeFileSync('scripts/project-wave-check.mjs',code);
// This wave has not been dispatched: make one bounded four-case recovery possible.
for(const p of['docs/decisions/ADR-016-consented-project-session.md','docs/M1-PROJECT-CONSENT-PLAN-20261019.md','docs/dispatch/W1-PROJECT-WORKER-RULES.md']){let s=readFileSync(p,'utf8');s=s.replaceAll('最多6窗','最多8窗').replaceAll('整单预算6','整单预算8').replace('2窗只用于有依据失败恢复','额外4窗只用于有依据失败后的单次完整恢复');writeFileSync(p,s);}
const path='contracts/project-batch-v1/TESTS.json',defs=JSON.parse(readFileSync(path));defs.tasks['WATER-W1-AA'].native_dialog_budget=8;writeFileSync(path,JSON.stringify(defs,null,2)+'\n');
console.log(JSON.stringify({newGate:'scripts/project-wave-check.mjs',oldHelperModified:false,AAFinalWindows:4,AAWholeTaskBudget:8}));
