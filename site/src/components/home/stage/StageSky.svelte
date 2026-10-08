<script lang="ts">
  /**
   * StageSky.svelte — 舞台的天空模式。
   *
   * 舞台本身变成透明的窗口，背后首页的天空底色和粒子从窗里透出来；
   * 窗上只放沈阳此刻的时间、天气、日出日落，数据和首页其他地方的天色是同一份。
   */
  import { onMount } from 'svelte';

  import { WEATHER } from '@/config';
  import { getAmbient, PHASE_LABEL, startAmbient, type Ambient } from '@/lib/sky/ambient';

  let ambient = $state<Ambient | null>(null);
  let now = $state<Date | null>(null);

  onMount(() => {
    startAmbient();
    ambient = getAmbient();
    now = new Date();
    const onAmbient = (event: Event) => (ambient = (event as CustomEvent<Ambient>).detail);
    window.addEventListener('ambient:change', onAmbient);
    const timer = setInterval(() => (now = new Date()), 10_000);
    return () => {
      window.removeEventListener('ambient:change', onAmbient);
      clearInterval(timer);
    };
  });

  const clock = (date: Date, options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat('zh-CN', { timeZone: WEATHER.timeZone, ...options }).format(date);

  const time = $derived(now ? clock(now, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }) : '--:--');
  const date = $derived(now ? clock(now, { month: 'long', day: 'numeric', weekday: 'long' }) : '');
  const report = $derived(ambient?.preview ? null : (ambient?.report ?? null));

  const hhmm = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
</script>

<div class="sky">
  <div class="left">
    <p class="label">{WEATHER.name}此刻</p>
    <p class="time tabular">{time}</p>
    <p class="sub">{date}{#if ambient}<span class="mx-1.5 opacity-50">·</span>{PHASE_LABEL[ambient.phase]}{/if}</p>
  </div>
  <div class="right">
    {#if report}
      <p class="weather">{report.label}</p>
      {#if report.temperature !== null}<p class="temp tabular">{report.temperature}°</p>{/if}
      {#if report.sun}
        <p class="sub tabular">日出 {hhmm(report.sun.sunrise)}<span class="mx-1.5 opacity-50">·</span>日落 {hhmm(report.sun.sunset)}</p>
      {/if}
    {:else if ambient?.preview}
      <p class="weather">预览</p>
      <p class="sub">{ambient.weather}</p>
    {:else}
      <p class="sub">天气加载中</p>
    {/if}
  </div>
</div>

<style>
  .sky {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 2rem;
    padding: clamp(1.25rem, 4vw, 2.75rem);
    color: var(--fg);
    border-radius: inherit;
    /* 窗玻璃：顶部带一点天色，往下透明，让背后的粒子透出来。 */
    background: linear-gradient(180deg, color-mix(in oklab, var(--sky-top) 40%, transparent), transparent 70%);
  }
  .label {
    font-size: 0.875rem;
    color: var(--fg-muted);
  }
  .time {
    margin-top: 0.25rem;
    font-size: clamp(3rem, 2rem + 5vw, 5.75rem);
    line-height: 1;
    font-weight: 600;
    letter-spacing: -0.045em;
  }
  .sub {
    margin-top: 0.6rem;
    font-size: 0.9375rem;
    color: var(--fg-muted);
  }
  .right {
    text-align: right;
  }
  .weather {
    font-size: 1.125rem;
    font-weight: 600;
  }
  .temp {
    font-size: clamp(2.25rem, 1.6rem + 3vw, 3.75rem);
    line-height: 1.05;
    font-weight: 300;
    letter-spacing: -0.03em;
  }
  @media (width < 40rem) {
    .sky {
      flex-direction: column;
      align-items: flex-start;
      justify-content: flex-end;
      gap: 1rem;
    }
    .right {
      text-align: left;
    }
  }
</style>
