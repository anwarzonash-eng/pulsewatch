/** shields.io-style SVG badge, e.g. "uptime | 99.95%". */

const COLORS = { up: "#1f9d55", down: "#d64545", unknown: "#9aa1ad" };

// rough width of 11px Verdana; good enough for short labels
const textWidth = (text) => Math.round(text.length * 6.5 + 10);

export function badge(label, value, state) {
  const lw = textWidth(label);
  const vw = textWidth(value);
  const w = lw + vw;
  const color = COLORS[state] ?? COLORS.unknown;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="20" role="img" aria-label="${label}: ${value}">
<rect width="${lw}" height="20" fill="#555"/>
<rect x="${lw}" width="${vw}" height="20" fill="${color}"/>
<g fill="#fff" font-family="Verdana,DejaVu Sans,sans-serif" font-size="11" text-anchor="middle">
<text x="${lw / 2}" y="14">${label}</text>
<text x="${lw + vw / 2}" y="14">${value}</text>
</g>
</svg>`;
}
