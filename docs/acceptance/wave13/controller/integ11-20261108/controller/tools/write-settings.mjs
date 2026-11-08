// Writes a fresh Flick settings.json for a read-only recheck: every category on, optionally one folder added.
// Usage: node write-settings.mjs <data dir> [<root id> <folder>]   e.g. ... mirasim-a "F:\Mirasim-A"
import {mkdirSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
const [dir, rootId, folder] = process.argv.slice(2);
if (!dir) throw Error('usage: write-settings.mjs <data dir> [<root id> <folder>]');
const categories = Object.fromEntries(['agent_tool', 'browser', 'system_temp', 'app_leftover', 'dev_cache', 'crash_log', 'gpu_system'].map(c => [c, true]));
const custom_roots = rootId ? [{root_id: rootId, path: folder, added_at: new Date().toISOString().replace(/\.\d+Z$/, 'Z')}] : [];
mkdirSync(dir, {recursive: true});
writeFileSync(join(dir, 'settings.json'), JSON.stringify({settings_version: 'water.settings.v1', categories, custom_roots}, null, 2));
console.log('settings', join(dir, 'settings.json'), custom_roots.length ? 'with ' + folder : 'common locations only');
