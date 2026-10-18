// Controller infrastructure only; no new product implementation.
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {homedir} from 'node:os';
import {dirname,isAbsolute,join} from 'node:path';
import {copyCache} from './parallel-next-common.mjs';
import {selectCargoArtifacts} from './acceptance/cargo-artifacts.mjs';
export function rustEnvironment(ctx){
 const {root,env,command}=ctx,home=ctx.local('.local/next-cargo-home'),target=ctx.local('.local/next-target'),tmp=ctx.local('.local/next-tmp');
 for(let p=root;;p=dirname(p)){for(const n of ['config','config.toml'])assert(!existsSync(join(p,'.cargo',n)));if(dirname(p)===p)break;}for(const n of ['config','config.toml'])assert(!existsSync(join(home,n)));copyCache(ctx,home);
 const rustup=join(homedir(),'.cargo/bin/rustup.exe'),rustc=command(rustup,['which','rustc','--toolchain','1.95.0']),cargo=command(rustup,['which','cargo','--toolchain','1.95.0']);assert(isAbsolute(rustc)&&isAbsolute(cargo));assert(command(rustc,['--version']).startsWith('rustc 1.95.0 '));
 Object.assign(env,{RUSTUP_TOOLCHAIN:'1.95.0',RUSTC:rustc,RUSTDOC:join(dirname(rustc),'rustdoc.exe'),CARGO_HOME:home,CARGO_TARGET_DIR:target,CARGO_BUILD_JOBS:'1',CARGO_NET_OFFLINE:'true',CARGO_TERM_COLOR:'never',TEMP:tmp,TMP:tmp,TMPDIR:tmp});const k=Object.keys(env).find(k=>k.toLowerCase()==='path')??'PATH';env[k]=dirname(rustc)+';'+(env[k]??'');
 const deps=join(target,'debug/deps');
 function build(manifest,pkg,names){const args=['--manifest-path',manifest],meta=JSON.parse(command(cargo,['metadata','--offline','--locked','--format-version','1',...args],180000)),stdout=command(cargo,['build','--offline','--locked','--lib','--message-format=json',...args],180000);const artifacts=selectCargoArtifacts(meta,stdout,pkg,names,deps);ctx.record.cargoGraphs??=[];ctx.record.cargoGraphs.push(artifacts);return artifacts;}
 return {rustc,cargo,tmp,target,deps,build};
}
