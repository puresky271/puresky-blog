<script lang="ts">
  /**
   * ClockCard.svelte — 时钟 + 月历。
   *
   * 时钟显示访客本地时间；访客和作者不在同一时区时，额外给出作者那边的时间。
   * 卡片角落的天光和天气一行跟随沈阳此刻的天色（和首页 hero 是同一份数据）。
   * 月历周一开头，固定 6 行，翻月时卡片高度不跳。有文章的日子打点，可以直接点进去。
   *
   * 服务端渲染时没有「现在」，先输出占位，挂载后再填，避免水合不一致。
   */
  import { onMount } from 'svelte';
  import { fly } from 'svelte/transition';

  import Icon from '@/components/ui/Icon.svelte';
  import { SITE } from '@/config';
  import { postPath, withBase } from '@/lib/format';
  import { iCaretLeft, iCaretRight, iClock } from '@/lib/icons.generated';
  import { getAmbient, PHASE_LABEL, startAmbient, type Ambient } from '@/lib/sky/ambient';

  type PostDay = { id: string; title: string };
  let { posts }: { posts: Record<string, PostDay[]> } = $props();

  let now = $state<Date | null>(null);
  let view = $state<{ year: number; month: number } | null>(null);
  let ambient = $state<Ambient | null>(null);

  onMount(() => {
    startAmbient();
    ambient = getAmbient();
    const onAmbient = (event: Event) => (ambient = (event as CustomEvent<Ambient>).detail);
    window.addEventListener('ambient:change', onAmbient);
    now = new Date();
    view = { year: now.getFullYear(), month: now.getMonth() };
    let interval = 0;
    // 对齐到整秒再开始走，否则秒数会比系统时钟慢半拍。
    const timeout = window.setTimeout(() => {
      now = new Date();
      interval = window.setInterval(() => (now = new Date()), 1000);
    }, 1000 - (Date.now() % 1000));
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
      window.removeEventListener('ambient:change', onAmbient);
    };
  });

  // 「沈阳 · 多云 18°C · 黄昏」。天气没取到时只显示时段。
  const weatherLine = $derived.by(() => {
    if (!ambient) return '';
    const report = ambient.report;
    const parts = [report?.place ?? '沈阳'];
    if (report && !ambient.preview) {
      parts.push(report.temperature !== null ? `${report.label} ${report.temperature}°C` : report.label);
    }
    parts.push(PHASE_LABEL[ambient.phase]);
    return parts.join(' · ');
  });

  const pad = (n: number) => String(n).padStart(2, '0');

  const hhmm = $derived(now ? `${pad(now.getHours())}:${pad(now.getMinutes())}` : '--:--');
  const ss = $derived(now ? pad(now.getSeconds()) : '--');

  const greeting = $derived.by(() => {
    if (!now) return ' ';
    const h = now.getHours();
    if (h < 5) return '夜深了';
    if (h < 9) return '早上好';
    if (h < 12) return '上午好';
    if (h < 14) return '中午好';
    if (h < 18) return '下午好';
    return '晚上好';
  });

  const dateLine = $derived(
    now
      ? new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' }).format(now)
      : ' '
  );

  // 农历：浏览器原生支持中国历法，不需要查表。
  const lunarFormat =
    typeof Intl !== 'undefined' ? new Intl.DateTimeFormat('zh-CN-u-ca-chinese', { dateStyle: 'full' }) : null;

  function lunar(date: Date): { month: string; day: string; year: string } | null {
    try {
      const parts = lunarFormat!.formatToParts(date);
      const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
      const month = get('month');
      const day = get('day');
      if (!month || !day || /^\d/.test(day)) return null;
      return { month, day, year: get('yearName') };
    } catch {
      return null;
    }
  }

  const lunarToday = $derived(now ? lunar(now) : null);

  // 作者所在时区的时间。偏移和访客一致时不显示。
  const authorTime = $derived.by(() => {
    if (!now) return null;
    const visitor = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (visitor === SITE.timeZone) return null;
    const format = new Intl.DateTimeFormat('zh-CN', {
      timeZone: SITE.timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
    const mine = format.format(now);
    const theirs = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    return mine === theirs ? null : mine;
  });

  // ── 月历 ──

  const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];

  function isoKey(date: Date): string {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  const cells = $derived.by(() => {
    if (!view) return [];
    const first = new Date(view.year, view.month, 1);
    // 周一为一周第一天：getDay() 的周日是 0，换算成 6。
    const offset = (first.getDay() + 6) % 7;
    const start = new Date(view.year, view.month, 1 - offset);
    const todayKey = now ? isoKey(now) : '';
    return Array.from({ length: 42 }, (_, i) => {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      const key = isoKey(date);
      const l = lunar(date);
      return {
        key,
        day: date.getDate(),
        inMonth: date.getMonth() === view!.month,
        today: key === todayKey,
        weekend: i % 7 >= 5,
        // 初一显示月份名，其他日子显示日名，和纸质日历一致。
        lunar: l ? (l.day === '初一' ? l.month : l.day) : '',
        posts: posts[key] ?? [],
      };
    });
  });

  const monthPosts = $derived(cells.filter((c) => c.inMonth).reduce((n, c) => n + c.posts.length, 0));
  const isCurrentMonth = $derived(!!now && !!view && view.year === now.getFullYear() && view.month === now.getMonth());

  function shift(delta: number) {
    if (!view) return;
    const d = new Date(view.year, view.month + delta, 1);
    view = { year: d.getFullYear(), month: d.getMonth() };
  }

  function backToToday() {
    if (now) view = { year: now.getFullYear(), month: now.getMonth() };
  }
</script>

<article class="card clock-card">
  <header class="widget-label">
    <Icon icon={iClock} size={15} />
    <span>{greeting}</span>
  </header>

  <div class="mt-3 flex items-end gap-2" aria-live="off">
    <time class="clock tabular" datetime={now?.toISOString()} aria-label={now ? `现在 ${hhmm}` : '时钟加载中'}>
      {#each hhmm.split('') as char, i (i)}
        <span class="slot" class:colon={char === ':'}>
          {#key char}
            <span in:fly={{ y: 14, duration: 420, opacity: 0 }} out:fly={{ y: -14, duration: 320, opacity: 0 }}>{char}</span>
          {/key}
        </span>
      {/each}
    </time>
    <span class="seconds tabular" aria-hidden="true">
      {#each ss.split('') as char, i (i)}
        <span class="slot">
          {#key char}
            <span in:fly={{ y: 8, duration: 360, opacity: 0 }} out:fly={{ y: -8, duration: 260, opacity: 0 }}>{char}</span>
          {/key}
        </span>
      {/each}
    </span>
  </div>

  <p class="mt-2 text-[0.9375rem] text-fg">{dateLine}</p>
  <p class="mt-0.5 min-h-[1.25rem] text-[0.8125rem] text-fg-muted">
    {#if lunarToday}农历{lunarToday.year}年{lunarToday.month}{lunarToday.day}{/if}
  </p>
  <p class="mt-0.5 min-h-[1.25rem] text-[0.8125rem] text-fg-muted">
    {weatherLine}{#if authorTime}<span class="mx-1.5 text-fg-subtle">·</span>当地 {authorTime}{/if}
  </p>

  <div class="calendar">
    <div class="flex items-center justify-between">
      <p class="text-sm font-medium text-fg tabular">
        {#if view}{view.year}年{view.month + 1}月{:else}&nbsp;{/if}
      </p>
      <div class="flex items-center gap-0.5">
        {#if !isCurrentMonth && view}
          <button type="button" class="chip !h-7" onclick={backToToday}>今天</button>
        {/if}
        <button type="button" class="icon-btn !h-8 !w-8" onclick={() => shift(-1)} aria-label="上个月">
          <Icon icon={iCaretLeft} size={15} />
        </button>
        <button type="button" class="icon-btn !h-8 !w-8" onclick={() => shift(1)} aria-label="下个月">
          <Icon icon={iCaretRight} size={15} />
        </button>
      </div>
    </div>

    <div class="grid" role="grid" aria-label="月历">
      {#each WEEKDAYS as w, i}
        <span class="weekday" class:weekend={i >= 5} role="columnheader">{w}</span>
      {/each}
      {#if cells.length}
        {#each cells as cell (cell.key)}
          {#if cell.posts.length}
            <a
              href={cell.posts.length === 1 ? postPath(cell.posts[0].id) : withBase(`/archive/#${cell.key.slice(0, 7)}`)}
              class="cell has-post"
              class:out={!cell.inMonth}
              class:today={cell.today}
              data-tip={cell.posts.map((p) => p.title).join(' / ')}
              aria-label={`${cell.key}：${cell.posts.map((p) => p.title).join('、')}`}
              role="gridcell"
            >
              <span class="num">{cell.day}</span>
              <span class="lunar">{cell.lunar}</span>
            </a>
          {:else}
            <span
              class="cell"
              class:out={!cell.inMonth}
              class:today={cell.today}
              class:weekend={cell.weekend}
              role="gridcell"
              aria-current={cell.today ? 'date' : undefined}
            >
              <span class="num">{cell.day}</span>
              <span class="lunar">{cell.lunar}</span>
            </span>
          {/if}
        {/each}
      {:else}
        {#each Array(42) as _}
          <span class="cell"><span class="num skeleton !h-3 !w-4"></span></span>
        {/each}
      {/if}
    </div>

    <p class="mt-3 flex items-center gap-1.5 text-[0.75rem] text-fg-subtle">
      <span class="legend-dot" aria-hidden="true"></span>
      {monthPosts > 0 ? `这个月写了 ${monthPosts} 篇` : '这个月还没有新文章'}
    </p>
  </div>
</article>

<style>
  .clock-card {
    position: relative;
    display: flex;
    flex-direction: column;
    padding: 1.25rem 1.25rem 1.1rem;
    isolation: isolate;
  }
  /* 不给卡片设 overflow: hidden，否则日历格子上的提示会被裁掉；天色层自己跟随圆角。 */
  .clock-card::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -1;
    border-radius: inherit;
    /* 和 hero 共用 --sky-* 变量，只取右上角一小片，作为一层很淡的天光，不压文字。 */
    background:
      linear-gradient(180deg, var(--sky-veil), transparent 40%),
      radial-gradient(130% 75% at 100% 0%, color-mix(in oklab, var(--sky-top) 85%, transparent), transparent 62%);
    opacity: 0.9;
  }

  .clock {
    display: flex;
    font-size: 3.25rem;
    line-height: 1;
    font-weight: 600;
    letter-spacing: -0.04em;
    color: var(--fg);
  }
  .seconds {
    display: flex;
    margin-bottom: 0.35rem;
    font-size: 1.125rem;
    font-weight: 500;
    color: var(--fg-subtle);
  }
  .slot {
    display: inline-grid;
    overflow: hidden;
    /* 翻滚动画时新旧数字叠在同一格里。 */
  }
  .slot > :global(span) {
    grid-area: 1 / 1;
  }
  .colon {
    padding-inline: 0.02em;
    color: var(--fg-subtle);
    font-weight: 500;
  }

  .calendar {
    margin-top: 1.25rem;
    padding-top: 1rem;
    border-top: 1px solid var(--line);
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    gap: 2px;
    margin-top: 0.6rem;
  }
  .weekday {
    padding-block: 0.25rem;
    text-align: center;
    font-size: 0.6875rem;
    color: var(--fg-subtle);
  }
  .cell {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1px;
    height: 2.6rem;
    border-radius: 10px;
    color: var(--fg);
    transition: background-color 140ms ease;
  }
  .num {
    font-size: 0.8125rem;
    font-weight: 500;
    line-height: 1.1;
    font-variant-numeric: tabular-nums;
  }
  .lunar {
    font-size: 0.5625rem;
    line-height: 1.1;
    color: var(--fg-subtle);
    white-space: nowrap;
  }
  .weekend .num {
    color: var(--fg-muted);
  }
  .out {
    opacity: 0.38;
  }
  .today {
    background: var(--accent);
    color: var(--accent-fg);
  }
  .today .num,
  .today .lunar {
    color: var(--accent-fg);
  }

  .has-post::after {
    content: '';
    position: absolute;
    bottom: 3px;
    width: 4px;
    height: 4px;
    border-radius: 999px;
    background: var(--accent);
  }
  .has-post.today::after {
    background: var(--accent-fg);
  }
  .has-post:hover {
    background: var(--accent-soft);
  }
  .has-post.today:hover {
    background: var(--accent-strong);
  }
  /* 悬停时在格子上方显示文章标题。 */
  .has-post::before {
    content: attr(data-tip);
    position: absolute;
    bottom: calc(100% + 6px);
    left: 50%;
    z-index: var(--z-raised);
    width: max-content;
    max-width: 14rem;
    padding: 0.4rem 0.6rem;
    border-radius: 8px;
    background: var(--fg);
    color: var(--bg);
    font-size: 0.75rem;
    line-height: 1.45;
    text-align: left;
    white-space: normal;
    pointer-events: none;
    opacity: 0;
    transform: translate(-50%, 4px);
    transition:
      opacity 140ms ease,
      transform 200ms var(--ease-out-expo);
  }
  .has-post:hover::before,
  .has-post:focus-visible::before {
    opacity: 1;
    transform: translate(-50%, 0);
  }
  /* 靠边两列的提示改为贴边对齐，不伸出卡片。前 7 个子元素是星期表头。 */
  .has-post:is(:nth-child(7n + 1), :nth-child(7n + 2))::before {
    left: 0;
    transform: translate(0, 4px);
  }
  .has-post:is(:nth-child(7n + 6), :nth-child(7n))::before {
    left: auto;
    right: 0;
    transform: translate(0, 4px);
  }
  .has-post:is(:nth-child(7n + 1), :nth-child(7n + 2), :nth-child(7n + 6), :nth-child(7n)):is(:hover, :focus-visible)::before {
    transform: none;
  }

  .legend-dot {
    width: 5px;
    height: 5px;
    border-radius: 999px;
    background: var(--accent);
  }
</style>
