/**
 * frontmatter.mjs — 文章文件的解析与序列化。保存、批量改系列、标签改名都走这里，写出来的样子保持一致。
 */

import YAML from 'yaml';

import { HttpError } from './http.mjs';

/** frontmatter 的键写回文件时的顺序；不认识的键原样保留在最后。 */
const KEY_ORDER = ['title', 'description', 'pubDate', 'updatedDate', 'category', 'tags', 'series', 'seriesOrder', 'cover', 'coverAlt', 'featured', 'draft', 'archived', 'commentsOff', 'mayBeStale'];
/** 这些布尔值默认 false，为 false 时不写进文件。 */
const DEFAULT_FALSE = new Set(['featured', 'draft', 'archived', 'commentsOff', 'mayBeStale']);

export function parse(raw) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw);
  if (!match) return { frontmatter: {}, body: raw };
  let frontmatter = {};
  try {
    frontmatter = YAML.parse(match[1]) ?? {};
  } catch (error) {
    throw new HttpError(422, `frontmatter 解析失败：${error.message}`);
  }
  // 日期统一成 YYYY-MM-DD 字符串，编辑器里用 <input type="date">。
  for (const key of ['pubDate', 'updatedDate']) {
    const value = frontmatter[key];
    if (value instanceof Date) frontmatter[key] = value.toISOString().slice(0, 10);
  }
  return { frontmatter, body: raw.slice(match[0].length).replace(/^\r?\n/, '') };
}

function quote(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

/** 手写序列化：键顺序固定、字符串统一单引号、标签用行内数组，和仓库里手写的文章保持同一个样子。 */
export function serialize(frontmatter, body) {
  const keys = [...KEY_ORDER.filter((k) => k in frontmatter), ...Object.keys(frontmatter).filter((k) => !KEY_ORDER.includes(k))];
  const lines = [];
  for (const key of keys) {
    const value = frontmatter[key];
    if (value === undefined || value === null || value === '') continue;
    if (DEFAULT_FALSE.has(key) && value === false) continue;
    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      lines.push(`${key}: [${value.map(quote).join(', ')}]`);
    } else if (typeof value === 'boolean' || typeof value === 'number') {
      lines.push(`${key}: ${value}`);
    } else if ((key === 'pubDate' || key === 'updatedDate') && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      lines.push(`${key}: ${value}`);
    } else if (key === 'category') {
      lines.push(`${key}: ${value}`);
    } else if (typeof value === 'object') {
      lines.push(YAML.stringify({ [key]: value }).trimEnd());
    } else {
      lines.push(`${key}: ${quote(value)}`);
    }
  }
  const text = body.replace(/\r\n/g, '\n').replace(/^\n+/, '');
  return `---\n${lines.join('\n')}\n---\n\n${text.endsWith('\n') ? text : `${text}\n`}`;
}

export function countWords(body) {
  const text = body.replace(/```[\s\S]*?```/g, ' ').replace(/[#>*_`~[\]()!|-]/g, ' ');
  const cjk = text.match(/[㐀-鿿豈-﫿]/g)?.length ?? 0;
  const latin = text.replace(/[㐀-鿿豈-﫿]/g, ' ').match(/[A-Za-z0-9]+/g)?.length ?? 0;
  return cjk + latin;
}
