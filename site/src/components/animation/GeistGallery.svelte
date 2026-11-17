<script lang="ts">
  /**
   * Geist 组件画廊：把 public/data/geist/<group>.json 里的原站示例快照渲染成卡片。
   *
   * 数据是原站演示区的静态快照，一个分组一个 JSON。挂载后先等着进视口（提前 300px），
   * 再取这一组的 JSON，所以一篇文章里七个画廊不会在进页面时一起发请求。
   *
   * 快照里的按钮还原成了普通 HTML，原站的悬浮 / 按下 / 聚焦样式靠 React Aria 挂在元素上的
   * data-hover / data-pressed / data-focus 属性切换；空示例过滤、自闭合标签展开、懒加载、
   * 可交互版本挂载这些通用逻辑都在 @/lib/snapshot 里，别的文章复刻外部站点时可以直接复用。
   *
   * 注册表里登记过的组件（site/src/components/animation/geist/interactive/registry.ts），
   * 会在静态示例后面再挂一张「可交互版本」小节；注册表为空时整段安静跳过。
   */
  import { onMount, tick } from 'svelte';

  import {
    fetchSnapshotJson,
    filterRenderableSections,
    fixSnapshotMedia,
    loadSnapshotJson,
    mountInteractiveComponents,
    normalizeSnapshotHtml,
    setupSnapshotInteractions,
    whenInViewport,
    type SnapshotComponent,
    type SnapshotGroupData,
    type SnapshotSection,
  } from '@/lib/snapshot';

  import { INTERACTIVE, type GeistInteractiveProps } from './geist/interactive/registry';

  import './geist/base.css';
  import './geist/utilities.css';
  import './geist/gallery.css';

  /** 渲染用视图：sections 已滤掉空示例，hollow 表示整张卡没有可展示的静态示例。 */
  interface GeistComponentView extends SnapshotComponent {
    hollow: boolean;
  }

  type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

  const GROUPS = new Set(['actions', 'inputs', 'choices', 'data', 'feedback', 'overlays', 'containers']);

  /** 原站部分示例是 React Suspense 占位，静态快照里只剩空壳，整张卡只剩一行说明。 */
  const EMPTY_COMPONENT_HINT =
    '这个示例依赖客户端运行时，静态快照里是空的；可以到原站看实际效果。';

  let { config = {} }: { config?: Record<string, unknown> } = $props();

  const group = $derived(
    typeof config.group === 'string' && GROUPS.has(config.group) ? config.group : 'actions'
  );

  let rootEl: HTMLDivElement | undefined = $state();
  let status: LoadStatus = $state('idle');
  let components: GeistComponentView[] = $state.raw([]);

  /** 本次加载的序号，分组重载或组件卸载后丢弃过期结果。 */
  let loadVersion = 0;
  let destroyed = false;

  /** 已挂载可交互组件的清理函数，卸载组件时统一调用。 */
  let disposeInteractives: (() => void) | undefined;

  async function renderGroup(data: SnapshotGroupData): Promise<void> {
    const element = rootEl;
    if (!element) return;

    const list = Array.isArray(data.components) ? data.components : [];
    components = list
      .filter((item) => item && typeof item.slug === 'string')
      .map((item) => {
        const sections: SnapshotSection[] = (Array.isArray(item.sections) ? item.sections : [])
          .map((section) => ({
            ...section,
            heading: String(section.heading ?? ''),
            headingZh: String(section.headingZh ?? ''),
            html: normalizeSnapshotHtml(String(section.html ?? '')),
          }));
        const renderable = filterRenderableSections(sections, element, 'geist-card-body');
        return {
          ...item,
          title: String(item.title ?? item.slug),
          titleZh: String(item.titleZh ?? ''),
          sections: renderable,
          hollow: renderable.length === 0,
        };
      });
    status = 'ready';

    await tick();
    if (destroyed || !element.isConnected) return;

    fixSnapshotMedia(element, '/media/geist/');
    disposeInteractives?.();
    disposeInteractives = await mountInteractiveComponents(element, {
      attribute: 'geist-interactive',
      registry: INTERACTIVE as Record<
        string,
        () => Promise<import('svelte').Component<GeistInteractiveProps>>
      >,
      afterMount: (target) => fixSnapshotMedia(target, '/media/geist/'),
    });
  }

  async function loadGroup(force = false): Promise<void> {
    const version = ++loadVersion;
    status = 'loading';
    const path = `/data/geist/${group}.json`;

    try {
      const data = force
        ? await fetchSnapshotJson<SnapshotGroupData>(path)
        : await loadSnapshotJson<SnapshotGroupData>(path);
      if (version !== loadVersion || destroyed) return;
      await renderGroup(data);
    } catch {
      if (version !== loadVersion || destroyed) return;
      components = [];
      status = 'error';
    }
  }

  onMount(() => {
    destroyed = false;
    const element = rootEl;
    if (!element) return;

    const stopInteractions = setupSnapshotInteractions(element);
    const stopObserving = whenInViewport(element, () => void loadGroup());

    return () => {
      destroyed = true;
      stopObserving();
      stopInteractions();
      disposeInteractives?.();
      disposeInteractives = undefined;
    };
  });
</script>

<div
  class="geist-demo geist-gallery snapshot-root"
  bind:this={rootEl}
  role="region"
  aria-label="Geist 组件示例"
  aria-busy={status === 'loading'}
>
  {#if status === 'error'}
    <button class="geist-gallery-retry" type="button" onclick={() => void loadGroup(true)}>
      示例加载失败，点击重试
    </button>
  {:else if status !== 'ready'}
    <p class="geist-gallery-state">示例加载中…</p>
  {:else}
    {#each components as component (component.slug)}
      <article class="geist-card" id={`geist-${component.slug}`}>
        <div class="geist-card-head">
          <div class="geist-card-title">{component.title}</div>
          <div class="geist-card-zh">{component.titleZh}</div>
          <div class="geist-card-note">
            {#if component.sections.length > 0}
              {component.sections.length} 个示例
            {:else if component.slug in INTERACTIVE}
              可交互复刻
            {:else}
              快照为空
            {/if}
          </div>
        </div>

        {#each component.sections as section, index (index)}
          <div class="geist-card-subhead geist-gallery-subhead">
            <span class="geist-gallery-subhead-zh">{section.headingZh || section.heading}</span>
            {#if section.headingZh && section.heading}
              <span class="geist-gallery-subhead-en">{section.heading}</span>
            {/if}
          </div>
          <div class="geist-card-body">
            {@html section.html}
          </div>
        {/each}

        {#if component.hollow && !(component.slug in INTERACTIVE)}
          <div class="geist-card-body geist-card-body--plain">
            <p class="geist-gallery-empty">{EMPTY_COMPONENT_HINT}</p>
          </div>
        {/if}

        {#if component.slug in INTERACTIVE}
          <div class="geist-card-subhead geist-gallery-subhead">
            <span class="geist-gallery-subhead-zh">可交互版本</span>
            <span class="geist-gallery-subhead-en">Interactive</span>
          </div>
          <div
            class="geist-card-body geist-card-body--plain geist-gallery-interactive"
            data-geist-interactive={component.slug}
          >
            可交互版本加载中…
          </div>
        {/if}
      </article>
    {/each}
  {/if}
</div>
