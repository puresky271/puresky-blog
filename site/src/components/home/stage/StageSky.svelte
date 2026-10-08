<script lang="ts">
  /**
   * StageSky.svelte — 舞台的天空模式：一扇看沈阳此刻天空的窗。
   *
   * 画面全部按真实数据画：
   *   天色     按时段（破晓 / 白天 / 黄昏 / 夜晚）换整套配色，阴雨雪雾再罩一层灰幕。
   *   日月轨迹 一条从地平线到地平线的弧，白天是太阳、夜里是月亮，位置按日出日落算；
   *            月亮按日期算出真实月相。
   *   云       数量和颜色随天气、时段变化，缓慢飘过。
   *   粒子     夜里的星星和流星、风、雨、雪、雷雨闪光（复用 lib/sky/field.ts）。
   *   云海     画面底部三层柔软的云，颜色被此刻的天光染上（朝霞、晚霞、月光）。
   * 指针移动时远近几层有一点视差。数据和首页其他地方的天色是同一份（lib/sky/ambient.ts）。
   */
  import { onMount } from 'svelte';

  import Icon from '@/components/ui/Icon.svelte';
  import { WEATHER } from '@/config';
  import { iCloud, iCloudRain, iMapPin, iMoon, iSnowflake, iSun } from '@/lib/icons.generated';
  import { getAmbient, PHASE_LABEL, startAmbient, type Ambient } from '@/lib/sky/ambient';
  import { SkyField } from '@/lib/sky/field';

  let ambient = $state<Ambient>(getAmbient());
  let now = $state<Date | null>(null);
  let canvas = $state<HTMLCanvasElement>();
  let host = $state<HTMLDivElement>();
  let mx = $state(0);
  let my = $state(0);
  let field: SkyField | null = null;

  onMount(() => {
    startAmbient();
    ambient = getAmbient();
    now = new Date();
    const timer = setInterval(() => (now = new Date()), 15_000);

    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    try {
      // 窗里的天总是「暗底亮粒子」的配色：星星、雨丝、雪片都是浅色的。
      field = new SkyField(canvas!, 'dark', sceneOf(ambient), { density: 0.9, maxParticles: 220, still });
    } catch {
      field = null;
    }

    const onAmbient = (event: Event) => {
      ambient = (event as CustomEvent<Ambient>).detail;
      field?.setScene(sceneOf(ambient));
    };
    window.addEventListener('ambient:change', onAmbient);

    let visible = false;
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !document.hidden) field?.start();
      else field?.stop();
    });
    io.observe(host!);
    const ro = new ResizeObserver(() => field?.resize());
    ro.observe(canvas!);
    const onVisibility = () => {
      if (document.hidden) field?.stop();
      else if (visible) field?.start();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearInterval(timer);
      window.removeEventListener('ambient:change', onAmbient);
      document.removeEventListener('visibilitychange', onVisibility);
      io.disconnect();
      ro.disconnect();
      field?.destroy();
      field = null;
    };
  });

  function sceneOf(a: Ambient) {
    return { phase: a.phase, weather: a.weather, intensity: a.intensity };
  }

  function onPointer(event: PointerEvent) {
    const rect = host!.getBoundingClientRect();
    mx = (event.clientX - rect.left) / rect.width - 0.5;
    my = (event.clientY - rect.top) / rect.height - 0.5;
    // 粒子场的指针交互（星星被拨开、风绕开）。
    const r = canvas!.getBoundingClientRect();
    field?.pointerMove(event.clientX - r.left, event.clientY - r.top);
  }

  // ── 时间与日月 ─────────────────────────────────────────────────────────────

  const fmt = (date: Date, options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat('zh-CN', { timeZone: WEATHER.timeZone, ...options }).format(date);

  const time = $derived(now ? fmt(now, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }) : '--:--');
  const date = $derived(now ? fmt(now, { month: 'long', day: 'numeric', weekday: 'long' }) : '');
  const report = $derived(ambient.preview ? null : ambient.report);

  /** 作者那边的「一天中的第几分钟」。 */
  const minuteOfDay = $derived.by(() => {
    if (!now) return 720;
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: WEATHER.timeZone, hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(now);
    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
    return get('hour') * 60 + get('minute');
  });

  const sun = $derived(report?.sun ?? { sunrise: 360, sunset: 1080 });
  const isDay = $derived(minuteOfDay >= sun.sunrise && minuteOfDay < sun.sunset);

  /** 天体在弧上的位置 0..1：白天按日出到日落，夜里按日落到次日日出。 */
  const progress = $derived.by(() => {
    if (isDay) return (minuteOfDay - sun.sunrise) / (sun.sunset - sun.sunrise);
    const night = 1440 - sun.sunset + sun.sunrise;
    const since = minuteOfDay >= sun.sunset ? minuteOfDay - sun.sunset : minuteOfDay + 1440 - sun.sunset;
    return since / night;
  });

  /** 预览模式下天体跟着预览的时段走，放在弧上一个合适的位置。 */
  const body = $derived.by(() => {
    if (ambient.preview) {
      const preset = { dawn: 0.06, day: 0.5, dusk: 0.94, night: 0.5 }[ambient.phase];
      return { kind: ambient.phase === 'night' ? 'moon' : 'sun', u: preset };
    }
    return { kind: isDay ? 'sun' : 'moon', u: progress };
  });

  const hhmm = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(Math.round(m) % 60).padStart(2, '0')}`;
  const until = $derived.by(() => {
    const target = isDay ? sun.sunset : sun.sunrise;
    let diff = target - minuteOfDay;
    if (diff < 0) diff += 1440;
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    return `距${isDay ? '日落' : '日出'} ${h ? `${h} 小时 ` : ''}${m} 分`;
  });

  // 弧：viewBox 400×200，地平线在 y=196。
  const ARC = { cx: 200, cy: 196, rx: 184, ry: 160 };
  const point = (u: number) => ({
    x: ARC.cx - ARC.rx * Math.cos(Math.PI * u),
    y: ARC.cy - ARC.ry * Math.sin(Math.PI * u),
  });
  const bodyPos = $derived(point(Math.min(1, Math.max(0, body.u))));
  /** 已经走过的那段弧。 */
  const traveled = $derived.by(() => {
    const steps = 32;
    const u = Math.min(1, Math.max(0, body.u));
    let d = '';
    for (let i = 0; i <= steps; i += 1) {
      const p = point((u * i) / steps);
      d += `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    }
    return d;
  });

  /** 月相 0..1（0 新月、0.5 满月），以 2000-01-06 18:14 UTC 的新月为基准。 */
  const moonPhase = $derived(now ? ((((now.getTime() - Date.UTC(2000, 0, 6, 18, 14)) / 86400000) % 29.530588853) + 29.530588853) % 29.530588853 / 29.530588853 : 0.5);
  /** 月亮被照亮部分的轮廓（以月心为原点，半径 r）。 */
  function moonPath(p: number, r: number): string {
    const k = Math.cos(2 * Math.PI * p);
    const rx = Math.abs(k) * r;
    const waxing = p < 0.5;
    const limb = `M0 ${-r}A${r} ${r} 0 0 ${waxing ? 1 : 0} 0 ${r}`;
    // 蛾眉时明暗交界线朝亮边鼓，凸月时朝暗边鼓。
    const bulgeToLit = k > 0;
    const sweep = waxing ? (bulgeToLit ? 0 : 1) : bulgeToLit ? 1 : 0;
    return `${limb}A${rx.toFixed(2)} ${r} 0 0 ${sweep} 0 ${-r}Z`;
  }

  // ── 天气 ───────────────────────────────────────────────────────────────────

  const weatherIcon = $derived(
    {
      clear: body.kind === 'sun' ? iSun : iMoon,
      cloudy: iCloud,
      overcast: iCloud,
      fog: iCloud,
      drizzle: iCloudRain,
      rain: iCloudRain,
      thunder: iCloudRain,
      snow: iSnowflake,
    }[ambient.weather]
  );

  const PREVIEW_LABEL: Record<string, string> = {
    clear: '晴',
    cloudy: '多云',
    overcast: '阴',
    fog: '雾',
    drizzle: '毛毛雨',
    rain: '雨',
    snow: '雪',
    thunder: '雷雨',
  };

  /** 云：数量随天气，位置和速度固定（用种子生成，每次渲染一致）。 */
  const CLOUD_COUNT: Record<string, number> = { clear: 2, cloudy: 5, overcast: 8, fog: 4, drizzle: 6, rain: 7, snow: 6, thunder: 8 };
  const clouds = $derived.by(() => {
    const rand = seeded(7 + ambient.weather.length);
    // 晴夜不放云，星空要干净。
    const count = ambient.weather === 'clear' && ambient.phase === 'night' ? 0 : (CLOUD_COUNT[ambient.weather] ?? 3);
    return Array.from({ length: count }, (_, i) => ({
      top: 4 + rand() * 42,
      x: rand() * 85,
      scale: (ambient.weather === 'clear' ? 0.45 : 0.7) + rand() * 0.7,
      duration: 90 + rand() * 110,
      delay: -rand() * 200,
      opacity: 0.55 + rand() * 0.4,
      flip: rand() < 0.5,
      shape: i % 3,
    }));
  });

  function seeded(seed: number) {
    let s = seed % 2147483647;
    if (s <= 0) s += 2147483646;
    return () => (s = (s * 16807) % 2147483647) / 2147483647;
  }

  const overcast = $derived(['overcast', 'drizzle', 'rain', 'thunder'].includes(ambient.weather));
</script>

<div
  class="sky"
  bind:this={host}
  data-phase={ambient.phase}
  data-weather={ambient.weather}
  class:overcast
  style="--mx: {mx}; --my: {my}"
  onpointermove={onPointer}
  onpointerleave={() => {
    mx = 0;
    my = 0;
    field?.pointerLeave();
  }}
  role="presentation"
>
  <!-- 天 -->
  <div class="layer heaven" aria-hidden="true"></div>

  <!-- 日月轨迹 -->
  <div class="layer orbit-box" aria-hidden="true">
    <svg class="orbit" viewBox="0 0 400 200" preserveAspectRatio="xMidYMax meet">
      <defs>
        <radialGradient id="sky-sun-glow">
          <stop offset="0" stop-color="var(--sun-glow)" stop-opacity="0.75" />
          <stop offset="1" stop-color="var(--sun-glow)" stop-opacity="0" />
        </radialGradient>
        <linearGradient id="sky-trail" x1="0" x2="1">
          <stop offset="0" stop-color="var(--trail)" stop-opacity="0.05" />
          <stop offset="1" stop-color="var(--trail)" stop-opacity="0.9" />
        </linearGradient>
      </defs>
      <path
        class="track"
        d="M{ARC.cx - ARC.rx} {ARC.cy}A{ARC.rx} {ARC.ry} 0 0 1 {ARC.cx + ARC.rx} {ARC.cy}"
        fill="none"
      />
      <path class="trail" d={traveled} fill="none" stroke="url(#sky-trail)" />
      <g transform="translate({bodyPos.x.toFixed(1)} {bodyPos.y.toFixed(1)})">
        {#if body.kind === 'sun'}
          <circle r="46" fill="url(#sky-sun-glow)" class="pulse" />
          <circle r="13" class="sun" />
        {:else}
          <circle r="34" fill="url(#sky-sun-glow)" opacity="0.6" />
          <circle r="11" class="moon-dark" />
          <path d={moonPath(moonPhase, 11)} class="moon" />
        {/if}
      </g>
    </svg>
  </div>

  <!-- 粒子：星、风、雨、雪、闪光 -->
  <canvas class="layer particles" bind:this={canvas} aria-hidden="true"></canvas>

  <!-- 云 -->
  <div class="layer clouds" aria-hidden="true">
    {#each clouds as c}
      <svg
        class="cloud"
        viewBox="0 0 220 90"
        style="top: {c.top}%; --x: {c.x}; --s: {c.scale}; --d: {c.duration}s; --delay: {c.delay}s; opacity: {c.opacity}; {c.flip ? 'scale: -1 1;' : ''}"
      >
        {#if c.shape === 0}
          <path d="M28 80c-15 0-24-9-24-20s10-20 22-19c3-14 16-24 31-22 7-14 24-21 40-15 12-12 34-12 46 2 16-4 33 6 35 22 16 1 26 11 26 25 0 15-12 27-27 27z" />
        {:else if c.shape === 1}
          <path d="M20 82c-10 0-16-7-16-15 0-9 8-16 18-15 2-11 13-18 24-15 6-10 19-14 30-9 9-8 24-7 31 4 12-2 23 6 23 18 9 1 15 8 15 16 0 9-7 16-16 16z" />
        {:else}
          <path d="M40 82c-20 0-34-9-34-21s15-21 32-19c5-10 18-16 31-12 11-12 35-14 50-2 13-6 31-1 37 12 18 0 32 9 32 21 0 12-13 21-30 21z" />
        {/if}
      </svg>
    {/each}
  </div>

  <!-- 云海：三层，越近越大越亮，视差越强 -->
  <svg class="layer sea back" viewBox="0 0 1600 200" preserveAspectRatio="none" aria-hidden="true">
    <path d="M0 200V96C70 70 150 74 214 92 268 62 360 58 420 86 488 60 580 64 640 92 720 70 800 72 860 96 930 66 1030 62 1090 90 1160 64 1250 66 1310 94 1380 70 1470 70 1530 92 1560 84 1580 86 1600 90V200Z" />
  </svg>
  <svg class="layer sea mid" viewBox="0 0 1600 200" preserveAspectRatio="none" aria-hidden="true">
    <path d="M0 200V128C60 100 150 98 210 124 270 92 380 90 440 120 520 94 610 96 670 126 740 98 840 96 900 124 980 92 1080 94 1140 124 1210 100 1300 98 1370 126 1440 102 1530 100 1600 122V200Z" />
  </svg>
  <svg class="layer sea front" viewBox="0 0 1600 200" preserveAspectRatio="none" aria-hidden="true">
    <path d="M0 200V160C80 130 190 128 260 154 340 124 460 122 530 152 610 128 720 126 790 156 870 126 990 124 1060 152 1140 128 1250 128 1320 156 1400 132 1510 130 1600 150V200Z" />
  </svg>

  <div class="layer veil" aria-hidden="true"></div>

  <!-- 文字 -->
  <div class="info">
    <p class="label"><Icon icon={iMapPin} size={13} />{WEATHER.name} · 此刻</p>
    <p class="time tabular">{time}</p>
    <p class="sub">{date}<span class="dot">·</span>{PHASE_LABEL[ambient.phase]}</p>
    <div class="weather">
      <Icon icon={weatherIcon} size={22} />
      {#if report}
        <span class="w-label">{report.label}</span>
        {#if report.temperature !== null}<span class="w-temp tabular">{report.temperature}°</span>{/if}
      {:else if ambient.preview}
        <span class="w-label">{PREVIEW_LABEL[ambient.weather]}</span><span class="w-note">预览</span>
      {:else}
        <span class="w-label">天气加载中</span>
      {/if}
    </div>
    {#if report?.sun}
      <p class="sun-line tabular">
        日出 {hhmm(report.sun.sunrise)}<span class="dot">·</span>日落 {hhmm(report.sun.sunset)}<span class="dot">·</span>{until}
      </p>
    {/if}
  </div>
</div>

<style>
  /*
   * 配色按时段。天顶 → 中段 → 地平线三段，再加远山、城市、近景三层由浅到深。
   * 这是一扇「窗」，颜色跟着真实的天，不随站点亮暗主题反转。
   */
  .sky {
    --top: #2f6fd6;
    --mid: #6ea6ee;
    --horizon: #cfe4fb;
    --sea-back: #cfe2fb;
    --sea-mid: #e4effd;
    --sea-front: #f7fbff;
    --cloud: #ffffff;
    --sun: #fff8de;
    --sun-glow: #fff1b8;
    --trail: #ffffff;
    --ink: #ffffff;

    position: absolute;
    inset: 0;
    overflow: hidden;
    border-radius: inherit;
    color: var(--ink);
    isolation: isolate;
  }
  .sky[data-phase='dawn'] {
    --top: #34437f;
    --mid: #8a7cba;
    --horizon: #f6bfa2;
    --sea-back: #b9a6cf;
    --sea-mid: #e3bcc4;
    --sea-front: #fbd8cc;
    --cloud: #fbd9d6;
    --sun: #ffe3c2;
    --sun-glow: #ffb98a;
    --trail: #ffe6d2;
  }
  .sky[data-phase='dusk'] {
    --top: #2a2766;
    --mid: #87509a;
    --horizon: #f7a06c;
    --sea-back: #9a6a9e;
    --sea-mid: #d08a96;
    --sea-front: #f6b08e;
    --cloud: #f8b9a6;
    --sun: #ffd9a8;
    --sun-glow: #ff9a5c;
    --trail: #ffd2b8;
  }
  .sky[data-phase='night'] {
    --top: #050b1f;
    --mid: #0f1d45;
    --horizon: #2a3f74;
    --sea-back: #1d2b55;
    --sea-mid: #26386a;
    --sea-front: #33477e;
    --cloud: #34436d;
    --sun: #f3f0e4;
    --sun-glow: #c8d6ff;
    --trail: #c8d6ff;
  }

  .layer {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }
  .heaven {
    background:
      radial-gradient(90% 70% at 72% 100%, color-mix(in oklab, var(--horizon) 60%, transparent), transparent 70%),
      linear-gradient(180deg, var(--top) 0%, var(--mid) 58%, var(--horizon) 100%);
    transition: background 1.2s ease;
  }

  /* 日月轨迹：桌面在右侧，窄屏也在右上，不压文字。 */
  .orbit-box {
    inset: 9% 4% auto auto;
    width: min(46%, 34rem);
    height: 64%;
    transform: translate(calc(var(--mx) * -6px), calc(var(--my) * -4px));
    transition: transform 600ms var(--ease-out-expo);
  }
  .orbit {
    width: 100%;
    height: 100%;
    overflow: visible;
  }
  .track {
    stroke: var(--trail);
    stroke-opacity: 0.32;
    stroke-width: 1.2;
    stroke-dasharray: 2 6;
    stroke-linecap: round;
    vector-effect: non-scaling-stroke;
  }
  .trail {
    stroke-width: 2;
    stroke-linecap: round;
    vector-effect: non-scaling-stroke;
  }
  .sun {
    fill: var(--sun);
    filter: drop-shadow(0 0 6px var(--sun-glow));
  }
  .pulse {
    transform-origin: center;
    transform-box: fill-box;
    animation: pulse 5s ease-in-out infinite;
  }
  .moon {
    fill: var(--sun);
    filter: drop-shadow(0 0 5px rgb(220 230 255 / 0.6));
  }
  .moon-dark {
    fill: #ffffff;
    opacity: 0.08;
  }

  .particles {
    z-index: 1;
  }

  .clouds {
    z-index: 2;
    container-type: size;
  }
  .cloud {
    position: absolute;
    left: 0;
    width: calc(15rem * var(--s));
    fill: var(--cloud);
    filter: blur(0.5px);
    animation: drift var(--d) linear infinite;
    animation-delay: var(--delay);
  }
  .overcast .cloud {
    fill: color-mix(in oklab, var(--cloud) 55%, #6b7487);
  }

  .sea {
    z-index: 3;
    top: auto;
    bottom: 0;
    transition: transform 700ms var(--ease-out-expo);
  }
  .sea path {
    transition: fill 1.2s ease;
  }
  .back {
    height: 34%;
    opacity: 0.75;
    filter: blur(3px);
    transform: translateX(calc(var(--mx) * -5px));
    animation: swell 14s ease-in-out infinite;
  }
  .back path {
    fill: var(--sea-back);
  }
  .mid {
    height: 26%;
    opacity: 0.85;
    filter: blur(1.5px);
    transform: translateX(calc(var(--mx) * -10px));
    animation: swell 11s ease-in-out infinite reverse;
  }
  .mid path {
    fill: var(--sea-mid);
  }
  .front {
    height: 19%;
    transform: translateX(calc(var(--mx) * -18px));
    animation: swell 9s ease-in-out infinite;
  }
  .front path {
    fill: var(--sea-front);
  }
  .overcast .sea path {
    fill: color-mix(in oklab, var(--sea-mid) 50%, #7c8698);
  }

  /* 阴雨天的灰幕、雾的地面雾带。 */
  .veil {
    z-index: 4;
    background: transparent;
    transition: background 1.2s ease;
  }
  .sky[data-weather='cloudy'] .veil {
    background: linear-gradient(180deg, rgb(150 165 190 / 0.18), transparent 70%);
  }
  .overcast .veil {
    background: linear-gradient(180deg, rgb(110 122 145 / 0.5), rgb(110 122 145 / 0.2));
  }
  .sky[data-phase='night'].overcast .veil {
    background: linear-gradient(180deg, rgb(20 25 38 / 0.55), rgb(20 25 38 / 0.25));
  }
  .sky[data-weather='fog'] .veil {
    background: linear-gradient(180deg, rgb(220 226 236 / 0.15), rgb(220 226 236 / 0.7) 85%);
  }
  .sky[data-phase='night'][data-weather='fog'] .veil {
    background: linear-gradient(180deg, rgb(60 70 95 / 0.15), rgb(70 80 105 / 0.65) 85%);
  }
  .sky[data-weather='snow'] .veil {
    background: linear-gradient(180deg, rgb(200 212 230 / 0.3), rgb(235 240 250 / 0.25));
  }

  /* ── 文字 ── */
  .info {
    position: absolute;
    z-index: 5;
    top: 0;
    left: 0;
    padding: clamp(1.1rem, 3.4vw, 2.4rem) clamp(1.25rem, 4vw, 3rem);
    text-shadow: 0 1px 12px rgb(0 0 0 / 0.25);
  }
  .label {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.8125rem;
    letter-spacing: 0.04em;
    opacity: 0.85;
  }
  .time {
    margin-top: 0.15rem;
    font-size: clamp(2.75rem, 1.6rem + 4.6vw, 5.25rem);
    line-height: 1;
    font-weight: 600;
    letter-spacing: -0.045em;
  }
  .sub {
    margin-top: 0.55rem;
    font-size: 0.9375rem;
    opacity: 0.88;
  }
  .dot {
    margin-inline: 0.45em;
    opacity: 0.55;
  }
  .weather {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: clamp(0.75rem, 2vw, 1.4rem);
  }
  .w-label {
    font-size: 1rem;
    font-weight: 600;
  }
  .w-temp {
    font-size: 1.5rem;
    font-weight: 300;
    letter-spacing: -0.02em;
  }
  .w-note {
    padding: 0.05rem 0.5rem;
    border-radius: 999px;
    font-size: 0.6875rem;
    background: rgb(255 255 255 / 0.18);
  }
  .sun-line {
    margin-top: 0.35rem;
    font-size: 0.8125rem;
    opacity: 0.8;
  }

  @media (width < 40rem) {
    .orbit-box {
      inset: 6% 3% auto auto;
      width: 52%;
      height: 42%;
    }
    .sun-line {
      display: none;
    }
  }

  @keyframes drift {
    from {
      transform: translateX(-100%);
    }
    to {
      transform: translateX(100cqw);
    }
  }
  /* 云海的起伏：很慢地上下浮一点，三层节奏错开。 */
  @keyframes swell {
    0%,
    100% {
      translate: 0 0;
    }
    50% {
      translate: 0 4%;
    }
  }
  @keyframes pulse {
    0%,
    100% {
      transform: scale(0.92);
      opacity: 0.85;
    }
    50% {
      transform: scale(1.08);
      opacity: 1;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .cloud,
    .pulse,
    .sea {
      animation: none !important;
    }
    .cloud {
      transform: translateX(calc(var(--x) * 1cqw));
    }
  }
</style>
