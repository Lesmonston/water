// Controller check for WATER-W6-I2 (HOST-M3 section 2, close guard): close the real Water window while a
// clean of a large synthetic fixture is running, and verify the window waits for the clean to stop, the
// clean record and journal are complete and the app exits 0. One native window, no directory dialog.
// The data directory is seeded like the desktop gate's M2 fixture loop: every category off and only the
// fixture folder added, so the clean can only reach the fixture. Run from the root of the tree under test.
// Usage: node F:/new/smaltalk/water/scripts/acceptance/w6-i2-close-during-clean.mjs <water.exe> <work dir>
import {spawn, spawnSync} from 'node:child_process';
import {existsSync, mkdirSync, readFileSync, readdirSync, lstatSync, utimesSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const [exeArg, workArg] = process.argv.slice(2);
if (!exeArg || !workArg) throw Error('usage: w6-i2-close-during-clean.mjs <water.exe> <work dir>');
const exe = resolve(exeArg), work = resolve(workArg), here = dirname(fileURLToPath(import.meta.url));
if (!existsSync(exe)) throw Error('executable missing');
if (existsSync(work)) throw Error('work dir must not exist');
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const fixture = join(work, 'fixture'), dataDir = join(work, 'data'), evidence = join(work, 'evidence');
mkdirSync(fixture, {recursive: true}); mkdirSync(dataDir); mkdirSync(evidence);

// 160 tagged cache folders x 400 files of 2 KiB: about 64,000 files, so the clean runs for several seconds.
const DIRS = 160, FILES = 400, BYTES = 2048, tag = 'Signature: 8a477f597d28d172789f06886806bc55\n# Water W6-I2 close-during-clean fixture: safe to delete.\n';
const kept = {'src/main.rs': 'fn main() {}\n', 'notes/keep.txt': 'not a cache\n'};
for (const [p, text] of Object.entries(kept)) { mkdirSync(dirname(join(fixture, p)), {recursive: true}); writeFileSync(join(fixture, p), text, {flag: 'wx'}); }
const blob = Buffer.alloc(BYTES, 0x61);
for (let d = 0; d < DIRS; d++) {
  const dir = join(fixture, 'caches', 'c' + String(d).padStart(3, '0')); mkdirSync(dir, {recursive: true});
  writeFileSync(join(dir, 'CACHEDIR.TAG'), tag, {flag: 'wx'});
  for (let f = 0; f < FILES; f++) writeFileSync(join(dir, 'f' + String(f).padStart(3, '0') + '.bin'), blob, {flag: 'wx'});
}
const when = new Date(Date.now() - 72 * 3600000), all = [];
const walk = d => { for (const n of readdirSync(d)) { const p = join(d, n); if (lstatSync(p).isDirectory()) walk(p); all.push(p); } };
walk(fixture); for (const p of [...all, fixture]) utimesSync(p, when, when);
const categories = ['agent_tool', 'browser', 'system_temp', 'app_leftover', 'dev_cache', 'crash_log', 'gpu_system'];
writeFileSync(join(dataDir, 'settings.json'), JSON.stringify({settings_version: 'water.settings.v1', categories: Object.fromEntries(categories.map(c => [c, false])),
  custom_roots: [{root_id: 'fixture', path: fixture, added_at: new Date().toISOString().replace(/\.\d+Z$/, 'Z')}]}, null, 2) + '\n', {flag: 'wx'});
const texts = {home: '开始一次体检', scanButton: '开始体检', results: '本次体检共识别', scanFailed: '体检未能完成，请重新体检。', cleanButton: '清理所选',
  confirm: '这些文件将被永久删除，不进入回收站，无法恢复。', deletePrefix: '永久删除 ', stopButton: '停止'};
const textsPath = join(evidence, stamp + '-texts.json'); writeFileSync(textsPath, JSON.stringify(texts, null, 2) + '\n');
console.log(`fixture: ${DIRS * FILES} cache files in ${DIRS} tagged folders, ${Object.keys(kept).length} kept files`);

const started = Date.now(), child = spawn(exe, [], {cwd: process.cwd(), env: {...process.env, WATER_DATA_DIR: dataDir}, windowsHide: false, stdio: ['ignore', 'pipe', 'pipe']});
let stdout = '', stderr = ''; child.stdout.on('data', b => stdout += b); child.stderr.on('data', b => stderr += b);
const ended = new Promise(ok => child.once('close', (code, signal) => ok({code, signal})));
const observerPath = join(evidence, stamp + '-observer.json');
const obs = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-File', join(here, 'w6-i2-close-observe.ps1'), '-TestProcessId', String(child.pid), '-ExpectedExe', exe,
  '-TextsPath', textsPath, '-EvidencePath', observerPath, '-ShotPrefix', join(evidence, stamp), '-Title', 'Water', '-MaximumSeconds', '420'], {encoding: 'utf8', windowsHide: true, timeout: 480000});
let exit; { let t; try { exit = await Promise.race([ended, new Promise((_, bad) => { t = setTimeout(() => bad(Error('desktop exit timeout')), 30000); })]); } finally { clearTimeout(t); } }
if (child.exitCode === null) child.kill();
const observer = existsSync(observerPath) ? JSON.parse(readFileSync(observerPath, 'utf8')) : null;

// Service store after exit: one scan, plan, clean record and journal.
const list = d => existsSync(join(dataDir, d)) ? readdirSync(join(dataDir, d)) : [];
const cleans = list('cleans'), journals = list('journal');
const report = cleans.length === 1 ? JSON.parse(readFileSync(join(dataDir, 'cleans', cleans[0]), 'utf8')).report : null;
const lines = journals.length === 1 ? readFileSync(join(dataDir, 'journal', journals[0]), 'utf8').trim().split(/\r?\n/).map(l => JSON.parse(l)) : [];
const intents = lines.filter(l => l.event === 'intent'), results = lines.filter(l => l.event === 'result');
const unmatched = intents.filter(i => !results.some(r => r.item_id === i.item_id)).length;
let remaining = 0; for (let d = 0; d < DIRS; d++) { const dir = join(fixture, 'caches', 'c' + String(d).padStart(3, '0')); if (existsSync(dir)) remaining += readdirSync(dir).filter(n => n.endsWith('.bin')).length; }
const keptOk = Object.entries(kept).every(([p, text]) => existsSync(join(fixture, p)) && readFileSync(join(fixture, p), 'utf8') === text);
const ms = s => s ? Date.parse(s) : NaN, closeAt = ms(observer?.closeRequestedAt), goneAt = ms(observer?.windowGoneAt), endedAt = ms(report?.ended_at);
const lastResultAt = Math.max(...results.map(r => ms(r.at)));
const checks = {
  observerPassed: obs.status === 0 && !observer?.error,
  exitCode0: exit?.code === 0,
  oneCleanRecord: cleans.length === 1 && journals.length === 1 && list('scans').length === 1 && list('plans').length === 1,
  stoppedByClose: report?.status === 'stopped',
  // ended_at and journal times have whole-second precision.
  cleanRunningAtClose: endedAt + 1000 > closeAt,
  windowWaitedForClean: goneAt > closeAt && goneAt + 1000 >= endedAt && goneAt + 1000 >= lastResultAt,
  journalComplete: intents.length > 0 && unmatched === 0,
  partialDeletion: remaining > 0 && remaining < DIRS * FILES,
  keptFilesIntact: keptOk,
};
const summary = {stamp, exe, wallMs: Date.now() - started, exit, observerExit: obs.status, observer, report: report && {status: report.status, started_at: report.started_at, ended_at: report.ended_at, freed_bytes: report.freed_bytes,
  items: report.items.length, itemStatuses: report.items.reduce((a, i) => (a[i.status] = (a[i.status] ?? 0) + 1, a), {})},
  journal: {intents: intents.length, results: results.length, unmatched}, remainingCacheFiles: remaining, closeToWindowGoneMs: goneAt - closeAt, checks,
  passed: Object.values(checks).every(Boolean), stdoutBytes: stdout.length, stderrTail: stderr.slice(-2000)};
writeFileSync(join(evidence, stamp + '-result.json'), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify({passed: summary.passed, checks, report: summary.report, journal: summary.journal, remaining, closeToWindowGoneMs: summary.closeToWindowGoneMs, observerError: observer?.error ?? null}));
if (!summary.passed) process.exitCode = 1;
