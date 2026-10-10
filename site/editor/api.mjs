/**
 * api.mjs — 本地文章编辑器的后端，只在 `astro dev` 里挂在 /__editor/api 上（见 integration.mjs）。
 *
 * 能做的事：
 *   文章   列出 / 读取 / 新建 / 保存 / 重命名 / 删除，渲染预览，接收粘贴的图片；
 *   整理   分类、标签分组、标签的增删改和排序（写回 config.ts，见 vocab.mjs），系列的成员和顺序；
 *   Git    看改动和 diff、勾选文件提交、推送、拉取、提交历史、撤销最近一次提交（见 git.mjs）。
 *
 * 安全边界见 http.mjs：只对本机开放、挡 DNS rebinding、挡跨站请求。
 * 另外 slug 只允许小写字母、数字、连字符，所有路径解析后都必须落在文章目录里；
 * Git 只碰文章目录和 config.ts，不会把工作区里别的改动一起提交。
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

import { createMarkdownProcessor } from '@astrojs/markdown-remark';

import { countWords, parse, serialize } from './frontmatter.mjs';
import { createGit } from './git.mjs';
import { guard, guardAsset, HttpError, json, readBody, send } from './http.mjs';
import { applyVocabOp, readVocab, writeVocab } from './vocab.mjs';

const SLUG = /^[a-z0-9][a-z0-9-]{0,80}$/;
const IMAGE_TYPES = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.avif': 'image/avif', '.svg': 'image/svg+xml' };

export function createEditorApi({ root, markdown }) {
  const postsDir = path.resolve(root, 'src/content/posts');
  const configFile = path.resolve(root, 'src/config.ts');
  const repoRoot = path.resolve(root, '..');
  const toRepo = (file) => path.relative(repoRoot, file).split(path.sep).join('/');
  const git = createGit({ repoRoot, postsRel: toRepo(postsDir), configRel: toRepo(configFile) });
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
    const usage = { categories: {}, tags: {} };
    for (const p of posts) {
      if (p.category) (usage.categories[p.category] ??= []).push(p.title);
      for (const t of p.tags) (usage.tags[t] ??= []).push(p.title);
    }
    return { vocab, usage };
  }

  function withCounts({ vocab, usage }) {
    const count = (map) => Object.fromEntries(Object.entries(map).map(([k, v]) => [k, v.length]));
    return { ...vocab, usage: { categories: count(usage.categories), tags: count(usage.tags) } };
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

  // ── 预览 ───────────────────────────────────────────────────────────────────

  async function preview(slug, body) {
    renderer ??= await createMarkdownProcessor(markdown);
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
