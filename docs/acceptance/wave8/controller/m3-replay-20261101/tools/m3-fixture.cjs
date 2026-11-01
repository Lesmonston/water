// Controller fixture for the 10-29 replay (handoff 12 §4.3): hard links inside and across cache items,
// two Python cache items (one to skip, one to exclude by hand), a Git worktree (.git file).
// Creates only <base>/fx under the integration tree's .local; aged 3 days. Prints the root.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const base = process.argv[2];
if (!base || !/\\\.worktrees\\integ-w8a\\\.local\\m3-replay\\/.test(base)) throw Error('base must be under integ-w8a/.local/m3-replay');
const root = path.join(base, 'fx');
const mk = p => fs.mkdirSync(p, { recursive: true });
const write = (p, n) => { mk(path.dirname(p)); fs.writeFileSync(p, typeof n === 'number' ? crypto.randomBytes(n) : n, { flag: 'wx' }); };
const link = (from, to) => { mk(path.dirname(to)); fs.linkSync(from, to); };
const MiB = 1024 * 1024;
const tag = 'Signature: 8a477f597d28d172789f06886806bc55\n# controller replay fixture\n';
// cachedir-tagged: proj item has one 1 MiB file with two more links, and a file linked into proj2
write(path.join(root, 'proj', 'build-cache', 'CACHEDIR.TAG'), tag);
write(path.join(root, 'proj', 'build-cache', 'blob.bin'), MiB);
link(path.join(root, 'proj', 'build-cache', 'blob.bin'), path.join(root, 'proj', 'build-cache', 'l1.bin'));
link(path.join(root, 'proj', 'build-cache', 'blob.bin'), path.join(root, 'proj', 'build-cache', 'sub', 'l2.bin'));
write(path.join(root, 'proj', 'build-cache', 'cross.bin'), 200000);
write(path.join(root, 'proj', 'src', 'main.rs'), 'fn main() {}\n');
write(path.join(root, 'proj2', 'build-cache', 'CACHEDIR.TAG'), tag);
write(path.join(root, 'proj2', 'build-cache', 'own.bin'), 100000);
link(path.join(root, 'proj', 'build-cache', 'cross.bin'), path.join(root, 'proj2', 'build-cache', 'cross.bin'));
// python-tool-caches: two items
write(path.join(root, 'pyproj', '__pycache__', 'm.cpython-312.pyc'), 50000);
write(path.join(root, 'pyproj2', '__pycache__', 'n.cpython-312.pyc'), 60000);
// git-worktrees: a directory whose .git is a small file
write(path.join(root, 'wt1', '.git'), 'gitdir: F:/elsewhere/repo/.git/worktrees/wt1\n');
write(path.join(root, 'wt1', 'src', 'a.txt'), 30000);
const when = new Date(Date.now() - 3 * 86400000);
const age = p => { for (const e of fs.readdirSync(p, { withFileTypes: true })) { const q = path.join(p, e.name); if (e.isDirectory()) age(q); fs.utimesSync(q, when, when); } };
age(root); fs.utimesSync(root, when, when);
console.log(JSON.stringify({ root, agedTo: when.toISOString(), tagBytes: Buffer.byteLength(tag) }));
