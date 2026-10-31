/**
 * api.mjs — 本地文章编辑器的后端，只在 `astro dev` 里挂在 /__editor/api 上（见 integration.mjs）。
 *
 * 能做的事：
 *   文章   列出 / 读取 / 新建 / 保存 / 重命名 / 删除，渲染预览，接收粘贴的图片；
 *   整理   分类、标签分组、标签的增删改和排序（写回 config.ts，见 vocab.mjs），系列的成员和顺序；
 *   Git    看改动和 diff、勾选文件提交、推送、拉取、提交历史、撤销最近一次提交（见 git.mjs）；
 *   榜单   模型榜单的读取、校验后写回、OpenRouter 候选池（数据文件 src/data/leaderboard.json）。
 *
 * 安全边界见 http.mjs：只对本机开放、挡 DNS rebinding、挡跨站请求。
 * 另外 slug 只允许小写字母、数字、连字符，所有路径解析后都必须落在文章目录里；
 * Git 只碰文章目录、config.ts 和榜单文件，不会把工作区里别的改动一起提交。
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

import { createMarkdownProcessor } from '@astrojs/markdown-remark';

import { countWords, parse, serialize } from './frontmatter.mjs';
import { createGit } from './git.mjs';
import { guard, guardAsset, HttpError, json, readBody, send } from './http.mjs';
import { rehypePreviewImages } from './preview-images.mjs';
import { applyVocabOp, readVocab, writeVocab } from './vocab.mjs';

const LEADERBOARD_REL = 'src/data/leaderboard.json';
const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/models';
/** OpenRouter 目录的内存缓存时长。抓取失败也缓存，免得每点一次刷新都等一次超时。 */
const CATALOG_TTL = 5 * 60 * 1000;
/** 候选池只看最近这么多天里新出现的模型。 */
const CANDIDATE_DAYS = 30;
const CANDIDATE_LIMIT = 60;

/*
 * 下面这一段是 src/lib/leaderboard.ts 和 src/lib/models.ts 的纯 JS 等价实现。
 *
 * 为什么不直接 import 这两个文件：
 *   1. 它们是给 astro 构建期和浏览器用的 TS，引用了 `@/config` 这种 Vite 别名。
 *      本文件由 integration.mjs 在 dev server 启动时加载，路径解析走 Node 而不是 Vite，
 *      别名和 .ts 扩展名在这里都解析不到。
 *   2. lib/models.ts 用 import.meta.env.DEV 和 node_modules 里的构建缓存，语义是「构建期抓一次」，
 *      编辑器要的是「现场抓一次、5 分钟内复用、失败不报错」，缓存位置和生命周期都不一样。
 * 校验规则和 parseLeaderboard 对齐，档位 id、评分键、价格换算跟 lib 那边保持一致，改动时两边要同步。
 */

const TIER_IDS = ['hang', 'elite', 'mid', 'npc', 'trash'];
const SCORE_KEYS = ['coding', 'writing', 'reasoning', 'multimodal', 'value'];
const DATE_TEXT = /^\d{4}-\d{2}-\d{2}$/;

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function leaderboardError(where, text) {
  return new HttpError(400, `榜单文件${where}${text}`);
}

function needText(value, where, field) {
  if (typeof value !== 'string' || !value.trim()) throw leaderboardError(where, `的 ${field} 必须是非空字符串`);
  return value.trim();
}

function optionalText(value, where, field) {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') throw leaderboardError(where, `的 ${field} 必须是字符串`);
  return value.trim() || undefined;
}

function needDate(value, where, field) {
  const text = needText(value, where, field);
  if (!DATE_TEXT.test(text)) throw leaderboardError(where, `的 ${field} 要写成 YYYY-MM-DD`);
  return text;
}

/** 可选日期：编辑器里把日期输入框清空时给的是空字符串，当成没填。 */
function optionalDate(value, where, field) {
  if (value === undefined || value === null || value === '') return undefined;
  return needDate(value, where, field);
}

/**
 * 和 src/lib/leaderboard.ts 的 parseLeaderboard 等价的结构校验，返回归一化后的文件。
 * knownTags 为 null 表示 config.ts 读不出来，这时只检查标签是字符串数组。
 */
function parseLeaderboardFile(raw, knownTags) {
  if (!isRecord(raw)) throw new HttpError(400, '榜单文件顶层必须是一个对象');
  const updatedAt = needDate(raw.updatedAt, '里', 'updatedAt');
  if (!Array.isArray(raw.models)) throw new HttpError(400, '榜单文件的 models 必须是数组');

  const seen = new Set();
  const models = raw.models.map((item, index) => {
    const where = `第 ${index + 1} 条`;
    if (!isRecord(item)) throw leaderboardError(where, '必须是一个对象');
    const id = needText(item.id, where, 'id');
    if (seen.has(id)) throw leaderboardError(where, `的 id 重复了：${id}`);
    seen.add(id);
    if (/\s/.test(id)) throw leaderboardError(where, '的 id 不能带空格');

    const tier = needText(item.tier, where, 'tier');
    if (!TIER_IDS.includes(tier)) throw leaderboardError(where, `的 tier 只能是 ${TIER_IDS.join(' / ')}，现在写的是 ${tier}`);

    if (!Array.isArray(item.tags)) throw leaderboardError(where, '的 tags 必须是数组');
    const tags = item.tags.map((tag) => {
      if (typeof tag !== 'string' || (knownTags && !knownTags.has(tag))) throw leaderboardError(where, `的标签“${String(tag)}”不在 config.ts 的 TAGS 里`);
      return tag;
    });

    const subscores = {};
    if (item.subscores !== undefined) {
      if (!isRecord(item.subscores)) throw leaderboardError(where, '的 subscores 必须是对象');
      for (const key of SCORE_KEYS) {
        const value = item.subscores[key];
        if (value === undefined || value === null) continue;
        if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100) throw leaderboardError(where, `的 subscores.${key} 必须是 0 到 100 的数字`);
        subscores[key] = Math.round(value);
      }
    }

    const status = optionalText(item.status, where, 'status') ?? 'active';
    if (status !== 'active' && status !== 'retired') throw leaderboardError(where, '的 status 只能是 active 或 retired');

    if (typeof item.order !== 'number' || !Number.isFinite(item.order)) throw leaderboardError(where, '的 order 必须是数字');

    return {
      id,
      name: needText(item.name, where, 'name'),
      vendor: needText(item.vendor, where, 'vendor'),
      tier,
      order: item.order,
      icon: optionalText(item.icon, where, 'icon'),
      tags,
      subscores,
      blurb: needText(item.blurb, where, 'blurb'),
      review: needText(item.review, where, 'review'),
      useCase: optionalText(item.useCase, where, 'useCase'),
      link: optionalText(item.link, where, 'link'),
      releasedAt: optionalDate(item.releasedAt, where, 'releasedAt'),
      addedAt: needDate(item.addedAt, where, 'addedAt'),
      status,
      retiredAt: optionalDate(item.retiredAt, where, 'retiredAt'),
    };
  });

  return { updatedAt, models };
}

/** OpenRouter 的厂商前缀 → 展示名，和 lib/models.ts 保持同一张表。 */
const VENDOR_BY_PREFIX = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google',
  meta: 'Meta',
  'meta-llama': 'Meta',
  deepseek: 'DeepSeek',
  moonshotai: 'MoonshotAI',
  minimax: 'MiniMax',
  nvidia: 'NVIDIA',
  mistralai: 'Mistral',
  qwen: 'Qwen',
  'z-ai': 'Z.ai',
  stepfun: 'StepFun',
  inclusionai: 'inclusionAI',
  reflection: 'Reflection',
  'particle-ai': 'Particle AI',
  xai: 'xAI',
  cohere: 'Cohere',
  amazon: 'Amazon',
  microsoft: 'Microsoft',
};

function vendorOf(id, name) {
  const prefix = id.split('/')[0] ?? '';
  const known = VENDOR_BY_PREFIX[prefix];
  if (known) return known;
  // OpenRouter 的 name 一般写成「厂商: 模型名」，兜底就从里面取。
  const fromName = name.split(':')[0]?.trim();
  if (fromName && fromName !== name) return fromName;
  return prefix ? prefix[0].toUpperCase() + prefix.slice(1) : '未知';
}

/** OpenRouter 的价格是「每 token」的字符串，这里换算成「美元 / 百万 token」。 */
function perMillion(value) {
  const raw = typeof value === 'string' ? Number(value) : typeof value === 'number' ? value : Number.NaN;
  if (!Number.isFinite(raw) || raw < 0) return undefined;
  return Math.round(raw * 1_000_000 * 1e6) / 1e6;
}

function toCatalogEntry(raw) {
  if (typeof raw !== 'object' || raw === null) return null;
  const item = raw;
  const id = typeof item.id === 'string' ? item.id : '';
  if (!id) return null;
  const name = typeof item.name === 'string' && item.name ? item.name : id;
  const pricing = isRecord(item.pricing) ? item.pricing : {};
  const contextLength = typeof item.context_length === 'number' && item.context_length > 0 ? item.context_length : undefined;
  const created = typeof item.created === 'number' && item.created > 0 ? new Date(item.created * 1000).toISOString().slice(0, 10) : undefined;
  return {
    id,
    name,
    vendor: vendorOf(id, name),
    contextLength,
    created,
    priceIn: perMillion(pricing.prompt),
    priceOut: perMillion(pricing.completion),
  };
}

let catalogCache = { at: 0, value: null };
let catalogFetching = null;

async function fetchCatalog() {
  const response = await fetch(OPENROUTER_ENDPOINT, {
    headers: { accept: 'application/json', 'user-agent': 'puresky-blog-editor' },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`OpenRouter 返回 ${response.status}`);
  const payload = await response.json();
  if (!Array.isArray(payload?.data)) throw new Error('OpenRouter 返回的 data 不是数组');
  const models = {};
  for (const raw of payload.data) {
    const entry = toCatalogEntry(raw);
    if (entry) models[entry.id] = entry;
  }
  if (Object.keys(models).length === 0) throw new Error('OpenRouter 返回了空目录');
  return models;
}

/**
 * 现场抓 OpenRouter 的模型目录，带 5 分钟内存缓存。
 * 抓不到返回 null，绝不抛错：榜单页面没有价格也能照常打开，候选池给一句兜底文案就行。
 * force 为 true 时跳过缓存（候选池的「刷新」按钮用）。
 */
async function getCatalog(force = false) {
  if (!force && Date.now() - catalogCache.at < CATALOG_TTL) return catalogCache.value;
  catalogFetching ??= fetchCatalog()
    .then((models) => ({ fetchedAt: new Date().toISOString(), models }))
    .catch((error) => {
      console.warn(`[editor] OpenRouter 模型目录抓取失败：${error.message ?? error}`);
      return null;
    })
    .finally(() => {
      catalogFetching = null;
    });
  const value = await catalogFetching;
  catalogCache = { at: Date.now(), value };
  return value;
}

const SLUG = /^[a-z0-9][a-z0-9-]{0,80}$/;
const IMAGE_TYPES = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.avif': 'image/avif', '.svg': 'image/svg+xml' };

export function createEditorApi({ root, markdown }) {
  const postsDir = path.resolve(root, 'src/content/posts');
  const configFile = path.resolve(root, 'src/config.ts');
  const repoRoot = path.resolve(root, '..');
  const toRepo = (file) => path.relative(repoRoot, file).split(path.sep).join('/');
  const dataDir = path.resolve(root, 'src/data');
  /** 榜单文件的写路径：先 resolve，再确认确实落在 src/data 里。 */
  function inData(name) {
    const target = path.resolve(dataDir, name);
    if (target !== dataDir && !target.startsWith(dataDir + path.sep)) throw new HttpError(400, '路径越界');
    return target;
  }
  const leaderboardFile = inData('leaderboard.json');
  const git = createGit({ repoRoot, postsRel: toRepo(postsDir), configRel: toRepo(configFile), dataRel: toRepo(leaderboardFile) });
  // 每次 dev server（重新）启动都会重新创建这个接口：前端改完词表后靠它变了没有，判断重启是否已经完成。
  const boot = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  let renderer = null;

  // ── 文件 ───────────────────────────────────────────────────────────────────

  function inPosts(...parts) {
    const target = path.resolve(postsDir, ...parts);
    if (target !== postsDir && !target.startsWith(postsDir + path.sep)) throw new HttpError(400, '路径越界');
    return target;
  }

  function checkSlug(slug) {
    if (typeof slug !== 'string' || !SLUG.test(slug)) throw new HttpError(400, 'slug 只能用小写字母、数字和连字符');
    return slug;
  }

  async function exists(file) {
    try {
      await fs.access(file);
      return true;
    } catch {
      return false;
    }
  }

  /** 找到 slug 对应的文件（.md 或 .mdx）。 */
  async function fileOf(slug) {
    for (const ext of ['.md', '.mdx']) {
      const file = inPosts(`${slug}${ext}`);
      if (await exists(file)) return { file, ext };
    }
    return null;
  }

  // ── 文章 ───────────────────────────────────────────────────────────────────

  async function listPosts() {
    const entries = await fs.readdir(postsDir, { withFileTypes: true });
    const posts = [];
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const ext = path.extname(entry.name);
      if (ext !== '.md' && ext !== '.mdx') continue;
      const slug = entry.name.slice(0, -ext.length);
      const file = path.join(postsDir, entry.name);
      const [raw, stat] = await Promise.all([fs.readFile(file, 'utf8'), fs.stat(file)]);
      let frontmatter = {};
      let body = raw;
      let error = null;
      try {
        ({ frontmatter, body } = parse(raw));
      } catch (e) {
        error = e.message;
      }
      posts.push({
        slug,
        ext,
        title: frontmatter.title ?? slug,
        description: frontmatter.description ?? '',
        category: frontmatter.category ?? null,
        subcategory: frontmatter.subcategory ?? null,
        tags: Array.isArray(frontmatter.tags) ? frontmatter.tags : [],
        pubDate: frontmatter.pubDate ?? null,
        updatedDate: frontmatter.updatedDate ?? null,
        series: frontmatter.series ?? null,
        seriesOrder: typeof frontmatter.seriesOrder === 'number' ? frontmatter.seriesOrder : null,
        cover: frontmatter.cover ?? null,
        draft: Boolean(frontmatter.draft),
        archived: Boolean(frontmatter.archived),
        featured: Boolean(frontmatter.featured),
        words: countWords(body),
        mtime: stat.mtimeMs,
        error,
      });
    }
    return posts.sort((a, b) => String(b.pubDate ?? '').localeCompare(String(a.pubDate ?? '')) || b.mtime - a.mtime);
  }

  async function readPost(slug) {
    const found = await fileOf(checkSlug(slug));
    if (!found) throw new HttpError(404, '文章不存在');
    const [raw, stat] = await Promise.all([fs.readFile(found.file, 'utf8'), fs.stat(found.file)]);
    return { slug, ext: found.ext, ...parse(raw), mtime: stat.mtimeMs };
  }

  /**
   * 保存。baseMtime 是编辑器打开（或上次保存）时文件的修改时间：磁盘上的文件在这之后被别的程序改过，
   * 就返回 409 conflict，由用户决定覆盖还是载入磁盘上的版本（force 表示确认覆盖）。
   */
  async function savePost({ slug, previousSlug, frontmatter, body, create, baseMtime, force }) {
    checkSlug(slug);
    if (typeof body !== 'string' || typeof frontmatter !== 'object' || !frontmatter) throw new HttpError(400, '缺少内容');
    const current = previousSlug ? await fileOf(checkSlug(previousSlug)) : await fileOf(slug);
    if (create && current) throw new HttpError(409, `已经有一篇叫 ${slug} 的文章了`, 'exists');
    if (current && !create && !force && typeof baseMtime === 'number') {
      const stat = await fs.stat(current.file);
      if (Math.abs(stat.mtimeMs - baseMtime) > 1) throw new HttpError(409, '这篇文章在编辑器之外被改过', 'conflict');
    }
    let text = body;

    if (current && previousSlug && previousSlug !== slug) {
      // 改名：目标不能已存在；图片目录跟着搬，正文和封面里的图片路径跟着改。
      if (await fileOf(slug)) throw new HttpError(409, `已经有一篇叫 ${slug} 的文章了`, 'exists');
      const oldImages = inPosts('images', previousSlug);
      if (await exists(oldImages)) {
        await fs.rename(oldImages, inPosts('images', slug));
        text = text.split(`./images/${previousSlug}/`).join(`./images/${slug}/`);
        if (typeof frontmatter.cover === 'string') frontmatter = { ...frontmatter, cover: frontmatter.cover.replace(`./images/${previousSlug}/`, `./images/${slug}/`) };
      }
    }

    // 新文章一律用 .md：MDX 会把正文里的 { } < 当语法解析，写技术文章很容易踩到。
    const ext = current?.ext ?? '.md';
    const target = inPosts(`${slug}${ext}`);
    await fs.writeFile(target, serialize(frontmatter, text), 'utf8');
    if (current && current.file !== target) await fs.rm(current.file);
    const stat = await fs.stat(target);
    return { slug, ext, mtime: stat.mtimeMs, body: text, frontmatter };
  }

  /** 只改 frontmatter 里的几个键（值为 null 表示删掉这个键），正文原样不动。没有变化就不写文件。 */
  async function patchPost(slug, changes) {
    const found = await fileOf(checkSlug(slug));
    if (!found) throw new HttpError(404, `文章不存在：${slug}`);
    const raw = await fs.readFile(found.file, 'utf8');
    const { frontmatter, body } = parse(raw);
    const next = { ...frontmatter };
    for (const [key, value] of Object.entries(changes)) {
      if (value === null) delete next[key];
      else next[key] = value;
    }
    if (JSON.stringify(next) === JSON.stringify(frontmatter)) return null;
    await fs.writeFile(found.file, serialize(next, body), 'utf8');
    const stat = await fs.stat(found.file);
    return { slug, frontmatter: next, mtime: stat.mtimeMs };
  }

  async function deletePost(slug) {
    const found = await fileOf(checkSlug(slug));
    if (!found) throw new HttpError(404, '文章不存在');
    await fs.rm(found.file);
    await fs.rm(inPosts('images', slug), { recursive: true, force: true });
    return { ok: true };
  }

  async function upload(slug, name, data) {
    checkSlug(slug);
    const ext = path.extname(name || '').toLowerCase() || '.png';
    if (!IMAGE_TYPES[ext]) throw new HttpError(415, '只支持图片');
    const base = path
      .basename(name || 'image', ext)
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'image';
    const file = `${Date.now().toString(36)}-${base}${ext}`;
    const dir = inPosts('images', slug);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, file), data);
    return { path: `./images/${slug}/${file}` };
  }

  // ── 系列 ───────────────────────────────────────────────────────────────────

  /**
   * order：把 slugs 按顺序设为这个系列的第 1、2、3… 篇；原来在这个系列、但不在 slugs 里的移出系列。
   *        slugs 为空就是解散系列。
   * rename：系列改名，目标名字已经存在时拒绝（合并两个系列请用 order）。
   */
  async function seriesOp(op) {
    const posts = await listPosts();
    const changed = [];
    const apply = async (slug, changes) => {
      const result = await patchPost(slug, changes);
      if (result) changed.push(result);
    };
    if (op?.action === 'order') {
      const name = String(op.name ?? '').trim();
      if (!name) throw new HttpError(400, '系列名不能为空');
      if ([...name].length > 40) throw new HttpError(400, '系列名最多 40 个字');
      const slugs = Array.isArray(op.slugs) ? op.slugs.map(checkSlug) : [];
      if (new Set(slugs).size !== slugs.length) throw new HttpError(400, '同一篇文章不能在系列里出现两次');
      const known = new Set(posts.map((p) => p.slug));
      for (const slug of slugs) if (!known.has(slug)) throw new HttpError(404, `文章不存在：${slug}`);
      for (const [i, slug] of slugs.entries()) await apply(slug, { series: name, seriesOrder: i + 1 });
      for (const p of posts) if (p.series === name && !slugs.includes(p.slug)) await apply(p.slug, { series: null, seriesOrder: null });
    } else if (op?.action === 'rename') {
      const from = String(op.from ?? '').trim();
      const to = String(op.to ?? '').trim();
      if (!to) throw new HttpError(400, '系列名不能为空');
      if ([...to].length > 40) throw new HttpError(400, '系列名最多 40 个字');
      if (from !== to && posts.some((p) => p.series === to)) throw new HttpError(409, `已经有叫「${to}」的系列了`);
      for (const p of posts) if (p.series === from) await apply(p.slug, { series: to });
    } else throw new HttpError(400, '不认识的操作');
    return { changed };
  }

  // ── 词表 ───────────────────────────────────────────────────────────────────

  async function vocabState(posts) {
    const vocab = await readVocab(configFile);
    const usage = { categories: {}, subcategories: {}, tags: {} };
    for (const p of posts) {
      if (p.category) (usage.categories[p.category] ??= []).push(p.title);
      if (p.subcategory) (usage.subcategories[p.subcategory] ??= []).push(p.title);
      for (const t of p.tags) (usage.tags[t] ??= []).push(p.title);
    }
    return { vocab, usage };
  }

  function withCounts({ vocab, usage }) {
    const count = (map) => Object.fromEntries(Object.entries(map).map(([k, v]) => [k, v.length]));
    return { ...vocab, usage: { categories: count(usage.categories), subcategories: count(usage.subcategories), tags: count(usage.tags) } };
  }

  /**
   * 改词表。写 config.ts 之后 dev server 会自动重启（integration.mjs 把它登记成了 watch file），
   * 重启后内容集合按新词表重新校验，新建的分类和标签马上能用。
   */
  async function vocabOp(op) {
    const posts = await listPosts();
    const state = await vocabState(posts);
    const { vocab, rename } = applyVocabOp(state.vocab, op, state.usage);
    const changed = [];
    if (rename) {
      for (const p of posts) {
        if (!p.tags.includes(rename.from)) continue;
        const result = await patchPost(p.slug, { tags: p.tags.map((t) => (t === rename.from ? rename.to : t)) });
        if (result) changed.push(result);
      }
    }
    const restart = await writeVocab(configFile, vocab);
    return { vocab: withCounts(await vocabState(await listPosts())), changed, restart, boot };
  }

  // ── 榜单 ───────────────────────────────────────────────────────────────────

  /** config.ts 里的标签名。读不出来时返回 null，保存时只跳过标签校验，其余照做。 */
  async function knownTags() {
    try {
      const vocab = await readVocab(configFile);
      return new Set(vocab.tags.map((tag) => tag.name));
    } catch {
      return null;
    }
  }

  /** 读并校验榜单文件。JSON 坏了或者结构不对都返回 400，信息写清楚是哪一条。 */
  async function readLeaderboardFile() {
    let raw;
    try {
      raw = await fs.readFile(leaderboardFile, 'utf8');
    } catch (error) {
      throw new HttpError(500, `读不了榜单文件 ${LEADERBOARD_REL}：${error.message}`);
    }
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      throw new HttpError(400, `榜单文件 ${LEADERBOARD_REL} 不是合法的 JSON：${error.message}`);
    }
    return parseLeaderboardFile(parsed, await knownTags());
  }

  /** 校验通过后按仓库一致的格式写回：2 空格缩进，末尾换行。 */
  async function saveLeaderboard(body) {
    if (!isRecord(body)) throw new HttpError(400, '请求体必须是一个榜单文件对象');
    const file = parseLeaderboardFile(body, await knownTags());
    await fs.writeFile(leaderboardFile, `${JSON.stringify(file, null, 2)}\n`, 'utf8');
    return { ok: true, file };
  }

  /** 候选池：最近 30 天新出现、id 不带 :free 这类变体、而且还没进榜单的模型。 */
  async function candidates(refresh) {
    const existing = new Set();
    try {
      const raw = JSON.parse(await fs.readFile(leaderboardFile, 'utf8'));
      if (Array.isArray(raw?.models)) for (const model of raw.models) if (model && typeof model.id === 'string') existing.add(model.id);
    } catch {
      // 榜单文件坏了也照常出候选池，只是不去重。
    }
    const snapshot = await getCatalog(refresh);
    if (!snapshot) return { fetchedAt: null, candidates: [], warning: '暂时连不上 OpenRouter，候选池稍后再试。已经加入榜单的模型不受影响。' };
    const cutoff = new Date(Date.now() - CANDIDATE_DAYS * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const list = Object.values(snapshot.models)
      .filter((entry) => entry.created && entry.created >= cutoff && !entry.id.includes(':') && !existing.has(entry.id))
      .sort((a, b) => String(b.created).localeCompare(String(a.created)) || a.id.localeCompare(b.id))
      .slice(0, CANDIDATE_LIMIT)
      .map(({ id, name, vendor, contextLength, created, priceIn, priceOut }) => ({ id, name, vendor, contextLength, created, priceIn, priceOut }));
    return { fetchedAt: snapshot.fetchedAt, candidates: list };
  }

  // ── 预览 ───────────────────────────────────────────────────────────────────

  async function preview(slug, body) {
    renderer ??= await createMarkdownProcessor({
      ...markdown,
      rehypePlugins: [...(markdown.rehypePlugins ?? []), rehypePreviewImages],
    });
    const { code, metadata } = await renderer.render(body, { fileURL: new URL(`file:///${inPosts(`${slug || 'preview'}.md`).replace(/\\/g, '/')}`) });
    // 正文里的相对图片路径在预览里换成经 asset 接口读取。
    const html = code.replace(/(<img[^>]+src=")(\.\/[^"]+)"/g, (_, head, src) => `${head}/__editor/api/asset?p=${encodeURIComponent(src)}"`);
    return { html, headings: metadata.headings };
  }

  async function asset(rel) {
    const file = inPosts(String(rel).replace(/^\.\//, ''));
    const type = IMAGE_TYPES[path.extname(file).toLowerCase()];
    if (!type) throw new HttpError(415, '只支持图片');
    return { type, data: await fs.readFile(file) };
  }

  // ── 请求处理 ───────────────────────────────────────────────────────────────

  return async function handler(req, res) {
    try {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const route = `${req.method} ${url.pathname.replace(/\/+$/, '') || '/'}`;
      const q = (name) => url.searchParams.get(name);

      // 预览图片由 <img> 直接请求，带不了自定义头；校验本机来源，且只读文章目录里的图片。
      if (route === 'GET /asset') {
        guardAsset(req);
        const { type, data } = await asset(q('p') ?? '');
        res.setHeader('content-type', type);
        res.setHeader('cache-control', 'no-store');
        res.end(data);
        return;
      }

      guard(req);

      switch (route) {
        case 'GET /ping':
          return send(res, 200, { ok: true, boot });
        case 'GET /posts':
          return send(res, 200, { posts: await listPosts() });
        case 'GET /post':
          return send(res, 200, await readPost(q('slug')));
        case 'POST /post':
          return send(res, 200, await savePost(await json(req)));
        case 'DELETE /post':
          return send(res, 200, await deletePost(q('slug')));
        case 'POST /preview': {
          const { slug, body } = await json(req);
          return send(res, 200, await preview(slug, String(body ?? '')));
        }
        case 'POST /upload':
          return send(res, 200, await upload(q('slug'), q('name') ?? '', await readBody(req)));
        case 'GET /vocab':
          return send(res, 200, withCounts(await vocabState(await listPosts())));
        case 'POST /vocab':
          return send(res, 200, await vocabOp(await json(req)));
        case 'POST /series':
          return send(res, 200, await seriesOp(await json(req)));
        case 'GET /leaderboard': {
          const file = await readLeaderboardFile();
          const snapshot = await getCatalog();
          let catalog = null;
          // 只留 file 里出现过的 model id，和构建期 resolveModels 看到的是同一份目录。
          if (snapshot) {
            const models = {};
            for (const model of file.models) if (snapshot.models[model.id]) models[model.id] = snapshot.models[model.id];
            catalog = { fetchedAt: snapshot.fetchedAt, models };
          }
          return send(res, 200, { file, catalog });
        }
        case 'POST /leaderboard':
          return send(res, 200, await saveLeaderboard(await json(req)));
        case 'GET /leaderboard/candidates':
          return send(res, 200, await candidates(q('refresh') === '1'));
        case 'GET /git':
          return send(res, 200, await git.status());
        case 'GET /git/diff':
          return send(res, 200, await git.diff(q('path')));
        case 'GET /git/log':
          return send(res, 200, await git.history());
        case 'POST /git/commit': {
          const { message, files } = await json(req);
          return send(res, 200, await git.commit(message, files));
        }
        case 'POST /git/push':
          return send(res, 200, await git.push());
        case 'POST /git/sync':
          return send(res, 200, await git.sync());
        case 'POST /git/pull':
          return send(res, 200, await git.pull());
        case 'POST /git/undo':
          return send(res, 200, await git.undo());
        default:
          throw new HttpError(404, '没有这个接口');
      }
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 500;
      send(res, status, { error: error.message ?? String(error), code: error.code });
    }
  };
}
