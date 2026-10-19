import { spawn } from 'node:child_process';
import { realpath, stat } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readSession } from './host.mjs';
import { startServer } from './server.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const owned = new Set();
const fail = () => { throw new Error('Native session unavailable.'); };
export async function launchNative(options = {}) {
  let child;
  try {
    if (!options || Object.getPrototypeOf(options) !== Object.prototype) fail();
    for (const key of Reflect.ownKeys(options)) {
      const d = Object.getOwnPropertyDescriptor(options, key);
      if (!['initialDirectory', 'port'].includes(key) || !d.enumerable || !Object.hasOwn(d, 'value')) fail();
    }
    const { initialDirectory, port = 0 } = options;
    if (typeof initialDirectory !== 'string' || !initialDirectory.length || initialDirectory.length > 4096 || initialDirectory.includes('\0') || !Number.isInteger(port) || port < 0 || port > 65535) fail();
    if (process.platform !== 'win32') fail();
    const binary = join(root, '.local/next-target/debug/water-native-session.exe');
    const canonicalRoot = await realpath(root), canonical = await realpath(binary);
    const rel = relative(canonicalRoot, canonical);
    if (canonicalRoot !== root || canonical !== binary || rel.startsWith('..') || isAbsolute(rel) || !(await stat(canonical)).isFile()) fail();
    child = spawn(canonical, [initialDirectory], { cwd: root, shell: false, windowsHide: false, stdio: ['ignore', 'pipe', 'pipe'] });
    owned.add(child);
    const exited = new Promise((accept, reject) => {
      child.once('error', reject);
      child.once('close', (code, signal) => code === 0 && signal === null ? accept() : reject(new Error()));
    });
    // Drain raw stderr; retain at most 4096 bytes, never echo producer diagnostics.
    let diagnostics = Buffer.alloc(0);
    child.stderr.on('data', chunk => {
      if (diagnostics.length < 4096) diagnostics = Buffer.concat([diagnostics, Buffer.from(chunk.subarray(0, 4096 - diagnostics.length))]);
    });
    const [bundle] = await Promise.all([readSession(child.stdout), exited]);
    owned.delete(child);
    return await startServer({ bundle, port });
  } catch {
    if (child) {
      if (child.exitCode === null && child.signalCode === null) child.kill();
      owned.delete(child);
    }
    fail();
  }
}

// No import-time process, server, signal handler or filesystem access.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 3) {
    process.stderr.write('Invalid native launcher arguments.\n');
    process.exitCode = 64;
  } else {
    let running, stopping = false;
    const stop = async () => {
      stopping = true;
      for (const child of owned) if (child.exitCode === null && child.signalCode === null) child.kill();
      await running?.close();
    };
    process.once('SIGINT', stop);
    process.once('SIGTERM', stop);
    try {
      running = await launchNative({ initialDirectory: process.argv[2] });
      if (stopping) await running.close();
      else process.stdout.write(running.url + '\n');
    } catch {
      process.stderr.write('Native session unavailable.\n');
      process.exitCode = 2;
    }
  }
}
