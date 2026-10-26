// Preview only: iceberg brand (DESIGN §10) plus one candidate for the "体检" nav icon, applied to a controller tree.
// Usage: node scripts/design/preview-brand-nav.cjs <controller tree root> <pulse|scan|gauge|search>
// Then in that tree: WATER_W2_SHOTS_DIR=<tree>/.local/<dir> node --test --test-concurrency=1 apps/water/ui/tests/browser.test.mjs,
// and restore with git checkout -- apps/water/ui. Never run it on a worker tree or the main checkout.
const fs = require('fs');
const [tree, which] = process.argv.slice(2), T = tree + '/apps/water/ui/';
const berg = '<symbol id="i-berg" viewBox="0 0 48 48"><mask id="berg-facets" maskUnits="userSpaceOnUse" x="0" y="0" width="48" height="48"><rect width="48" height="48" fill="#fff"/><path d="M24 23.5 L21.5 39 M24 23.5 L35 31.5" stroke="#000" stroke-width="1.4" fill="none"/></mask><path d="M19.5 17 L24.5 8.5 L27 12 L29.5 17 Z" fill="currentColor" stroke="none"/><path d="M4.5 20 H43.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M10 23.5 H38 L35 31.5 L28.5 42.5 L21.5 39 L14 32 Z" fill="currentColor" stroke="none" mask="url(#berg-facets)"/></symbol>';
const nav = {
  pulse: '<path d="M3.5 12.5h3.8l2.1-4.8 3.4 9.3 2.3-6 1.3 1.5h4.1"/>',
  scan: '<path d="M4 8.5V6a2 2 0 0 1 2-2h2.5"/><path d="M15.5 4H18a2 2 0 0 1 2 2v2.5"/><path d="M20 15.5V18a2 2 0 0 1-2 2h-2.5"/><path d="M8.5 20H6a2 2 0 0 1-2-2v-2.5"/><path d="M7.5 12h9"/>',
  gauge: '<path d="M4.2 16.5a8 8 0 1 1 15.6 0"/><path d="m12 15.6 3.6-4.2"/><circle cx="12" cy="16" r="1.3"/>',
  search: '<circle cx="10.8" cy="10.8" r="6.3"/><path d="m15.5 15.5 4.5 4.5"/>',
}[which];
if (!nav) throw new Error('unknown candidate ' + which);
const scan = '<symbol id="i-checkup" viewBox="0 0 24 24">' + nav + '</symbol>';
const edits = [
  ['index.html', '<defs><symbol id="i-drop"', '<defs>' + berg + scan + '<symbol id="i-drop"'],
  ['app.mjs', "add(el('div', 'brand'), icon('drop')", "add(el('div', 'brand'), icon('berg')"],
  ['app.mjs', "['home', '体检', 'drop']", "['home', '体检', 'checkup']"],
  ['views/about.mjs', "add(el('div', 'glass about-brand'), icon('drop')", "add(el('div', 'glass about-brand'), icon('berg')"],
  ['views/common.mjs', "return add(el('section', 'glass empty'), icon('drop')", "return add(el('section', 'glass empty'), icon('berg')"],
  ['styles/app.css', '.brand > .i { width: 30px; height: 34px; color: var(--w-accent); }', '.brand > .i { width: 30px; height: 30px; color: var(--w-ink); }'],
  ['styles/app.css', '.about-brand > .i { width: 42px; height: 42px; color: var(--w-accent); }', '.about-brand > .i { width: 42px; height: 42px; color: var(--w-ink); }'],
  ['styles/app.css', '.empty > .i { color: var(--w-accent); width: 36px; height: 36px; margin-bottom: 16px; }', '.empty > .i { color: var(--w-ink); width: 36px; height: 36px; margin-bottom: 16px; }'],
];
for (const [f, a, b] of edits) { const p = T + f, s = fs.readFileSync(p, 'utf8'); if (s.split(a).length !== 2) throw new Error('anchor ' + f + ': ' + a.slice(0, 40)); fs.writeFileSync(p, s.replace(a, b)); }
console.log('preview edits applied: ' + which);
