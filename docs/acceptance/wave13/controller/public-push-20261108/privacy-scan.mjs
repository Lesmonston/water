// Independent second scan of the public tree before the first push (case-insensitive, text and binary files).
import {readdirSync, readFileSync, statSync} from 'node:fs';
import {join, relative} from 'node:path';

const root = process.argv[2];
const PATTERNS = ['37310', 'xiluotaka', 'smaltalk', 'f:\\new', 'f:/new', '/f/new', 'riku', 'mirasim', 'usr_40dd', 'git-central',
  '7890', 'keeper', 'dfan0519-tech/water', 'water.git', 'water-w1', 'water-w', 'handoff', 'controller', 'grok', 'workbuddy',
  'vaultsystem', 'claude', 'anthropic', 'codex', 'gemini', '@gmail', '@qq.', '@163.', 'ghp_', 'github_pat_', 'gho_', 'akia',
  'begin private', 'begin rsa', 'password', 'secret', 'rsproxy', 'tuna.', 'ustc', 'npmmirror', 'mirrors.', 'sjtu', 'aliyun',
  '.local/', 'e:/', 'e:\\', 'd:\\code', 'c:\\users\\', 'c:/users/', 'administrator', 'deford', 'noreply', 'dispatch', 'acceptance',
  'ticket', 'executor', 'status.md', 'plan-open', 'jst'];
const hits = new Map(PATTERNS.map(p => [p, []]));
const walk = dir => readdirSync(dir).flatMap(n => { const p = join(dir, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
for (const file of walk(root)) {
  const rel = relative(root, file).split('\\').join('/');
  const text = readFileSync(file).toString('latin1').toLowerCase();
  const lines = text.split('\n');
  for (const p of PATTERNS) {
    if (rel.toLowerCase().includes(p)) hits.get(p).push(rel + ' (name)');
    lines.forEach((l, i) => { if (l.includes(p)) hits.get(p).push(rel + ':' + (i + 1) + '  ' + l.trim().slice(0, 140)); });
  }
}
for (const [p, h] of hits) {
  if (!h.length) continue;
  console.log(`== ${p}: ${h.length}`);
  for (const x of h.slice(0, Number(process.argv[3] ?? 6))) console.log('   ' + x);
}
console.log('clean patterns:', PATTERNS.filter(p => !hits.get(p).length).join(' | '));
