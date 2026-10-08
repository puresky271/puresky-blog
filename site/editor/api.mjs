/**
 * api.mjs — 本地文章编辑器的后端，只在 `astro dev` 里挂在 /__editor/api 上（见 integration.mjs）。
 *
 * 能做的事：列出 / 读取 / 新建 / 保存 / 重命名 / 删除文章，渲染预览，接收粘贴的图片，
 * 查看 Git 状态，把文章目录的改动提交并推送到 GitHub。
 *
 * 安全边界（这个接口能写文件、能执行 git，必须只对本机开放）：
 *   1. 只接受来自回环地址的连接：dev server 即使用 --host 暴露到局域网，别的机器也用不了；
 *   2. Host 头必须是 localhost / 127.0.0.1 / [::1]：挡 DNS rebinding（恶意域名解析到 127.0.0.1）；
 *   3. 有 Origin 头时必须是本机来源，且每个请求都要带自定义头 x-puresky-editor：
 *      别的网站的页面即使在你的浏览器里，也没法跨站调这个接口（自定义头会触发预检，而这里从不放行）；
 *   4. slug 只允许小写字母、数字、连字符，所有路径解析后都必须落在文章目录里。
 * Git 提交只包含文章目录（git commit -- <文章目录>），不会把工作区里别的改动一起带走。
 */

import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

import { createMarkdownProcessor } from '@astrojs/markdown-remark';
import YAML from 'yaml';

const run = promisify(execFile);

const SLUG = /^[a-z0-9][a-z0-9-]{0,80}$/;
const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);
const MAX_BODY = 16 * 1024 * 1024;
const IMAGE_TYPES = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.avif': 'image/avif', '.svg': 'image/svg+xml' };

/** frontmatter 的键写回文件时的顺序；不认识的键原样保留在最后。 */
const KEY_ORDER = ['title', 'description', 'pubDate', 'updatedDate', 'category', 'tags', 'series', 'seriesOrder', 'cover', 'coverAlt', 'featured', 'draft', 'commentsOff', 'mayBeStale'];
/** 这些布尔值默认 false，为 false 时不写进文件。 */
const DEFAULT_FALSE = new Set(['featured', 'draft', 'commentsOff', 'mayBeStale']);

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function createEditorApi({ root, markdown }) {
  const postsDir = path.resolve(root, 'src/content/posts');
  const repoRoot = path.resolve(root, '..');
  const postsRel = path.relative(repoRoot, postsDir).split(path.sep).join('/');
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

  function parse(raw) {
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
  function serialize(frontmatter, body) {
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

  function countWords(body) {
    const text = body.replace(/```[\s\S]*?```/g, ' ').replace(/[#>*_`~[\]()!|-]/g, ' ');
    const cjk = text.match(/[㐀-鿿豈-﫿]/g)?.length ?? 0;
    const latin = text.replace(/[㐀-鿿豈-﫿]/g, ' ').match(/[A-Za-z0-9]+/g)?.length ?? 0;
    return cjk + latin;
  }

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
        tags: frontmatter.tags ?? [],
        pubDate: frontmatter.pubDate ?? null,
        draft: Boolean(frontmatter.draft),
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

  async function savePost({ slug, previousSlug, frontmatter, body, create }) {
    checkSlug(slug);
    if (typeof body !== 'string' || typeof frontmatter !== 'object' || !frontmatter) throw new HttpError(400, '缺少内容');
    const current = previousSlug ? await fileOf(checkSlug(previousSlug)) : await fileOf(slug);
    if (create && current) throw new HttpError(409, `已经有一篇叫 ${slug} 的文章了`);
    let text = body;

    if (current && previousSlug && previousSlug !== slug) {
      // 改名：目标不能已存在；图片目录跟着搬，正文里的图片路径跟着改。
      if (await fileOf(slug)) throw new HttpError(409, `已经有一篇叫 ${slug} 的文章了`);
      const oldImages = inPosts('images', previousSlug);
      if (await exists(oldImages)) {
        await fs.rename(oldImages, inPosts('images', slug));
        text = text.split(`./images/${previousSlug}/`).join(`./images/${slug}/`);
      }
    }

    // 新文章一律用 .md：MDX 会把正文里的 { } < 当语法解析，写技术文章很容易踩到。
    const ext = current?.ext ?? '.md';
    const target = inPosts(`${slug}${ext}`);
    await fs.writeFile(target, serialize(frontmatter, text), 'utf8');
    if (current && current.file !== target) await fs.rm(current.file);
    const stat = await fs.stat(target);
    return { slug, ext, mtime: stat.mtimeMs, body: text };
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

  // ── Git ────────────────────────────────────────────────────────────────────

  async function git(args, allowFail = false) {
    try {
      const { stdout, stderr } = await run('git', args, { cwd: repoRoot, windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
      // 只去掉末尾空白：porcelain 状态的第一列可能是空格（例如 " M"），不能 trim 开头。
      return { ok: true, out: `${stdout}${stderr}`.replace(/\s+$/, '') };
    } catch (error) {
      if (!allowFail) throw new HttpError(500, `${error.stderr || error.stdout || error.message}`.trim());
      return { ok: false, out: `${error.stdout ?? ''}${error.stderr ?? error.message}`.trim() };
    }
  }

  async function gitStatus() {
    const [branch, status, counts, last, remote] = await Promise.all([
      git(['rev-parse', '--abbrev-ref', 'HEAD'], true),
      git(['status', '--porcelain=v1', '-uall', '--', postsRel], true),
      git(['rev-list', '--left-right', '--count', '@{u}...HEAD'], true),
      git(['log', '-1', '--format=%h%x09%s%x09%cr'], true),
      git(['remote', 'get-url', 'origin'], true),
    ]);
    const [behind = 0, ahead = 0] = counts.ok ? counts.out.split(/\s+/).map(Number) : [];
    const [hash, subject, when] = last.ok ? last.out.split('\t') : [];
    const changes = status.ok
      ? status.out
          .split('\n')
          .filter(Boolean)
          .map((line) => ({ code: line.slice(0, 2).trim() || '?', file: line.slice(3).replace(`${postsRel}/`, '') }))
      : [];
    return {
      branch: branch.ok ? branch.out : null,
      upstream: counts.ok,
      ahead,
      behind,
      changes,
      last: hash ? { hash, subject, when } : null,
      remote: remote.ok ? remote.out.replace(/\.git$/, '').replace(/^git@github\.com:/, 'https://github.com/') : null,
    };
  }

  async function publish(message) {
    const msg = String(message || '').trim();
    if (!msg) throw new HttpError(400, '提交说明不能为空');
    const log = [];
    await git(['add', '-A', '--', postsRel]);
    const commit = await git(['commit', '-m', msg, '--', postsRel], true);
    log.push(`$ git commit -m "${msg}" -- ${postsRel}`, commit.out);
    if (!commit.ok && !/nothing to commit|无文件要提交|没有.*提交/.test(commit.out)) throw new HttpError(500, log.join('\n'));
    const push = await git(['push'], true);
    log.push('$ git push', push.out || '(没有输出)');
    if (!push.ok) throw new HttpError(500, log.join('\n'));
    return { log: log.join('\n'), status: await gitStatus() };
  }

  async function pull() {
    const result = await git(['pull', '--rebase', '--autostash'], true);
    if (!result.ok) throw new HttpError(500, result.out);
    return { log: `$ git pull --rebase --autostash\n${result.out}`, status: await gitStatus() };
  }

  // ── 请求处理 ───────────────────────────────────────────────────────────────

  function guard(req) {
    if (!LOOPBACK.has(req.socket.remoteAddress ?? '')) throw new HttpError(403, '编辑器只对本机开放');
    const host = String(req.headers.host ?? '').replace(/:\d+$/, '');
    if (!LOCAL_HOSTS.has(host)) throw new HttpError(403, '编辑器只能通过 localhost 访问');
    const origin = req.headers.origin;
    if (origin) {
      let hostname = '';
      try {
        hostname = new URL(origin).hostname;
      } catch {
        // 解析不了的 Origin 一律拒绝。
      }
      if (!LOCAL_HOSTS.has(hostname) && hostname !== '[::1]') throw new HttpError(403, '拒绝跨站请求');
    }
    if (req.headers['x-puresky-editor'] !== '1') throw new HttpError(403, '缺少编辑器请求头');
  }

  function readBody(req) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      let size = 0;
      req.on('data', (chunk) => {
        size += chunk.length;
        if (size > MAX_BODY) {
          reject(new HttpError(413, '内容太大'));
          req.destroy();
          return;
        }
        chunks.push(chunk);
      });
      req.on('end', () => resolve(Buffer.concat(chunks)));
      req.on('error', reject);
    });
  }

  async function json(req) {
    const raw = await readBody(req);
    try {
      return JSON.parse(raw.toString('utf8') || '{}');
    } catch {
      throw new HttpError(400, '请求体不是合法 JSON');
    }
  }

  function send(res, status, payload) {
    res.statusCode = status;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.setHeader('cache-control', 'no-store');
    res.end(JSON.stringify(payload));
  }

  return async function handler(req, res) {
    try {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const route = `${req.method} ${url.pathname.replace(/\/+$/, '') || '/'}`;

      // 预览图片由 <img> 直接请求，带不了自定义头；只校验来源是本机，且只读文章目录里的图片。
      if (route === 'GET /asset') {
        if (!LOOPBACK.has(req.socket.remoteAddress ?? '')) throw new HttpError(403, '编辑器只对本机开放');
        const { type, data } = await asset(url.searchParams.get('p') ?? '');
        res.setHeader('content-type', type);
        res.setHeader('cache-control', 'no-store');
        res.end(data);
        return;
      }

      guard(req);

      switch (route) {
        case 'GET /posts':
          return send(res, 200, { posts: await listPosts() });
        case 'GET /post':
          return send(res, 200, await readPost(url.searchParams.get('slug')));
        case 'POST /post':
          return send(res, 200, await savePost(await json(req)));
        case 'DELETE /post':
          return send(res, 200, await deletePost(url.searchParams.get('slug')));
        case 'POST /preview': {
          const { slug, body } = await json(req);
          return send(res, 200, await preview(slug, String(body ?? '')));
        }
        case 'POST /upload':
          return send(res, 200, await upload(url.searchParams.get('slug'), url.searchParams.get('name') ?? '', await readBody(req)));
        case 'GET /git':
          return send(res, 200, await gitStatus());
        case 'POST /git/publish': {
          const { message } = await json(req);
          return send(res, 200, await publish(message));
        }
        case 'POST /git/pull':
          return send(res, 200, await pull());
        default:
          throw new HttpError(404, '没有这个接口');
      }
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 500;
      send(res, status, { error: error.message ?? String(error) });
    }
  };
}
