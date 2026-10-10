<script lang="ts">
  /**
   * GitPanel.svelte — 提交面板。
   *
   *   改动     按文章分组（文章文件 + 它的图片），config.ts 单独一组；勾选要提交的文件，点开看 diff。
   *   提交     说明自动生成可改；「提交」只提交不推送，「提交并推送」一起做，也可以单独「推送 / 拉取」。
   *   历史     最近 30 条动到文章目录和 config.ts 的提交；最近一条没推送的可以撤销（reset --soft）。
   *
   * 范围始终只限文章目录和 config.ts，工作区里别的改动这里既不显示也不提交。
   */
  import Icon from '@/components/ui/Icon.svelte';
  import { iArrowCounterClockwise, iCloudArrowDown, iCloudArrowUp, iGitBranch } from '@/lib/icons.generated';

  import { api, assetUrl, type DiffResult, type GitChange } from './client';
  import { ed } from './store.svelte';

  import ChangeRow from './ChangeRow.svelte';

  let { active }: { active: boolean } = $props();

  let checked = $state<Set<string>>(new Set());
  let message = $state('');
  let lastAuto = $state('');
  let viewing = $state<string | null>(null);
  let diff = $state<DiffResult | null>(null);
  let diffBusy = $state(false);
  let logOpen = $state(false);
  let history = $state<Awaited<ReturnType<typeof api.log>> | null>(null);

  const changes = $derived(ed.git?.changes ?? []);
  const groups = $derived.by(() => {
    const config = changes.filter((c) => c.kind === 'config');
    const bySlug = new Map<string, GitChange[]>();
    for (const c of changes) if (c.slug) bySlug.set(c.slug, [...(bySlug.get(c.slug) ?? []), c]);
    const posts = [...bySlug.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    const other = changes.filter((c) => c.kind === 'other');
    return { config, posts, other };
  });

  // 打开面板或改动列表变化时，勾上当前文章 + config.ts。
  $effect(() => {
    void [changes, active];
    if (!active) return;
    const next = new Set<string>();
    for (const c of changes) if (c.slug === ed.doc?.previousSlug || c.kind === 'config') next.add(c.path);
    checked = next;
    const auto = ed.commitMessage(changes.filter((c) => next.has(c.path)));
    if (auto !== lastAuto) {
      message = auto;
      lastAuto = auto;
    }
  });

  const allChecked = $derived(changes.length > 0 && checked.size >= changes.length);
  const someChecked = $derived(checked.size > 0 && !allChecked);

  function toggleAll() {
    checked = allChecked ? new Set() : new Set(changes.map((c) => c.path));
  }
  function toggle(path: string) {
    const next = new Set(checked);
    if (next.has(path)) next.delete(path);
    else next.add(path);
    checked = next;
  }

  async function show(path: string) {
    if (viewing === path) {
      viewing = null;
      return;
    }
    viewing = path;
    diff = null;
    diffBusy = true;
    try {
      diff = await api.diff(path);
    } catch (error) {
      ed.toast('error', `读不了 diff：${(error as Error).message}`);
    } finally {
      diffBusy = false;
    }
  }

  function label(c: GitChange) {
    return c.kind === 'config' ? 'config.ts' : c.kind === 'image' ? c.name.replace(/^images\/[^/]+\//, '') : c.name.replace(/\.(md|mdx)$/, '');
  }

  async function commit(push: boolean) {
    const files = changes.filter((c) => checked.has(c.path)).map((c) => c.path);
    const ok = await ed.commit(files, message.trim(), push);
    if (ok) {
      viewing = null;
      diff = null;
      checked = new Set();
      lastAuto = '';
    }
  }

  function canCommit() {
    return checked.size > 0 && message.trim().length > 0 && !ed.gitBusy;
  }

  async function openLog() {
    logOpen = true;
    history = null;
    try {
      history = await api.log();
    } catch (error) {
      ed.toast('error', `读提交历史失败：${(error as Error).message}`);
    }
  }
</script>

<div class="git">
  <div class="main">
    <header class="head">
      <div class="branch">
        <Icon icon={iGitBranch} size={16} />
        <span class="font-mono">{ed.git?.branch ?? '…'}</span>
        {#if ed.git?.upstream}
          <span class="ed-badge muted tabular" title="领先 / 落后远端的提交数">↑{ed.git.ahead} ↓{ed.git.behind}</span>
        {/if}
      </div>
      <p class="status-text">
        {#if !ed.git}读取中…
        {:else if changes.length}{changes.length} 项改动待提交
        {:else if ed.git.ahead}{ed.git.ahead} 个提交待推送
        {:else}文章目录没有改动{/if}
      </p>
      <span class="spacer"></span>
      <button type="button" class="ed-btn" onclick={() => ed.gitAction('pull')} disabled={ed.gitBusy} title="从远端拉取（git pull --rebase）"><Icon icon={iCloudArrowDown} size={15} />拉取</button>
      <button type="button" class="ed-btn" onclick={() => ed.gitAction('push')} disabled={ed.gitBusy || !ed.git?.ahead} title="把本地已有的提交推上去"><Icon icon={iCloudArrowUp} size={15} />推送</button>
      <button type="button" class="ed-btn" onclick={openLog}>提交历史</button>
    </header>

    <div class="body">
      <div class="col-list">
        {#if changes.length}
          <div class="list-head">
            <label class="pick" title="全选">
              <input class="ed-check" type="checkbox" checked={allChecked} indeterminate={someChecked} onchange={toggleAll} />
            </label>
            <span class="count tabular">{checked.size} / {changes.length}</span>
          </div>
          {#if groups.config.length}
            <h3>词表 config.ts</h3>
            {#each groups.config as c (c.path)}
              <ChangeRow {c} checked={checked.has(c.path)} oncheck={() => toggle(c.path)} viewing={viewing === c.path} onshow={() => show(c.path)} label={label(c)} />
            {/each}
          {/if}
          {#each groups.posts as [slug, list] (slug)}
            <h3 title={slug}>{ed.titleOf(slug)} <span class="font-mono id">{slug}</span></h3>
            {#each list as c (c.path)}
              <ChangeRow {c} checked={checked.has(c.path)} oncheck={() => toggle(c.path)} viewing={viewing === c.path} onshow={() => show(c.path)} label={label(c)} />
            {/each}
          {/each}
          {#if groups.other.length}
            <h3>其他</h3>
            {#each groups.other as c (c.path)}
              <ChangeRow {c} checked={checked.has(c.path)} oncheck={() => toggle(c.path)} viewing={viewing === c.path} onshow={() => show(c.path)} label={label(c)} />
            {/each}
          {/if}
        {:else}
          <div class="ed-empty">
            <p>没有改动。改了文章、传了图片、调了分类标签，都会出现在这里。</p>
          </div>
        {/if}
      </div>

      <div class="col-diff">
        {#if viewing && diff}
          {#if diff.image}
            <div class="diff-head">
              <span class="font-mono">{diff.image}</span>
              {#if diff.deleted}<span class="ed-badge danger">已删除</span>{/if}
            </div>
            {#if !diff.deleted}
              <figure class="diff-image"><img src={assetUrl(diff.image)} alt={diff.image} /></figure>
            {/if}
          {:else if diff.binary}
            <div class="ed-empty">二进制文件，看不了文本 diff。</div>
          {:else}
            <pre class="diff-text">{#each renderDiff(diff.text) as line, i}<span class="dline {line.kind}">{line.text || ' '}</span>{/each}</pre>
          {/if}
        {:else if viewing && diffBusy}
          <div class="ed-empty"><span class="ed-spinner"></span>读 diff 中…</div>
        {:else}
          <div class="ed-empty">勾选一个文件，点开看它改了什么。</div>
        {/if}
      </div>
    </div>

    <footer class="commit-bar">
      <textarea class="ed-input" rows="1" bind:value={message} placeholder="提交说明"></textarea>
      <span class="spacer"></span>
      {#if ed.gitLog}
        <button type="button" class="ed-btn quiet" onclick={() => (ed.gitLog = '')}>清空日志</button>
      {/if}
      <button type="button" class="ed-btn" onclick={() => commit(false)} disabled={!canCommit()}>提交</button>
      <button type="button" class="ed-btn primary" onclick={() => commit(true)} disabled={!canCommit()}>提交并推送</button>
    </footer>
    {#if ed.gitLog}<pre class="ed-log log">{ed.gitLog}</pre>{/if}
  </div>

  {#if logOpen}
    <div class="ed-overlay" role="presentation" onclick={(e) => e.target === e.currentTarget && (logOpen = false)}>
      <div class="ed-dialog wide" role="dialog" aria-modal="true" aria-labelledby="log-title">
        <h2 id="log-title">提交历史</h2>
        {#if !history}
          <div class="ed-empty"><span class="ed-spinner"></span>读取中…</div>
        {:else if history.commits.length}
          <p class="log-note">
            最近 {history.commits.length} 条动到文章和词表的提交。
            {#if !history.undo.ok}<span class="muted">{history.undo.reason}</span>{/if}
          </p>
          <ul class="commits">
            {#each history.commits as c}
              <li>
                <div class="c-main">
                  <span class="font-mono hash">{c.short}</span>
                  <span class="subj" title={c.subject}>{c.subject}</span>
                  <span class="ed-hint tabular">{c.when}</span>
                  {#if c.head}<span class="ed-badge ok">HEAD</span>{/if}
                  {#if c.pushed === true}<span class="ed-badge muted">已推送</span>{:else if c.pushed === false}<span class="ed-badge warn">未推送</span>{/if}
                </div>
                {#if c.files.length}
                  <div class="c-files">
                    {#each c.files.slice(0, 4) as f}<span class="ed-code {f.code}">{f.code === 'A' ? '新' : f.code === 'D' ? '删' : '改'}</span><span class="font-mono">{f.name}</span>{/each}
                    {#if c.files.length > 4}<span class="ed-hint">等 {c.files.length} 个文件</span>{/if}
                  </div>
                {/if}
              </li>
            {/each}
          </ul>
        {:else}
          <div class="ed-empty">还没有提交。</div>
        {/if}
        <div class="ed-dialog-actions">
          <button type="button" class="ed-btn" onclick={() => (logOpen = false)}>关闭</button>
          {#if history?.undo.ok}
            <button
              type="button"
              class="ed-btn"
              onclick={async () => {
                const msg = await ed.undoCommit();
                if (msg) {
                  await openLog();
                  ed.toast('ok', `已撤销「${msg}」`);
                }
              }}
              disabled={ed.gitBusy}
              title="撤掉最近一次还没推送的提交，改动回到待提交"
            >
              <Icon icon={iArrowCounterClockwise} size={15} />撤销最近一次提交
            </button>
          {/if}
        </div>
      </div>
    </div>
  {/if}
</div>

<script lang="ts" module>
  /** 把统一 diff 拆成带类别的行，模板里上色。文本由 Svelte 转义，没有注入。 */
  function renderDiff(text: string): { text: string; kind: string }[] {
    return text.split('\n').map((line) => ({
      text: line,
      kind: line.startsWith('+') ? 'add' : line.startsWith('-') ? 'del' : line.startsWith('@@') ? 'hunk' : 'ctx',
    }));
  }
</script>

<style>
  .git {
    display: flex;
    flex-direction: column;
    height: 100%;
  }
  .main {
    display: flex;
    flex-direction: column;
    min-height: 0;
    height: 100%;
  }
  .head {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    height: 3.25rem;
    padding: 0 1.2rem;
    border-bottom: 1px solid var(--line);
  }
  .branch {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.82rem;
    color: var(--fg-muted);
  }
  .status-text {
    font-size: 0.8125rem;
    color: var(--fg-subtle);
  }
  .spacer {
    flex: 1;
  }

  .body {
    flex: 1;
    display: grid;
    grid-template-columns: 21rem minmax(0, 1fr);
    min-height: 0;
  }
  .col-list {
    min-height: 0;
    overflow-y: auto;
    padding: 0.7rem 0.7rem 2rem;
    border-right: 1px solid var(--line);
  }
  .col-list h3 {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    margin: 0.9rem 0 0.3rem;
    padding: 0 0.3rem;
    font-size: 0.75rem;
    font-weight: 650;
    color: var(--fg-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .col-list h3:first-of-type {
    margin-top: 0.3rem;
  }
  .id {
    font-size: 0.68rem;
    color: var(--fg-subtle);
  }
  .list-head {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    height: 1.8rem;
    padding: 0 0.3rem;
  }
  .pick {
    display: inline-grid;
    place-items: center;
    cursor: pointer;
  }
  .count {
    font-size: 0.72rem;
    color: var(--fg-subtle);
  }

  .col-diff {
    min-width: 0;
    min-height: 0;
    overflow: auto;
    padding: 0.9rem 1rem 2rem;
    background: color-mix(in oklab, var(--surface) 50%, var(--bg));
  }
  .diff-head {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    margin-bottom: 0.6rem;
    font-size: 0.78rem;
    color: var(--fg-muted);
  }
  .diff-image {
    max-width: 40rem;
    border-radius: 10px;
    overflow: hidden;
    border: 1px solid var(--line);
  }
  .diff-image img {
    display: block;
    width: 100%;
  }
  .diff-text {
    margin: 0;
    font-family: var(--font-mono);
    font-size: 0.75rem;
    line-height: 1.55;
    white-space: pre;
  }
  .dline {
    display: block;
    white-space: pre-wrap;
  }
  .dline.add {
    color: var(--success);
    background: color-mix(in oklab, var(--success) 8%, transparent);
  }
  .dline.del {
    color: var(--danger);
    background: color-mix(in oklab, var(--danger) 8%, transparent);
  }
  .dline.hunk {
    color: var(--accent);
  }
  .dline.ctx {
    color: var(--fg-muted);
  }

  .commit-bar {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    height: 3.6rem;
    padding: 0 1rem;
    border-top: 1px solid var(--line);
    background: var(--surface);
  }
  .commit-bar .ed-input {
    flex: 1;
  }
  .log {
    max-height: 11rem;
    margin: 0 1rem 0.75rem;
  }

  .wide {
    width: min(40rem, 100%);
  }
  .log-note {
    font-size: 0.75rem;
    color: var(--fg-muted);
  }
  .log-note .muted {
    margin-left: 0.5rem;
    color: var(--fg-subtle);
  }
  .commits {
    display: grid;
    gap: 0.3rem;
    max-height: 22rem;
    overflow-y: auto;
  }
  .commits li {
    display: grid;
    gap: 0.25rem;
    padding: 0.5rem 0.6rem;
    border-radius: 10px;
    border: 1px solid var(--line);
    background: var(--bg);
  }
  .c-main {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    min-width: 0;
  }
  .hash {
    font-size: 0.72rem;
    color: var(--accent);
  }
  .subj {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 0.8125rem;
    font-weight: 600;
  }
  .c-files {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.7rem;
    color: var(--fg-subtle);
  }

  @media (width < 60rem) {
    .body {
      grid-template-columns: minmax(0, 1fr);
      grid-template-rows: minmax(0, 1fr) minmax(0, 1fr);
    }
    .col-list {
      border-right: 0;
      border-bottom: 1px solid var(--line);
    }
  }
</style>
