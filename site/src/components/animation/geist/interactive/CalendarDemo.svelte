<script lang="ts">
  /**
   * 日历：一个月视图，标题行显示「11 月 2026」和上一月、下一月按钮，
   * 下面星期表头和 6 行日期格子。点日期选中，今天用主色描边，选中项主色填充。
   *
   * 原站的 Calendar 平时收在「Select Date Range」弹层里，静态快照是空的；
   * 这里按同一套尺寸和圆角手写一个常驻的月视图，交互按日期选择器的惯例写：
   * 方向键在日期间移动焦点，Enter 或空格选中，PageUp 和 PageDown 翻月。
   */
  import { tick } from 'svelte';
  import GiIcon from './GiIcon.svelte';
  import './interactive.css';

  let { config = {} }: { config?: Record<string, unknown> } = $props();
  $effect(() => {
    void config;
  });

  interface DayCell {
    date: Date;
    key: string;
  }

  const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];
  const now = new Date();

  function dateKey(date: Date) {
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  }

  function daysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate();
  }

  const todayKey = dateKey(now);

  let viewYear = $state(now.getFullYear());
  let viewMonth = $state(now.getMonth());
  let selectedDate = $state(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
  let focusDate = $state(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
  let gridEl = $state<HTMLDivElement>();

  const selectedKey = $derived(dateKey(selectedDate));
  const focusKey = $derived(dateKey(focusDate));

  const cells = $derived.by(() => {
    const offset = new Date(viewYear, viewMonth, 1).getDay();
    const total = daysInMonth(viewYear, viewMonth);
    const list: (DayCell | null)[] = [];
    for (let index = 0; index < offset; index += 1) list.push(null);
    for (let day = 1; day <= total; day += 1) {
      const date = new Date(viewYear, viewMonth, day);
      list.push({ date, key: dateKey(date) });
    }
    /* 固定补到 6 行，翻月时卡片高度不跳 */
    while (list.length < 42) list.push(null);
    return list;
  });

  function addDays(date: Date, delta: number) {
    const next = new Date(date);
    next.setDate(next.getDate() + delta);
    return next;
  }

  function formatDate(date: Date) {
    return `${date.getFullYear()} 年 ${date.getMonth() + 1} 月 ${date.getDate()} 日`;
  }

  async function focusDay(date: Date) {
    viewYear = date.getFullYear();
    viewMonth = date.getMonth();
    focusDate = date;
    const key = dateKey(date);
    await tick();
    gridEl?.querySelector<HTMLButtonElement>(`[data-date="${key}"]`)?.focus();
  }

  async function moveFocus(deltaDays: number) {
    await focusDay(addDays(focusDate, deltaDays));
  }

  function select(date: Date) {
    selectedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    focusDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  async function shiftMonth(delta: number) {
    const base = new Date(viewYear, viewMonth + delta, 1);
    viewYear = base.getFullYear();
    viewMonth = base.getMonth();
    const day = Math.min(focusDate.getDate(), daysInMonth(viewYear, viewMonth));
    focusDate = new Date(viewYear, viewMonth, day);
    await tick();
    gridEl?.querySelector<HTMLButtonElement>(`[data-date="${focusKey}"]`)?.focus();
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      void moveFocus(event.key === 'ArrowLeft' ? -1 : 1);
      return;
    }
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      void moveFocus(event.key === 'ArrowUp' ? -7 : 7);
      return;
    }
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      void focusDay(addDays(focusDate, event.key === 'Home' ? -focusDate.getDay() : 6 - focusDate.getDay()));
      return;
    }
    if (event.key === 'PageUp' || event.key === 'PageDown') {
      event.preventDefault();
      void shiftMonth(event.key === 'PageUp' ? -1 : 1);
    }
  }
</script>

<div class="gi-demo">
  <div class="gi-cal" aria-label="日期选择">
    <div class="gi-cal-head">
      <button type="button" class="gi-cal-nav" aria-label="上一月" onclick={() => shiftMonth(-1)}>
        <GiIcon name="chevron-left" />
      </button>
      <div class="gi-cal-title" aria-live="polite">{viewMonth + 1} 月 {viewYear}</div>
      <button type="button" class="gi-cal-nav" aria-label="下一月" onclick={() => shiftMonth(1)}>
        <GiIcon name="chevron-right" />
      </button>
    </div>

    <div class="gi-cal-week" aria-hidden="true">
      {#each WEEKDAYS as weekday (weekday)}
        <span>{weekday}</span>
      {/each}
    </div>

    <div bind:this={gridEl} class="gi-cal-grid" role="group" aria-label="日期">
      {#each cells as cell, index (index)}
        {#if cell}
          <button
            type="button"
            class="gi-cal-day {cell.key === selectedKey
              ? 'gi-cal-day--selected'
              : ''} {cell.key === todayKey ? 'gi-cal-day--today' : ''}"
            data-date={cell.key}
            tabindex={cell.key === focusKey ? 0 : -1}
            aria-label={`${cell.date.getMonth() + 1} 月 ${cell.date.getDate()} 日${
              cell.key === todayKey ? '，今天' : ''
            }`}
            aria-pressed={cell.key === selectedKey}
            onclick={() => select(cell.date)}
            onkeydown={onKeydown}
          >
            {cell.date.getDate()}
          </button>
        {:else}
          <span class="gi-cal-day gi-cal-day--empty" aria-hidden="true"></span>
        {/if}
      {/each}
    </div>
  </div>

  <p class="gi-status" aria-live="polite">已选择：{formatDate(selectedDate)}</p>
  <p class="gi-hint">
    点日期选中，方向键在日期之间移动焦点，Enter 或空格确认，左右两边的箭头切换月份。
  </p>
</div>
