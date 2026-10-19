// Actual approved libraries only. Control capture is not a new product.
import assert from 'node:assert/strict';
import {join} from 'node:path';
import {readFileSync} from 'node:fs';
import {rustEnvironment} from './next-core-runtime.mjs';
import {prepareProjectFixtures} from './project-wave-fixtures.mjs';
export function captureProjectDependencies(ctx){
 const fixture=prepareProjectFixtures(ctx);ctx.env.WATER_MARKER_INDEX=fixture.indexPath;
 const rust=rustEnvironment(ctx),artifacts=new Map();
 for(const[manifest,pkg,names]of[
  ['packages/native-session/Cargo.toml','water-native-session',['water_native_scan','water_contracts','water_scope_registry','water_report_view','water_summary_export','water_redacted_report','serde_json']],
  ['packages/root-marker/Cargo.toml','water-root-marker',['water_root_marker']],
  ['packages/scan-host/Cargo.toml','water-scan-host',['water_scan_host']],
 ])for(const a of rust.build(manifest,pkg,names))artifacts.set(a.crate,a);
 const exe=join(rust.tmp,ctx.stamp+'-project-dependency.exe');ctx.command(rust.rustc,['--edition=2024','--crate-name','project_dependency','scripts/acceptance/project-dependency-capture.rs','-L','dependency='+rust.deps,...[...artifacts.values()].flatMap(a=>['--extern',a.crate+'='+a.filename]),'-o',exe],180000);
 const text=ctx.command(exe,[],180000),data=JSON.parse(text);assert(data.actual_P_R_E_H_Q_Z&&data.actual_X_shared_token);assert.equal(data.systemNativeDialogs,0);assert.equal(data.cases.length,6);
 assert.equal(prepareProjectFixtures(ctx).sha256,fixture.sha256);return{data,fixtureIndex:fixture.indexPath,fixtureSha256:fixture.sha256,literalPayloadBytes:fixture.index.literal_payload_bytes,systemNativeDialogs:0,newProductTested:false};
}
