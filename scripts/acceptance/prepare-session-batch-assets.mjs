// Controller-only: derives immutable JSON from an already verified real pipeline log.
// Does not run new products or traverse/create physical fixtures.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
assert.equal(resolve(process.cwd()).toLowerCase(),root.toLowerCase());
const git=(args,cwd=root)=>{const r=spawnSync('git',['-c','core.hooksPath=NUL','-c','core.fsmonitor=false',...args],{cwd,encoding:'utf8'});assert.equal(r.status,0,r.stderr);return r.stdout.trim();};
const json=p=>JSON.parse(readFileSync(join(root,p),'utf8')),hash=b=>createHash('sha256').update(b).digest('hex');
function directory(parts){let p=root;for(const part of parts.split('/')){p=join(p,part);if(!existsSync(p))mkdirSync(p);}return p;}
const audit={checkedAt:new Date().toISOString(),mainHead:git(['rev-parse','HEAD']),oldTasks:[],formalTickets:[],unassignedOldTickets:[],oldOutstandingTasks:[],boundary:'Git/registry/document audit only; no new worker or product launched.'};
const registry=json('docs/dispatch/registry.json');
for(const t of registry.tasks.filter(t=>/^WATER-W1-[A-I]$/.test(t.id))){assert.equal(t.status,'VERIFIED');assert.equal(git(['rev-parse','HEAD'],t.worktree),t.acceptedCommit);assert.equal(git(['status','--porcelain=v1','--untracked-files=all'],t.worktree),'');assert(existsSync(join(root,t.controllerReview)));audit.oldTasks.push({id:t.id,status:t.status,acceptedCommit:t.acceptedCommit,workerClean:true,controllerReview:t.controllerReview});}
assert.equal(audit.oldTasks.length,9);
for(const file of readdirSync(join(root,'docs/dispatch/tickets')).filter(n=>/^WATER-W1-[A-I]-.*\.md$/.test(n))){const id=/^(WATER-W1-[A-I])-/.exec(file)[1];assert(registry.tasks.some(t=>t.id===id&&t.status==='VERIFIED'));audit.formalTickets.push({file,id,status:'covered-by-verified-task',supplement:file.includes('ADDENDUM')});}
assert.equal(audit.formalTickets.length,13);
const sourceDir='docs/acceptance/wave1/controller/w1-gh-integration-20261018';
const receiptName='2026-10-17T15-25-29.855Z-18684-result.json',receipt=json(sourceDir+'/'+receiptName);
assert.equal(receipt.status,'passed');assert.equal(receipt.expectedHead,'e383ece84f2943fe099106f2e121643417bbe346');assert(receipt.pipeline.actualFNative&&receipt.pipeline.actualGAssembly&&receipt.pipeline.actualHTwoEntries&&receipt.pipeline.actualEProjection);
const run=receipt.commands.find(c=>c.binary.replaceAll('\\','/').endsWith('/controller-pipeline.exe'));assert(run&&run.log);
const logPath=sourceDir+'/'+run.log,logBytes=readFileSync(join(root,logPath)),text=logBytes.toString('utf8');
const raw=text.split('\n--- stdout ---\n')[1]?.split('\n--- stderr ---\n')[0].trim();assert(raw);
const actual=JSON.parse(raw);assert.equal(actual.cases.length,13);
const completed=actual.cases.find(c=>c.native&&c.facts.case_id==='project-markers');assert(completed);
const partial=actual.cases.find(c=>c.native&&c.facts.case_id==='depth-budget');
const cancelled=actual.cases.find(c=>!c.native&&c.facts.status==='cancelled');
const denied=actual.cases.find(c=>!c.native&&c.facts.scopes.some(s=>s.issues.some(i=>i.origin==='injected')));
const selected=[completed,partial,cancelled,denied];assert(selected.every(Boolean));
const bundle={bundle_version:'water.lab-reader-bundle.v1',snapshots:selected.map(c=>({session_version:'water.lab-session.v1',data_kind:'controlled_fixture_metadata',source_facts:c.facts,report:c.bundle.report,view:c.view,summary:c.summary}))};
const model=await import(pathToFileURL(join(root,'prototypes/report-reader/model.mjs')));
for(const [i,s]of bundle.snapshots.entries()){model.assertReportView(s.view);assert.deepEqual(s.source_facts,selected[i].bundle.source_facts);assert.equal(s.report.scan_id,s.view.scan_id);assert.equal(s.summary.counts.findings,s.view.findings.length);assert.deepEqual(s.summary.totals,s.view.totals);assert.equal(s.report.status,s.source_facts.status);}
const provenance={asset_version:'water.session-batch-assets.v1',createdAt:new Date().toISOString(),sourceTestedCommit:receipt.expectedHead,sourceReceipt:sourceDir+'/'+receiptName,sourceLog:logPath,sourceLogSha256:hash(logBytes),sourceProductTrees:[...receipt.preservedProducts,...receipt.tasks.map(t=>({path:t.id==='WATER-W1-G'?'packages/scan-report':'packages/summary-export',tree:t.productTree}))],actualFNativeCapture:true,actualGAssembly:true,actualAValidated:true,actualEProjection:true,actualHTwoEntries:true,newJImplementationUsed:false,newKProductTested:false,wrapperOnly:'Six-field J protocol envelope around verified F/G/A/E/H results; not a claim that J exists.',selected:bundle.snapshots.map((s,i)=>({scan_id:s.view.scan_id,case_id:s.source_facts.case_id,status:s.view.status,role:['native_completed','native_partial','controlled_pre_cancelled','controlled_injected_permission'][i]}))};
directory('contracts/session-batch-v1');
writeFileSync(join(root,'contracts/lab-reader-v1/sessions.json'),JSON.stringify(bundle,null,2)+'\n',{flag:'wx'});
writeFileSync(join(root,'contracts/session-batch-v1/PROVENANCE.json'),JSON.stringify(provenance,null,2)+'\n',{flag:'wx'});
writeFileSync(join(root,'contracts/lab-reader-v1/cases.json'),JSON.stringify({fixture_version:'water.lab-reader-cases.v1',snapshots:provenance.selected,invalid_mutations:['missing-session-version','wrong-data-kind','missing-nullable','wrong-view-scan-id','wrong-status','wrong-count','wrong-path','wrong-totals','duplicate-scan-id','unknown-top-field'],memory_variants:{synthetic_only:true,bigint_values:['9007199254740992','9007199254740993','18446744073709551615'],html_relative_path:'html/<img src=x onerror=literal>',instructions:'Use a File entry in first snapshot. Synchronize its source_facts relative_path/depth/logical_bytes, report finding relative_path/size.logical_bytes and view relative_path/title/logical_bytes/size.logical_bytes. All totals stay unknown. Rename scan_id consistently in report/view for separate caller bundles. These are synthetic memory variants, not physical F captures.'}},null,2)+'\n',{flag:'wx'});
writeFileSync(join(root,'contracts/lab-session-v1/cases.json'),JSON.stringify({fixture_version:'water.lab-session-cases.v1',matrix:'contracts/scan-lab-v1/matrix.json',negative_inputs:'contracts/scan-lab-v1/negative-inputs.json',native:{cases:11,scopes:12,entries_if_all_supported:39},controlled:['pre_cancelled_overlapping_scopes','injected_permission_plan'],snapshot_fields:['session_version','data_kind','source_facts','report','view','summary'],max_snapshot_bytes:16777216,errors:[['OpenRejected','/open'],['ScanRejected','/scan'],['AssemblyRejected','/assembly'],['ProjectionRejected','/view'],['SummaryRejected','/summary'],['SnapshotTooLarge','/snapshot'],['SerializationFailed','/snapshot']],proof_targets:{behavior:'J_BEHAVIOR',nc1:'J_CANCEL_SHARED',nc2:'J_FACTS_PRESERVED',nc3:'J_SUMMARY_UNKNOWN'},tests:['session_native_composition','session_cancellation_and_progress','session_errors_and_bounds','session_identity_and_protection','session_snapshot_wire']},null,2)+'\n',{flag:'wx'});
directory('docs/acceptance/wave1/controller/w1-session-batch-preflight-20261018');
writeFileSync(join(root,'docs/acceptance/wave1/controller/w1-session-batch-preflight-20261018/old-task-audit.json'),JSON.stringify(audit,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({oldTasksVerified:9,oldFormalTickets:13,oldOutstanding:0,selectedActualCaptures:4,newProductsTested:false,sourceLog:logPath},null,2));
