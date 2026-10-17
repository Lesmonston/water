// water.prototype.v1 display model. It grants no filesystem capabilities.
export function selectFindings(findings, {
  query = '', tool = 'all', category = 'all', risk = 'all', sort = 'size_desc',
} = {}) {
  const needle = query.toLowerCase();
  const sorted = [...findings].sort((a, b) => {
    if (a.logical_bytes === null) return b.logical_bytes === null ? 0 : 1;
    if (b.logical_bytes === null) return -1;
    if (sort === 'name_asc') {
      const left = a.title.toLowerCase(), right = b.title.toLowerCase();
      return left < right ? -1 : left > right ? 1 : 0;
    }
    const left = BigInt(a.logical_bytes), right = BigInt(b.logical_bytes);
    const order = left < right ? -1 : left > right ? 1 : 0;
    return sort === 'size_asc' ? order : -order;
  });
  return sorted.filter((row) =>
    (tool === 'all' || row.tool_id === tool) &&
    (category === 'all' || row.category === category) &&
    (risk === 'all' || row.risk === risk) &&
    (row.title.toLowerCase().includes(needle) || row.relative_path.toLowerCase().includes(needle)));
}

export function formatBytes(value) {
  if (value === null) return '未知';
  const bytes = BigInt(value);
  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB'];
  let unit = 0, divisor = 1n;
  while (unit < units.length - 1 && bytes >= divisor * 1024n) { divisor *= 1024n; unit++; }
  // Truncate to one fractional digit using only integer arithmetic; omit .0.
  const tenths = bytes * 10n / divisor;
  const fraction = tenths % 10n;
  return `${tenths / 10n}${fraction ? '.' + fraction : ''} ${units[unit]}`;
}

export function summarize(findings) {
  return {
    count: findings.length,
    protected_count: findings.filter((row) => row.risk === 'protected').length,
    unknown_size_count: findings.filter((row) => row.logical_bytes === null).length,
    logical_total_bytes: null,
    reclaimable_bytes: null,
  };
}
