<script lang="ts">
  /**
   * Geist 字体排印演示。
   *
   * 四组规格表（标题 / 按钮 / 标签 / 正文），每行用该行自己的字号、行高、字距、字重实时渲染样张，
   * 旁边列出类名、数值和中文用法。顶部可以在 Geist Sans / Mono / Serif / Pixel 之间切换字体族，
   * 还有一个 Strong 开关演示 <strong> 修饰。
   *
   * 数据在 public/data/geist/foundations/typography.json，说明译文取自 _scratch/geist/zh/typography.md。
   */
  import { onMount } from 'svelte';

  import { loadGeistJson } from '../data';

  import '../base.css';
  import '../utilities.css';
  import './common.css';
  import './type.css';

  interface TypeItem {
    class: string;
    label: string;
    size: string;
    lineHeight: string;
    weight: string;
    letterSpacing: string;
    family: string;
    usage: string;
    usageZh: string;
  }

  interface TypeGroup {
    id: string;
    nameZh: string;
    items: TypeItem[];
  }

  interface TypeData {
    groups: TypeGroup[];
  }

  type Theme = 'light' | 'dark';
  type Status = 'loading' | 'ready' | 'error';

  /** 符合规格说明的分组小标题和样张文字（样张拆两段，Strong 开关加粗后一段）。 */
  const GROUP_META: Record<string, { en: string; desc: string; sample: [string, string] }> = {
    headings: { en: 'Headings', desc: '用来引出页面或章节。', sample: ['Geist ', 'Design'] },
    buttons: { en: 'Buttons', desc: '只用在真正渲染按钮的组件里。', sample: ['Create ', 'Deployment'] },
    labels: { en: 'Label', desc: '专为单行设计，行高给得比较宽松，方便做高亮，也方便和图标对齐。', sample: ['Deployment ', 'overview'] },
    copy: { en: 'Copy', desc: '为多行文本设计，行高比 Label 更大。', sample: ['The quick brown fox ', 'jumps over the lazy dog.'] },
  };

  const FAMILIES = [
    { id: 'sans', label: 'Sans', css: 'var(--font-geist-sans)' },
    { id: 'mono', label: 'Mono', css: 'var(--font-geist-mono)' },
    { id: 'serif', label: 'Serif', css: 'var(--font-geist-serif)' },
    { id: 'pixel', label: 'Pixel', css: 'var(--font-geist-pixel)' },
  ] as const;

  type FamilyId = (typeof FAMILIES)[number]['id'];

  let { config = {} }: { config?: Record<string, unknown> } = $props();
  // 目前没有配置项；在 effect 里读一下，既保留后续扩展的口子，也避开 state_referenced_locally 警告
  $effect(() => {
    void config;
  });

  let localTheme: Theme = $state('light');
  let family: FamilyId = $state('sans');
  let strong = $state(false);
  let status: Status = $state('loading');
  let data: TypeData | null = $state(null);

  let destroyed = false;

  const familyCss = $derived(FAMILIES.find((item) => item.id === family)?.css ?? FAMILIES[0].css);

  onMount(() => {
    localTheme = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
    void load();
    return () => {
      destroyed = true;
    };
  });

  async function load(): Promise<void> {
    try {
      data = await loadGeistJson<TypeData>('/data/geist/foundations/typography.json');
      if (!destroyed) status = 'ready';
    } catch {
      if (!destroyed) status = 'error';
    }
  }

  function setTheme(theme: Theme): void {
    localTheme = theme;
  }

  /** 规格里写的字体族，显示成 Sans / Mono 这种短名。 */
  function familyLabel(familyValue: string): string {
    return familyValue.includes('mono') ? 'Mono' : 'Sans';
  }

  /** 字号 / 行高 / 字距 / 字重压成一行。 */
  function specText(item: TypeItem): string {
    const spacing = item.letterSpacing && item.letterSpacing !== 'normal' ? item.letterSpacing : '0';
    return `${item.size} / ${item.lineHeight} · ${spacing} · ${item.weight} · ${familyLabel(item.family)}`;
  }

  /** 没有单独说明的行，用分组说明兜底。 */
  function usageOf(item: TypeItem, group: TypeGroup): string {
    return item.usageZh && item.usageZh !== '—' ? item.usageZh : (GROUP_META[group.id]?.desc ?? '—');
  }
</script>

<div class="gf-root" data-theme={localTheme}>
  <div class="geist-demo snapshot-root">
    <div class="gf-toolbar">
      <div class="gf-toolbar-title">
        <span class="gf-toolbar-label">字体排印</span>
        <span class="gf-toolbar-zh">四组规格，实时渲染样张；字体族和加粗只影响样张</span>
      </div>
      <div class="gf-toolbar-right">
        <div class="gf-seg" role="group" aria-label="演示亮暗主题">
          <button
            type="button"
            class="gf-seg-btn"
            aria-pressed={localTheme === 'light'}
            onclick={() => setTheme('light')}>亮</button>
          <button
            type="button"
            class="gf-seg-btn"
            aria-pressed={localTheme === 'dark'}
            onclick={() => setTheme('dark')}>暗</button>
        </div>
      </div>
    </div>

    {#if status === 'loading'}
      <div class="gf-state"><span class="gf-spinner"></span>字阶数据加载中</div>
    {:else if status === 'error'}
      <div class="gf-state gf-state--error">字阶数据加载失败，请刷新后重试。</div>
    {:else if data}
      <div class="gf-type">
        <div class="gf-type-controls">
          <div class="gf-field">
            <span class="gf-field-label">字体族</span>
            <div class="gf-seg" role="group" aria-label="样张字体族">
              {#each FAMILIES as item (item.id)}
                <button
                  type="button"
                  class="gf-seg-btn"
                  aria-pressed={family === item.id}
                  onclick={() => (family = item.id)}
                >{item.label}</button>
              {/each}
            </div>
          </div>
          <div class="gf-field">
            <span class="gf-field-label">Strong 修饰</span>
            <button
              type="button"
              class="gf-switch"
              role="switch"
              aria-checked={strong}
              onclick={() => (strong = !strong)}
            >
              <span class="gf-switch-track"><span class="gf-switch-thumb"></span></span>
              <span class="gf-switch-text">{strong ? '已加粗' : '未加粗'}</span>
            </button>
          </div>
        </div>

        {#each data.groups as group (group.id)}
          {@const meta = GROUP_META[group.id]}
          <section class="gf-type-group">
            <div class="gf-type-group-head">
              <h3 class="gf-type-group-title">
                {group.nameZh}
                <span class="gf-type-group-en">{meta?.en ?? group.id}</span>
              </h3>
              {#if meta}
                <p class="gf-type-group-desc">{meta.desc}</p>
              {/if}
            </div>

            <div class="gf-type-table">
              <div class="gf-type-head" aria-hidden="true">
                <span>示例</span>
                <span>类名</span>
                <span>字号 / 行高 / 字距 / 字重</span>
                <span>用法</span>
              </div>
              {#each group.items as item (item.class)}
                {@const parts = meta?.sample ?? [item.label, '']}
                <div class="gf-type-row">
                  <div
                    class="gf-type-sample"
                    style:font-size={item.size}
                    style:line-height={item.lineHeight}
                    style:letter-spacing={item.letterSpacing || 'normal'}
                    style:font-weight={item.weight}
                    style:font-family={familyCss}
                  >
                    {parts[0]}{#if strong}<strong>{parts[1]}</strong>{:else}{parts[1]}{/if}
                  </div>
                  <div class="gf-type-meta">
                    <code class="gf-type-class">{item.class}</code>
                    <span class="gf-type-spec">{specText(item)}</span>
                    <span class="gf-type-usage">{usageOf(item, group)}</span>
                  </div>
                </div>
              {/each}
            </div>
          </section>
        {/each}

        <p class="gf-note gf-type-note">
          这些类把字号、行高、字距和字重打包成一组预设，用的时候不要再单独覆盖其中某一项，否则字号和行高很容易对不上。
          加粗（Strong）只要在样张里嵌一个 strong 元素就能看到效果。
        </p>
      </div>
    {/if}
  </div>
</div>
