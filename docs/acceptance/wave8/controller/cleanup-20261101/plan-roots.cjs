// Count plan paths of one item by their first two folder levels: node plan-roots.cjs <plan.json> <n>
const p = JSON.parse(require('fs').readFileSync(process.argv[2], 'utf8').replace(/^﻿/, ''));
const it = p.items.find(i => i.n === +process.argv[3]);
const roots = {};
for (const x of it.paths) { const k = x.path.split('\\').slice(0, 3).join('\\'); roots[k] = (roots[k] || 0) + 1; }
console.log(it.label, JSON.stringify(roots, null, 1));
