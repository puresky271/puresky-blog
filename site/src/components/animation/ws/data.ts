/**
 * Sparks of Weight-Space Programming 那篇文章里四个交互演示的共用数据层与行内渲染。
 *
 * 数据是原站的 JSON，逐字复制到 public/data/weight-space/ 下，这里只在组件真正挂载时才取：
 * 一篇长文里有七个 trace 卡片和三个图表，同步打进 bundle 太重。
 *
 * 行内标记沿用原站的写法：
 * - `**粗体**`、`*斜体*`、`` `代码` ``；
 * - `⟦…⟧` 是 Ada 命名的术语（原站画成深色小字）；
 * - `⦃…⦄` 是模型从权重里读出来的数字，画成浅绿底。
 */

import { withBase } from '@/lib/format';

export interface SetupText {
  en: string[];
  zh: string[];
}

/* ---------- 取数据 ---------- */

const cache = new Map<string, Promise<unknown>>();

/** 同一份 JSON 只取一次，浏览器缓存之外再压一层，切 tab 不会重复请求。 */
export function loadJson<T>(path: string): Promise<T> {
  const cached = cache.get(path);
  if (cached) return cached as Promise<T>;
  const pending = fetch(withBase(path)).then((response) => {
    if (!response.ok) throw new Error(`${path}: ${response.status}`);
    return response.json();
  });
  cache.set(path, pending);
  return pending as Promise<T>;
}

/** 原站 JSON 里的图片路径以 assets/ 开头，站内的静态资源在 media/weight-space/ 下。 */
export function assetUrl(path: string | undefined): string {
  if (!path) return '';
  return withBase(`media/weight-space/${path.replace(/^assets\//, '')}`);
}

export async function loadSetup(key: string): Promise<SetupText | undefined> {
  const all = await loadJson<Record<string, SetupText>>('/data/weight-space/setup.json');
  return all[key];
}

/* ---------- 行内 ---------- */

export function esc(value: string): string {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const ITALIC = /(^|[\s(])\*([^*\s][^*]*?)\*(?=[\s).,;:]|$)/g;

/** 一段已经转义的纯文本 → 带行内标记的 HTML。 */
export function inline(text: string): string {
  return esc(text)
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(ITALIC, '$1<i>$2</i>')
    .replace(/`([^`]+)`/g, '<span class="tp-code">$1</span>')
    .replace(/⟦/g, '<span class="tp-key">')
    .replace(/⟧/g, '</span>')
    .replace(/⦃/g, '<mark class="tp-read">')
    .replace(/⦄/g, '</mark>');
}

/** 提示词原文：不加行内标记，只把模型引用到的权重数字标出来。 */
export function promptText(text: string): string {
  return esc(text).replace(/⦃/g, '<mark class="tp-read">').replace(/⦄/g, '</mark>');
}

/** 一行权重数字，被引用的那几位标出来。 */
export function weightLine(values: string[], marks: number[]): string {
  return values.map((value, index) => (marks.includes(index) ? `<mark class="tp-read">${esc(value)}</mark>` : esc(value))).join(' ');
}

/** 代码块：去掉列表项里的公共缩进。 */
export function preBlock(lines: string[]): string {
  const indents = lines.filter((line) => line.trim()).map((line) => (line.match(/^\s*/) as RegExpMatchArray)[0].length);
  const indent = indents.length ? Math.min(...indents) : 0;
  return `<pre class="tp-pre">${esc(lines.map((line) => line.slice(indent)).join('\n'))}</pre>`;
}

/** Markdown 表格（若干行）→ HTML。 */
export function markdownTable(lines: string[]): string {
  const cells = (line: string): string[] => line.trim().replace(/^\||\|$/g, '').split('|').map((cell) => inline(cell.trim()));
  const rows = lines.filter((line) => !/^[\s|:-]+$/.test(line));
  const [head, ...body] = rows.map(cells);
  return `<table class="tp-table"><thead><tr>${head.map((cell) => `<th>${cell}</th>`).join('')}</tr></thead><tbody>${
    body.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}

/* ---------- 小图 ---------- */

/** 一行行灰度值（0 到 1）画成小图：扩散模型的采样，或者模型自己画的那张。 */
export function pixelSvg(rows: number[][], color: string, className: string): string {
  let lit = '';
  rows.forEach((row, y) => row.forEach((value, x) => {
    if (value > 0) lit += `<rect x="${x}" y="${y}" width="1" height="1" fill="${color}" fill-opacity="${value}"/>`;
  }));
  const width = rows[0].length;
  const height = rows.length;
  return `<svg class="${className}" viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges" role="img">`
    + `<rect width="${width}" height="${height}" fill="#000000"/>${lit}</svg>`;
}

/** 代码块其实是张画：每行等长的 # 和 .。 */
export function asDrawing(text: string): number[][] | null {
  const rows = text.split('\n').map((line) => line.trim()).filter(Boolean);
  if (rows.length < 6 || !rows.every((row) => /^[.#]+$/.test(row) && row.length === rows[0].length)) return null;
  return rows.map((row) => [...row].map((character) => (character === '#' ? 1 : 0)));
}

/* ---------- 答案的骨架 ---------- */

/** 把“哪句话是问题”从提示词里挑出来：问号那句，或者 “Rank / Change / Predict / Write” 开头那句。 */
export function askFrom(question: string): { text: string; rule: string } {
  const flat = question.replace(/[⦃⦄]/g, '').replace(/\s+/g, ' ').trim();
  const sentences = flat.match(/[^.?!]+[.?!]/g) ?? [flat];
  const questions = sentences.filter((sentence) => sentence.trim().endsWith('?'));
  let picked = (questions.length
    ? questions
    : sentences.filter((sentence) => /^\s*(QUESTION\. )?(Rank|Change|Predict|Write)\b|YOUR TASK:/.test(sentence)))[0] ?? sentences[0];
  picked = picked.replace(/^\s*(QUESTION\.|YOUR TASK:)\s*/, '').trim();
  picked = picked.replace(/\b(was|does|is|did|can) it\b/, '$1 this neural network');
  const noTools = /no tools/i.test(flat);
  const noForward = /forward-pass calculation/i.test(flat);
  const rule = noTools && noForward
    ? 'No tools or forward passes are allowed.'
    : noTools
      ? 'No tools are allowed.'
      : noForward
        ? 'No forward passes are allowed.'
        : '';
  return { text: picked.charAt(0).toUpperCase() + picked.slice(1), rule };
}

/** 最终答案的核心：只加粗了一部分就取加粗那部分，去掉 “ — ” 或 “, or ” 之后的补充。 */
export function coreOf(final: string): string {
  const plain = final.replace(/\*\*/g, '');
  const bold = final.match(/\*\*(.+?)\*\*/);
  const picked = bold && bold[1].length < plain.length - 2 ? bold[1] : plain;
  return picked.split(/ — |, or /)[0].replace(/\.$/, '');
}

export function formatNumber(value: number): string {
  return value.toLocaleString('en-US');
}
