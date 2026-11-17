<script lang="ts">
  /**
   * Geist 色彩系统演示。
   *
   * 三个标签页：色阶（9 组色阶，每组 10 档）、语义色（Color 1 到 10）、背景（Background 1 / 2）。
   * 色块显示步数、色值和令牌名，点一下复制当前主题下的色值；亮暗按钮只切这一块演示的主题，
   * 同时也决定色块显示哪一套值。
   *
   * 数据在 public/data/geist/foundations/palette.json，挂载后按需取；
   * 语义色的中文用途译文取自 _scratch/geist/zh/colors.md。
   */
  import { onMount, tick } from 'svelte';

  import { loadGeistJson } from '../data';

  import '../base.css';
  import '../utilities.css';
  import './common.css';
  import './palette.css';

  interface PaletteStep {
    step: number;
    token: string;
    light: string;
    dark: string;
  }

  interface PaletteScale {
    key: string;
    name: string;
    nameZh: string;
    steps: PaletteStep[];
  }

  interface SemanticColor {
    id: string;
    label: string;
    token: string;
    light: string;
    dark: string;
  }

  interface PaletteData {
    scales: PaletteScale[];
    semantic: SemanticColor[];
  }

  type TabId = 'scales' | 'semantic' | 'background';
  type Theme = 'light' | 'dark';
  type Status = 'loading' | 'ready' | 'error';

  const TABS: { id: TabId; label: string }[] = [
    { id: 'scales', label: '色阶' },
    { id: 'semantic', label: '语义色' },
    { id: 'background', label: '背景' },
  ];

  /** 语义色的用途，译文取自 _scratch/geist/zh/colors.md。 */
  const SEMANTIC_USAGE: Record<string, string> = {
    'color-1': '默认背景',
    'color-2': '悬停背景',
    'color-3': '按下背景',
    'color-4': '默认边框',
    'color-5': '悬停边框',
    'color-6': '按下边框',
    'color-7': '高对比背景',
    'color-8': '高对比背景的悬停态',
    'color-9': '次级文本和图标',
    'color-10': '主要文本和图标',
  };

  /** 语义色按用途分组，说明取自原站同一页的分组小标题。 */
  const SEMANTIC_GROUPS: { title: string; desc: string; ids: string[] }[] = [
    { title: '组件背景', desc: 'Color 1 到 3 专门用于 UI 组件的背景。', ids: ['color-1', 'color-2', 'color-3'] },
    { title: '边框', desc: 'Color 4 到 6 定义默认、悬停、按下三种边框强度。', ids: ['color-4', 'color-5', 'color-6'] },
    { title: '高对比背景', desc: 'Color 7 和 8 用于高对比度的组件背景。', ids: ['color-7', 'color-8'] },
    { title: '文本与图标', desc: 'Color 9 和 10 用于满足无障碍要求的文本和图标。', ids: ['color-9', 'color-10'] },
  ];

  let { config = {} }: { config?: Record<string, unknown> } = $props();
  // 目前没有配置项；在 effect 里读一下，既保留后续扩展的口子，也避开 state_referenced_locally 警告
  $effect(() => {
    void config;
  });

  let localTheme: Theme = $state('light');
  let tab: TabId = $state('scales');
  let status: Status = $state('loading');
  let data: PaletteData | null = $state(null);
  let demoEl: HTMLDivElement | undefined = $state();
  let copiedKey = $state('');
  let copiedValue = $state('');
  let backgrounds = $state({ b1: '#ffffff', b2: '#fafafa' });

  const tabRefs: (HTMLButtonElement | undefined)[] = [];
  let copyTimer: ReturnType<typeof setTimeout> | null = null;
  let destroyed = false;

  onMount(() => {
    localTheme = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
    void load();
    return () => {
      destroyed = true;
      if (copyTimer) clearTimeout(copyTimer);
    };
  });

  async function load(): Promise<void> {
    try {
      data = await loadGeistJson<PaletteData>('/data/geist/foundations/palette.json');
      if (destroyed) return;
      status = 'ready';
      await tick();
      readBackgrounds();
    } catch {
      if (!destroyed) status = 'error';
    }
  }

  /** 只切本演示的亮暗：既换整体配色，也换色块显示的那一套值。 */
  function setTheme(theme: Theme): void {
    if (localTheme === theme) return;
    localTheme = theme;
    void tick().then(readBackgrounds);
  }

  /** 当前主题下应该显示 / 复制的色值。 */
  function valueOf(light: string, dark: string): string {
    return localTheme === 'dark' ? dark : light;
  }

  /**
   * 背景页要显示具体色值，但 palette.json 里没有背景色。
   * 这里给演示区临时塞一个探针元素，从当前主题的 --ds-background-* 令牌读计算值再转 hex。
   */
  function readBackgrounds(): void {
    if (!demoEl) return;
    const probe = document.createElement('div');
    probe.style.cssText = 'position:absolute;width:0;height:0;visibility:hidden;pointer-events:none;';
    demoEl.appendChild(probe);
    const read = (token: string): string => {
      probe.style.setProperty('background-color', `var(${token})`);
      return rgbToHex(getComputedStyle(probe).backgroundColor);
    };
    backgrounds = { b1: read('--ds-background-100'), b2: read('--ds-background-200') };
    probe.remove();
  }

  function rgbToHex(value: string): string {
    const match = value.match(/^rgba?\(([^)]+)\)$/i);
    if (!match) return value;
    const [r, g, b] = match[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    const hex = (n: number): string => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
    return `#${hex(r)}${hex(g)}${hex(b)}`;
  }

  /** 复制色值，成功后色块上盖一层「已复制」，同时用 aria-live 播报。 */
  async function copy(value: string, key: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const area = document.createElement('textarea');
      area.value = value;
      area.setAttribute('readonly', '');
      area.style.cssText = 'position:fixed;left:-9999px;top:0;';
      document.body.appendChild(area);
      area.select();
      try {
        document.execCommand('copy');
      } catch {
        /* 复制失败就只给视觉提示，不阻断演示 */
      }
      area.remove();
    }
    copiedKey = key;
    copiedValue = value;
    if (copyTimer) clearTimeout(copyTimer);
    copyTimer = setTimeout(() => {
      copiedKey = '';
      copyTimer = null;
    }, 1400);
  }

  /** 标签页的键盘导航：左右方向键循环，Home / End 跳到首尾。 */
  function onTabKeydown(event: KeyboardEvent, index: number): void {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    let next = index;
    if (event.key === 'ArrowLeft') next = (index + TABS.length - 1) % TABS.length;
    else if (event.key === 'ArrowRight') next = (index + 1) % TABS.length;
    else if (event.key === 'Home') next = 0;
    else next = TABS.length - 1;
    tab = TABS[next].id;
    tabRefs[next]?.focus();
  }
</script>

<div class="gf-root" data-theme={localTheme}>
  <div class="geist-demo snapshot-root" bind:this={demoEl}>
    <div class="gf-toolbar">
      <div class="gf-toolbar-title">
        <span class="gf-toolbar-label">色彩系统</span>
        <span class="gf-toolbar-zh">10 组色阶，每组 10 档，背景色单独放在“背景”页；点色块复制当前主题色值</span>
      </div>
      <div class="gf-toolbar-right">
        <span class="gf-value-mode">{localTheme === 'light' ? '亮色值' : '暗色值'}</span>
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
      <div class="gf-state"><span class="gf-spinner"></span>色彩数据加载中</div>
    {:else if status === 'error'}
      <div class="gf-state gf-state--error">色彩数据加载失败，请刷新后重试。</div>
    {:else if data}
      <div class="gf-palette">
        <div class="gf-tabs" role="tablist" aria-label="色彩演示分组">
          {#each TABS as item, index (item.id)}
            <button
              type="button"
              role="tab"
              id={`gf-palette-tab-${item.id}`}
              class="gf-tab"
              aria-selected={tab === item.id}
              aria-controls={`gf-palette-panel-${item.id}`}
              tabindex={tab === item.id ? 0 : -1}
              bind:this={tabRefs[index]}
              onclick={() => (tab = item.id)}
              onkeydown={(event) => onTabKeydown(event, index)}
            >{item.label}</button>
          {/each}
        </div>

        {#if tab === 'scales'}
          <div class="gf-panel" role="tabpanel" id="gf-palette-panel-scales" aria-labelledby="gf-palette-tab-scales">
            <div class="gf-scales">
              {#each data.scales as scale (scale.key)}
                <div class="gf-scale">
                  <div class="gf-scale-label">
                    <span class="gf-scale-name">{scale.name}</span>
                    <span class="gf-scale-zh">{scale.nameZh}</span>
                  </div>
                  <div class="gf-swatches">
                    {#each scale.steps as step (step.token)}
                      {@const value = valueOf(step.light, step.dark)}
                      <button
                        type="button"
                        class="gf-swatch"
                        class:gf-swatch--alpha={scale.key === 'gray-alpha'}
                        style:--gf-swatch={value}
                        title={`${step.token} · 复制 ${value}`}
                        aria-label={`复制 ${scale.name} ${step.step} 的色值 ${value}`}
                        onclick={() => copy(value, step.token)}
                      >
                        <span class="gf-swatch-color"></span>
                        <span class="gf-swatch-meta">
                          <span class="gf-swatch-line">
                            <span class="gf-swatch-step">{step.step}</span>
                            <span class="gf-swatch-hex">{value}</span>
                          </span>
                          <span class="gf-swatch-token" title={step.token}>{step.token}</span>
                        </span>
                        {#if copiedKey === step.token}
                          <span class="gf-copied">已复制</span>
                        {/if}
                      </button>
                    {/each}
                  </div>
                </div>
              {/each}
            </div>
            <p class="gf-note gf-scales-note">
              灰用于文本、图标、填充、边框和分隔线；带透明度的灰只在需要透出下层背景时使用，比如阴影和浮层。
            </p>
          </div>
        {/if}

        {#if tab === 'semantic'}
          <div class="gf-panel" role="tabpanel" id="gf-palette-panel-semantic" aria-labelledby="gf-palette-tab-semantic">
            {#each SEMANTIC_GROUPS as group (group.title)}
              <section class="gf-sem-group">
                <h3 class="gf-sem-group-title">{group.title}</h3>
                <p class="gf-sem-group-desc">{group.desc}</p>
                <div class="gf-sem-grid">
                  {#each group.ids as id (id)}
                    {@const item = data.semantic.find((color) => color.id === id)}
                    {#if item}
                      {@const value = valueOf(item.light, item.dark)}
                      <button
                        type="button"
                        class="gf-sem-card"
                        style:--gf-swatch={value}
                        title={`复制 ${value}`}
                        aria-label={`复制 ${item.label} 的色值 ${value}`}
                        onclick={() => copy(value, item.id)}
                      >
                        <span class="gf-sem-color"></span>
                        <span class="gf-sem-name">{item.label}</span>
                        <span class="gf-sem-usage">{SEMANTIC_USAGE[item.id] ?? ''}</span>
                        <span class="gf-sem-token">{item.token}</span>
                        <span class="gf-sem-value">{value}</span>
                        {#if copiedKey === item.id}
                          <span class="gf-copied gf-copied--sem">已复制</span>
                        {/if}
                      </button>
                    {/if}
                  {/each}
                </div>
              </section>
            {/each}
          </div>
        {/if}

        {#if tab === 'background'}
          <div class="gf-panel" role="tabpanel" id="gf-palette-panel-background" aria-labelledby="gf-palette-tab-background">
            <p class="gf-note gf-bg-note">
              页面和 UI 组件有两种背景色。绝大多数情况都该用 Background 1，尤其是要在背景上再叠颜色的时候。Background 2 留给大容器做次级背景。
            </p>
            <div class="gf-bg-grid">
              <div class="gf-bg-card">
                <div class="gf-bg-preview gf-bg-preview--1">
                  <span class="gf-bg-badge">1</span>
                  <span class="gf-bg-sample gf-bg-sample--1">默认元素背景</span>
                </div>
                <div class="gf-bg-meta">
                  <span class="gf-bg-name">Background 1</span>
                  <span class="gf-bg-zh">元素的默认背景</span>
                  <code class="gf-bg-value">{backgrounds.b1}</code>
                </div>
              </div>
              <div class="gf-bg-card">
                <div class="gf-bg-preview gf-bg-preview--2">
                  <span class="gf-bg-badge">2</span>
                  <span class="gf-bg-sample gf-bg-sample--2">次级背景</span>
                </div>
                <div class="gf-bg-meta">
                  <span class="gf-bg-name">Background 2</span>
                  <span class="gf-bg-zh">大容器的次级背景</span>
                  <code class="gf-bg-value">{backgrounds.b2}</code>
                </div>
              </div>
            </div>
          </div>
        {/if}
      </div>
    {/if}

    <span class="gf-sr-only" aria-live="polite">{copiedKey ? `已复制 ${copiedValue}` : ''}</span>
  </div>
</div>
