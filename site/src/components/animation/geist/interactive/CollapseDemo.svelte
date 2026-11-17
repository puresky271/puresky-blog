<script lang="ts">
  /**
   * 折叠面板：点击标题展开或收起，内容高度用 grid-template-rows 从 0fr 过渡到 1fr。
   *
   * 标题是原生 button，带 aria-expanded 和 aria-controls；
   * 收起时内容仍留在 DOM 里，只是高度为 0，方便做动画和页内查找。
   */
  import GiIcon from './GiIcon.svelte';
  import './interactive.css';

  let { config = {} }: { config?: Record<string, unknown> } = $props();
  $effect(() => {
    void config;
  });

  const uid = $props.id();

  const ITEMS = [
    {
      id: 'spacing',
      title: 'Geist 的间距是怎么分级的？',
      body: '间距按 4px 的倍数分档，组件内部常用 8px 和 12px，区块之间用 24px，页面留白用 32px 到 40px。',
    },
    {
      id: 'theme',
      title: '做暗色主题要另写一套颜色吗？',
      body: '不用。灰阶、背景和阴影令牌在暗色下整体翻转，组件只要引用 --ds-* 变量就会自动跟着切换。',
    },
    {
      id: 'focus',
      title: '为什么焦点环要用 box-shadow？',
      body: 'box-shadow 不占布局空间，圆角控件上也不会像 outline 那样画出直角框，--ds-focus-ring 就是两层影子叠出来的。',
    },
  ];

  let openIds = $state<string[]>(['spacing']);

  function toggle(id: string) {
    openIds = openIds.includes(id) ? openIds.filter((item) => item !== id) : [...openIds, id];
  }
</script>

<div class="gi-demo">
  <div class="gi-collapse">
    {#each ITEMS as item (item.id)}
      <div class="gi-collapse-item">
        <button
          type="button"
          class="gi-collapse-head"
          aria-expanded={openIds.includes(item.id)}
          aria-controls={`gi-${uid}-${item.id}`}
          onclick={() => toggle(item.id)}
        >
          {item.title}
          <span class="gi-collapse-chevron" aria-hidden="true"><GiIcon name="chevron-right" /></span>
        </button>
        <div
          id={`gi-${uid}-${item.id}`}
          class="gi-collapse-body {openIds.includes(item.id) ? 'gi-collapse-body--open' : ''}"
          aria-hidden={!openIds.includes(item.id)}
        >
          <div class="gi-collapse-inner">
            <p class="gi-collapse-text">{item.body}</p>
          </div>
        </div>
      </div>
    {/each}
  </div>

  <p class="gi-hint">点标题展开或收起对应内容，箭头会转 90 度，内容高度是平滑过渡的。</p>
</div>
