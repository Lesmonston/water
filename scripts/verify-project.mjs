// Verifies Water's research handoff, not the safety or behavior of upstream apps.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const strict = process.argv.includes('--with-upstreams');
const env = { ...process.env, GIT_OPTIONAL_LOCKS: '0' };
function git(cwd, args, binary = false) {
  return execFileSync('git', ['-c', 'core.fsmonitor=false', '-C', cwd, ...args], {
    env, encoding: binary ? undefined : 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
  });
}
function inside(path) {
  const rel = relative(root, path);
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}
const required = [
  'README.md', 'AGENTS.md', 'docs/STATUS.md', 'docs/PROJECT-CHARTER.md',
  'docs/MVP-REQUIREMENTS.md', 'docs/ARCHITECTURE.md', 'docs/ROADMAP.md',
  'docs/OPEN-SOURCE-STRATEGY.md', 'docs/COMPLETION-SUMMARY.md',
  'docs/tasks/W0-INIT-AND-RESEARCH.md', 'docs/tasks/W1-READONLY-CORE.md',
  'research/OPEN-SOURCE-ANALYSIS.md', 'research/README.md',
  'research/sources/ai-developer-cleaner-research-2026-10-17.zh-CN.md',
  'docs/CONTROLLER-WORKFLOW.md', 'docs/dispatch/README.md',
  'docs/dispatch/templates/WORK-ORDER.md', 'docs/dispatch/templates/REPORT.md',
  'research/CONTROLLER-WORKFLOW-STUDY.md',
];
for (const file of required) assert(existsSync(resolve(root, file)), `Missing ${file}`);
const dispatchRegistry = JSON.parse(readFileSync(resolve(root, 'docs/dispatch/registry.json'), 'utf8'));
assert.equal(dispatchRegistry.schemaVersion, 1);
assert.equal(dispatchRegistry.mode, 'manual-external-paste');
assert(Array.isArray(dispatchRegistry.slots) && Array.isArray(dispatchRegistry.tasks));
assert.equal(new Set(dispatchRegistry.tasks.map((task) => task.id)).size, dispatchRegistry.tasks.length);
const workflowSources = JSON.parse(readFileSync(resolve(root, 'research/controller-workflow-sources.json'), 'utf8'));
assert.equal(workflowSources.schemaVersion, 1);
assert.equal(workflowSources.mode, 'local-read-only-workflow-study');
assert.equal(workflowSources.contentCopied, false);
assert.equal(workflowSources.sourceProgramsExecuted, false);
assert(workflowSources.sources.length > 0);
for (const source of workflowSources.sources) assert.match(source.sha256, /^[a-f0-9]{64}$/);
const manifest = JSON.parse(readFileSync(resolve(root, 'research/upstreams.lock.json'), 'utf8'));
assert.equal(manifest.schemaVersion, 1);
assert.equal(manifest.productCodeReused, false);
assert.equal(manifest.upstreams.length, 5);
const ids = new Set();
let checkedSnapshots = 0;
for (const item of manifest.upstreams) {
  assert(!ids.has(item.id), `Duplicate upstream id: ${item.id}`);
  ids.add(item.id);
  assert.match(item.commit, /^[a-f0-9]{40}$/);
  assert.match(item.licenseSha256, /^[a-f0-9]{64}$/);
  assert.equal(item.usage, 'static-research-only');
  const cwd = resolve(root, item.path);
  assert(inside(cwd), `Outside project: ${item.path}`);
  const reviewPath = resolve(root, item.review);
  assert(inside(reviewPath));
  const review = readFileSync(reviewPath, 'utf8');
  assert(review.includes(item.commit), `${item.review} lacks pinned commit ${item.commit}`);
  assert(review.includes(`${item.repository}/blob/${item.commit}/`), `${item.review} lacks pinned source link`);
  if (!existsSync(resolve(cwd, '.git'))) {
    assert(!strict, `Missing local snapshot: ${item.id}`);
    continue;
  }
  assert.equal(git(cwd, ['rev-parse', 'HEAD']).trim(), item.commit, `HEAD changed: ${item.id}`);
  assert.equal(git(cwd, ['config', '--get', 'remote.origin.url']).trim(), item.origin);
  assert.equal(git(cwd, ['status', '--porcelain', '--untracked-files=all']).trim(), '', `Dirty snapshot: ${item.id}`);
  const licenseBytes = git(cwd, ['show', `${item.commit}:${item.licensePath}`], true);
  assert.equal(createHash('sha256').update(licenseBytes).digest('hex'), item.licenseSha256);
  checkedSnapshots++;
}

function markdownFiles(dir) {
  const found = [];
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    if (['.git', '.worktrees', '.local', 'upstream', 'node_modules', 'target'].includes(item.name)) continue;
    const path = resolve(dir, item.name);
    if (item.isDirectory()) found.push(...markdownFiles(path));
    else if (item.isFile() && item.name.endsWith('.md')) found.push(path);
  }
  return found;
}
const markdown = markdownFiles(root);
let localLinks = 0;
let pinnedSourceLinks = 0;
let externalPinnedSourceLinks = 0;
for (const file of markdown) {
  const content = readFileSync(file, 'utf8');
  assert(!content.includes('\uFFFD'), `Replacement character in ${relative(root, file)}`);
  for (const match of content.matchAll(/\[[^\]\n]*\]\(([^)\n]+)\)/g)) {
    const target = match[1].replace(/^<|>$/g, '');
    if (/^(?:[a-z][a-z0-9+.-]*:|#)/i.test(target)) continue;
    const pathPart = target.split('#')[0];
    if (!pathPart) continue;
    const dest = resolve(dirname(file), decodeURIComponent(pathPart));
    assert(inside(dest), `Link leaves Water: ${relative(root, file)} → ${target}`);
    assert(existsSync(dest), `Broken link: ${relative(root, file)} → ${target}`);
    localLinks++;
  }
  // Check both inline and reference-style GitHub citations against pinned checkouts.
  const githubPattern = /https:\/\/github\.com\/[^/\s)<>]+\/[^/\s)<>]+\/(?:blob|tree)\/[a-f0-9]{40}\/[^\s)<>`]+/g;
  for (const match of content.matchAll(githubPattern)) {
    const url = new URL(match[0]);
    const parts = url.pathname.split('/').filter(Boolean);
    const repoUrl = `https://github.com/${parts[0]}/${parts[1]}`;
    const commit = parts[3];
    const upstream = manifest.upstreams.find((item) => item.repository === repoUrl && item.commit === commit);
    if (!upstream || !existsSync(resolve(root, upstream.path, '.git'))) {
      externalPinnedSourceLinks++;
      continue;
    }
    const sourceRoot = resolve(root, upstream.path);
    const source = resolve(sourceRoot, decodeURIComponent(parts.slice(4).join('/')));
    const rel = relative(sourceRoot, source);
    assert(!rel.startsWith('..') && !isAbsolute(rel), `Source link leaves checkout: ${url.href}`);
    assert(existsSync(source), `Missing source in pinned checkout: ${url.href}`);
    if (parts[2] === 'blob' && url.hash) {
      const lineMatch = /^#L(\d+)(?:-L(\d+))?$/.exec(url.hash);
      if (lineMatch) {
        const start = Number(lineMatch[1]);
        const end = Number(lineMatch[2] ?? lineMatch[1]);
        const lines = readFileSync(source, 'utf8').split('\n');
        if (lines.at(-1) === '') lines.pop();
        assert(start >= 1 && end >= start && end <= lines.length, `Invalid source line range: ${url.href}`);
      }
    }
    pinnedSourceLinks++;
  }
}
const trackedUpstreams = git(root, ['ls-files', '--', 'research/upstream']).trim();
assert.equal(trackedUpstreams, '', 'Upstream source must not be tracked in Water');
assert(!existsSync(resolve(root, '.gitmodules')), 'No upstream submodules expected');
console.log(JSON.stringify({
  status: 'passed', markdownFiles: markdown.length, localLinks, pinnedSourceLinks,
  externalPinnedSourceLinks,
  dispatchRegistryTasks: dispatchRegistry.tasks.length,
  workflowSourceRecords: workflowSources.sources.length,
  upstreams: manifest.upstreams.length, checkedLocalSnapshots: checkedSnapshots,
  mode: strict ? 'with-upstreams' : 'documents-and-available-snapshots',
  boundary: 'Metadata, provenance and handoff checks only; no upstream runtime or cleanup safety test.',
}, null, 2));
