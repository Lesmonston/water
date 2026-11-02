// Synthetic fixture for the M3 close F1/F2 recheck (wave 9 plan §2.3). Plain files and folders only; every time is set
// to 10 days ago so the one-week rule (node-modules) and the one-day rule (test-browser-profiles) can both apply.
// Expected: proj-web and ms-playwright / puppeteer stay "confirm" (selectable); the rest go to the advisory fallbacks.
// Usage: node fx-w9.cjs <new empty dir>
const fs = require('fs'), path = require('path');
const root = path.resolve(process.argv[2]);
if (fs.existsSync(root)) throw Error('fixture root must not exist: ' + root);
const files = {
  // F2: a real project (package.json plus source) keeps node-modules
  'proj-web/package.json': '{"name":"proj-web"}',
  'proj-web/src/index.js': 'console.log(1)\n',
  'proj-web/node_modules/left-pad/package.json': '{"name":"left-pad"}',
  'proj-web/node_modules/left-pad/index.js': 'x'.repeat(40000),
  // F2: npm global directory, no package.json beside node_modules
  'npm-global/node_modules/some-cli/index.js': 'x'.repeat(30000),
  // F2: a tool install with only package.json, lock file and node_modules (like isolated-cli\pkg\claude)
  'cli-pkg/package.json': '{"name":"cli-pkg"}',
  'cli-pkg/package-lock.json': '{}',
  'cli-pkg/node_modules/tool/index.js': 'x'.repeat(20000),
  // F2: Electron unpacked app; the parent even looks like a project, the .asar.unpacked ancestor decides
  'desktop-app/resources/app.asar.unpacked/package.json': '{"name":"app"}',
  'desktop-app/resources/app.asar.unpacked/main.js': 'x',
  'desktop-app/resources/app.asar.unpacked/node_modules/native/addon.node': 'x'.repeat(10000),
  // F1: test tool profiles keep test-browser-profiles
  'ms-playwright/chromium-1140/profile/Local State': '{}',
  'ms-playwright/chromium-1140/profile/Default/Preferences': 'x'.repeat(5000),
  'cache/puppeteer/profile-1/Local State': '{}',
  'cache/puppeteer/profile-1/Default/Preferences': 'x'.repeat(4000),
  // F1: an embedded browser's data (WebView2) goes to browser-data-dirs
  'chat-app/EBWebView/Local State': '{}',
  'chat-app/EBWebView/Default/Cookies': 'x'.repeat(8000),
};
for (const [rel, body] of Object.entries(files)) {
  const p = path.join(root, rel);
  fs.mkdirSync(path.dirname(p), {recursive: true});
  fs.writeFileSync(p, body);
}
const old = new Date(Date.now() - 10 * 24 * 3600 * 1000);
const touch = dir => {
  for (const e of fs.readdirSync(dir, {withFileTypes: true})) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) touch(p);
    fs.utimesSync(p, old, old);
  }
};
touch(root);
fs.utimesSync(root, old, old);
console.log(JSON.stringify({root, files: Object.keys(files).length, time: old.toISOString()}));
