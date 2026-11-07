// Render the Flick tweet video from scenes.html with the machine's own headless Chrome (nothing is downloaded).
// Usage (repo root):
//   node docs/launch/flick-video/render.mjs frames <out dir> <t1,t2,...>   still PNGs at those seconds
//   node docs/launch/flick-video/render.mjs video <out.mp4>                 30 fps H.264 MP4, 1920x1080
// The video pipes PNG frames into ffmpeg: FLICK_FFMPEG if set, else the one bundled with the Python package imageio-ffmpeg.
// Chrome talks over --remote-debugging-pipe (no port) and keeps its throwaway profile under .local/flick-video/.
import {execFileSync, spawn} from 'node:child_process';
import {existsSync, mkdirSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {StringDecoder} from 'node:string_decoder';
import {fileURLToPath, pathToFileURL} from 'node:url';

const [mode, out, times] = process.argv.slice(2);
if (!['frames', 'video'].includes(mode) || !out || (mode === 'frames' && !times)) throw Error('usage: frames <dir> <t1,t2,...> | video <out.mp4>');
const FPS = 30, W = 1920, H = 1080;
const page = pathToFileURL(join(dirname(fileURLToPath(import.meta.url)), 'scenes.html')).href;
const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(p => existsSync(p));
if (!chrome) throw Error('no local Chrome or Edge');
const profile = resolve('.local/flick-video/profile');
mkdirSync(profile, {recursive: true});

const proc = spawn(chrome, ['--headless=new', '--remote-debugging-pipe', '--user-data-dir=' + profile, '--no-first-run', '--no-default-browser-check',
  '--hide-scrollbars', '--force-device-scale-factor=1',
  // A headless tab counts as hidden; without these its frames, and so each screenshot, come about once a second.
  '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', `--window-size=${W},${H}`, 'about:blank'], {stdio: ['ignore', 'ignore', 'ignore', 'pipe', 'pipe']});
let seq = 0, buf = '';
const pending = new Map(), waiters = [], decoder = new StringDecoder('utf8');
proc.stdio[4].on('data', chunk => {
  buf += decoder.write(chunk);
  for (let i; (i = buf.indexOf('\0')) >= 0;) {
    const msg = JSON.parse(buf.slice(0, i)); buf = buf.slice(i + 1);
    if (msg.id && pending.has(msg.id)) {
      const {ok, fail} = pending.get(msg.id); pending.delete(msg.id);
      msg.error ? fail(Error(JSON.stringify(msg.error))) : ok(msg.result);
    } else if (msg.method) for (const w of waiters.filter(w => w.method === msg.method)) { waiters.splice(waiters.indexOf(w), 1); w.ok(msg.params); }
  }
});
const send = (method, params = {}, sessionId) => new Promise((ok, fail) => {
  const id = ++seq; pending.set(id, {ok, fail});
  proc.stdio[3].write(JSON.stringify(sessionId ? {id, method, params, sessionId} : {id, method, params}) + '\0');
});
const once = method => new Promise(ok => waiters.push({method, ok}));

try {
  const {targetId} = await send('Target.createTarget', {url: 'about:blank'});
  const {sessionId: s} = await send('Target.attachToTarget', {targetId, flatten: true});
  await send('Page.enable', {}, s);
  await send('Page.bringToFront', {}, s);
  await send('Emulation.setFocusEmulationEnabled', {enabled: true}, s);
  await send('Emulation.setDeviceMetricsOverride', {width: W, height: H, deviceScaleFactor: 1, mobile: false}, s);
  const loaded = once('Page.loadEventFired');
  await send('Page.navigate', {url: page}, s);
  await loaded;
  const ready = await send('Runtime.evaluate', {expression: 'document.fonts.ready.then(() => typeof renderAt)', awaitPromise: true, returnByValue: true}, s);
  if (ready.result.value !== 'function') throw Error('scenes.html did not load');
  // captureScreenshot draws a fresh frame, so the styles set here are in it; waiting for requestAnimationFrame is not
  // needed (and is throttled to about once a second in a headless background tab).
  const at = async t => (await send('Runtime.evaluate', {returnByValue: true, expression: `renderAt(${t})`}, s)).result.value;
  const shot = async () => Buffer.from((await send('Page.captureScreenshot', {format: 'png'}, s)).data, 'base64');

  if (mode === 'frames') {
    mkdirSync(out, {recursive: true});
    for (const t of times.split(',').map(Number)) {
      await at(t);
      const file = join(out, `t${t.toFixed(2).replace('.', '_')}.png`);
      writeFileSync(file, await shot()); console.log(file);
    }
  } else {
    const ffmpeg = process.env.FLICK_FFMPEG ?? execFileSync('python', ['-c', 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())'], {encoding: 'utf8'}).trim();
    mkdirSync(dirname(resolve(out)), {recursive: true});
    const ff = spawn(ffmpeg, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
      
      // Fixed fine grain so the faint background gradient does not band in 8-bit 4:2:0.
      '-vf', 'noise=alls=2:allf=u', '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], {stdio: ['pipe', 'inherit', 'inherit']});
    const done = new Promise((ok, fail) => ff.on('close', code => code === 0 ? ok() : fail(Error('ffmpeg exit ' + code))));
    const total = process.env.FLICK_TO ? Math.round(FPS * +process.env.FLICK_TO) : Math.round(FPS * (await send('Runtime.evaluate', {expression: 'VIDEO_LENGTH', returnByValue: true}, s)).result.value);
    let lastKey = null, last = null, shots = 0;
    for (let i = 0; i < total; i++) {
      const key = await at(i / FPS);
      if (key !== lastKey) { last = await shot(); lastKey = key; shots++; }
      if (!ff.stdin.write(last)) await new Promise(ok => ff.stdin.once('drain', ok));
      if (i % 150 === 0) console.log(`frame ${i}/${total}`);
    }
    ff.stdin.end(); await done;
    console.log(`${out}: ${total} frames, ${shots} rendered`);
  }
} finally {
  proc.kill();
}
