/**
 * vocab.mjs — 读写 config.ts 里的分类、标签分组和标签三张词表，让编辑器里就能新建、改名、调整顺序。
 *
 * 读：找到 `export const CATEGORIES = [ … ] as const` 这样的数组字面量，在空白的 vm 上下文里求值
 *     （只是对象和字符串的字面量，求值等于解析）。手改过格式也读得出来。
 * 写：只重写这三个数组字面量本身，文件其余部分（注释、类型、as const satisfies …）原样保留；
 *     输出格式和手写的一致：一项一行、单引号，标签按分组排、组前一行 `// 分组名`。
 *
 * 规则和 config.ts 里的注释一致：分类 id、分组 id、标签 slug 进 URL，创建后不能改；
 * 还有文章在用的分类和标签、还有标签的分组不能删。标签改名由调用方负责把文章里的旧名一起换掉。
 */

import { promises as fs } from 'node:fs';
import vm from 'node:vm';

import { HttpError } from './http.mjs';

const BLOCKS = /** @type {const} */ (['CATEGORIES', 'TAG_GROUPS', 'TAGS']);
const ID = /^[a-z][a-z0-9-]{0,31}$/;
const TAG_SLUG = /^[a-z0-9][a-z0-9-]{0,47}$/;

function locate(source, name) {
  const match = new RegExp(`export const ${name} = (\\[[\\s\\S]*?\\r?\\n\\]) as const`).exec(source);
  if (!match) throw new HttpError(500, `config.ts 里找不到 ${name} 的定义`);
  const start = match.index + match[0].indexOf('[');
  return { start, end: start + match[1].length, text: match[1] };
}

function str(value) {
  return typeof value === 'string' ? value : '';
}

export async function readVocab(file) {
  const source = await fs.readFile(file, 'utf8');
  const raw = {};
  for (const name of BLOCKS) {
    try {
      raw[name] = vm.runInNewContext(`(${locate(source, name).text})`, Object.create(null), { timeout: 200 });
    } catch (error) {
      if (error instanceof HttpError) throw error;
      throw new HttpError(500, `config.ts 里的 ${name} 读不出来：${error.message}`);
    }
  }
  return {
    categories: [...raw.CATEGORIES].map((c) => ({ id: str(c.id), label: str(c.label), blurb: str(c.blurb) })),
    tagGroups: [...raw.TAG_GROUPS].map((g) => ({ id: str(g.id), label: str(g.label), blurb: str(g.blurb) })),
    tags: [...raw.TAGS].map((t) => ({ name: str(t.name), slug: str(t.slug), group: str(t.group), blurb: str(t.blurb) })),
  };
}

function q(value) {
  return `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

function render(name, vocab, eol) {
  const lines = [];
  if (name === 'CATEGORIES') {
    for (const c of vocab.categories) lines.push(`  { id: ${q(c.id)}, label: ${q(c.label)}, blurb: ${q(c.blurb)} },`);
  } else if (name === 'TAG_GROUPS') {
    for (const g of vocab.tagGroups) lines.push(`  { id: ${q(g.id)}, label: ${q(g.label)}, blurb: ${q(g.blurb)} },`);
  } else {
    for (const g of vocab.tagGroups) {
      lines.push(`  // ${g.label}`);
      for (const t of vocab.tags.filter((x) => x.group === g.id)) {
        lines.push(`  { name: ${q(t.name)}, slug: ${q(t.slug)}, group: ${q(t.group)}, blurb: ${q(t.blurb)} },`);
      }
    }
  }
  return `[${eol}${lines.join(eol)}${eol}]`;
}

/** 写回 config.ts。返回文件是否真的变了（没变就不会触发 dev server 重启）。 */
export async function writeVocab(file, vocab) {
  check(vocab);
  const source = await fs.readFile(file, 'utf8');
  const eol = source.includes('\r\n') ? '\r\n' : '\n';
  let next = source;
  // 从后往前替换，前面块的位置不受影响。
  const spans = BLOCKS.map((name) => ({ name, ...locate(source, name) })).sort((a, b) => b.start - a.start);
  for (const span of spans) next = next.slice(0, span.start) + render(span.name, vocab, eol) + next.slice(span.end);
  if (next === source) return false;
  await fs.writeFile(file, next, 'utf8');
  return true;
}

// ── 校验 ─────────────────────────────────────────────────────────────────────

const len = (s) => [...s].length;
const nameKey = (s) => s.toLowerCase().replace(/\s+/g, '');

function text(value, field, { min = 0, max }) {
  const v = String(value ?? '').trim();
  if (/[\r\n]/.test(v)) throw new HttpError(400, `${field}不能换行`);
  if (len(v) < min) throw new HttpError(400, min === 1 ? `${field}不能为空` : `${field}至少 ${min} 个字`);
  if (len(v) > max) throw new HttpError(400, `${field}最多 ${max} 个字`);
  return v;
}

/** 整张词表的一致性：id / slug / 名字不重复，标签的分组存在。 */
function check(vocab) {
  if (!vocab.categories.length) throw new HttpError(400, '至少要有一个分类');
  if (!vocab.tagGroups.length) throw new HttpError(400, '至少要有一个标签分组');
  const seen = (list, key, what) => {
    const set = new Set();
    for (const item of list) {
      const k = key(item);
      if (set.has(k)) throw new HttpError(409, `${what}重复了：${k}`);
      set.add(k);
    }
  };
  seen(vocab.categories, (c) => c.id, '分类 id ');
  seen(vocab.categories, (c) => c.label, '分类名');
  seen(vocab.tagGroups, (g) => g.id, '分组 id ');
  seen(vocab.tags, (t) => t.slug, '标签 slug ');
  seen(vocab.tags, (t) => nameKey(t.name), '标签名');
  // 「prompt」和 slug 为 prompt 的「提示词」是同一个意思，这正是词表要挡住的重复。
  for (const t of vocab.tags) {
    const twin = vocab.tags.find((u) => u !== t && u.slug === nameKey(t.name));
    if (twin) throw new HttpError(409, `「${t.name}」和已有的标签「${twin.name}」（slug ${twin.slug}）是同一个词`);
  }
  const groups = new Set(vocab.tagGroups.map((g) => g.id));
  for (const t of vocab.tags) if (!groups.has(t.group)) throw new HttpError(400, `标签「${t.name}」的分组 ${t.group} 不存在`);
}

function category(item, id) {
  const cid = id ?? String(item?.id ?? '').trim();
  if (!ID.test(cid)) throw new HttpError(400, 'id 只能用小写字母开头，后面跟小写字母、数字、连字符');
  return { id: cid, label: text(item?.label, '名称', { min: 1, max: 12 }), blurb: text(item?.blurb, '说明', { min: 1, max: 120 }) };
}

function group(item, id) {
  const gid = id ?? String(item?.id ?? '').trim();
  if (!ID.test(gid)) throw new HttpError(400, 'id 只能用小写字母开头，后面跟小写字母、数字、连字符');
  return { id: gid, label: text(item?.label, '名称', { min: 1, max: 12 }), blurb: text(item?.blurb, '说明', { max: 120 }) };
}

function tag(item, slug) {
  const tslug = slug ?? String(item?.slug ?? '').trim();
  if (!TAG_SLUG.test(tslug)) throw new HttpError(400, 'slug 只能用小写字母、数字和连字符');
  const name = text(item?.name, '标签名', { min: 1, max: 20 });
  if (name.startsWith('#')) throw new HttpError(400, '标签名不用带 #');
  return { name, slug: tslug, group: String(item?.group ?? ''), blurb: text(item?.blurb, '说明', { max: 120 }) };
}

function move(list, index, delta, sameBucket = () => true) {
  // 在同一组里和相邻的一项交换位置（标签只在自己的分组里移动）。
  let target = index + delta;
  while (target >= 0 && target < list.length && !sameBucket(list[target])) target += delta;
  if (target < 0 || target >= list.length) return list;
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

function used(usage, key, what) {
  const titles = usage[key] ?? [];
  if (titles.length) {
    const shown = titles.slice(0, 3).map((t) => `《${t}》`).join('');
    throw new HttpError(409, `还有 ${titles.length} 篇文章在用这个${what}：${shown}${titles.length > 3 ? '等' : ''}`);
  }
}

/**
 * 在词表上做一次修改，返回新词表；标签改名时另外返回 rename，调用方要把文章里的旧名换掉。
 * usage：{ categories: { id: [标题…] }, tags: { 名字: [标题…] } }，用来拦下删除还在用的条目。
 */
export function applyVocabOp(vocab, op, usage) {
  const v = { categories: [...vocab.categories], tagGroups: [...vocab.tagGroups], tags: [...vocab.tags] };
  const { kind, action } = op ?? {};

  if (kind === 'category') {
    const index = v.categories.findIndex((c) => c.id === op.id);
    if (action !== 'create' && index < 0) throw new HttpError(404, '没有这个分类');
    if (action === 'create') {
      const item = category(op.item);
      if (v.categories.some((c) => c.id === item.id)) throw new HttpError(409, `已经有 id 为 ${item.id} 的分类了`);
      v.categories.push(item);
    } else if (action === 'update') {
      v.categories[index] = category(op.item, op.id);
    } else if (action === 'delete') {
      used(usage.categories, op.id, '分类');
      v.categories.splice(index, 1);
    } else if (action === 'move') {
      v.categories = move(v.categories, index, Math.sign(op.delta));
    } else throw new HttpError(400, '不认识的操作');
    return { vocab: v };
  }

  if (kind === 'group') {
    const index = v.tagGroups.findIndex((g) => g.id === op.id);
    if (action !== 'create' && index < 0) throw new HttpError(404, '没有这个分组');
    if (action === 'create') {
      const item = group(op.item);
      if (v.tagGroups.some((g) => g.id === item.id)) throw new HttpError(409, `已经有 id 为 ${item.id} 的分组了`);
      v.tagGroups.push(item);
    } else if (action === 'update') {
      v.tagGroups[index] = group(op.item, op.id);
    } else if (action === 'delete') {
      const inside = v.tags.filter((t) => t.group === op.id).length;
      if (inside) throw new HttpError(409, `这个分组里还有 ${inside} 个标签，先把它们移走或删掉`);
      v.tagGroups.splice(index, 1);
    } else if (action === 'move') {
      v.tagGroups = move(v.tagGroups, index, Math.sign(op.delta));
    } else throw new HttpError(400, '不认识的操作');
    return { vocab: v };
  }

  if (kind === 'tag') {
    const index = v.tags.findIndex((t) => t.name === op.name);
    if (action !== 'create' && index < 0) throw new HttpError(404, '没有这个标签');
    if (action === 'create') {
      const item = tag(op.item);
      if (v.tags.some((t) => t.slug === item.slug)) throw new HttpError(409, `slug ${item.slug} 已经被别的标签用了`);
      v.tags.push(item);
    } else if (action === 'update') {
      const before = v.tags[index];
      const item = tag(op.item, before.slug);
      v.tags[index] = item;
      // 换了分组就排到新分组的最后。
      if (item.group !== before.group) v.tags.push(v.tags.splice(index, 1)[0]);
      if (item.name !== before.name) return { vocab: v, rename: { from: before.name, to: item.name } };
    } else if (action === 'delete') {
      used(usage.tags, op.name, '标签');
      v.tags.splice(index, 1);
    } else if (action === 'move') {
      const g = v.tags[index].group;
      v.tags = move(v.tags, index, Math.sign(op.delta), (t) => t.group === g);
    } else throw new HttpError(400, '不认识的操作');
    return { vocab: v };
  }

  throw new HttpError(400, '不认识的词表类型');
}
