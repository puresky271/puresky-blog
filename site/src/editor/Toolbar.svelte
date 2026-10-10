<script lang="ts">
  /**
   * Toolbar.svelte — 写作区的格式工具栏。按钮都转给 CodeEditor（经 store 里注册的 ed.cm）。
   * 标题级别、代码块语言、提示块类型是下拉菜单；提示块的中文名和站点的 remark-callout 一致。
   */
  import Icon from '@/components/ui/Icon.svelte';
  import {
    iArrowClockwise,
    iArrowCounterClockwise,
    iCaretDown,
    iCheckSquare,
    iCode,
    iImage,
    iLightbulb,
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
    ['bash', 'Shell'],
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

  let menu = $state<'heading' | 'code' | 'callout' | null>(null);
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

  <button type="button" class="tb" onclick={() => ed.cm?.prefix('> ')} title="引用" aria-label="引用"><Icon icon={iQuotes} size={16} /></button>
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
  <div class="drop">
    <button type="button" class="tb wide" onclick={(e) => toggle('callout', e)} aria-expanded={menu === 'callout'} title="提示块（选中几行再点，会把它们变成提示块）">
      <Icon icon={iLightbulb} size={16} /><span>提示块</span><Icon icon={iCaretDown} size={11} />
    </button>
    {#if menu === 'callout'}
      <div class="ed-menu" role="menu">
        {#each CALLOUTS as [kind, label, hint]}
          <button type="button" class="ed-menu-item" role="menuitem" onclick={() => run(() => ed.cm?.callout(kind))}>
            <span class="callout-dot" data-kind={kind}></span>{label}<span class="aside">{hint}</span>
          </button>
        {/each}
      </div>
    {/if}
  </div>
  <button type="button" class="tb" onclick={() => ed.cm?.insert('| 列 | 列 | 列 |\n| --- | --- | --- |\n|  |  |  |', true)} title="表格" aria-label="表格"><Icon icon={iTable} size={16} /></button>
  <button type="button" class="tb" onclick={() => ed.cm?.footnote()} title="脚注：插入引用，并在文末加上定义" aria-label="脚注"><Icon icon={iTextSuperscript} size={16} /></button>
  <button type="button" class="tb" onclick={() => ed.cm?.insert('---', true)} title="分隔线" aria-label="分隔线"><Icon icon={iMinus} size={16} /></button>
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
  @media (width < 90rem) {
    .tb.wide span {
      display: none;
    }
  }
</style>
