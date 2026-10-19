import { spawn } from 'node:child_process';
import { realpath, stat } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startFromStreams } from './transport.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const unavailable = 'Workspace unavailable.';
export async function launchWorkspace(options = {}) {
  let child, workspace, exited, shutdown;
  try {
    if (!options || Object.getPrototypeOf(options) !== Object.prototype) throw new Error();
    for (const key of Reflect.ownKeys(options)) {
      const d = Object.getOwnPropertyDescriptor(options, key);
      if (!['initialDirectory', 'port'].includes(key) || !d.enumerable || !Object.hasOwn(d, 'value')) throw new Error();
    }
    const { initialDirectory, port = 0 } = options;
    if (process.platform !== 'win32' || typeof initialDirectory !== 'string' || !initialDirectory.length ||
        initialDirectory.length > 4096 || !initialDirectory.isWellFormed() || initialDirectory.includes('\0') ||
        !Number.isInteger(port) || port < 0 || port > 65535) throw new Error();
    const binary = join(root, '.local/next-target/debug/water-scan-host.exe');
    const canonicalRoot = await realpath(root), canonical = await realpath(binary), rel = relative(canonicalRoot, canonical);
    if (canonicalRoot !== root || canonical !== binary || rel.startsWith('..') || isAbsolute(rel) || !(await stat(canonical)).isFile()) throw new Error();
    child = spawn(canonical, [initialDirectory], { cwd: root, shell: false, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    // Child diagnostics are drained as raw bytes and never reach HTTP or logs.
    child.stderr.on('data', () => {});
    child.stdin.on('error', () => {});
    exited = new Promise(ok => { child.once('error', () => ok()); child.once('close', () => ok()); });
    shutdown = () => {
      if (child.exitCode !== null || child.signalCode !== null) return;
      if (!child.stdin.destroyed && !child.stdin.writableEnded) child.stdin.end(Buffer.from('{"command":"shutdown"}\n'));
    };
    workspace = await startFromStreams({ input: child.stdout, output: child.stdin, port });
    let closing;
    return { url: workspace.url, close() {
      closing ??= (async () => {
        shutdown();
        const timer = setTimeout(() => { if (child.exitCode === null && child.signalCode === null) child.kill(); }, 2000);
        try { await workspace.close(); child.stdout.resume(); await exited; } finally { clearTimeout(timer); }
      })();
      return closing;
    } };
  } catch {
    if (child) {
      shutdown?.();
      const timer = setTimeout(() => { if (child.exitCode === null && child.signalCode === null) child.kill(); }, 2000);
      try { await workspace?.close(); child.stdout.resume(); await exited; } finally { clearTimeout(timer); }
    }
    throw new Error(unavailable);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 3) { process.stderr.write('Invalid workspace arguments.\n'); process.exitCode = 64; }
  else {
    let running, stopping = false;
    const stop = async () => { stopping = true; await running?.close(); };
    process.once('SIGINT', stop); process.once('SIGTERM', stop);
    try {
      running = await launchWorkspace({ initialDirectory: process.argv[2] });
      if (stopping) await running.close(); else process.stdout.write(running.url + '\n');
    } catch { process.stderr.write(unavailable + '\n'); process.exitCode = 2; }
  }
}
