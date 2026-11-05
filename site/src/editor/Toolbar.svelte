<script lang="ts">
  /**
   * Toolbar.svelte — 写作区的格式工具栏。按钮都转给 CodeEditor（经 store 里注册的 ed.cm）。
   * 标题级别、代码块语言、提示块类型是下拉菜单；提示块的中文名和站点的 remark-callout 一致。
   * 「图片容器」也是下拉菜单：上面一排是 :::photo 的五个预设，下面是根据光标所在容器回填的参数面板
   *（位置和宽度，宽度只对左浮/右浮显示）。光标不在容器里时，预设负责包裹选中的行或者插入骨架。
   */
  import Icon from '@/components/ui/Icon.svelte';
  import {
    iArrowClockwise,
    iArrowCounterClockwise,
    iCaretDown,
    iChatCenteredText,
    iCheckSquare,
    iCode,
    iFileImage,
    iImage,
    iLink,
    iListBullets,
    iListNumbers,
    iMinus,
    iQuotes,
    iTable,
    iTerminalWindow,
    iTextB,
    iTextH,
    iTextItalic,
    iTextStrikethrough,
    iTextSuperscript,
  } from '@/lib/icons.generated';

  import { PHOTO_LABELS, PHOTO_PRESETS, PHOTO_WIDTH_MAX, PHOTO_WIDTH_MIN, type PhotoLayout } from './photo';
  import { ed } from './store.svelte';

  const HEADINGS: [number, string, string][] = [
    [0, '正文', 'Ctrl Alt 0'],
    [2, '二级标题', 'Ctrl Alt 2'],
    [3, '三级标题', 'Ctrl Alt 3'],
    [4, '四级标题', 'Ctrl Alt 4'],
  ];
  const LANGS: [string, string][] = [
    ['ts', 'TypeScript'],
    ['js', 'JavaScript'],
    ['python', 'Python'],
    ['bash', 'Bash'],
    ['json', 'JSON'],
    ['yaml', 'YAML'],
    ['toml', 'TOML'],
    ['sql', 'SQL'],
    ['html', 'HTML'],
    ['css', 'CSS'],
    ['diff', 'Diff'],
    ['text', '纯文本'],
  ];
  const CALLOUTS: [string, string, string][] = [
    ['NOTE', '说明', '补充背景'],
    ['TIP', '提示', '更好的做法'],
    ['IMPORTANT', '重点', '读者不能错过的'],
    ['WARNING', '注意', '容易踩的坑'],
    ['CAUTION', '警告', '有风险的操作'],
  ];
  const PHOTO_HINTS: Record<PhotoLayout, string> = {
    left: '左浮：图片浮在左侧，正文绕排，默认宽度 42%',
    right: '右浮：图片浮在右侧，正文绕排，默认宽度 42%',
    wide: '加宽：随笔版式里比正文栏宽一些，别的版式就是满宽',
    row: '横排：多张图排成一条等高横条，放不下时横向滑动',
    '': '普通：不带参数的居中图片',
  };

  let menu = $state<'heading' | 'code' | 'callout' | 'photo' | null>(null);
  let fileInput = $state<HTMLInputElement>();

  function toggle(name: typeof menu, event: MouseEvent) {
    event.stopPropagation();
    menu = menu === name ? null : name;
  }

  function run(action: () => void) {
    menu = null;
    action();
  }

  function onPick(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const files = [...(input.files ?? [])];
    input.value = '';
    if (files.length) ed.cm?.pickImages(files);
  }

  /** 位置按钮：点完菜单不关，接着拖宽度滑块。 */
  function pickLayout(layout: PhotoLayout) {
    ed.cm?.photo(layout);
  }

  function onWidth(event: Event) {
    ed.cm?.photoWidth(Number((event.currentTarget as HTMLInputElement).value));
  }
</script>

<svelte:window onclick={() => (menu = null)} onkeydown={(e) => e.key === 'Escape' && (menu = null)} />

<div class="bar" role="toolbar" aria-label="格式">
  <button type="button" class="tb" onclick={() => ed.cm?.undo()} title="撤销（Ctrl+Z）" aria-label="撤销"><Icon icon={iArrowCounterClockwise} size={16} /></button>
  <button type="button" class="tb" onclick={() => ed.cm?.redo()} title="重做（Ctrl+Y）" aria-label="重做"><Icon icon={iArrowClockwise} size={16} /></button>
  <span class="sep"></span>

  <div class="drop">
    <button type="button" class="tb wide" onclick={(e) => toggle('heading', e)} aria-expanded={menu === 'heading'} title="段落和标题">
      <Icon icon={iTextH} size={16} /><span>标题</span><Icon icon={iCaretDown} size={11} />
    </button>
    {#if menu === 'heading'}
      <div class="ed-menu" role="menu">
        {#each HEADINGS as [level, label, keys]}
          <button type="button" class="ed-menu-item" role="menuitem" onclick={() => run(() => ed.cm?.heading(level))}>
            <span class="h" data-level={level}>{label}</span><span class="aside">{keys}</span>
          </button>
        {/each}
      </div>
    {/if}
  </div>
  <span class="sep"></span>

  <button type="button" class="tb" onclick={() => ed.cm?.wrap('**', '**', '加粗')} title="加粗（Ctrl+B）" aria-label="加粗"><Icon icon={iTextB} size={16} /></button>
  <button type="button" class="tb" onclick={() => ed.cm?.wrap('*', '*', '斜体')} title="斜体（Ctrl+I）" aria-label="斜体"><Icon icon={iTextItalic} size={16} /></button>
  <button type="button" class="tb" onclick={() => ed.cm?.wrap('~~', '~~', '删除线')} title="删除线" aria-label="删除线"><Icon icon={iTextStrikethrough} size={16} /></button>
  <button type="button" class="tb" onclick={() => ed.cm?.wrap('`', '`', 'code')} title="行内代码（Ctrl+E）" aria-label="行内代码"><Icon icon={iCode} size={16} /></button>
  <button type="button" class="tb" onclick={() => ed.cm?.wrap('[', '](https://)', '链接文字')} title="链接（Ctrl+K）。选中文字后直接粘贴网址也行" aria-label="链接"><Icon icon={iLink} size={16} /></button>
  <span class="sep"></span>

  <div class="drop">
    <button type="button" class="tb wide" onclick={(e) => toggle('callout', e)} aria-label="引用" aria-expanded={menu === 'callout'} title="引用：普通引用或带 [!TIP] 等标记的提示块">
      <Icon icon={iQuotes} size={16} /><span>引用</span><Icon icon={iCaretDown} size={11} />
    </button>
    {#if menu === 'callout'}
      <div class="ed-menu" role="menu">
        <button type="button" class="ed-menu-item" role="menuitem" onclick={() => run(() => ed.cm?.prefix('> '))}>普通引用<span class="aside">&gt;</span></button>
        {#each CALLOUTS as [kind, label, hint]}
          <button type="button" class="ed-menu-item" role="menuitem" title={hint} onclick={() => run(() => ed.cm?.callout(kind))}>
            <span class="callout-dot" data-kind={kind}></span>{label}<span class="aside">[!{kind}]</span>
          </button>
        {/each}
      </div>
    {/if}
  </div>
  <button type="button" class="tb" onclick={() => ed.cm?.annotation()} title="注解段：插入 :::annotation 容器，选中几行会把它们包进去。论文对照文章里的批注卡" aria-label="注解段"><Icon icon={iChatCenteredText} size={16} /></button>
  <button type="button" class="tb" onclick={() => ed.cm?.prefix('- ')} title="无序列表" aria-label="无序列表"><Icon icon={iListBullets} size={16} /></button>
  <button type="button" class="tb" onclick={() => ed.cm?.prefix('1. ')} title="有序列表" aria-label="有序列表"><Icon icon={iListNumbers} size={16} /></button>
  <button type="button" class="tb" onclick={() => ed.cm?.prefix('- [ ] ')} title="任务列表" aria-label="任务列表"><Icon icon={iCheckSquare} size={16} /></button>
  <span class="sep"></span>

  <div class="drop">
    <button type="button" class="tb wide" onclick={(e) => toggle('code', e)} aria-expanded={menu === 'code'} title="代码块（选中几行再点，会把它们包进去）">
      <Icon icon={iTerminalWindow} size={16} /><span>代码块</span><Icon icon={iCaretDown} size={11} />
    </button>
    {#if menu === 'code'}
      <div class="ed-menu cols" role="menu">
        {#each LANGS as [lang, label]}
          <button type="button" class="ed-menu-item" role="menuitem" onclick={() => run(() => ed.cm?.codeBlock(lang))}>{label}<span class="aside">{lang}</span></button>
        {/each}
      </div>
    {/if}
  </div>
  <button type="button" class="tb" onclick={() => ed.cm?.insert('| 列 | 列 | 列 |\n| --- | --- | --- |\n|  |  |  |', true)} title="表格" aria-label="表格"><Icon icon={iTable} size={16} /></button>
  <button type="button" class="tb" onclick={() => ed.cm?.footnote()} title="脚注：插入引用，并在文末加上定义" aria-label="脚注"><Icon icon={iTextSuperscript} size={16} /></button>
  <button type="button" class="tb" onclick={() => ed.cm?.insert('---', true)} title="分隔线" aria-label="分隔线"><Icon icon={iMinus} size={16} /></button>

  <div class="drop">
    <button type="button" class="tb wide" onclick={(e) => toggle('photo', e)} aria-expanded={menu === 'photo'} title="图片容器：把选中的图片行包进 :::photo。光标已经在容器里时，按钮改成调整这个容器的参数" aria-label="图片容器">
      <Icon icon={iFileImage} size={16} /><span>图片容器</span><Icon icon={iCaretDown} size={11} />
    </button>
    {#if menu === 'photo'}
      <div class="ed-menu photo-menu" role="group" aria-label="图片容器">
        <div class="photo-presets">
          {#each PHOTO_PRESETS as layout}
            <button type="button" class="photo-preset" class:active={ed.photo.inside && ed.photo.layout === layout} aria-pressed={ed.photo.inside && ed.photo.layout === layout} title={PHOTO_HINTS[layout]} onclick={() => run(() => ed.cm?.photo(layout))}>
              <span class="glyph" data-layout={layout}></span>
              <span>{PHOTO_LABELS[layout]}</span>
            </button>
          {/each}
        </div>
        <div class="ed-menu-sep"></div>
        {#if ed.photo.inside}
          <div class="photo-params">
            <div class="photo-head">
              <span class="photo-state">光标在第 {ed.photo.line} 行的容器里</span>
              <code class="photo-marker">{ed.photo.marker}</code>
            </div>
            <div class="photo-row">
              <span class="photo-label">位置</span>
              <div class="ed-seg photo-seg" role="radiogroup" aria-label="图片位置">
                {#each PHOTO_PRESETS as layout}
                  <button type="button" role="radio" aria-checked={ed.photo.layout === layout} title={PHOTO_HINTS[layout]} onclick={(e) => {
                    e.stopPropagation();
                    pickLayout(layout);
                  }}>{PHOTO_LABELS[layout]}</button>
                {/each}
              </div>
            </div>
            {#if ed.photo.layout === 'left' || ed.photo.layout === 'right'}
              <div class="photo-row">
                <span class="photo-label">宽度</span>
                <input class="photo-range" type="range" min={PHOTO_WIDTH_MIN} max={PHOTO_WIDTH_MAX} step="1" value={ed.photo.width} aria-label="图片宽度百分比" oninput={onWidth} onclick={(e) => e.stopPropagation()} />
                <output class="photo-value">{ed.photo.width}%{ed.photo.widthSet ? '' : ' 默认'}</output>
              </div>
            {:else}
              <p class="ed-hint photo-hint">宽度只对左浮和右浮生效。</p>
            {/if}
            {#each ed.photo.issues as issue, i (i)}
              <p class="photo-issue">{issue}</p>
            {/each}
          </div>
        {:else}
          <p class="ed-hint photo-hint">光标不在 :::photo 容器里。选中图片行再点上面的预设会把它们包进容器，没有选区就插入一个骨架。</p>
        {/if}
      </div>
    {/if}
  </div>

  <button type="button" class="tb" onclick={() => fileInput?.click()} title="插入图片（也可以直接粘贴或拖进来）。图片只存在本机，不进仓库" aria-label="插入图片"><Icon icon={iImage} size={16} /></button>
  <input bind:this={fileInput} type="file" accept="image/*" multiple hidden onchange={onPick} />
</div>

<style>
  .bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 2px;
    padding: 0.35rem 0.8rem;
    border-bottom: 1px solid var(--line);
  }
  .tb {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.3rem;
    min-width: 2rem;
    height: 2rem;
    padding-inline: 0.4rem;
    border-radius: 8px;
    font-size: 0.78rem;
    color: var(--fg-muted);
    transition:
      background-color 140ms ease,
      color 140ms ease;
  }
  .tb:hover,
  .tb[aria-expanded='true'] {
    color: var(--fg);
    background: var(--surface-2);
  }
  .tb.wide {
    padding-inline: 0.5rem 0.4rem;
  }
  .sep {
    width: 1px;
    height: 1.1rem;
    margin-inline: 0.3rem;
    background: var(--line);
  }
  .drop {
    position: relative;
  }
  .cols {
    grid-template-columns: 1fr 1fr;
    min-width: 17rem;
  }
  .h[data-level='0'] {
    font-weight: 400;
  }
  .h[data-level='2'] {
    font-size: 1rem;
    font-weight: 700;
  }
  .h[data-level='3'] {
    font-size: 0.92rem;
    font-weight: 650;
  }
  .h[data-level='4'] {
    font-weight: 650;
  }
  .callout-dot {
    width: 0.55rem;
    height: 0.55rem;
    border-radius: 999px;
    background: var(--accent);
  }
  .callout-dot[data-kind='TIP'] {
    background: var(--success);
  }
  .callout-dot[data-kind='IMPORTANT'] {
    background: oklch(0.6 0.16 300);
  }
  .callout-dot[data-kind='WARNING'] {
    background: var(--warning);
  }
  .callout-dot[data-kind='CAUTION'] {
    background: var(--danger);
  }

  /* ── 图片容器 ── */
  .drop .photo-menu {
    right: 0;
    left: auto;
    width: min(21rem, calc(100vw - 2rem));
    padding: 0.45rem;
  }
  .photo-presets {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 0.25rem;
  }
  .photo-preset {
    display: grid;
    justify-items: center;
    gap: 0.32rem;
    padding: 0.45rem 0.1rem 0.4rem;
    border-radius: 9px;
    font-size: 0.73rem;
    color: var(--fg-muted);
    transition:
      background-color 140ms ease,
      color 140ms ease;
  }
  .photo-preset:hover {
    color: var(--fg);
    background: var(--surface-2);
  }
  .photo-preset.active {
    color: var(--accent-strong);
    background: var(--accent-soft);
  }
  /* 预设按钮里的示意图：一个方框，里面的色块就是图片摆在哪儿。 */
  .glyph {
    position: relative;
    width: 1.55rem;
    height: 1.05rem;
    border: 1px solid var(--line-strong);
    border-radius: 3px;
  }
  .glyph::before {
    content: '';
    position: absolute;
    top: 2px;
    bottom: 2px;
    border-radius: 1.5px;
    background: color-mix(in oklab, var(--accent) 68%, transparent);
  }
  .glyph[data-layout='left']::before {
    left: 2px;
    width: 0.52rem;
  }
  .glyph[data-layout='right']::before {
    right: 2px;
    width: 0.52rem;
  }
  .glyph[data-layout='wide']::before {
    left: -3px;
    right: -3px;
  }
  .glyph[data-layout='row']::before {
    left: 2px;
    right: 2px;
    background: repeating-linear-gradient(
      90deg,
      color-mix(in oklab, var(--accent) 68%, transparent) 0 0.28rem,
      transparent 0.28rem 0.42rem
    );
  }
  .glyph[data-layout='']::before {
    left: 50%;
    width: 0.56rem;
    margin-left: -0.28rem;
  }
  .photo-params {
    display: grid;
    gap: 0.3rem;
    padding: 0.1rem 0.1rem 0.2rem;
  }
  .photo-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    padding-inline: 0.2rem;
  }
  .photo-state {
    flex-shrink: 0;
    font-size: 0.72rem;
    color: var(--fg-muted);
  }
  .photo-marker {
    flex: 1;
    min-width: 0;
    text-align: right;
    overflow: hidden;
    font-family: var(--font-mono);
    font-size: 0.66rem;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--fg-subtle);
  }
  .photo-row {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    padding-inline: 0.2rem;
  }
  .photo-label {
    flex-shrink: 0;
    width: 2rem;
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--fg-muted);
  }
  .photo-seg {
    flex: 1;
  }
  .photo-seg button {
    flex: 1;
    padding-inline: 0.25rem;
    font-size: 0.72rem;
  }
  .photo-range {
    flex: 1;
    min-width: 0;
    height: 1.1rem;
    accent-color: var(--accent);
  }
  .photo-value {
    flex-shrink: 0;
    min-width: 3.6rem;
    text-align: right;
    font-family: var(--font-mono);
    font-size: 0.68rem;
    color: var(--fg-muted);
  }
  .photo-hint {
    padding: 0.1rem 0.25rem 0.25rem;
  }
  .photo-issue {
    margin-inline: 0.2rem;
    padding: 0.3rem 0.45rem;
    border-radius: 7px;
    font-size: 0.7rem;
    line-height: 1.5;
    color: var(--warning);
    background: color-mix(in oklab, var(--warning) 11%, transparent);
  }
  @media (width < 90rem) {
    .tb.wide span {
      display: none;
    }
  }
</style>
