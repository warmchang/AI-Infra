#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const dataPath = path.join(repoRoot, 'diagrams', 'mcm-multicluster-radar.data.json');
const outPath = path.join(repoRoot, 'diagrams', 'mcm-multicluster-radar.svg');

const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

const canvas = { width: 1880, height: 1260 };
const radar = { cx: 560, cy: 640, innerRadius: 86, outerRadius: 500 };
const legend = { x: 1080, y: 128, width: 730, height: 1010 };
const ringThickness = (radar.outerRadius - radar.innerRadius) / data.rings.length;

function escapeXml(input) {
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function toRadians(deg) {
  return (deg * Math.PI) / 180;
}

function polarToCartesian(cx, cy, r, angle) {
  const rad = toRadians(angle);
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad)
  };
}

function sectorPath(cx, cy, inner, outer, start, end) {
  const outerStart = polarToCartesian(cx, cy, outer, start);
  const outerEnd = polarToCartesian(cx, cy, outer, end);
  const innerEnd = polarToCartesian(cx, cy, inner, end);
  const innerStart = polarToCartesian(cx, cy, inner, start);
  const delta = ((end - start) % 360 + 360) % 360;
  const largeArc = delta > 180 ? 1 : 0;

  return [
    `M ${outerStart.x.toFixed(2)} ${outerStart.y.toFixed(2)}`,
    `A ${outer} ${outer} 0 ${largeArc} 1 ${outerEnd.x.toFixed(2)} ${outerEnd.y.toFixed(2)}`,
    `L ${innerEnd.x.toFixed(2)} ${innerEnd.y.toFixed(2)}`,
    `A ${inner} ${inner} 0 ${largeArc} 0 ${innerStart.x.toFixed(2)} ${innerStart.y.toFixed(2)}`,
    'Z'
  ].join(' ');
}

function wrapWords(text, maxChars) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars || current.length === 0) {
      current = next;
      continue;
    }
    lines.push(current);
    current = word;
  }

  if (current) lines.push(current);
  return lines.length ? lines : [text];
}

const rings = data.rings.map((ring, index) => {
  const inner = radar.innerRadius + ringThickness * index;
  const outer = radar.innerRadius + ringThickness * (index + 1);
  return {
    ...ring,
    index,
    inner,
    outer,
    mid: (inner + outer) / 2
  };
});

const sectors = data.sectors.map((sector, index) => ({
  ...sector,
  index,
  mid: (sector.start + sector.end) / 2
}));

const ringIndex = new Map(rings.map((ring) => [ring.id, ring.index]));
const ringById = new Map(rings.map((ring) => [ring.id, ring]));
const sectorIndex = new Map(sectors.map((sector) => [sector.id, sector.index]));
const sectorById = new Map(sectors.map((sector) => [sector.id, sector]));

const projects = data.projects
  .slice()
  .sort((a, b) => {
    const ringDiff = (ringIndex.get(a.ring) ?? 999) - (ringIndex.get(b.ring) ?? 999);
    if (ringDiff !== 0) return ringDiff;
    const sectorDiff = (sectorIndex.get(a.sector) ?? 999) - (sectorIndex.get(b.sector) ?? 999);
    if (sectorDiff !== 0) return sectorDiff;
    return a.name.localeCompare(b.name, 'en', { sensitivity: 'base' });
  });

const grouped = new Map();
for (const project of projects) {
  const key = `${project.ring}::${project.sector}`;
  const arr = grouped.get(key) || [];
  arr.push(project);
  grouped.set(key, arr);
}

const radialSteps = [0.34, 0.56, 0.78];
const placedProjects = [];

for (const [key, groupProjects] of grouped.entries()) {
  const [ringId, sectorId] = key.split('::');
  const ring = ringById.get(ringId);
  const sector = sectorById.get(sectorId);
  if (!ring || !sector) continue;

  const total = groupProjects.length;
  for (let i = 0; i < total; i += 1) {
    const project = groupProjects[i];
    const angle =
      typeof project.angle === 'number'
        ? project.angle
        : sector.start + ((i + 1) / (total + 1)) * (sector.end - sector.start);
    const radial =
      typeof project.radial === 'number' ? project.radial : radialSteps[i % radialSteps.length];
    const radius = ring.inner + radial * (ring.outer - ring.inner);
    const point = polarToCartesian(radar.cx, radar.cy, radius, angle);
    placedProjects.push({
      ...project,
      ring,
      sector,
      source: data.sources[project.source] || data.sources.ecosystem,
      angle,
      radius,
      x: point.x,
      y: point.y
    });
  }
}

placedProjects.sort((a, b) => {
  const ringDiff = a.ring.index - b.ring.index;
  if (ringDiff !== 0) return ringDiff;
  const sectorDiff = a.sector.index - b.sector.index;
  if (sectorDiff !== 0) return sectorDiff;
  return a.name.localeCompare(b.name, 'en', { sensitivity: 'base' });
});

for (let i = 0; i < placedProjects.length; i += 1) {
  placedProjects[i].id = String(i + 1).padStart(2, '0');
}

const sectorBackgrounds = sectors
  .map((sector, index) => {
    const fill = index % 2 === 0 ? '#FAFCFF' : '#F7FAFC';
    return `<path d="${sectorPath(
      radar.cx,
      radar.cy,
      radar.innerRadius,
      radar.outerRadius,
      sector.start,
      sector.end
    )}" fill="${fill}" />`;
  })
  .join('\n  ');

const ringCircles = rings
  .map(
    (ring) =>
      `<circle cx="${radar.cx}" cy="${radar.cy}" r="${ring.outer.toFixed(2)}" fill="${ring.fill}" fill-opacity="0.36" stroke="${ring.stroke}" stroke-width="1.4" />`
  )
  .reverse()
  .join('\n  ');

const ringBoundaries = rings
  .map(
    (ring) =>
      `<circle cx="${radar.cx}" cy="${radar.cy}" r="${ring.outer.toFixed(
        2
      )}" fill="none" stroke="#8A94A6" stroke-width="0.8" stroke-dasharray="4 5" />`
  )
  .join('\n  ');

const sectorLines = sectors
  .map((sector) => {
    const start = polarToCartesian(radar.cx, radar.cy, radar.innerRadius, sector.start);
    const end = polarToCartesian(radar.cx, radar.cy, radar.outerRadius, sector.start);
    return `<line x1="${start.x.toFixed(2)}" y1="${start.y.toFixed(2)}" x2="${end.x.toFixed(
      2
    )}" y2="${end.y.toFixed(2)}" stroke="#99A3B2" stroke-width="1.1" />`;
  })
  .join('\n  ');

const sectorLabels = sectors
  .map((sector) => {
    const pos = polarToCartesian(radar.cx, radar.cy, radar.outerRadius + 34, sector.mid);
    const cos = Math.cos(toRadians(sector.mid));
    const anchor = cos > 0.24 ? 'start' : cos < -0.24 ? 'end' : 'middle';
    return `<text x="${pos.x.toFixed(2)}" y="${(pos.y + 4).toFixed(2)}" text-anchor="${anchor}" class="sector-label">${escapeXml(
      sector.label
    )}</text>`;
  })
  .join('\n  ');

const ringLabels = rings
  .map((ring) => {
    const pos = polarToCartesian(radar.cx, radar.cy, ring.mid, -104);
    return `<text x="${(pos.x - 12).toFixed(2)}" y="${(pos.y + 4).toFixed(
      2
    )}" text-anchor="end" class="ring-label">${escapeXml(ring.label)}</text>`;
  })
  .join('\n  ');

const projectDots = placedProjects
  .map((project) => {
    return `
    <g class="project-dot">
      <circle cx="${project.x.toFixed(2)}" cy="${project.y.toFixed(2)}" r="12.5" fill="${project.source.fill}" stroke="${project.source.stroke}" stroke-width="2.1" />
      <text x="${project.x.toFixed(2)}" y="${(project.y + 4.2).toFixed(2)}" text-anchor="middle" class="dot-id">${project.id}</text>
    </g>`;
  })
  .join('\n  ');

const sourceLegendEntries = Object.entries(data.sources)
  .map(([id, source], index) => {
    const x = legend.x + 28 + index * 220;
    const y = legend.y + 80;
    return `
    <g transform="translate(${x}, ${y})">
      <circle cx="0" cy="0" r="9" fill="${source.fill}" stroke="${source.stroke}" stroke-width="2" />
      <text x="16" y="4.5" class="legend-source">${escapeXml(source.label)}</text>
    </g>`;
  })
  .join('\n  ');

const projectsByRing = new Map(rings.map((ring) => [ring.id, []]));
for (const project of placedProjects) {
  projectsByRing.get(project.ring.id).push(project);
}

let legendY = legend.y + 130;
let ringDetails = '';

for (const ring of rings) {
  const items = projectsByRing.get(ring.id) || [];
  ringDetails += `<text x="${legend.x + 18}" y="${legendY}" class="legend-ring-title" fill="${
    ring.stroke
  }">${escapeXml(ring.label)} (${items.length})</text>\n`;
  legendY += 20;
  ringDetails += `<text x="${legend.x + 18}" y="${legendY}" class="legend-ring-desc">${escapeXml(
    ring.description
  )}</text>\n`;
  legendY += 20;

  for (const item of items) {
    const line = `${item.id} ${item.name} [${item.source.label}] - ${item.sector.label}`;
    const wrapped = wrapWords(line, 70);
    for (const wrappedLine of wrapped) {
      ringDetails += `<text x="${legend.x + 28}" y="${legendY}" class="legend-item">${escapeXml(
        wrappedLine
      )}</text>\n`;
      legendY += 16;
    }
    legendY += 4;
  }

  legendY += 8;
}

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}" role="img" aria-labelledby="title desc">
  <title id="title">${escapeXml(data.meta.title)} (${escapeXml(data.meta.version)})</title>
  <desc id="desc">Multi-cluster management technology radar generated from JSON data for easy GitHub maintenance.</desc>
  <defs>
    <style>
      .title { font: 700 42px ui-sans-serif, -apple-system, Segoe UI, Helvetica, Arial, sans-serif; fill: #111827; }
      .subtitle { font: 500 19px ui-sans-serif, -apple-system, Segoe UI, Helvetica, Arial, sans-serif; fill: #4B5563; }
      .sector-label { font: 600 13px ui-sans-serif, -apple-system, Segoe UI, Helvetica, Arial, sans-serif; fill: #334155; }
      .ring-label { font: 700 14px ui-sans-serif, -apple-system, Segoe UI, Helvetica, Arial, sans-serif; fill: #475569; letter-spacing: 0.6px; }
      .dot-id { font: 700 10.5px ui-sans-serif, -apple-system, Segoe UI, Helvetica, Arial, sans-serif; fill: #111827; }
      .legend-title { font: 700 24px ui-sans-serif, -apple-system, Segoe UI, Helvetica, Arial, sans-serif; fill: #111827; }
      .legend-note { font: 500 13.5px ui-sans-serif, -apple-system, Segoe UI, Helvetica, Arial, sans-serif; fill: #4B5563; }
      .legend-source { font: 600 13px ui-sans-serif, -apple-system, Segoe UI, Helvetica, Arial, sans-serif; fill: #334155; }
      .legend-ring-title { font: 700 16px ui-sans-serif, -apple-system, Segoe UI, Helvetica, Arial, sans-serif; }
      .legend-ring-desc { font: 500 12.5px ui-sans-serif, -apple-system, Segoe UI, Helvetica, Arial, sans-serif; fill: #64748B; }
      .legend-item { font: 500 12.5px ui-sans-serif, -apple-system, Segoe UI, Helvetica, Arial, sans-serif; fill: #1F2937; }
      .footer { font: 500 13px ui-sans-serif, -apple-system, Segoe UI, Helvetica, Arial, sans-serif; fill: #64748B; }
    </style>
  </defs>

  <rect x="0" y="0" width="${canvas.width}" height="${canvas.height}" fill="#F3F5F8" />
  <rect x="${legend.x}" y="${legend.y}" width="${legend.width}" height="${legend.height}" rx="16" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.4" />

  <text x="76" y="72" class="title">${escapeXml(data.meta.title)}</text>
  <text x="76" y="102" class="subtitle">${escapeXml(data.meta.version)} | updated ${escapeXml(
    data.meta.last_updated
  )}</text>

  ${sectorBackgrounds}
  ${ringCircles}
  ${ringBoundaries}
  ${sectorLines}
  ${sectorLabels}
  ${ringLabels}

  <circle cx="${radar.cx}" cy="${radar.cy}" r="${radar.innerRadius - 2}" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.2" />
  <text x="${radar.cx}" y="${radar.cy - 4}" text-anchor="middle" class="ring-label">MCM</text>
  <text x="${radar.cx}" y="${radar.cy + 14}" text-anchor="middle" class="legend-note">2026Q1</text>

  ${projectDots}

  <text x="${legend.x + 18}" y="${legend.y + 40}" class="legend-title">Index</text>
  <text x="${legend.x + 18}" y="${legend.y + 60}" class="legend-note">Blend of CNCF MCM radar and non-CNCF ecosystem projects (issue #267).</text>
  ${sourceLegendEntries}
  ${ringDetails}

  <text x="76" y="1186" class="footer">Maintenance: edit diagrams/mcm-multicluster-radar.data.json and run node scripts/generate-mcm-radar-svg.js</text>
  <text x="76" y="1208" class="footer">Scope: multi-cluster management for AI infra (control plane, delivery, lifecycle, tenancy, portal, and scale testing).</text>
</svg>
`;

fs.writeFileSync(outPath, svg);
console.log(`Generated ${path.relative(repoRoot, outPath)} from ${path.relative(repoRoot, dataPath)}`);
