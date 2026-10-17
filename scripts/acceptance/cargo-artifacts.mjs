// Select only library artifacts emitted by one successful Cargo build graph.
import assert from 'node:assert/strict';
import {basename,dirname,isAbsolute,resolve} from 'node:path';
export function selectCargoArtifacts(metadata,stdout,packageName,crateNames,depsDirectory){
  const messages=stdout.trim().split(/\r?\n/).filter(Boolean).map(line=>JSON.parse(line));
  assert(messages.some(m=>m.reason==='build-finished'&&m.success===true),'Cargo build did not finish successfully');
  const roots=metadata.packages.filter(p=>p.name===packageName);assert.equal(roots.length,1,'Ambiguous root package');
  const nodes=new Map(metadata.resolve.nodes.map(n=>[n.id,n])),reachable=new Set();
  function visit(id){if(reachable.has(id))return;reachable.add(id);const node=nodes.get(id);assert(node,'Missing Cargo graph node');for(const dep of node.dependencies)visit(dep);}
  visit(roots[0].id);
  return crateNames.map(crate=>{
    const packages=metadata.packages.filter(p=>reachable.has(p.id)&&p.targets.some(t=>t.name===crate&&t.kind.includes('lib')));
    assert.equal(packages.length,1,'Ambiguous graph package for '+crate);const pkg=packages[0];
    const files=new Set(messages.filter(m=>m.reason==='compiler-artifact'&&m.package_id===pkg.id&&m.target.name===crate&&m.target.kind.includes('lib')&&m.profile.test===false).flatMap(m=>m.filenames.filter(f=>f.endsWith('.rlib'))));
    assert.equal(files.size,1,'Missing or ambiguous Cargo artifact for '+crate);const filename=[...files][0];
    assert(isAbsolute(filename));const parent=resolve(dirname(filename)).toLowerCase(),deps=resolve(depsDirectory).toLowerCase();
    const rootOutput=pkg.id===roots[0].id&&parent===resolve(dirname(depsDirectory)).toLowerCase()&&basename(filename)==='lib'+crate+'.rlib';
    assert(parent===deps||rootOutput,'Artifact outside private dependency directory or fixed root library');
    return {crate,packageId:pkg.id,filename};
  });
}
