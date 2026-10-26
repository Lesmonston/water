const MB = 1024n ** 2n;
const GB = 1024n ** 3n;
export function bytes(value) {
  if (typeof value === 'bigint') return value;
  if (typeof value !== 'string' || !/^-?\d+$/.test(value)) throw new TypeError('Invalid byte value');
  return BigInt(value);
}
export function formatBytes(value) {
  const n = bytes(value), abs = n < 0n ? -n : n, sign = n < 0n ? '−' : '';
  if (abs < MB) return `${sign}<1 MB`;
  const roundedMB = (abs + MB / 2n) / MB;
  if (abs < GB && roundedMB < 1024n) return `${sign}${count(roundedMB)} MB`;
  const tenths = (abs * 10n + GB / 2n) / GB;
  return `${sign}${count(tenths / 10n)}.${tenths % 10n} GB`;
}
export function count(value) { return BigInt(value).toLocaleString('en-US'); }
export function byteDelta(value) { return `${bytes(value) > 0n ? '+' : ''}${formatBytes(value)}`; }
export function countDelta(value) { const n = BigInt(value); return `${n < 0n ? '−' : n > 0n ? '+' : ''}${count(n < 0n ? -n : n)}`; }
export function relativeTime(value, now = Date.now()) {
  if (!value) return '尚无记录';
  const date = new Date(value), delta = Math.max(0, now - date.getTime());
  if (!Number.isFinite(date.getTime())) return '时间未知';
  if (delta < 60000) return '刚刚';
  if (delta < 3600000) return `${Math.floor(delta / 60000)} 分钟前`;
  if (delta < 86400000) return `${Math.floor(delta / 3600000)} 小时前`;
  return `${delta >= 365 * 86400000 ? `${date.getUTCFullYear()} 年 ` : ''}${date.getUTCMonth() + 1} 月 ${date.getUTCDate()} 日`;
}
export function dateTime(value) {
  const date = new Date(value);
  return `${date.getMonth() + 1} 月 ${date.getDate()} 日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}
export function elapsed(ms) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
// Only the bounded ratio becomes a Number, never a byte quantity.
export function percent(part, total) {
  const t = bytes(total), p = bytes(part);
  return t <= 0n ? 0 : Number((p < 0n ? 0n : p > t ? t : p) * 10000n / t) / 100;
}
export function middlePath(path, max = 56) {
  return path.length <= max ? path : `${path.slice(0, 13)}…${path.slice(-(max - 14))}`;
}
