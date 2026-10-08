/**
 * generate-tokens.mjs — 从物理量生成设计 token。
 *
 * 运行：npm run tokens
 *
 * 这个脚本存在的理由：Tailwind 的 @theme 只接受静态值，但本站的谱线颜色
 * 是从里德伯公式算出来的。手抄一遍算出的 hex 会立刻变成第二真源并慢慢腐烂，
 * 所以改成让脚本从 physics.ts / spectrum.ts 生成 CSS，生成物入版本库，
 * CI 用 verify-palette 检查它没被手改过。
 *
 * 需要 Node ≥ 22.18（原生 TypeScript type stripping）。
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = resolve(HERE, '..');

/** Windows 上 import() 必须收 file:// URL，直接给盘符路径会被 ESM loader 拒掉。 */
const mod = (relativePath) => pathToFileURL(resolve(SITE_ROOT, relativePath)).href;

const { CATEGORIES, formatWavelength, formatTransition } = await import(
  mod('src/lib/spectrum.ts')
);
const { SHELLS } = await import(mod('src/lib/shells.ts'));
const { deriveInk, rgbToHex, contrastRatio, relativeLuminance } = await import(
  mod('src/lib/physics.ts')
);

/* 两个主题的基底色。谱线的 ink 变体要分别对这两个背景派生。 */
const SURFACES = {
  dark: { r: 0x08, g: 0x09, b: 0x0d },
  light: { r: 0xfb, g: 0xfb, b: 0xfd },
};

/*
 * ink 的目标对比度取 6.0 而不是 AA 下限 4.5。
 * 4.5 对红色谱线会解出一个刺眼的火红，视觉上很吵；6.0 解出来是柔和的鲑红，
 * 既合规又不抢正文。这是在合规基础上的额外余量，不是降低标准。
 */
const INK_TARGET_CONTRAST = 6.0;

function rgbaChannels({ r, g, b }) {
  return `${r} ${g} ${b}`;
}

const rows = CATEGORIES.map((category) => {
  const darkInk = deriveInk(category.lineRgb, SURFACES.dark, INK_TARGET_CONTRAST);
  const lightInk = deriveInk(category.lineRgb, SURFACES.light, INK_TARGET_CONTRAST);
  return {
    category,
    darkInk,
    lightInk,
    darkContrast: contrastRatio(darkInk, SURFACES.dark),
    lightContrast: contrastRatio(lightInk, SURFACES.light),
  };
});

const lines = [];
lines.push('/*');
lines.push(' * 本文件由 scripts/generate-tokens.mjs 生成，请不要手改。');
lines.push(' * 要改颜色就去改 src/lib/spectrum.ts 里的谱线定义，然后 npm run tokens。');
lines.push(' *');
lines.push(' * 派生链：里德伯公式 → 波长 → Dan Bruton 波长转 sRGB → 谱线真色（line）');
lines.push(` *          → 保色相抬明度直到对比度 ≥ ${INK_TARGET_CONTRAST.toFixed(1)} → 文字色（ink）`);
lines.push(' */');
lines.push('');
lines.push('@theme {');
for (const { category, darkInk } of rows) {
  const { lineHex, id, line, wavelengthNm, airWavelengthNm, visible } = category;
  const tag = visible ? '真色' : '伪彩色';
  lines.push(
    `  /* ${line} ${formatTransition(category)} 真空 ${formatWavelength(wavelengthNm)}` +
      ` / 空气 ${formatWavelength(airWavelengthNm)} ${tag} */`
  );
  lines.push(`  --color-spec-${id}: ${lineHex};`);
  lines.push(`  --color-spec-${id}-ink: ${rgbToHex(darkInk)};`);
  lines.push(`  --color-spec-${id}-rgb: ${rgbaChannels(category.lineRgb)};`);
}
lines.push('}');
lines.push('');

/* 谱线相关的运行时变量放 :root，这样主题切换能换 ink 而不动 line。 */
lines.push(':root {');
for (const { category, darkInk } of rows) {
  lines.push(`  --spec-${category.id}: ${category.lineHex};`);
  lines.push(`  --spec-${category.id}-ink: ${rgbToHex(darkInk)};`);
  lines.push(`  --spec-${category.id}-rgb: ${rgbaChannels(category.lineRgb)};`);
}
lines.push('}');
lines.push('');
lines.push('[data-theme="light"] {');
for (const { category, lightInk } of rows) {
  lines.push(`  --spec-${category.id}-ink: ${rgbToHex(lightInk)};`);
}
lines.push('}');
lines.push('');

/* 壳层半径比例，玻尔模型 r_n = n²a₀，供同心圆布局用。 */
const maxN = Math.max(...SHELLS.map((s) => s.n));
lines.push(':root {');
for (const shell of SHELLS) {
  const ratio = (shell.n * shell.n) / (maxN * maxN);
  lines.push(
    `  /* ${shell.letter} 壳 容量 ${shell.capacity} 束缚能 ${shell.bindingEnergyEv.toFixed(2)} eV */`
  );
  lines.push(`  --shell-${shell.n}-radius: ${(ratio * 100).toFixed(3)}%;`);
}
lines.push('}');
lines.push('');

const css = lines.join('\n');
const outPath = resolve(SITE_ROOT, 'src/styles/spectrum.generated.css');

const mode = process.argv[2] ?? 'write';

if (mode === 'check') {
  if (!existsSync(outPath)) {
    console.error('spectrum.generated.css 不存在。跑 npm run tokens 生成它。');
    process.exit(1);
  }
  const current = readFileSync(outPath, 'utf8');
  if (current.trim() !== css.trim()) {
    console.error('spectrum.generated.css 与物理 SSOT 不一致。');
    console.error('要么它被手改了，要么谱线定义变了而没重新生成。跑 npm run tokens。');
    process.exit(1);
  }
  console.log('调色板与物理 SSOT 一致。');
  process.exit(0);
}

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, css, 'utf8');

console.log('已写入 src/styles/spectrum.generated.css\n');
console.log('谱线派生结果：');
console.log(
  ['分类', '谱线', '跃迁', 'λ真空', 'λ空气', '真色', '暗底文字色', '对比度暗/亮'].join('\t')
);
for (const { category, darkInk, darkContrast, lightContrast } of rows) {
  console.log(
    [
      category.id,
      category.line,
      formatTransition(category),
      formatWavelength(category.wavelengthNm),
      formatWavelength(category.airWavelengthNm) + (category.visible ? '' : ' 伪彩'),
      category.lineHex,
      rgbToHex(darkInk),
      `${darkContrast.toFixed(2)} / ${lightContrast.toFixed(2)}`,
    ].join('\t')
  );
}

const failures = rows.filter((r) => r.darkContrast < 4.5 || r.lightContrast < 4.5);
if (failures.length > 0) {
  console.error(
    `\n以下分类的文字色未达 WCAG AA：${failures.map((f) => f.category.id).join(', ')}`
  );
  process.exit(1);
}
console.log('\n所有谱线文字色在两个主题下均达到 WCAG AA。');
console.log(`暗底基准亮度 ${relativeLuminance(SURFACES.dark).toFixed(5)}`);
