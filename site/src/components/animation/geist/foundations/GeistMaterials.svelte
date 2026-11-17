<script lang="ts">
  /**
   * Geist 材质演示。
   *
   * 八个预设按 Surface（位于页面上）和 Floating（浮在页面之上）两档，摆在一块带彩色渐变的背景板上，
   * 每张卡用真实的 --ds-shadow-* 阴影和对应圆角，层级差别才看得出来。
   * 类名和中文用法来自 materials.json，译文参考 _scratch/geist/zh/materials.md。
   */
  import { onMount } from 'svelte';

  import { loadGeistJson } from '../data';

  import '../base.css';
  import '../utilities.css';
  import './common.css';
  import './materials.css';

  interface MaterialItem {
    name: string;
    class: string;
    usage: string;
    usageZh: string;
  }

  interface MaterialData {
    materials: MaterialItem[];
  }

  type Theme = 'light' | 'dark';
  type Status = 'loading' | 'ready' | 'error';

  /**
   * 类名到阴影令牌和圆角的映射，取值规则来自原站 Material 页：
   * Surface 四个由 base 到 large 依次增强，Floating 四个从 tooltip 到 fullscreen 依次抬高。
   */
  const MATERIAL_META: Record<string, { shadow: string; radius: number; group: 'surface' | 'floating' }> = {
    'material-base': { shadow: 'var(--ds-shadow-border)', radius: 6, group: 'surface' },
    'material-small': { shadow: 'var(--ds-shadow-border-small)', radius: 6, group: 'surface' },
    'material-medium': { shadow: 'var(--ds-shadow-border-medium)', radius: 12, group: 'surface' },
    'material-large': { shadow: 'var(--ds-shadow-border-large)', radius: 12, group: 'surface' },
    'material-tooltip': { shadow: 'var(--ds-shadow-tooltip)', radius: 6, group: 'floating' },
    'material-menu': { shadow: 'var(--ds-shadow-menu)', radius: 12, group: 'floating' },
    'material-modal': { shadow: 'var(--ds-shadow-modal)', radius: 12, group: 'floating' },
    'material-fullscreen': { shadow: 'var(--ds-shadow-fullscreen)', radius: 16, group: 'floating' },
  };

  const FALLBACK_META = { shadow: 'var(--ds-shadow-border)', radius: 6, group: 'surface' as const };

  let { config = {} }: { config?: Record<string, unknown> } = $props();
  // 目前没有配置项；在 effect 里读一下，既保留后续扩展的口子，也避开 state_referenced_locally 警告
  $effect(() => {
    void config;
  });

  let localTheme: Theme = $state('light');
  let status: Status = $state('loading');
  let data: MaterialData | null = $state(null);
  let surface: MaterialItem[] = $state([]);
  let floating: MaterialItem[] = $state([]);

  let destroyed = false;

  onMount(() => {
    localTheme = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
    void load();
    return () => {
      destroyed = true;
    };
  });

  async function load(): Promise<void> {
    try {
      data = await loadGeistJson<MaterialData>('/data/geist/foundations/materials.json');
      if (destroyed) return;
      surface = data.materials.filter((item) => (MATERIAL_META[item.class]?.group ?? 'surface') === 'surface');
      floating = data.materials.filter((item) => MATERIAL_META[item.class]?.group === 'floating');
      status = 'ready';
    } catch {
      if (!destroyed) status = 'error';
    }
  }

  function setTheme(theme: Theme): void {
    localTheme = theme;
  }

  function metaOf(item: MaterialItem): { shadow: string; radius: number } {
    return MATERIAL_META[item.class] ?? FALLBACK_META;
  }

  /** 类名去掉 material- 前缀，只用来在卡片角上做个小标记。 */
  function shortName(item: MaterialItem): string {
    return item.name.replace(/^Material\s+/, '');
  }
</script>

<div class="gf-root" data-theme={localTheme}>
  <div class="geist-demo snapshot-root">
    <div class="gf-toolbar">
      <div class="gf-toolbar-title">
        <span class="gf-toolbar-label">材质</span>
        <span class="gf-toolbar-zh">圆角、填充、描边和阴影的预设组合；彩色背景板能看出层级差别</span>
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
      <div class="gf-state"><span class="gf-spinner"></span>材质数据加载中</div>
    {:else if status === 'error'}
      <div class="gf-state gf-state--error">材质数据加载失败，请刷新后重试。</div>
    {:else if data}
      <div class="gf-materials">
        <div class="gf-mat-board">
          <section class="gf-mat-section">
            <div class="gf-mat-section-head">
              <h3 class="gf-mat-section-title">Surface<span class="gf-mat-section-zh">位于页面上</span></h3>
              <p class="gf-mat-section-desc">页面里静止的表面，从日常卡片到抬起的内容。</p>
            </div>
            <div class="gf-mat-grid">
              {#each surface as item (item.class)}
                {@const meta = metaOf(item)}
                <div
                  class="gf-mat-card"
                  data-material={item.class}
                  style:box-shadow={meta.shadow}
                  style:border-radius={`${meta.radius}px`}
                >
                  <span class="gf-mat-card-top">
                    <span class="gf-mat-name">{shortName(item)}</span>
                    <code class="gf-mat-class">{item.class}</code>
                  </span>
                  <span class="gf-mat-usage">{item.usageZh}</span>
                  <span class="gf-mat-meta">圆角 {meta.radius}px</span>
                </div>
              {/each}
            </div>
          </section>

          <section class="gf-mat-section gf-mat-section--floating">
            <div class="gf-mat-section-head">
              <h3 class="gf-mat-section-title">Floating<span class="gf-mat-section-zh">浮在页面之上</span></h3>
              <p class="gf-mat-section-desc">离开页面表面的浮层，阴影一层比一层远。</p>
            </div>
            <div class="gf-mat-grid">
              {#each floating as item (item.class)}
                {@const meta = metaOf(item)}
                <div
                  class="gf-mat-card"
                  data-material={item.class}
                  style:box-shadow={meta.shadow}
                  style:border-radius={`${meta.radius}px`}
                >
                  <span class="gf-mat-card-top">
                    <span class="gf-mat-name">{shortName(item)}</span>
                    <code class="gf-mat-class">{item.class}</code>
                  </span>
                  <span class="gf-mat-usage">{item.usageZh}</span>
                  <span class="gf-mat-meta">圆角 {meta.radius}px</span>
                </div>
              {/each}
            </div>
          </section>
        </div>

        <p class="gf-note gf-mat-note">
          不要在同一个元素上叠两个 Material：子元素如果需要更高的层级，就让子元素自己套一个类型更高的 Material。
        </p>
      </div>
    {/if}
  </div>
</div>
