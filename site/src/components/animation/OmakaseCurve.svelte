<script lang="ts">
  /**
   * OmakaseCurve.svelte — 一席 Omakase 的风味递进弧线。
   *
   * 不是「播放 / 上一步」那套：这张图本身就是交互面。指到曲线的哪一段，就停在对应的那一站，
   * 曲线亮到那里，下方说明当场换成这一口在吃什么。原因很简单，这条曲线的横轴是上菜顺序，
   * 读者想知道的「第几贯」和「味道怎么变」，本来就是同一个位置上的事，分成播放条和图表两边反而是负担。
   *
   * 进入视野后曲线自己画出来（约 1.2 秒），停笔时停在最后一站。
   * 键盘左右键在五站之间走，Home / End 到首尾；reduced-motion 下直接给出画好的图。
   */
  import { onMount } from 'svelte';

  import type { AnimationProps } from './mount';

  // 这个演示没有配置项。读一次 config，既让挂载层传进来的值有响应式身份，也不触发「只取初始值」的警告。
  const { config = {} }: AnimationProps = $props();
  $effect(() => {
    void config;
  });

  interface Stop {
    /** 结点在 viewBox 里的位置。 */
    x: number;
    y: number;
    /** 阶段名，写在结点上方。 */
    title: string;
    /** 这一站的大类，写在结点下方。 */
    short: string;
    /** 这一刻桌上的东西。 */
    items: string[];
    /** 一句话说明为什么这么排。 */
    note: string;
  }

  const STOPS: Stop[] = [
    {
      x: 68,
      y: 192,
      title: '起承 · 清雅',
      short: '先付酒肴 / 白身鱼',
      items: ['真鲷', '比目鱼'],
      note: '温度低，酸度轻，先把舌头叫醒。',
    },
    {
      x: 196,
      y: 152,
      title: '转折 · 酸香',
      short: '亮皮鱼 / 贝类',
      items: ['小肌', '竹荚', '赤贝'],
      note: '醋渍的酸把刚才的油清掉，味蕾重新归零。',
    },
    {
      x: 330,
      y: 118,
      title: '推进 · 醇厚',
      short: '红肉鱼 / 酱油渍',
      items: ['金枪鱼赤身', '中腹'],
      note: '酱油渍把鲜味往前推一档，油脂开始上来。',
    },
    {
      x: 466,
      y: 80,
      title: '高潮 · 丰腴',
      short: '油脂与浓鲜',
      items: ['大腹', '海胆', '煮星鳗'],
      note: '整条曲线的最高点，油脂在这里最厚。',
    },
    {
      x: 574,
      y: 168,
      title: '余韵 · 温甜',
      short: '收尾甜点与汤碗',
      items: ['玉子烧', '干瓢卷'],
      note: '甜和温暖把味道收住，余韵才留得下来。',
    },
  ];

  /** 曲线：五站之间的平滑过渡，也就是「味觉一直往上走」这件事的形状。 */
  const CURVE = 'M 68 192 C 128 188 150 166 196 152 C 250 136 292 124 330 118 C 384 110 426 92 466 80 C 506 70 548 132 574 168';
  const AREA = `${CURVE} L 574 226 L 68 226 Z`;

  const X0 = STOPS[0].x;
  const X1 = STOPS[STOPS.length - 1].x;

  /** 0 到 1，读到的位置。曲线画到 cutoff 为止。 */
  let progress = $state(0);
  /** 点过或按过键之后钉住的站，指一下曲线就解除。 */
  let pinned = $state<number | null>(null);
  /** 第一次互动之后收起「试一试」的提示。 */
  let touched = $state(false);
  let root = $state<HTMLDivElement>();
  /** 画布元素，指针坐标按它的渲染宽度换算（窄屏时画布比外层宽）。 */
  let svgEl = $state<SVGSVGElement>();
  /** 入场绘制动画的句柄和状态：用户一上手就停下来，把画面交给交互。 */
  let frame = 0;
  let drawing = false;

  const cutoff = $derived(X0 + progress * (X1 - X0));

  function nearest(x: number) {
    let best = 0;
    for (let i = 1; i < STOPS.length; i += 1) {
      if (Math.abs(STOPS[i].x - x) < Math.abs(STOPS[best].x - x)) best = i;
    }
    return best;
  }

  const activeIndex = $derived(pinned ?? nearest(cutoff));
  const active = $derived(STOPS[activeIndex]);

  /** 用户开始操作时停掉入场绘制，后面的读数交给指针或键盘。 */
  function cancelEntrance() {
    if (!drawing) return;
    drawing = false;
    cancelAnimationFrame(frame);
  }

  /** 指针横坐标换算成 0 到 1 的进度：先按画布的渲染宽度换算回 viewBox，再夹在首尾两站之间。 */
  function ratioAt(event: PointerEvent) {
    const box = (svgEl ?? (event.currentTarget as HTMLElement)).getBoundingClientRect();
    const vbX = ((event.clientX - box.left) / box.width) * 640;
    return Math.min(1, Math.max(0, (vbX - X0) / (X1 - X0)));
  }

  /** 指到哪读到哪。 */
  function follow(event: PointerEvent) {
    cancelEntrance();
    progress = ratioAt(event);
    pinned = null;
    touched = true;
  }

  /** 点一下把指针最近的一站钉住，再点同一站解除。 */
  function pin(event: PointerEvent) {
    cancelEntrance();
    const index = nearest(X0 + ratioAt(event) * (X1 - X0));
    pinned = pinned === index ? null : index;
    progress = (STOPS[index].x - X0) / (X1 - X0);
    touched = true;
  }

  function step(delta: number) {
    cancelEntrance();
    const next = Math.min(STOPS.length - 1, Math.max(0, activeIndex + delta));
    pinned = next;
    progress = (STOPS[next].x - X0) / (X1 - X0);
    touched = true;
  }

  function onKeydown(event: KeyboardEvent) {
    const map: Record<string, () => void> = {
      ArrowLeft: () => step(-1),
      ArrowRight: () => step(1),
      Home: () => step(-STOPS.length),
      End: () => step(STOPS.length),
    };
    const action = map[event.key];
    if (!action) return;
    event.preventDefault();
    action();
  }

  /** 进视野后把曲线画出来；已经在视野里（比如从编辑器预览进来）也照常画。 */
  onMount(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !root) {
      progress = 1;
      return;
    }

    let started = 0;
    const draw = (now: number) => {
      started ||= now;
      const k = Math.min(1, (now - started) / 1200);
      progress = 1 - (1 - k) ** 3;
      if (k < 1) frame = requestAnimationFrame(draw);
      else drawing = false;
    };
    drawing = true;

    const observer = new IntersectionObserver(
      (entries, self) => {
        if (!entries[0]?.isIntersecting) return;
        self.disconnect();
        frame = requestAnimationFrame(draw);
      },
      { threshold: 0.35 }
    );
    observer.observe(root);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      drawing = false;
    };
  });
</script>

<div class="omakase" bind:this={root} data-touched={touched ? '' : undefined}>
  <div class="scroll">
    <!--
      键盘和指针的交互都挂在这层 div 上：slider 角色让读屏软件听到当前站和值，
      svg 本身退成装饰（aria-hidden），避免在非交互元素上挂 tabindex 和事件。
    -->
    <div
      class="graph"
      role="slider"
      tabindex="0"
      aria-valuemin={1}
      aria-valuemax={STOPS.length}
      aria-valuenow={activeIndex + 1}
      aria-valuetext={`第 ${activeIndex + 1} 站：${active.title}，${active.short}，${active.items.join('、')}。${active.note}`}
      aria-label="一席 Omakase 的风味递进弧线，用左右方向键在五站之间切换"
      onkeydown={onKeydown}
      onpointermove={follow}
      onpointerdown={pin}
      onpointerenter={() => (touched = true)}
    >
    <svg viewBox="0 0 640 268" aria-hidden="true" bind:this={svgEl}>
      <text class="chart-title" x="24" y="30">一席 Omakase 的风味递进弧线</text>
      <text class="axis-label" x="616" y="30" text-anchor="end">浓淡与油脂度 ↑</text>

      <g class="grid">
        <line x1="24" y1="72" x2="616" y2="72" />
        <line x1="24" y1="126" x2="616" y2="126" />
        <line x1="24" y1="180" x2="616" y2="180" />
      </g>
      <line class="baseline" x1="24" y1="226" x2="616" y2="226" />

      <!-- 曲线和它下面的填充都按 cutoff 裁掉，读到哪里亮到哪里 -->
      <clipPath id="omakase-cut">
        <rect x="0" y="0" width={cutoff} height="268" />
      </clipPath>
      <path class="area" d={AREA} clip-path="url(#omakase-cut)" />
      <path class="curve" d={CURVE} clip-path="url(#omakase-cut)" />

      <!-- 还没走到的那一段，用一条很淡的线托住形状 -->
      <path class="curve-ghost" d={CURVE} />

      <!-- 扫过的位置：一条细竖线，只在下滑时出现 -->
      {#if touched && cutoff < X1 - 4 && cutoff > X0 + 4}
        <line class="scan" x1={cutoff} y1="58" x2={cutoff} y2="226" />
      {/if}

      {#each STOPS as stop, index (stop.title)}
        <g class="stop" class:lit={cutoff >= stop.x - 2} class:active={index === activeIndex} transform={`translate(${stop.x} ${stop.y})`}>
          <circle class="ring" r="13" />
          <circle class="dot" r={index === activeIndex ? 7 : 5.2} />
          <text class="title" y="-19" text-anchor="middle">{stop.title}</text>
          <text class="short" y="27" text-anchor="middle">{stop.short}</text>
        </g>
      {/each}

    </svg>
    </div>
    <p class="hint" aria-hidden="true">{touched ? '点一下停住这一贯' : '把手指放到曲线上，看看这一席怎么走'}</p>
  </div>

  <div class="caption" aria-live="polite">
    <span class="step-no">
      <b>{String(activeIndex + 1).padStart(2, '0')}</b><i>/</i>{String(STOPS.length).padStart(2, '0')}
    </span>
    <span class="step-title">{active.title}</span>
    <span class="step-items">
      {#each active.items as item, index (item)}
        {#if index > 0}<i aria-hidden="true">·</i>{/if}<span class="chip">{item}</span>
      {/each}
    </span>
    <span class="step-note">{active.note}</span>
  </div>
</div>

<style>
  .omakase {
    --ink: var(--cat-essays, var(--accent));
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
  }
  .scroll {
    position: relative;
  }
  /* 窄屏上整张图横向滑动，缩到 480px 以下字就看不清了；右缘的渐隐提示后面还有内容。 */
  @media (width < 40rem) {
    .scroll {
      overflow-x: auto;
      overscroll-behavior-x: contain;
      scrollbar-width: none;
      mask-image: linear-gradient(to right, #000 88%, transparent);
    }
    .scroll::-webkit-scrollbar {
      display: none;
    }
  }
  .graph {
    position: relative;
    cursor: crosshair;
    touch-action: pan-y;
    outline: none;
  }
  /* 指针事件统一由外层 .graph 接，svg 只当画面。 */
  .graph svg {
    pointer-events: none;
  }
  svg {
    display: block;
    width: 100%;
    height: auto;
    overflow: visible;
  }
  @media (width < 40rem) {
    svg {
      min-width: 30rem;
    }
  }
  .graph:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: 6px;
    border-radius: 8px;
  }

  .chart-title {
    font-family: var(--font-serif);
    font-size: 13px;
    font-weight: 800;
    letter-spacing: 0.02em;
    fill: var(--fg);
  }
  .axis-label {
    font-family: var(--font-mono);
    font-size: 9.5px;
    letter-spacing: 0.06em;
    fill: var(--fg-subtle);
  }
  .grid line {
    stroke: var(--line);
    stroke-width: 1;
    stroke-dasharray: 3 5;
  }
  .baseline {
    stroke: var(--line-strong);
    stroke-width: 1.2;
  }

  .curve {
    fill: none;
    stroke: var(--ink);
    stroke-width: 2.6;
    stroke-linecap: round;
  }
  .curve-ghost {
    fill: none;
    stroke: color-mix(in oklab, var(--ink) 16%, transparent);
    stroke-width: 2.6;
    stroke-linecap: round;
  }
  .area {
    fill: color-mix(in oklab, var(--ink) 11%, transparent);
  }
  .scan {
    stroke: color-mix(in oklab, var(--ink) 45%, transparent);
    stroke-width: 1;
    stroke-dasharray: 3 3;
  }

  .stop .dot {
    fill: var(--surface);
    stroke: color-mix(in oklab, var(--ink) 35%, var(--line-strong));
    stroke-width: 2;
    transition:
      r 220ms var(--ease-out-expo),
      fill 220ms ease,
      stroke 220ms ease;
  }
  .stop.lit .dot {
    fill: var(--ink);
    stroke: var(--surface);
  }
  .stop.active .dot {
    fill: var(--ink);
    stroke: var(--surface);
  }
  /* 当前这一站外面一圈缓慢呼吸的光环。 */
  .stop .ring {
    fill: none;
    stroke: var(--ink);
    stroke-width: 1.2;
    opacity: 0;
    transform: scale(0.6);
    transition:
      opacity 220ms ease,
      transform 320ms var(--ease-out-expo);
  }
  .stop.active .ring {
    opacity: 0.5;
    transform: scale(1);
    animation: omakase-pulse 2.4s ease-in-out infinite;
  }
  @keyframes omakase-pulse {
    0%,
    100% {
      opacity: 0.42;
      transform: scale(0.92);
    }
    50% {
      opacity: 0.16;
      transform: scale(1.16);
    }
  }

  .stop .title {
    font-family: var(--font-serif);
    font-size: 12px;
    font-weight: 800;
    fill: var(--fg-muted);
    transition: fill 220ms ease;
  }
  .stop .short {
    font-family: var(--font-serif);
    font-size: 10.5px;
    fill: var(--fg-subtle);
    transition: fill 220ms ease;
  }
  .stop.lit .title,
  .stop.active .title {
    fill: var(--fg);
  }
  .stop.active .short {
    fill: var(--fg-muted);
  }

  .hint {
    position: absolute;
    left: 24px;
    bottom: 2px;
    margin: 0;
    font-family: var(--font-mono);
    font-size: 0.625rem;
    letter-spacing: 0.08em;
    color: var(--fg-subtle);
    pointer-events: none;
    transition: opacity 300ms ease;
  }
  .omakase[data-touched] .hint {
    opacity: 0;
  }

  /* 说明条：左边是站号，中间是这一刻在吃什么，右边一句话。高度固定，换站时不跳。 */
  .caption {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.35rem 0.85rem;
    min-height: 3.5rem;
    padding: 0.75rem 0.95rem;
    border: 1px solid var(--line);
    border-left: 3px solid var(--ink);
    border-radius: 4px 10px 10px 4px;
    background: color-mix(in oklab, var(--ink) 5%, var(--surface));
  }
  .step-no {
    display: inline-flex;
    align-items: baseline;
    gap: 0.3rem;
    font-family: var(--font-mono);
    font-size: 0.625rem;
    color: var(--fg-subtle);
  }
  .step-no b {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--ink);
  }
  .step-no i {
    font-style: normal;
  }
  .step-title {
    font-family: var(--font-serif);
    font-size: 0.9375rem;
    font-weight: 800;
    color: var(--fg);
  }
  .step-items {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.3rem;
    font-size: 0.8125rem;
    color: var(--fg-muted);
  }
  .step-items i {
    font-style: normal;
    color: var(--fg-subtle);
  }
  .chip {
    padding: 0.05rem 0.42rem;
    border-radius: 5px;
    background: var(--surface);
    border: 1px solid var(--line);
  }
  .step-note {
    flex: 1 1 18rem;
    font-size: 0.8125rem;
    line-height: 1.6;
    color: var(--fg-muted);
  }

  @media (prefers-reduced-motion: reduce) {
    .stop .dot,
    .stop .ring {
      transition: none;
    }
    .stop.active .ring {
      animation: none;
    }
  }
</style>
