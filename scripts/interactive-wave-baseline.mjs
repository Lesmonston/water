// Existing dependencies/platform only; never executes X/Y/Z product code.
import assert from 'node:assert/strict';
import {join} from 'node:path';
import {readFileSync} from 'node:fs';
import {rustEnvironment} from './next-core-runtime.mjs';
import {prepareInteractiveFixtures} from './interactive-wave-fixtures.mjs';
export function interactiveBaseline(ctx) {
 const lane=ctx.task.id.slice(-1);
 if(lane==='Y') {
  const replay=JSON.parse(ctx.command(process.execPath,['scripts/acceptance/interactive-host-driver.mjs','replay'],180000));assert.equal(replay.completed.length,3);assert.equal(replay.nativeDialogs,0);
  const browser=JSON.parse(ctx.command(process.execPath,['scripts/acceptance/native-review-platform-probe.mjs'],180000));assert(browser.actualBrowserClick&&browser.downloadBytes>0);
  return{replay,browser,newProductTested:false,physicalFixtureAccess:false,nativeDialogs:0};
 }
 const fixture=prepareInteractiveFixtures(ctx);ctx.env[lane==='X'?'WATER_NATIVE_WALK_INDEX':'WATER_MARKER_INDEX']=fixture.indexPath;
 const rust=rustEnvironment(ctx),artifacts=rust.build('packages/native-session/Cargo.toml','water-native-session',['water_native_session','water_native_scan','water_native_picker','water_scope_registry','water_native_root','water_contracts','serde_json']);
 const manifest=rust.build('packages/node-manifest/Cargo.toml','water-node-manifest',['water_node_manifest']);artifacts.push(...manifest);
 const flags=artifacts.flatMap(a=>['--extern',a.crate+'='+a.filename]),exe=join(rust.tmp,ctx.stamp+'-interactive-dependency.exe');
 ctx.command(rust.rustc,['--edition=2024','--crate-name','interactive_dependency','scripts/acceptance/interactive-dependency-probe.rs','-L','dependency='+rust.deps,...flags,'-o',exe],180000);
 const existing=JSON.parse(ctx.command(exe,[lane],180000));let abi=null;
 if(lane==='Z') {const binary=join(rust.tmp,ctx.stamp+'-marker-abi.exe');ctx.command(rust.rustc,['--edition=2024','--crate-name','marker_abi','scripts/acceptance/root-marker-abi-probe.rs','-L','dependency='+rust.deps,...flags,'-o',binary],180000);abi=JSON.parse(ctx.command(binary,[],180000));assert(abi.root_relative_NtCreateFile&&abi.actual_U);}
 assert.equal(prepareInteractiveFixtures(ctx).sha256,fixture.sha256);
 return{existing,abi,fixtureIndex:fixture.indexPath,fixtureSha256:fixture.sha256,literalPayloadBytes:fixture.index.literal_payload_bytes,nativeDialogs:0,newProductTested:false};
}
