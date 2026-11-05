<script lang="ts">
  /**
   * BiGym 2.0 榜单：复刻原站 #board 顶部的条形图。
   *
   * 原站是三套视图（20 tasks / 9 core / 11 extended）各一份图表，靠顶部分段控件切换，
   * 点击时把当前视图的条形图、任务盘和成本散点一起换掉。这里只做图表这一块：
   * 三套数据都在 board-bars.json 里，切换时换 --n 和条形。
   *
   * 条高是原站算好的百分比（相对坐标轴上限），不是成功率本身：9 core 视图里上限 100%，
   * 20 tasks / 11 extended 视图上限 60%，所以 51.9% 的条形高度是 86.5%。这里直接用原站值，
   * 不重算，免得和原站表格对不上。
   */

  import { onMount } from 'svelte';

  import { loadJson, styleValue, type BoardData, type ViewId } from './bigym/data';
  import './bigym/base.css';

  let { config = {} }: { config?: Record<string, unknown> } = $props();
  $effect(() => { void config; });

  import './bigym/board.css';

  let data = $state<BoardData | null>(null);
  let logos = $state<Record<string, string>>({});
  let view = $state<ViewId>('core');
  let error = $state('');

  onMount(async () => {
    try {
      const [board, marks] = await Promise.all([
        loadJson<BoardData>('data/bigym2/board-bars.json'),
        loadJson<Record<string, string>>('data/bigym2/logos.json'),
      ]);
      data = board;
      logos = marks;
      const pressed = board.sets.find((set) => set.pressed === 'true');
      if (pressed) view = pressed.id;
    } catch {
      error = '榜单加载失败，请刷新页面重试。';
    }
  });

  const current = $derived(data ? data.views[view] : null);
  const which = $derived(data?.sets.find((set) => set.id === view)?.lede ?? '');

  /** 原站的 --c 用的是它自己的变量名，站内加 bm- 前缀。 */
  function colorOf(style: string | undefined): string {
    return styleValue(style, '--c')
      .replace(/var\(--series-/g, 'var(--bm-series-')
      .replace(/var\(--bar\)/g, 'var(--bm-bar)');
  }

  function heightOf(style: string | undefined): string {
    return styleValue(style, '--h');
  }

  function bottomOf(style: string | undefined): string {
    return styleValue(style, 'bottom') || '0%';
  }

  /** 原站把模型图标直接内联在 names 列里，这里照抄它的 SVG。 */
  function logoOf(text: string): string {
    return logos[text] ?? '';
  }
</script>

<div class="bm-demo bm-board">
  {#if error}
    <p class="bm-error">{error}</p>
  {:else if !data || !current}
    <p class="bm-loading">榜单加载中。</p>
  {:else}
    <header class="bm-board-head">
      <div>
        <p class="bm-board-lede">
          Mean success over <span class="bm-which">{which}</span>, 3 independent sessions per task,
          100 hidden episodes per final program. <span class="bm-upd">{data.updated ?? ''}</span>
        </p>
      </div>
      <div class="bm-seg" role="group" aria-label="Task set">
        {#each data.sets as set (set.id)}
          <button type="button" aria-pressed={view === set.id} onclick={() => { view = set.id; }}>
            {set.label}
          </button>
        {/each}
      </div>
    </header>

    <div class="bm-chart-scroll">
      <div class="bm-chart" style={`--n:${current.bars.length}`}>
        <div class="bm-plot">
          {#each current.ticks as tick, index (index)}
            <span class="bm-gl" style={`bottom:${bottomOf(tick.bottom)}`}><i>{tick.label}</i></span>
          {/each}
          <div class="bm-cols">
            {#each current.bars as bar, index (index)}
              <button
                type="button"
                class="bm-col"
                class:bm-short={bar.short}
                data-s={bar.key}
                aria-label={bar.aria}
                style={`--c:${colorOf(bar.style)};--h:${heightOf(bar.style)}`}
              >
                <span class="bm-tip"><b>{bar.name}</b><span>{bar.kind}</span></span>
                <span class="bm-bar"><b class="bm-val">{bar.value}</b></span>
              </button>
            {/each}
          </div>
        </div>
        <div class="bm-names" style={`--n:${current.names.length}`}>
          {#each current.names as name, index (index)}
            <div class="bm-nm">
              {#if name.logo}
                <span class="bm-logo">{@html logoOf(name.text)}</span>
              {/if}
              <b>{#each name.lines as line, lineIndex (lineIndex)}{line}{#if lineIndex < name.lines.length - 1}<br />{/if}{/each}</b>
              {#if name.effort}
                <span class="bm-eff" style={`--c:${colorOf(name.color)}`}>{name.effort}</span>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    </div>

    {#if current.leftNote}
      <p class="bm-left">{current.leftNote}</p>
    {/if}
  {/if}
</div>
