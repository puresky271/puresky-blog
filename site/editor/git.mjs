/**
 * git.mjs — 编辑器里的 Git：查看改动、逐个文件看 diff、勾选文件提交、推送、拉取、提交历史、撤销最近一次提交。
 *
 * 范围只有文章目录和 config.ts（分类与标签词表）。提交时只带勾选的、并且确实在这个范围里有改动的文件
 * （git commit -- <这些文件>），工作区里别的改动、别人暂存好的东西都不会被带走。
 * 撤销只针对最近一次提交，并且要求它还没推送、只改了这个范围里的文件，用 reset --soft，改动回到待提交状态，不丢东西。
 */

import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

import { HttpError } from './http.mjs';

const run = promisify(execFile);
const IMAGE = /\.(png|jpe?g|gif|webp|avif|svg)$/i;
const MAX_UNTRACKED = 1024 * 1024;

/**
 * @param {{ repoRoot: string, postsRel: string, configRel: string }} options
 *   postsRel / configRel 是相对仓库根、用 / 分隔的路径。
 */
export function createGit({ repoRoot, postsRel, configRel }) {
  const scope = [postsRel, configRel];

  async function git(args, allowFail = false, timeout = 30_000) {
    try {
      const { stdout, stderr } = await run('git', args, {
        cwd: repoRoot,
        windowsHide: true,
        maxBuffer: 16 * 1024 * 1024,
        timeout,
        // 没有终端可以输密码：要凭据时直接失败，而不是让请求一直挂着。
        env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
      });
      // 只去掉末尾空白：porcelain 状态的第一列可能是空格（例如 " M"），不能 trim 开头。
      return { ok: true, out: `${stdout}${stderr}`.replace(/\s+$/, ''), stdout };
    } catch (error) {
      if (!allowFail) throw new HttpError(500, `${error.stderr || error.stdout || error.message}`.trim());
      return { ok: false, out: `${error.stdout ?? ''}${error.stderr ?? error.message}`.trim(), stdout: error.stdout ?? '' };
    }
  }

  // 改动类操作排队执行，连点两下「提交」也不会让两个 git 进程抢同一个 index.lock。
  let queue = Promise.resolve();
  function exclusive(fn) {
    const next = queue.then(fn, fn);
    queue = next.catch(() => {});
    return next;
  }

  function inScope(file) {
    return file === configRel || file.startsWith(`${postsRel}/`);
  }

  /** 给前端用的描述：这个文件属于哪篇文章、是文章本身还是它的图片。 */
  function describe(file) {
    if (file === configRel) return { kind: 'config', slug: null, name: 'config.ts' };
    const rel = file.slice(postsRel.length + 1);
    const post = /^([a-z0-9][a-z0-9-]*)\.(md|mdx)$/.exec(rel);
    if (post) return { kind: 'post', slug: post[1], name: rel };
    const image = /^images\/([a-z0-9][a-z0-9-]*)\//.exec(rel);
    if (image) return { kind: 'image', slug: image[1], name: rel };
    return { kind: 'other', slug: null, name: rel };
  }

  /** porcelain 状态码收成三种：新增 / 修改 / 删除。 */
  function simplify(xy) {
    if (xy === '??' || xy.includes('A')) return 'A';
    if (xy.includes('D')) return 'D';
    return 'M';
  }

  async function lineCount(file) {
    try {
      const stat = await fs.stat(path.join(repoRoot, file));
      if (stat.size > MAX_UNTRACKED || IMAGE.test(file)) return null;
      const text = await fs.readFile(path.join(repoRoot, file), 'utf8');
      return text ? text.split('\n').length - (text.endsWith('\n') ? 1 : 0) : 0;
    } catch {
      return null;
    }
  }

  async function changes() {
    const [status, numstat] = await Promise.all([
      git(['status', '--porcelain=v1', '-z', '-uall', '--no-renames', '--', ...scope], true),
      git(['diff', '--numstat', '-z', '--no-renames', 'HEAD', '--', ...scope], true),
    ]);
    const counts = new Map();
    if (numstat.ok) {
      for (const record of numstat.stdout.split('\0')) {
        const [added, removed, file] = record.split('\t');
        if (file) counts.set(file, { added: added === '-' ? null : Number(added), removed: removed === '-' ? null : Number(removed) });
      }
    }
    if (!status.ok) return [];
    const list = [];
    for (const record of status.stdout.split('\0')) {
      if (record.length < 4) continue;
      const xy = record.slice(0, 2);
      const file = record.slice(3);
      if (!inScope(file)) continue;
      const code = simplify(xy);
      let stat = counts.get(file) ?? { added: null, removed: null };
      if (xy === '??') stat = { added: await lineCount(file), removed: 0 };
      list.push({ path: file, xy, code, ...describe(file), ...stat });
    }
    return list.sort((a, b) => a.path.localeCompare(b.path));
  }

  async function status() {
    const [branch, list, counts, last, remote] = await Promise.all([
      git(['rev-parse', '--abbrev-ref', 'HEAD'], true),
      changes(),
      git(['rev-list', '--left-right', '--count', '@{u}...HEAD'], true),
      git(['log', '-1', '--format=%h%x09%s%x09%cr'], true),
      git(['remote', 'get-url', 'origin'], true),
    ]);
    const [behind = 0, ahead = 0] = counts.ok ? counts.out.split(/\s+/).map(Number) : [];
    const [hash, subject, when] = last.ok ? last.out.split('\t') : [];
    // 要推送的提交不限于文章目录：别处做的代码提交也会一起推上去，这里全部列出来。
    const unpushed = counts.ok && ahead > 0 ? parseLog((await git(['log', '--format=%x1e%H%x09%h%x09%s%x09%cr', '@{u}..HEAD'], true)).stdout) : [];
    return {
      branch: branch.ok ? branch.out : null,
      upstream: counts.ok,
      ahead,
      behind,
      changes: list,
      last: hash ? { hash, subject, when } : null,
      remote: remote.ok ? remote.out.replace(/\.git$/, '').replace(/^git@github\.com:/, 'https://github.com/') : null,
      unpushed,
    };
  }

  function parseLog(out) {
    return out
      .split('\x1e')
      .map((chunk) => chunk.trim())
      .filter(Boolean)
      .map((chunk) => {
        const [head, ...rest] = chunk.split('\n');
        const [hash, short, subject, when] = head.split('\t');
        const files = rest
          .filter(Boolean)
          .map((line) => {
            const [code, file] = line.split('\t');
            return { code: simplify(code), path: file, ...describe(file) };
          })
          .filter((f) => f.path && inScope(f.path));
        return { hash, short, subject, when, files };
      });
  }

  // ── diff ───────────────────────────────────────────────────────────────────

  async function diff(file) {
    if (typeof file !== 'string' || !inScope(file)) throw new HttpError(400, '只能查看文章目录和 config.ts 的改动');
    const entry = (await changes()).find((c) => c.path === file);
    if (!entry) throw new HttpError(404, '这个文件没有改动');
    const image = IMAGE.test(file) ? file.slice(postsRel.length + 1) : null;
    if (entry.xy === '??') {
      if (image) return { path: file, binary: true, image, deleted: false, text: '' };
      const stat = await fs.stat(path.join(repoRoot, file));
      if (stat.size > MAX_UNTRACKED) return { path: file, binary: true, image: null, deleted: false, text: '' };
      const body = (await fs.readFile(path.join(repoRoot, file), 'utf8')).replace(/\r\n/g, '\n');
      const lines = body.endsWith('\n') ? body.slice(0, -1).split('\n') : body.split('\n');
      // 未跟踪的文件 git diff 看不到，拼一个「整个文件都是新增」的 diff，前端按同一种格式渲染。
      return { path: file, binary: false, image: null, deleted: false, text: `@@ -0,0 +1,${lines.length} @@\n${lines.map((l) => `+${l}`).join('\n')}` };
    }
    const result = await git(['diff', '--no-color', '--no-ext-diff', '--no-renames', 'HEAD', '--', file]);
    const binary = /^Binary files /m.test(result.stdout);
    const text = result.stdout.replace(/\r\n/g, '\n');
    // 去掉 diff --git / index / --- / +++ 这几行文件头，只留 @@ 开始的块。
    const start = text.indexOf('\n@@');
    return { path: file, binary, image, deleted: entry.code === 'D', text: binary ? '' : start >= 0 ? text.slice(start + 1) : '' };
  }

  // ── 提交 / 推送 / 拉取 / 撤销 ────────────────────────────────────────────

  function commit(message, files) {
    return exclusive(async () => {
      const msg = String(message ?? '').trim();
      if (!msg) throw new HttpError(400, '提交说明不能为空');
      if (!Array.isArray(files) || !files.length) throw new HttpError(400, '没有勾选要提交的文件');
      const pending = new Set((await changes()).map((c) => c.path));
      for (const file of files) {
        if (typeof file !== 'string' || !inScope(file)) throw new HttpError(400, `不能提交 ${file}：只能提交文章目录和 config.ts`);
        if (!pending.has(file)) throw new HttpError(409, `${file} 已经没有改动了，刷新一下再提交`);
      }
      await git(['add', '-A', '--', ...files]);
      const result = await git(['commit', '-m', msg, '--', ...files], true);
      const log = [`$ git commit -m "${msg}" -- （${files.length} 个文件）`, result.out];
      if (!result.ok) throw new HttpError(500, log.join('\n'));
      const head = await git(['rev-parse', 'HEAD'], true);
      return { log: log.join('\n'), hash: head.ok ? head.out : null, status: await status() };
    });
  }

  function push() {
    return exclusive(async () => {
      const upstream = await git(['rev-parse', '--abbrev-ref', '@{u}'], true);
      // 新分支还没有上游时顺手建立跟踪关系。
      const args = upstream.ok ? ['push'] : ['push', '-u', 'origin', 'HEAD'];
      const result = await git(args, true, 120_000);
      const log = `$ git ${args.join(' ')}\n${result.out || '(没有输出)'}`;
      if (!result.ok) throw new HttpError(500, log);
      return { log, status: await status() };
    });
  }

  function pull() {
    return exclusive(async () => {
      const result = await git(['pull', '--rebase', '--autostash'], true, 120_000);
      const log = `$ git pull --rebase --autostash\n${result.out}`;
      if (!result.ok) throw new HttpError(500, log);
      return { log, status: await status() };
    });
  }

  /** 最近一次提交能不能撤销；不能时给出原因。 */
  async function undoable() {
    const parents = await git(['rev-list', '--parents', '-n', '1', 'HEAD'], true);
    const ids = parents.ok ? parents.out.split(/\s+/) : [];
    if (ids.length !== 2) return { ok: false, reason: ids.length > 2 ? '最近一次是合并提交' : '没有可以撤销的提交' };
    const remote = await git(['branch', '-r', '--contains', 'HEAD'], true);
    if (remote.ok && remote.out.trim()) return { ok: false, reason: '最近一次提交已经推送了，撤销会和远端分叉' };
    const files = await git(['diff-tree', '--no-commit-id', '--name-only', '-r', '--no-renames', 'HEAD'], true);
    const outside = files.ok ? files.out.split('\n').filter((f) => f && !inScope(f)) : [];
    if (outside.length) return { ok: false, reason: '最近一次提交改了文章目录以外的文件，不在编辑器里撤销' };
    return { ok: true, reason: '' };
  }

  async function history(limit = 30) {
    const [log, check, upstream] = await Promise.all([
      git(['log', `-n${limit}`, '--no-renames', '--format=%x1e%H%x09%h%x09%s%x09%cr', '--name-status', '--', ...scope], true),
      undoable(),
      git(['rev-list', '@{u}..HEAD'], true),
    ]);
    const head = await git(['rev-parse', 'HEAD'], true);
    const unpushed = new Set(upstream.ok ? upstream.out.split('\n').filter(Boolean) : []);
    const commits = log.ok
      ? parseLog(log.stdout).map((c) => ({ ...c, pushed: upstream.ok ? !unpushed.has(c.hash) : null, head: head.ok && c.hash === head.out }))
      : [];
    return { commits, undo: check };
  }

  function undo() {
    return exclusive(async () => {
      const check = await undoable();
      if (!check.ok) throw new HttpError(409, check.reason);
      const message = await git(['log', '-1', '--format=%B', 'HEAD']);
      await git(['reset', '--soft', 'HEAD~1']);
      return { message: message.out.trim(), status: await status() };
    });
  }

  return { status, diff, commit, push, pull, history, undo };
}
