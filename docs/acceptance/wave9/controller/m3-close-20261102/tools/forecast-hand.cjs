// Hand calculation of "几天后满" (SERVICE-M3C §7) straight from the record files, without the service, to compare with
// what the service's trends command returns for the same records.
// Usage: node forecast-hand.cjs <data dir copy> <service trends output .json>
const fs = require('fs'), path = require('path');
const [dir, servicePath] = process.argv.slice(2);
const read = (sub) => fs.readdirSync(path.join(dir, sub)).map(f => JSON.parse(fs.readFileSync(path.join(dir, sub, f), 'utf8')));
const scans = read('scans'), cleans = read('cleans');
const now = Date.now(), DAY = 86400000;
const points = {};
for (const s of scans) {
  const at = Date.parse(s.finished_at);
  if (now - at > 30 * DAY) continue;
  for (const d of s.drives) (points[d.root] ??= []).push({at, free: BigInt(d.free_bytes)});
}
const freed = cleans.flatMap(c => {
  const v = typeof c.view === 'string' ? JSON.parse(c.view) : c.view;
  return v.drives.map(d => ({root: d.root, at: Date.parse(v.finished_at), bytes: BigInt(d.free_after) > BigInt(d.free_before) ? BigInt(d.free_after) - BigInt(d.free_before) : 0n}));
});
const service = JSON.parse(fs.readFileSync(servicePath, 'utf8')).forecast;
const rows = Object.entries(points).map(([root, ps]) => {
  ps.sort((a, b) => a.at - b.at);
  const first = ps[0], last = ps.at(-1), days = (last.at - first.at) / DAY;
  const adjusted = p => p.free - freed.filter(c => c.root === root && c.at > first.at && c.at < p.at).reduce((a, c) => a + c.bytes, 0n);
  let hand;
  if (ps.length < 3 || days < 3) hand = {days_to_full: null, note: '不足'};
  else {
    const rate = Number(adjusted(first) - adjusted(last)) / days;
    hand = rate <= 0 ? {bytes_per_day: Math.trunc(rate), days_to_full: null, note: '没有减少'}
      : {bytes_per_day: Math.trunc(rate), days_to_full: Math.floor(Number(last.free) / rate)};
    if (hand.days_to_full > 3650) hand = {...hand, days_to_full: null, note: '十年内不会满'};
  }
  const svc = service.find(f => f.root === root);
  const same = svc && String(hand.bytes_per_day) === svc.bytes_per_day && hand.days_to_full === svc.days_to_full;
  return {root, points: ps.length, basis_days: days.toFixed(2), cleans_subtracted: freed.filter(c => c.root === root && c.at > first.at && c.at < last.at).map(c => String(c.bytes)),
    hand, service: svc && {bytes_per_day: svc.bytes_per_day, days_to_full: svc.days_to_full, basis_days: svc.basis_days, note_zh: svc.note_zh}, same};
});
console.log(JSON.stringify(rows, null, 2));
