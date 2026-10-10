<script lang="ts">
  /**
   * Inspector.svelte — 文章模式的右栏，两页：
   *   设置   状态（草稿 / 公开 / 归档）、链接、日期、分类（可就地新建）、标签、系列、封面、开关、删除。
   *          不合规的地方实时列在最上面，点一下跳到对应的输入框；有错误时不让保存，
   *          因为一篇 frontmatter 不合规的文章会让整个文章集合加载失败。
   *   大纲   正文里的标题，点一下跳到那一行，预览也跟着滚过去；当前光标所在的小节高亮。
   */
  import Icon from '@/components/ui/Icon.svelte';
  import { iArchive, iGlobe, iImage, iPencilSimple, iPlus, iTrash, iUploadSimple, iWarning, iX } from '@/lib/icons.generated';

  import { api, assetUrl } from './client';
  import { ed, SLUG, today } from './store.svelte';
  import TagPicker from './TagPicker.svelte';

  type Status = 'draft' | 'public' | 'archived';
  const STATUS: { id: Status; label: string; icon: typeof iGlobe; hint: string }[] = [
    { id: 'draft', label: '草稿', icon: iPencilSimple, hint: '只在本机 dev 里能看到，线上没有这一页。' },
    { id: 'public', label: '公开', icon: iGlobe, hint: '出现在首页、文章列表、归档页、分类标签页、RSS 和搜索里。' },
    { id: 'archived', label: '归档', icon: iArchive, hint: '从所有列表、RSS 和搜索里收起来，原链接仍能打开，页面顶部会提示已归档。' },
  ];
  const FIELD_IDS: Record<string, string> = {
    slug: 'f-slug',
    title: 'f-title',
    description: 'f-desc',
    pubDate: 'f-pub',
    category: 'f-category',
    tags: 'f-tags',
    series: 'f-series',
    cover: 'f-cover',
  };

  let newCategory = $state<{ label: string; id: string; blurb: string } | null>(null);
  let busy = $state(false);
  let coverInput = $state<HTMLInputElement>();
  let coverBusy = $state(false);

  const doc = $derived(ed.doc!);
  const fm = $derived(doc.frontmatter);
  const status = $derived<Status>(fm.archived ? 'archived' : fm.draft ? 'draft' : 'public');
  const category = $derived(ed.vocab.categories.find((c) => c.id === fm.category));

  function setStatus(next: Status) {
    fm.draft = next === 'draft';
    fm.archived = next === 'archived';
  }

  function jump(field: string) {
    const el = document.getElementById(FIELD_IDS[field] ?? '');
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    el?.focus();
  }

  // ── 分类 ───────────────────────────────────────────────────────────────────

  async function createCategory() {
    if (!newCategory || busy) return;
    busy = true;
    const item = { id: newCategory.id.trim(), label: newCategory.label.trim(), blurb: newCategory.blurb.trim() };
    const ok = await ed.vocabOp({ kind: 'category', action: 'create', item });
    busy = false;
    if (!ok) return;
    newCategory = null;
    fm.category = item.id;
    ed.toast('ok', `已新建分类「${item.label}」`);
  }

  // ── 系列 ───────────────────────────────────────────────────────────────────

  const seriesNames = $derived([...new Set(ed.posts.map((p) => p.series).filter((s): s is string => Boolean(s)))].sort((a, b) => a.localeCompare(b, 'zh-CN')));
  const others = $derived(ed.posts.filter((p) => fm.series && p.series === fm.series.trim() && p.slug !== doc.previousSlug));
  const members = $derived(
    fm.series?.trim()
      ? [
          ...others.map((p) => ({ key: p.slug, title: p.title, order: p.seriesOrder ?? 0, self: false })),
          { key: '__self', title: fm.title || '（这篇）', order: Number(fm.seriesOrder) || 0, self: true },
        ].sort((a, b) => (a.order || 999) - (b.order || 999))
      : []
  );

  function putLast() {
    fm.seriesOrder = Math.max(0, ...others.map((p) => p.seriesOrder ?? 0)) + 1;
  }

  function openSeries() {
    ed.seriesFocus = fm.series?.trim() || null;
    ed.organizeTab = 'series';
    ed.mode = 'organize';
  }

  // ── 封面 ───────────────────────────────────────────────────────────────────

  async function uploadCover(file: File | undefined) {
    if (!file || coverBusy) return;
    if (!file.type.startsWith('image/')) {
      ed.toast('error', '封面只能是图片');
      return;
    }
    coverBusy = true;
    try {
      const { path } = await api.upload(doc.slug, file);
      fm.cover = path;
      ed.toast('ok', '封面已保存到本机（不进仓库）');
    } catch (error) {
      ed.toast('error', `封面上传失败：${(error as Error).message}`);
    } finally {
      coverBusy = false;
    }
  }

  function onCoverPick(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    void uploadCover(file);
  }

  // ── 大纲 ───────────────────────────────────────────────────────────────────

  const outline = $derived.by(() => {
    const out: { depth: number; text: string; line: number }[] = [];
    let fence = false;
    doc.body.split('\n').forEach((text, i) => {
      if (/^\s*(```|~~~)/.test(text)) fence = !fence;
      else if (!fence) {
        const m = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(text);
        if (m) out.push({ depth: m[1]!.length, text: m[2]!.replace(/[*_`]/g, ''), line: i + 1 });
      }
    });
    return out;
  });
  const current = $derived(outline.findLastIndex((h) => h.line <= ed.cursor.line));
  const minDepth = $derived(Math.min(...outline.map((h) => h.depth), 6));
</script>

<aside class="ins" aria-label="文章设置">
  <div class="head">
    <div class="ed-seg" role="tablist">
      <button type="button" role="tab" aria-selected={ed.inspectorTab === 'settings'} onclick={() => (ed.inspectorTab = 'settings')}>
        设置{#if ed.errors.length}<span class="err-dot"></span>{/if}
      </button>
      <button type="button" role="tab" aria-selected={ed.inspectorTab === 'outline'} onclick={() => (ed.inspectorTab = 'outline')}>大纲</button>
    </div>
    <button type="button" class="ed-icon" onclick={() => (ed.inspector = false)} title="收起（Ctrl+.）" aria-label="收起"><Icon icon={iX} size={15} /></button>
  </div>

  {#if ed.inspectorTab === 'settings'}
    <div class="body">
      {#if ed.issues.length}
        <ul class="issues">
          {#each ed.issues as issue}
            <li><button type="button" class={issue.level} onclick={() => jump(issue.field)}><Icon icon={iWarning} size={13} />{issue.text}</button></li>
          {/each}
        </ul>
      {/if}

      <section>
        <h3>状态</h3>
        <div class="ed-seg fill" role="radiogroup" aria-label="状态">
          {#each STATUS as s}
            <button type="button" role="radio" aria-checked={status === s.id} onclick={() => setStatus(s.id)}><Icon icon={s.icon} size={13} />{s.label}</button>
          {/each}
        </div>
        <p class="ed-hint">{STATUS.find((s) => s.id === status)?.hint}</p>
      </section>

      <section>
        <h3>链接与日期</h3>
        <div class="slug" class:invalid={!SLUG.test(doc.slug)}>
          <span>/posts/</span>
          <input id="f-slug" bind:value={doc.slug} spellcheck="false" autocomplete="off" aria-label="链接" />
          <span>/</span>
        </div>
        <p class="ed-hint">小写字母、数字、连字符。发布后尽量别改，改了旧链接会失效。</p>
        <div class="rows">
          <label class="row" for="f-pub"><span>发布</span><input id="f-pub" class="ed-input" type="date" bind:value={fm.pubDate} /></label>
          <div class="row">
            <label for="f-upd">更新</label>
            <div class="with-btns">
              <input id="f-upd" class="ed-input" type="date" bind:value={fm.updatedDate} />
              {#if fm.updatedDate}
                <button type="button" class="ed-icon sm" onclick={() => (fm.updatedDate = undefined)} title="清除" aria-label="清除更新日期"><Icon icon={iX} size={13} /></button>
              {:else}
                <button type="button" class="ed-btn sm quiet" onclick={() => (fm.updatedDate = today())}>今天</button>
              {/if}
            </div>
          </div>
        </div>
      </section>

      <section>
        <h3>分类</h3>
        <div class="cats" id="f-category" role="radiogroup" aria-label="分类" tabindex="-1">
          {#each ed.vocab.categories as c}
            <button type="button" role="radio" aria-checked={fm.category === c.id} class="cat" onclick={() => (fm.category = c.id)} title={c.blurb}>{c.label}</button>
          {/each}
          <button type="button" class="cat add" onclick={() => (newCategory = newCategory ? null : { label: '', id: '', blurb: '' })} title="新建分类">
            <Icon icon={iPlus} size={12} />新分类
          </button>
        </div>
        {#if category}<p class="ed-hint">{category.blurb}</p>{/if}
        {#if newCategory}
          <div class="mini-form">
            <div class="grid2">
              <label class="f"><span class="ed-label">名称</span><input class="ed-input" bind:value={newCategory.label} placeholder="例如 工具" /></label>
              <label class="f"><span class="ed-label">id</span><input class="ed-input mono" bind:value={newCategory.id} placeholder="tools" spellcheck="false" /></label>
            </div>
            <label class="f"><span class="ed-label">说明</span><input class="ed-input" bind:value={newCategory.blurb} placeholder="一句话，分类页顶部会显示" /></label>
            <p class="ed-hint">id 进 URL（/categories/id/），建好后不能改。会写进 config.ts，dev server 随后自动重启几秒。</p>
            <div class="form-actions">
              <button type="button" class="ed-btn sm quiet" onclick={() => (newCategory = null)} disabled={busy}>取消</button>
              <button type="button" class="ed-btn sm primary" onclick={createCategory} disabled={busy || !newCategory.label.trim() || !newCategory.id.trim() || !newCategory.blurb.trim()}>
                {#if busy}<span class="ed-spinner"></span>{/if}新建并选上
              </button>
            </div>
          </div>
        {/if}
      </section>

      <section>
        <h3>标签 <span class="ed-hint">{fm.tags?.length ?? 0} / 6，建议 3 到 5 个</span></h3>
        <TagPicker />
      </section>

      <section>
        <h3>系列</h3>
        <div class="series-row">
          <input id="f-series" class="ed-input" list="series-names" bind:value={fm.series} placeholder="不属于任何系列" />
          <input class="ed-input order" type="number" min="1" bind:value={fm.seriesOrder} placeholder="序号" aria-label="系列序号" />
        </div>
        <datalist id="series-names">
          {#each seriesNames as name}<option value={name}></option>{/each}
        </datalist>
        {#if members.length}
          <ol class="members">
            {#each members as m}
              <li class:self={m.self}><span class="tabular">{m.order || '?'}</span>{m.title}</li>
            {/each}
          </ol>
          <div class="series-actions">
            <button type="button" class="ed-link" onclick={putLast}>排到最后</button>
            {#if others.length}<button type="button" class="ed-link" onclick={openSeries}>在「整理」里调整顺序</button>{/if}
          </div>
        {:else}
          <p class="ed-hint">输入已有的系列名会自动补全；写一个新名字就是开一个新系列。</p>
        {/if}
      </section>

      <section>
        <h3>封面</h3>
        <input bind:this={coverInput} type="file" accept="image/*" hidden onchange={onCoverPick} />
        {#if fm.cover}
          <figure class="cover"><img src={assetUrl(fm.cover)} alt={fm.coverAlt ?? ''} /></figure>
          <div class="cover-actions">
            <button type="button" class="ed-btn sm" onclick={() => coverInput?.click()} disabled={coverBusy}><Icon icon={iUploadSimple} size={13} />更换</button>
            <button type="button" class="ed-btn sm quiet" onclick={() => ((fm.cover = undefined), (fm.coverAlt = undefined))}>移除</button>
          </div>
          <input class="ed-input" bind:value={fm.coverAlt} placeholder="封面的文字说明（读屏和图片加载失败时显示）" />
        {:else}
          <button
            type="button"
            id="f-cover"
            class="drop"
            onclick={() => coverInput?.click()}
            ondragover={(e) => e.preventDefault()}
            ondrop={(e) => {
              e.preventDefault();
              void uploadCover(e.dataTransfer?.files[0]);
            }}
            disabled={coverBusy}
          >
            {#if coverBusy}<span class="ed-spinner"></span>上传中{:else}<Icon icon={iImage} size={18} />点这里选图，或者把图片拖进来{/if}
          </button>
        {/if}
        <p class="ed-hint">图片只存在本机，不进仓库；从本机部署时会带上。</p>
      </section>

      <section>
        <h3>选项</h3>
        <div class="switches">
          {#each [['featured', '精选', '首页和列表里置顶、带星标'], ['commentsOff', '关闭评论', ''], ['mayBeStale', '可能过时', '文章顶部提示读者留意时效']] as [key, label, hint]}
            <label class="ed-switch">
              <input type="checkbox" bind:checked={fm[key] as boolean} />
              <span class="track" aria-hidden="true"><span class="knob"></span></span>
              <span class="text">{label}{#if hint}<small>{hint}</small>{/if}</span>
            </label>
          {/each}
        </div>
      </section>

      <section class="danger">
        <button type="button" class="ed-btn sm quiet del" onclick={() => ed.remove()}><Icon icon={iTrash} size={14} />{doc.isNew ? '放弃这篇' : '删除文章'}</button>
        {#if !doc.isNew && status !== 'archived'}
          <p class="ed-hint">不想删、只想让它不再出现在列表里？把状态改成「归档」。</p>
        {/if}
      </section>
    </div>
  {:else}
    <div class="body outline">
      {#if outline.length}
        <p class="ed-hint">{outline.length} 个标题。点一下跳到那里。</p>
        {#if outline.some((h) => h.depth === 1)}
          <p class="warn-line"><Icon icon={iWarning} size={13} />正文里有一级标题。文章标题已经是一级了，正文从二级开始更合适。</p>
        {/if}
        <ol class="toc">
          {#each outline as h, i}
            <li>
              <button
                type="button"
                class:current={i === current}
                style:padding-left={`${0.6 + (h.depth - minDepth) * 0.9}rem`}
                onclick={() => {
                  ed.cm?.jumpTo(h.line);
                  ed.revealHeading?.(i);
                }}
              >
                {h.text}
              </button>
            </li>
          {/each}
        </ol>
      {:else}
        <div class="ed-empty">还没有标题。用 <kbd>##</kbd> 开头写一个二级标题，或者用工具栏的「标题」。</div>
      {/if}
    </div>
  {/if}
</aside>

<style>
  .ins {
    display: flex;
    flex-direction: column;
    min-height: 0;
    border-left: 1px solid var(--line);
    background: var(--surface);
  }
  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 3.25rem;
    padding: 0 0.6rem 0 0.85rem;
    border-bottom: 1px solid var(--line);
  }
  .err-dot {
    width: 6px;
    height: 6px;
    border-radius: 999px;
    background: var(--danger);
  }
  .body {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 0.4rem 1rem 1.5rem;
  }
  section {
    display: grid;
    gap: 0.5rem;
    padding: 0.9rem 0;
    border-bottom: 1px solid color-mix(in oklab, var(--line) 70%, transparent);
  }
  section:last-child {
    border-bottom: 0;
  }
  h3 {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    font-size: 0.75rem;
    font-weight: 650;
    color: var(--fg-muted);
  }

  .issues {
    display: grid;
    gap: 0.3rem;
    padding-top: 0.6rem;
  }
  .issues button {
    display: flex;
    align-items: flex-start;
    gap: 0.4rem;
    width: 100%;
    padding: 0.4rem 0.6rem;
    border-radius: 9px;
    text-align: left;
    font-size: 0.75rem;
    line-height: 1.5;
  }
  .issues button :global(svg) {
    margin-top: 0.15rem;
  }
  .issues .error {
    color: var(--danger);
    background: color-mix(in oklab, var(--danger) 9%, transparent);
  }
  .issues .warn {
    color: var(--warning);
    background: color-mix(in oklab, var(--warning) 10%, transparent);
  }

  .slug {
    display: flex;
    align-items: center;
    height: 2.1rem;
    padding-inline: 0.65rem;
    border-radius: 9px;
    border: 1px solid var(--line);
    background: var(--bg);
    font-family: var(--font-mono);
    font-size: 0.75rem;
    color: var(--fg-subtle);
  }
  .slug:focus-within {
    border-color: color-mix(in oklab, var(--accent) 60%, var(--line));
  }
  .slug.invalid {
    border-color: var(--danger);
  }
  .slug input {
    flex: 1;
    min-width: 0;
    padding: 0 0.1rem;
    border: 0;
    outline: none;
    background: none;
    font: inherit;
    color: var(--fg);
  }
  .rows {
    display: grid;
    gap: 0.4rem;
    margin-top: 0.2rem;
  }
  .row {
    display: grid;
    grid-template-columns: 2.5rem minmax(0, 1fr);
    align-items: center;
    gap: 0.5rem;
    font-size: 0.75rem;
    color: var(--fg-muted);
  }
  .with-btns {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .cats {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }
  .cat {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    height: 1.85rem;
    padding-inline: 0.75rem;
    border-radius: 999px;
    border: 1px solid var(--line);
    font-size: 0.78rem;
    color: var(--fg-muted);
    transition:
      color 140ms ease,
      border-color 140ms ease,
      background-color 140ms ease;
  }
  .cat:hover {
    color: var(--fg);
    border-color: var(--line-strong);
  }
  .cat[aria-checked='true'] {
    font-weight: 600;
    color: var(--accent-strong);
    border-color: color-mix(in oklab, var(--accent) 50%, var(--line));
    background: color-mix(in oklab, var(--accent) 9%, var(--surface));
  }
  .cat.add {
    border-style: dashed;
    color: var(--fg-subtle);
  }
  .mini-form {
    display: grid;
    gap: 0.5rem;
    padding: 0.75rem;
    border-radius: 12px;
    border: 1px solid color-mix(in oklab, var(--accent) 35%, var(--line));
    background: color-mix(in oklab, var(--accent) 4%, var(--surface));
  }
  .grid2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }
  .f {
    display: grid;
    gap: 0.3rem;
  }
  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.4rem;
  }

  .series-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 4.5rem;
    gap: 0.4rem;
  }
  .members {
    display: grid;
    gap: 0.1rem;
    padding: 0.45rem 0.55rem;
    border-radius: 10px;
    background: var(--bg);
    border: 1px solid var(--line);
  }
  .members li {
    display: flex;
    gap: 0.5rem;
    overflow: hidden;
    font-size: 0.75rem;
    line-height: 1.6;
    color: var(--fg-muted);
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .members li span {
    flex-shrink: 0;
    width: 1rem;
    text-align: right;
    color: var(--fg-subtle);
  }
  .members li.self {
    font-weight: 600;
    color: var(--accent-strong);
  }
  .series-actions {
    display: flex;
    gap: 1rem;
    font-size: 0.75rem;
  }

  .cover {
    overflow: hidden;
    border-radius: 10px;
    border: 1px solid var(--line);
    background: var(--surface-2);
  }
  .cover img {
    display: block;
    width: 100%;
    max-height: 11rem;
    object-fit: cover;
  }
  .cover-actions {
    display: flex;
    gap: 0.35rem;
  }
  .drop {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    height: 4.5rem;
    border-radius: 12px;
    border: 1.5px dashed var(--line-strong);
    font-size: 0.78rem;
    color: var(--fg-subtle);
    transition:
      border-color 140ms ease,
      color 140ms ease;
  }
  .drop:hover {
    color: var(--accent);
    border-color: color-mix(in oklab, var(--accent) 50%, var(--line));
  }

  .switches {
    display: grid;
    gap: 0.6rem;
  }
  .danger {
    gap: 0.35rem;
  }
  .del {
    justify-self: start;
    color: var(--danger);
  }
  .del:hover:not(:disabled) {
    color: var(--danger);
    background: color-mix(in oklab, var(--danger) 10%, transparent);
  }

  .outline {
    display: grid;
    align-content: start;
    gap: 0.6rem;
    padding-top: 0.9rem;
  }
  .warn-line {
    display: flex;
    align-items: flex-start;
    gap: 0.4rem;
    padding: 0.45rem 0.6rem;
    border-radius: 9px;
    font-size: 0.72rem;
    line-height: 1.5;
    color: var(--warning);
    background: color-mix(in oklab, var(--warning) 10%, transparent);
  }
  .toc {
    display: grid;
    gap: 1px;
    margin-inline: -0.4rem;
  }
  .toc button {
    display: block;
    width: 100%;
    padding-block: 0.38rem;
    padding-right: 0.6rem;
    border-radius: 8px;
    text-align: left;
    font-size: 0.8rem;
    line-height: 1.45;
    color: var(--fg-muted);
    transition:
      background-color 120ms ease,
      color 120ms ease;
  }
  .toc button:hover {
    color: var(--fg);
    background: var(--surface-2);
  }
  .toc button.current {
    color: var(--accent-strong);
    background: color-mix(in oklab, var(--accent) 9%, transparent);
    box-shadow: inset 2px 0 0 var(--accent);
  }
</style>
