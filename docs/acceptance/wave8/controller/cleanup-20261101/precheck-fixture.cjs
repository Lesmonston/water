// Fixture for precheck-plan.cjs (verified 11-02: IN 1, KEEP 2, NAME 2, LINK 1): A
m is real; B
m -> A
m; C
m -> B
m (the grok2
// named nul, a folder ending in a space, release.jks and .env.local. Plan candidate: B. usage: node make-... <dir>
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const root = path.resolve(process.argv[2]);
const ns = p => path.toNamespacedPath(p);
for (const d of ['A\\nm\\pkg', 'B', 'C']) fs.mkdirSync(path.join(root, d), { recursive: true });
fs.writeFileSync(path.join(root, 'A\\nm\\pkg\\index.js'), '');
execFileSync('cmd', ['/c', 'mklink', '/J', path.join(root, 'B\\nm'), path.join(root, 'A\\nm')]);
execFileSync('cmd', ['/c', 'mklink', '/J', path.join(root, 'C\\nm'), path.join(root, 'B\\nm')]);
fs.writeFileSync(ns(path.join(root, 'B\\nul')), 'x');
fs.mkdirSync(ns(path.join(root, 'B\\cache ')));
fs.writeFileSync(path.join(root, 'B\\release.jks'), '');
fs.writeFileSync(path.join(root, 'B\\.env.local'), '');
fs.writeFileSync(path.join(root, 'plan.json'), JSON.stringify({ quarantine: 'unused', items: [{ n: 1, label: 'B', paths: [{ path: path.join(root, 'B') }] }] }));
console.log('fixture at', root);
