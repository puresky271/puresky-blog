/**
 * gen-icons.mjs — 从 iconify 数据里抽出用到的图标，生成 src/lib/icons.generated.ts。
 *
 * 为什么不直接在组件里 import 整个 icons.json：那是几 MB 的 JSON，
 * 在 Svelte 岛屿里引用会整个打进客户端包。这里只抽用到的，
 * 并且每个图标是独立的命名导出，客户端按需 import 时能被 tree-shake。
 *
 * 新增图标：把名字加进下面的列表，跑 `npm run icons`。
 */

import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

/** Phosphor，界面图标统一用这一套。 */
const PHOSPHOR = `
  magnifying-glass sun moon monitor list x arrow-right arrow-up-right arrow-left arrow-up
  caret-left caret-right caret-down caret-up check copy link hash calendar-blank clock tag
  folder-simple book-open eye heart heart-fill chat-circle share-network pencil-simple
  git-commit clock-counter-clockwise git-pull-request git-merge git-branch git-fork star
  star-fill chat-centered-text circle-dashed check-circle tag-simple book-bookmark users globe
  trash play-fill pause-fill skip-back-fill skip-forward-fill repeat repeat-once shuffle
  speaker-high speaker-low speaker-x playlist music-notes music-notes-simple quotes
  vinyl-record envelope-simple map-pin download-simple qr-code arrows-clockwise
  identification-card rss github-logo image images warning info lightbulb warning-octagon
  sign-in sign-out arrow-square-out cloud-slash code terminal-window user house article
  list-bullets sliders-horizontal hand-tap paper-plane-tilt arrow-counter-clockwise dots-three
  plus minus waveform command arrows-out-simple x-circle microphone-stage arrow-elbow-down-right
  buildings hourglass-medium cloud cloud-rain snowflake
  archive stack arrow-clockwise text-h text-b text-italic text-strikethrough table upload-simple
  sidebar-simple list-numbers check-square text-superscript dots-six-vertical folders
  cloud-arrow-up cloud-arrow-down git-diff file-text file-image gear-six corners-out corners-in
  keyboard text-t books floppy-disk
`;

/** Simple Icons，只用于第三方品牌标识。 */
const SIMPLE = `neteasecloudmusic bilibili`;

function pick(set, names, prefix) {
  const out = [];
  for (const name of names.split(/\s+/).filter(Boolean)) {
    const resolved = set.icons[name] ?? set.icons[set.aliases?.[name]?.parent];
    if (!resolved) throw new Error(`图标不存在：${prefix}:${name}`);
    out.push({
      name: prefix === 'ph' ? name : `brand-${name}`,
      body: resolved.body,
      size: resolved.width ?? set.width ?? 24,
    });
  }
  return out;
}

const icons = [
  ...pick(require('@iconify-json/ph/icons.json'), PHOSPHOR, 'ph'),
  ...pick(require('@iconify-json/simple-icons/icons.json'), SIMPLE, 'si'),
];

const ident = (name) =>
  'i' + name.replace(/(^|-)([a-z0-9])/g, (_, __, c) => c.toUpperCase());

const lines = [
  '/* 由 scripts/gen-icons.mjs 生成，不要手改。新增图标见该脚本头部说明。 */',
  '',
  'export interface IconData {',
  '  /** viewBox 边长。Phosphor 是 256，Simple Icons 是 24。 */',
  '  size: number;',
  '  body: string;',
  '}',
  '',
];

for (const icon of icons) {
  lines.push(`export const ${ident(icon.name)}: IconData = { size: ${icon.size}, body: ${JSON.stringify(icon.body)} };`);
}

lines.push('', '/** 按名字查表。只给 .astro 组件用（服务端渲染，不进客户端包）。 */');
lines.push('export const icons = {');
for (const icon of icons) lines.push(`  '${icon.name}': ${ident(icon.name)},`);
lines.push('} as const;', '', 'export type IconName = keyof typeof icons;', '');

writeFileSync(new URL('../src/lib/icons.generated.ts', import.meta.url), lines.join('\n'));
console.log(`生成 ${icons.length} 个图标`);
