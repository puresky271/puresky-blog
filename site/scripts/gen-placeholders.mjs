/**
 * gen-placeholders.mjs — 生成占位插画。
 *
 * 只是为了让插画位在没有真作品时也能看出版式。生成一次入库即可，
 * 换成自己的插画后把对应的 .md 和图片删掉。
 *
 *   node scripts/gen-placeholders.mjs
 */

import { mkdirSync, writeFileSync } from 'node:fs';

const OUT = new URL('../src/assets/illustrations/', import.meta.url);
mkdirSync(OUT, { recursive: true });

/** 可复现的伪随机，保证重复生成结果一致。 */
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const grain = `
  <filter id="grain" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/>
    <feColorMatrix values="0 0 0 0 0.5  0 0 0 0 0.55  0 0 0 0 0.65  0 0 0 0.09 0"/>
    <feComposite in2="SourceGraphic" operator="in"/>
  </filter>`;

function clouds(random, w, h, count, color, opacity, yRange) {
  let out = '';
  for (let i = 0; i < count; i += 1) {
    const cx = random() * w;
    const cy = yRange[0] * h + random() * (yRange[1] - yRange[0]) * h;
    const rx = w * (0.18 + random() * 0.22);
    const ry = rx * (0.22 + random() * 0.12);
    out += `<ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" fill="${color}" opacity="${(opacity * (0.6 + random() * 0.4)).toFixed(2)}"/>`;
  }
  return out;
}

function noon() {
  const w = 1200;
  const h = 1500;
  const random = rng(7);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2f7fe6"/>
      <stop offset="0.55" stop-color="#7cb8f5"/>
      <stop offset="1" stop-color="#dbeeff"/>
    </linearGradient>
    <radialGradient id="sun" cx="0.78" cy="0.2" r="0.45">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.95"/>
      <stop offset="0.12" stop-color="#ffffff" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <filter id="soft" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="38"/></filter>
    ${grain}
  </defs>
  <rect width="${w}" height="${h}" fill="url(#sky)"/>
  <rect width="${w}" height="${h}" fill="url(#sun)"/>
  <g filter="url(#soft)">${clouds(random, w, h, 9, '#ffffff', 0.85, [0.48, 0.95])}</g>
  <g filter="url(#soft)">${clouds(random, w, h, 4, '#ffffff', 0.5, [0.25, 0.45])}</g>
  <rect width="${w}" height="${h}" filter="url(#grain)"/>
</svg>`;
}

function night() {
  const w = 1200;
  const h = 1500;
  const random = rng(42);
  let stars = '';
  for (let i = 0; i < 420; i += 1) {
    const x = random() * w;
    const y = random() * h * 0.9;
    const r = random() < 0.04 ? 2.2 + random() * 1.4 : 0.6 + random() * 1.1;
    stars += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(2)}" fill="#eaf2ff" opacity="${(0.35 + random() * 0.6).toFixed(2)}"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#070b16"/>
      <stop offset="0.6" stop-color="#14254a"/>
      <stop offset="1" stop-color="#2b4f86"/>
    </linearGradient>
    <linearGradient id="band" x1="0" y1="1" x2="1" y2="0">
      <stop offset="0.25" stop-color="#7fb6ff" stop-opacity="0"/>
      <stop offset="0.5" stop-color="#9cc6ff" stop-opacity="0.22"/>
      <stop offset="0.75" stop-color="#7fb6ff" stop-opacity="0"/>
    </linearGradient>
    <filter id="glow"><feGaussianBlur stdDeviation="1.4"/></filter>
    <filter id="haze" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="60"/></filter>
    ${grain}
  </defs>
  <rect width="${w}" height="${h}" fill="url(#sky)"/>
  <rect width="${w}" height="${h}" fill="url(#band)"/>
  <g filter="url(#glow)">${stars}</g>
  <g filter="url(#haze)">${clouds(random, w, h, 6, '#3d6db3', 0.55, [0.85, 1.02])}</g>
  <rect width="${w}" height="${h}" filter="url(#grain)"/>
</svg>`;
}

function dawn() {
  const w = 1500;
  const h = 1000;
  const random = rng(19);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#5d8fd8"/>
      <stop offset="0.5" stop-color="#a9c9f0"/>
      <stop offset="0.82" stop-color="#e3edfb"/>
      <stop offset="1" stop-color="#f4f8fe"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.32" cy="0.86" r="0.6">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.9"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <filter id="soft" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="30"/></filter>
    ${grain}
  </defs>
  <rect width="${w}" height="${h}" fill="url(#sky)"/>
  <rect width="${w}" height="${h}" fill="url(#glow)"/>
  <g filter="url(#soft)">${clouds(random, w, h, 7, '#ffffff', 0.7, [0.12, 0.42])}</g>
  <g filter="url(#soft)">${clouds(random, w, h, 5, '#d6e6fa', 0.8, [0.78, 0.98])}</g>
  <rect width="${w}" height="${h}" filter="url(#grain)"/>
</svg>`;
}

const files = { 'placeholder-noon.svg': noon(), 'placeholder-night.svg': night(), 'placeholder-dawn.svg': dawn() };
for (const [name, svg] of Object.entries(files)) {
  writeFileSync(new URL(name, OUT), svg.replace(/\n\s*/g, '\n'));
  console.log('写入', name);
}
