<script lang="ts">
  /**
   * 标签页：概览、部署记录、访问分析三个面板。
   *
   * 原站 Tabs 的默认样式是下划线式：选中项文字变深、底下一条 2px 的横线。
   * 交互按 ARIA tablist 写：左右方向键切换，Home 和 End 跳到首尾，焦点跟随选中项。
   */
  import { tick } from 'svelte';
  import './interactive.css';

  let { config = {} }: { config?: Record<string, unknown> } = $props();
  $effect(() => {
    void config;
  });

  const TABS = [
    {
      id: 'overview',
      label: 'Overview',
      text: '概览面板：最近一次部署成功，构建耗时 42 秒，边缘网络已经同步到 18 个区域。',
    },
    {
      id: 'deployments',
      label: 'Deployments',
      text: '部署面板：本周一共触发 12 次部署，其中 11 次成功，1 次因为类型检查失败被回滚。',
    },
    {
      id: 'analytics',
      label: 'Analytics',
      text: '分析面板：过去 7 天访问量 24.6k，主要来源是文档站和仓库首页。',
    },
  ];

  const uid = $props.id();
  let active = $state(0);
  let tablistEl = $state<HTMLDivElement>();

  async function onKeydown(event: KeyboardEvent) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const last = TABS.length - 1;
    let next =
      event.key === 'ArrowLeft'
        ? active - 1
        : event.key === 'ArrowRight'
          ? active + 1
          : event.key === 'Home'
            ? 0
            : last;
    if (next < 0) next = last;
    if (next > last) next = 0;
    active = next;
    await tick();
    tablistEl?.querySelector<HTMLButtonElement>(`[data-tab="${next}"]`)?.focus();
  }
</script>

<div class="gi-demo">
  <div
    bind:this={tablistEl}
    class="gi-tabs"
    role="tablist"
    tabindex="-1"
    aria-label="项目视图"
    onkeydown={onKeydown}
  >
    {#each TABS as tab, index (tab.id)}
      <button
        type="button"
        class="gi-tab"
        role="tab"
        id={`gi-${uid}-tab-${tab.id}`}
        data-tab={index}
        aria-selected={active === index}
        aria-controls={`gi-${uid}-panel-${tab.id}`}
        tabindex={active === index ? 0 : -1}
        onclick={() => (active = index)}
      >
        {tab.label}
      </button>
    {/each}
  </div>

  {#each TABS as tab, index (tab.id)}
    <div
      class="gi-tab-panel"
      role="tabpanel"
      id={`gi-${uid}-panel-${tab.id}`}
      aria-labelledby={`gi-${uid}-tab-${tab.id}`}
      tabindex="0"
      hidden={active !== index}
    >
      <p>{tab.text}</p>
    </div>
  {/each}

  <p class="gi-hint">点击标签切换面板，聚焦标签后可以用左右方向键切换，Home 和 End 跳到首尾。</p>
</div>
