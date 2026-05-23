/**
 * Small inline SVG of response times, oldest on the left.
 * Failed checks are drawn as red dots on the baseline.
 */
export function sparkline(checks, { width = 120, height = 28 } = {}) {
  const points = [...checks].reverse();
  if (points.length < 2) return "";
  const values = points.map((c) => (c.ok ? c.ms : 0));
  const max = Math.max(...values, 1);
  const step = width / (points.length - 1);
  const y = (v) => (height - 2 - (v / max) * (height - 4)).toFixed(1);

  const line = points
    .map((c, i) => `${(i * step).toFixed(1)},${y(values[i])}`)
    .join(" ");
  const failures = points
    .map((c, i) => (c.ok ? "" : `<circle cx="${(i * step).toFixed(1)}" cy="${height - 2}" r="2" class="fail"/>`))
    .join("");

  return `<svg class="spark" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" aria-hidden="true"><polyline points="${line}" fill="none"/>${failures}</svg>`;
}
