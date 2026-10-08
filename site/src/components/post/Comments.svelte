<script lang="ts">
  /**
   * Comments.svelte — 评论区。
   *
   * GitHub 登录（worker 负责 OAuth），一层楼中楼。审核在服务端做：
   * 自己的待审评论只有自己看得到并标着「审核中」，别人看不到。
   * 进入视口才加载（client:visible），不拖慢正文。
   */
  import { onMount, tick } from 'svelte';
  import { slide } from 'svelte/transition';

  import Icon from '@/components/ui/Icon.svelte';
  import { api, ApiError, loginUrl } from '@/lib/api';
  import { renderComment } from '@/lib/comment-format';
  import { formatDate, formatRelative } from '@/lib/format';
  import { iArrowElbowDownRight, iChatCircle, iGithubLogo, iSignOut, iTrash } from '@/lib/icons.generated';

  interface Viewer {
    login: string;
    avatar: string | null;
    profile: string | null;
    isOwner: boolean;
    canComment: boolean;
  }

  interface CommentItem {
    id: string;
    parentId: string | null;
    author: string;
    avatar: string | null;
    profile: string | null;
    body: string;
    createdAt: string;
    isOwner: boolean;
    mine: boolean;
    pending: boolean;
  }

  let { slug }: { slug: string } = $props();

  const MAX = 2000;

  let status = $state<'loading' | 'ready' | 'error'>('loading');
  let viewer = $state<Viewer | null>(null);
  let comments = $state<CommentItem[]>([]);
  let now = $state(new Date());

  let draft = $state('');
  let replyTo = $state<CommentItem | null>(null);
  let sending = $state(false);
  let notice = $state<{ kind: 'ok' | 'error'; text: string } | null>(null);
  let textarea = $state<HTMLTextAreaElement>();

  const threads = $derived.by(() => {
    const roots = comments.filter((c) => !c.parentId || !comments.some((p) => p.id === c.parentId));
    return roots.map((root) => ({ root, replies: comments.filter((c) => c.parentId === root.id) }));
  });

  async function load() {
    status = 'loading';
    try {
      const [me, list] = await Promise.all([
        api<{ viewer: Viewer | null }>('/api/auth/me'),
        api<{ comments: CommentItem[] }>(`/api/comments/${slug}`),
      ]);
      viewer = me.viewer;
      comments = list.comments;
      now = new Date();
      status = 'ready';
    } catch {
      status = 'error';
    }
  }

  onMount(() => {
    void load();
  });

  async function startReply(comment: CommentItem) {
    replyTo = comment;
    await tick();
    textarea?.focus();
  }

  async function submit() {
    const body = draft.trim();
    if (body.length < 2 || sending) return;
    sending = true;
    notice = null;
    try {
      const result = await api<{ pending: boolean }>(`/api/comments/${slug}`, {
        method: 'POST',
        body: JSON.stringify({ body, parentId: replyTo?.id ?? null }),
      });
      draft = '';
      replyTo = null;
      notice = result.pending
        ? { kind: 'ok', text: '已提交，审核通过后对所有人可见。' }
        : { kind: 'ok', text: '已发布。' };
      const list = await api<{ comments: CommentItem[] }>(`/api/comments/${slug}`);
      comments = list.comments;
      now = new Date();
    } catch (error) {
      const message = error instanceof ApiError ? error.message : '发送失败';
      notice = { kind: 'error', text: error instanceof ApiError && error.offline ? '网络不通，稍后再试。' : message };
    } finally {
      sending = false;
    }
  }

  async function remove(comment: CommentItem) {
    if (!confirm('删除这条评论？')) return;
    try {
      await api(`/api/comments/${slug}/${comment.id}`, { method: 'DELETE' });
      comments = comments.filter((c) => c.id !== comment.id);
    } catch (error) {
      notice = { kind: 'error', text: error instanceof ApiError ? error.message : '删除失败' };
    }
  }

  async function logout() {
    try {
      await api('/api/auth/logout', { method: 'POST' });
    } finally {
      viewer = null;
    }
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      void submit();
    } else if (event.key === 'Escape' && replyTo) {
      replyTo = null;
    }
  }

  function canDelete(comment: CommentItem): boolean {
    return Boolean(viewer && (comment.mine || viewer.isOwner));
  }
</script>

{#snippet item(comment: CommentItem, isReply: boolean)}
  <article class="comment" class:reply={isReply} class:pending={comment.pending} id={`comment-${comment.id}`}>
    {#if comment.avatar}
      <img class="avatar" src={`${comment.avatar}${comment.avatar.includes('?') ? '&' : '?'}s=72`} alt="" width="36" height="36" loading="lazy" />
    {:else}
      <span class="avatar placeholder" aria-hidden="true">{comment.author.slice(0, 1).toUpperCase()}</span>
    {/if}
    <div class="min-w-0 flex-1">
      <header class="flex flex-wrap items-center gap-x-2 gap-y-0.5">
        {#if comment.profile}
          <a href={comment.profile} target="_blank" rel="noopener noreferrer nofollow" class="author">{comment.author}</a>
        {:else}
          <span class="author">{comment.author}</span>
        {/if}
        {#if comment.isOwner}<span class="badge">作者</span>{/if}
        {#if comment.pending}<span class="badge pending-badge">审核中，仅你可见</span>{/if}
        <time datetime={comment.createdAt} title={formatDate(comment.createdAt)} class="text-[0.75rem] text-fg-subtle">
          {formatRelative(comment.createdAt, now)}
        </time>
      </header>
      <div class="body">{@html renderComment(comment.body)}</div>
      <div class="actions">
        {#if viewer?.canComment && !comment.pending}
          <button type="button" onclick={() => startReply(isReply ? (comments.find((c) => c.id === comment.parentId) ?? comment) : comment)}>
            回复
          </button>
        {/if}
        {#if canDelete(comment)}
          <button type="button" class="danger" onclick={() => remove(comment)}>
            <Icon icon={iTrash} size={13} />删除
          </button>
        {/if}
      </div>
    </div>
  </article>
{/snippet}

<section class="comments" id="comments" aria-labelledby="comments-title">
  <h2 id="comments-title" class="flex items-center gap-2 text-lg font-semibold text-fg">
    <Icon icon={iChatCircle} size={20} class="text-fg-muted" />
    评论
    {#if status === 'ready' && comments.length}<span class="tabular text-base font-normal text-fg-subtle">{comments.length}</span>{/if}
  </h2>

  {#if status === 'loading'}
    <div class="mt-6 space-y-5" aria-busy="true">
      {#each [70, 52] as width}
        <div class="flex gap-3">
          <div class="skeleton h-9 w-9 !rounded-full"></div>
          <div class="flex-1 space-y-2">
            <div class="skeleton h-3.5 w-28"></div>
            <div class="skeleton h-3.5" style="width: {width}%"></div>
          </div>
        </div>
      {/each}
    </div>
  {:else if status === 'error'}
    <div class="state">
      <p>评论服务暂时连不上，文章不受影响。</p>
      <button type="button" class="btn btn-ghost !h-9 text-sm" onclick={load}>重试</button>
    </div>
  {:else}
    <div class="composer">
      {#if !viewer}
        <div class="login">
          <p class="text-sm text-fg-muted">登录 GitHub 后可以发表评论。只读取公开资料，不申请任何仓库权限。</p>
          <a href={loginUrl('#comments')} class="btn btn-primary !h-10">
            <Icon icon={iGithubLogo} size={17} />用 GitHub 登录
          </a>
        </div>
      {:else if !viewer.canComment}
        <p class="state !py-6">当前账号无法发表评论。</p>
      {:else}
        <div class="flex items-start gap-3">
          {#if viewer.avatar}
            <img class="avatar" src={viewer.avatar} alt="" width="36" height="36" />
          {/if}
          <div class="min-w-0 flex-1">
            {#if replyTo}
              <p class="replying" transition:slide={{ duration: 180 }}>
                <Icon icon={iArrowElbowDownRight} size={13} />回复 @{replyTo.author}
                <button type="button" onclick={() => (replyTo = null)} class="ml-1 underline">取消</button>
              </p>
            {/if}
            <label for="comment-input" class="sr-only">评论内容</label>
            <textarea
              id="comment-input"
              bind:this={textarea}
              bind:value={draft}
              rows="4"
              maxlength={MAX}
              placeholder="写点什么。支持 `行内代码` 和链接。"
              onkeydown={onKeydown}
              disabled={sending}
            ></textarea>
            <div class="toolbar">
              <span class="text-[0.75rem] text-fg-muted">
                以 <a href={viewer.profile ?? '#'} class="text-fg" target="_blank" rel="noopener noreferrer">{viewer.login}</a> 的身份
                <button type="button" onclick={logout} class="ml-1 inline-flex items-center gap-0.5 hover:text-fg">
                  <Icon icon={iSignOut} size={12} />退出
                </button>
              </span>
              <span class="ml-auto tabular text-[0.75rem] text-fg-subtle" class:text-warning={draft.length > MAX * 0.9}>
                {draft.length} / {MAX}
              </span>
              <button type="button" class="btn btn-primary !h-9 text-sm" onclick={submit} disabled={sending || draft.trim().length < 2}>
                {sending ? '发送中' : '发送'}
              </button>
            </div>
            <p class="mt-1 text-[0.6875rem] text-fg-subtle">Ctrl / ⌘ + Enter 发送</p>
          </div>
        </div>
      {/if}

      {#if notice}
        <p class="notice" class:error={notice.kind === 'error'} role="status" transition:slide={{ duration: 180 }}>{notice.text}</p>
      {/if}
    </div>

    {#if threads.length === 0}
      <p class="state">还没有评论。</p>
    {:else}
      <ol class="list">
        {#each threads as thread (thread.root.id)}
          <li>
            {@render item(thread.root, false)}
            {#if thread.replies.length}
              <ol class="replies">
                {#each thread.replies as reply (reply.id)}
                  <li>{@render item(reply, true)}</li>
                {/each}
              </ol>
            {/if}
          </li>
        {/each}
      </ol>
    {/if}
  {/if}
</section>

<style>
  .comments {
    scroll-margin-top: calc(var(--nav-h) + 24px);
  }
  .composer {
    margin-top: 1.25rem;
  }
  .login {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 1.1rem 1.25rem;
    border-radius: var(--radius-card);
    border: 1px dashed var(--line-strong);
    background: var(--surface);
  }
  textarea {
    display: block;
    width: 100%;
    min-height: 6.5rem;
    padding: 0.75rem 0.9rem;
    border-radius: var(--radius-control);
    border: 1px solid var(--line-strong);
    background: var(--surface);
    color: var(--fg);
    font: inherit;
    font-size: 0.9375rem;
    line-height: 1.7;
    resize: vertical;
    transition:
      border-color 160ms ease,
      box-shadow 160ms ease;
  }
  textarea::placeholder {
    color: var(--fg-muted);
  }
  textarea:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 3px color-mix(in oklab, var(--accent) 18%, transparent);
  }
  .toolbar {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-top: 0.6rem;
  }
  .toolbar .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .replying {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    margin-bottom: 0.4rem;
    font-size: 0.8125rem;
    color: var(--accent-strong);
  }
  .notice {
    margin-top: 0.75rem;
    padding: 0.6rem 0.85rem;
    border-radius: var(--radius-control);
    background: color-mix(in oklab, var(--success) 10%, var(--surface));
    color: var(--fg);
    font-size: 0.875rem;
  }
  .notice.error {
    background: color-mix(in oklab, var(--danger) 10%, var(--surface));
  }

  .list {
    margin-top: 2rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }
  .replies {
    margin-top: 1rem;
    margin-left: 3rem;
    padding-left: 1rem;
    border-left: 1px solid var(--line);
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  @media (width < 30rem) {
    .replies {
      margin-left: 1rem;
    }
  }
  .comment {
    display: flex;
    gap: 0.85rem;
    scroll-margin-top: calc(var(--nav-h) + 24px);
  }
  .comment.pending {
    opacity: 0.75;
  }
  .avatar {
    flex-shrink: 0;
    width: 36px;
    height: 36px;
    border-radius: 999px;
    background: var(--surface-2);
  }
  .reply .avatar {
    width: 28px;
    height: 28px;
  }
  .placeholder {
    display: grid;
    place-items: center;
    font-size: 0.875rem;
    color: var(--fg-muted);
  }
  .author {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--fg);
  }
  a.author:hover {
    color: var(--accent);
  }
  .badge {
    padding: 0.05rem 0.45rem;
    border-radius: 999px;
    background: var(--accent-soft);
    color: var(--accent-strong);
    font-size: 0.6875rem;
  }
  .pending-badge {
    background: color-mix(in oklab, var(--warning) 14%, var(--surface));
    color: var(--fg-muted);
  }
  .body {
    margin-top: 0.3rem;
    font-size: 0.9375rem;
    line-height: 1.75;
    color: var(--fg);
    overflow-wrap: anywhere;
  }
  .body :global(p + p) {
    margin-top: 0.6em;
  }
  .body :global(code) {
    font-family: var(--font-mono);
    font-size: 0.85em;
    padding: 0.1em 0.35em;
    border-radius: 5px;
    background: var(--surface-2);
  }
  .body :global(a) {
    color: var(--accent);
    text-decoration: underline;
    text-underline-offset: 0.2em;
  }
  .actions {
    display: flex;
    gap: 0.9rem;
    margin-top: 0.35rem;
  }
  .actions button {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.75rem;
    color: var(--fg-subtle);
    transition: color 160ms ease;
  }
  .actions button:hover {
    color: var(--fg);
  }
  .actions .danger:hover {
    color: var(--danger);
  }
  .state {
    display: grid;
    place-items: center;
    gap: 0.75rem;
    padding: 2.5rem 0;
    font-size: 0.875rem;
    color: var(--fg-muted);
    text-align: center;
  }
</style>
