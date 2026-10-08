<script lang="ts">
  /**
   * ContributionGraph.svelte — GitHub 贡献热力图。
   *
   * 格子固定尺寸，放不下时横向滚动，并在挂载时滚到最右（最近的一周），
   * 这样窄屏上默认看到的是最近的活动，而不是一年前。
   * 371 个格子不各自可聚焦（那会多出 371 个 Tab 停靠点），整体用 aria-label 给出摘要。
   */
  import { onMount } from 'svelte';

  import type { ContributionCalendar } from '@shared/github';

  let { calendar, cell = 11, gap = 3 }: { calendar: ContributionCalendar; cell?: number; gap?: number } = $props();

  let scroller = $state<HTMLDivElement>();
  let wrap = $state<HTMLDivElement>();
  let tip = $state<{ text: string; x: number; y: number } | null>(null);

  const dayFormat = new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'short', timeZone: 'UTC' });

  const cells = $derived(
    calendar.weeks.flatMap((week, w) =>
      week.map((day) => ({
        ...day,
        col: w + 2,
        row: new Date(`${day.date}T00:00:00Z`).getUTCDay() + 2,
      }))
    )
  );

  // 月份标签：某周的第一天换月时打一个，和上一个标签至少隔 3 周，避免挤在一起。
  const months = $derived.by(() => {
    const labels: { col: number; text: string }[] = [];
    let lastMonth = -1;
    let lastCol = -10;
    calendar.weeks.forEach((week, w) => {
      const first = week[0];
      if (!first) return;
      const month = Number(first.date.slice(5, 7));
      if (month !== lastMonth) {
        if (w - lastCol >= 3) {
          labels.push({ col: w + 2, text: `${month}月` });
          lastCol = w;
        }
        lastMonth = month;
      }
    });
    return labels;
  });

  const summary = $derived.by(() => {
    const busiest = cells.reduce((best, c) => (c.count > best.count ? c : best), cells[0] ?? { count: 0, date: '' });
    const base = `过去一年共 ${calendar.total} 次贡献`;
    return busiest?.count ? `${base}，最多的一天是 ${dayFormat.format(new Date(`${busiest.date}T00:00:00Z`))}，${busiest.count} 次` : base;
  });

  onMount(() => {
    if (scroller) scroller.scrollLeft = scroller.scrollWidth;
  });

  function onOver(event: PointerEvent) {
    const target = event.target as HTMLElement;
    const date = target.dataset.date;
    if (!date || !wrap) {
      tip = null;
      return;
    }
    const count = Number(target.dataset.count);
    const rect = target.getBoundingClientRect();
    const host = wrap.getBoundingClientRect();
    tip = {
      text: `${count > 0 ? `${count} 次贡献` : '没有贡献'} · ${dayFormat.format(new Date(`${date}T00:00:00Z`))}`,
      x: rect.left - host.left + rect.width / 2,
      y: rect.top - host.top,
    };
  }
</script>

<div class="graph" bind:this={wrap} style="--cell: {cell}px; --gap: {gap}px">
  <div class="scroller" bind:this={scroller}>
    <div
      class="inner"
      style="grid-template-columns: 1.6em repeat({calendar.weeks.length}, var(--cell))"
      role="img"
      aria-label={summary}
      onpointerover={onOver}
      onpointerleave={() => (tip = null)}
    >
      {#each months as m}
        <span class="month" style="grid-column: {m.col} / span 3" aria-hidden="true">{m.text}</span>
      {/each}
      <span class="weekday" style="grid-row: 3" aria-hidden="true">一</span>
      <span class="weekday" style="grid-row: 5" aria-hidden="true">三</span>
      <span class="weekday" style="grid-row: 7" aria-hidden="true">五</span>
      {#each cells as c (c.date)}
        <i
          style="grid-column: {c.col}; grid-row: {c.row}"
          data-level={c.level}
          data-date={c.date}
          data-count={c.count}
          aria-hidden="true"
        ></i>
      {/each}
    </div>
  </div>

  <div class="legend" aria-hidden="true">
    <span>少</span>
    {#each [0, 1, 2, 3, 4] as level}<i data-level={level}></i>{/each}
    <span>多</span>
  </div>

  {#if tip}
    <div class="tip" style="left: {tip.x}px; top: {tip.y}px" role="tooltip">{tip.text}</div>
  {/if}
</div>

<style>
  .graph {
    position: relative;
  }
  .scroller {
    overflow-x: auto;
    scrollbar-width: none;
    /* 左右边缘淡出，暗示可以横向滚动。 */
    mask-image: linear-gradient(to right, transparent, black 1.25rem, black calc(100% - 0.5rem), transparent);
  }
  .scroller::-webkit-scrollbar {
    display: none;
  }
  .inner {
    display: grid;
    grid-template-rows: 1.2em repeat(7, var(--cell));
    gap: var(--gap);
    width: max-content;
    padding-inline: 0.25rem 0.5rem;
  }
  .month {
    grid-row: 1;
    font-size: 0.6875rem;
    line-height: 1;
    color: var(--fg-subtle);
    white-space: nowrap;
  }
  .weekday {
    grid-column: 1;
    font-size: 0.625rem;
    line-height: var(--cell);
    color: var(--fg-subtle);
  }
  i {
    display: block;
    width: var(--cell);
    height: var(--cell);
    border-radius: 3px;
    background: var(--heat-0);
    outline: 1px solid color-mix(in oklab, var(--fg) 4%, transparent);
    outline-offset: -1px;
    transition: transform 120ms ease;
  }
  .inner i:hover {
    transform: scale(1.3);
    outline-color: color-mix(in oklab, var(--fg) 30%, transparent);
  }
  i[data-level='1'] {
    background: var(--heat-1);
  }
  i[data-level='2'] {
    background: var(--heat-2);
  }
  i[data-level='3'] {
    background: var(--heat-3);
  }
  i[data-level='4'] {
    background: var(--heat-4);
  }

  .legend {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 3px;
    margin-top: 0.6rem;
    font-size: 0.6875rem;
    color: var(--fg-subtle);
  }
  .legend i {
    width: 10px;
    height: 10px;
  }
  .legend span:first-child {
    margin-right: 3px;
  }
  .legend span:last-child {
    margin-left: 3px;
  }

  .tip {
    position: absolute;
    z-index: var(--z-raised);
    padding: 0.35rem 0.55rem;
    border-radius: 7px;
    background: var(--fg);
    color: var(--bg);
    font-size: 0.75rem;
    white-space: nowrap;
    pointer-events: none;
    transform: translate(-50%, calc(-100% - 6px));
  }
</style>
