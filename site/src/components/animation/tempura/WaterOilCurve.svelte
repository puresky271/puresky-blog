<script lang="ts">
  /**
   * WaterOilCurve.svelte — 卡 2：180°C 下衣的含水率与脂质率。
   *
   * 图型来自 lieflat-charts 的 F2 Hairline Line（basics-gallery.html 的
   * 「Thirty days of sign-ups」卡，渲染代码见 B2 · hairline line 注释块）：
   * 发丝折线加逐点圆珠，底部一排日历发丝当作时间的地板。
   * 这里横轴换成 0 到 180 秒，两根发丝分别走含水率与脂质率，零点和满刻度共用一把尺。
   * 首尾两点取自八訂増補成分表，中段是示意插值；悬停出十字线读数，
   * 图表下方还有排时刻按钮，键盘也能逐点查看。
   */
  import { onMount } from 'svelte';

  import { FRYING_AXIS, FRYING_CURVE, type FryingPoint } from '@/lib/animations/tempura';

  import Card from './Card.svelte';
  import { createChartReveal } from './reveal.svelte';

  const reveal = createChartReveal();

  // ── 几何：360 × 262 的半宽画布 ──
  const VB_W = 360;
  const VB_H = 262;
  const X0 = 40;
  const X1 = 330;
  const TOP = 34;
  const BOT = 226;

  const { maxPct, tickPct, maxSeconds } = FRYING_AXIS;
  const secondsToX = (seconds: number) => X0 + (seconds / maxSeconds) * (X1 - X0);
  const pctToY = (pct: number) => BOT - (pct / maxPct) * (BOT - TOP);

  const Y_TICKS = Array.from({ length: maxPct / tickPct + 1 }, (_, index) => index * tickPct);
  /** 每半分钟一条竖向参考线。 */
  const GRID_TICKS = Array.from({ length: maxSeconds / 30 + 1 }, (_, index) => index * 30);
  /** 横轴只标整分钟，避免 0 到 3 分之间挤六个标签。 */
  const LABEL_TICKS = [
    { seconds: 0, text: '0' },
    { seconds: 60, text: '1 分' },
    { seconds: 120, text: '2 分' },
    { seconds: 180, text: '3 分' },
  ];
  /** 时间地板：每 10 秒一根发丝，把「时间」画成可数单位。 */
  const FLOOR_TICKS = Array.from({ length: maxSeconds / 10 + 1 }, (_, index) => index * 10);

  const moisturePath = FRYING_CURVE.map(
    (point, index) => `${index === 0 ? 'M' : 'L'}${secondsToX(point.seconds)} ${pctToY(point.moisturePct)}`
  ).join(' ');
  const lipidPath = FRYING_CURVE.map(
    (point, index) => `${index === 0 ? 'M' : 'L'}${secondsToX(point.seconds)} ${pctToY(point.lipidPct)}`
  ).join(' ');

  const HERO_INDEX = FRYING_CURVE.findIndex((point) => point.id === 't180');

  // ── 状态：悬停预览，点击或键盘选一个时刻钉住；默认停在 3 分这个终点 ──
  let hovered = $state<number | null>(null);
  let pinned = $state(HERO_INDEX);
  let chartEl: HTMLDivElement | undefined = $state();

  const activeIndex = $derived(hovered ?? pinned);
  const active = $derived<FryingPoint>(FRYING_CURVE[activeIndex] ?? FRYING_CURVE[0]);

  /** 指针落在图上时吸附到最近的一个读数点。 */
  function pickFromPointer(event: PointerEvent) {
    const svg = event.currentTarget as SVGSVGElement;
    const rect = svg.getBoundingClientRect();
    if (rect.width === 0) return;
    const viewX = ((event.clientX - rect.left) / rect.width) * VB_W;
    let nearest = 0;
    let distance = Number.POSITIVE_INFINITY;
    FRYING_CURVE.forEach((point, index) => {
      const gap = Math.abs(secondsToX(point.seconds) - viewX);
      if (gap < distance) {
        distance = gap;
        nearest = index;
      }
    });
    hovered = nearest;
  }

  /** 关键读数的数字标签：离顶或离底太近时换到另一侧，避免和轴线、另一条线打架。 */
  function moistureLabelY(point: FryingPoint): number {
    return pctToY(point.moisturePct) + (point.moisturePct > 25 ? -11 : 14);
  }

  function lipidLabelY(point: FryingPoint): number {
    return pctToY(point.lipidPct) + (point.lipidPct > 30 ? -10 : 14);
  }

  const svgLabel = `180 摄氏度油温下衣的含水率与脂质率随炸制时间变化：${FRYING_CURVE.map(
    (point) => `${point.tick}含水率 ${point.moisturePct}%，脂质率 ${point.lipidPct}%`
  ).join('，')}。首尾两点取自食品成分表，中段为示意。`;

  onMount(() => {
    if (!chartEl) return;
    return reveal.observe(chartEl);
  });
</script>

<Card
  title="衣里的水从六成半掉到一成，脂质涨到近五成"
  sub="180°C 油温 · 一条线 = 衣的含水率，一条线 = 衣的脂质率 · 单位 %（衣重）· 首尾取八订成分表的生衣与炸后衣，中间为示意"
  src="HAIRLINE LINE · PORCELAIN · MEXT 2023 / JSFC 2025"
  replay={reveal.replay}
>
  <div class="tf-chart" class:tf-in={reveal.run} bind:this={chartEl}>
    <svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      role="img"
      aria-label={svgLabel}
      onpointermove={pickFromPointer}
      onpointerleave={() => (hovered = null)}
    >
      <!-- 图例：两根发丝各代表一条序列 -->
      <g class="tf-fade" style="--d:.1s">
        <line x1={X0} y1="12" x2={X0 + 18} y2="12" stroke="var(--tf-data)" stroke-width="2.2" />
        <circle cx={X0 + 9} cy="12" r="2.6" fill="var(--tf-data)" />
        <text x={X0 + 24} y="15" fill="var(--tf-muted)" font-size="7.5" font-weight="600">含水率</text>
        <line x1={X0 + 74} y1="12" x2={X0 + 92} y2="12" stroke="var(--tf-data-2)" stroke-width="2" />
        <circle cx={X0 + 83} cy="12" r="2.4" fill="var(--tf-data-2)" />
        <text x={X0 + 98} y="15" fill="var(--tf-muted)" font-size="7.5" font-weight="600">脂质率</text>
      </g>

      <!-- 横向网格与纵轴刻度 -->
      {#each Y_TICKS as tick (tick)}
        {@const y = pctToY(tick)}
        <line
          x1={X0}
          y1={y}
          x2={X1}
          y2={y}
          stroke="var(--tf-grid)"
          stroke-width="1"
          class="tf-fade"
          style={`--d:${0.12 + tick * 0.001}s`}
        />
        <text
          x={X0 - 6}
          y={y + 2.5}
          text-anchor="end"
          fill="var(--tf-muted)"
          font-size="7.5"
          font-weight="600"
          class="tf-fade"
          style={`--d:${0.12 + tick * 0.001}s`}>{tick}%</text
        >
      {/each}

      <!-- 半分钟一条竖向参考线 -->
      {#each GRID_TICKS as second (second)}
        <line
          x1={secondsToX(second)}
          y1={TOP}
          x2={secondsToX(second)}
          y2={BOT}
          stroke="var(--tf-grid)"
          stroke-width=".8"
          stroke-dasharray="2 5"
          class="tf-fade"
          style={`--d:${0.15 + second * 0.002}s`}
        />
      {/each}

      <!-- 时间地板：每 10 秒一根发丝 -->
      {#each FLOOR_TICKS as second (second)}
        <line
          x1={secondsToX(second)}
          y1={BOT}
          x2={secondsToX(second)}
          y2={BOT - (second % 60 === 0 ? 7 : 4)}
          stroke="var(--tf-grid)"
          stroke-width=".8"
          class="tf-fade"
          style={`--d:${0.2 + second * 0.004}s`}
        />
      {/each}
      <line
        x1={X0}
        y1={BOT}
        x2={X1}
        y2={BOT}
        stroke="var(--tf-grid)"
        stroke-width="1"
        class="tf-fade"
        style="--d:.2s"
      />

      <!-- 十字线：当前选中的时刻 -->
      <line
        x1={secondsToX(active.seconds)}
        y1={TOP}
        x2={secondsToX(active.seconds)}
        y2={BOT}
        stroke="var(--tf-data)"
        stroke-width="1"
        stroke-dasharray="3 4"
        stroke-opacity=".75"
      />

      <!-- 两条发丝折线 -->
      <path
        d={moisturePath}
        fill="none"
        stroke="var(--tf-data)"
        stroke-width="2.2"
        stroke-linejoin="round"
        stroke-linecap="round"
        pathLength="1"
        class="tf-draw"
        style="--d:.28s"
      />
      <path
        d={lipidPath}
        fill="none"
        stroke="var(--tf-data-2)"
        stroke-width="2"
        stroke-linejoin="round"
        stroke-linecap="round"
        pathLength="1"
        class="tf-draw"
        style="--d:.4s"
      />

      <!-- 逐点圆珠，3 分钟处的含水率用主角色点出来 -->
      {#each FRYING_CURVE as point, index (point.id)}
        {@const isActive = index === activeIndex}
        {@const isHero = index === HERO_INDEX}
        <circle
          cx={secondsToX(point.seconds)}
          cy={pctToY(point.moisturePct)}
          r={isHero ? 5 : isActive ? 4 : 3}
          fill={isHero ? 'var(--tf-hero)' : 'var(--tf-data)'}
          stroke="var(--bg)"
          stroke-width="1.4"
          class="tf-pop"
          style={`--d:${0.5 + index * 0.05}s`}
        />
        <circle
          cx={secondsToX(point.seconds)}
          cy={pctToY(point.lipidPct)}
          r={isActive ? 3.6 : 2.8}
          fill="var(--tf-data-2)"
          stroke="var(--bg)"
          stroke-width="1.2"
          class="tf-pop"
          style={`--d:${0.56 + index * 0.05}s`}
        />
        {#if point.callout}
          <text
            x={secondsToX(point.seconds)}
            y={moistureLabelY(point)}
            text-anchor="middle"
            fill="var(--tf-ink)"
            font-size="8.5"
            font-weight="800"
            class="tf-fade"
            style={`--d:${0.8 + index * 0.05}s`}>水 {point.moisturePct}</text
          >
          <text
            x={secondsToX(point.seconds)}
            y={lipidLabelY(point)}
            text-anchor="middle"
            fill="var(--tf-data)"
            font-size="8.5"
            font-weight="800"
            class="tf-fade"
            style={`--d:${0.85 + index * 0.05}s`}>脂 {point.lipidPct}</text
          >
        {/if}
      {/each}

      <!-- 横轴刻度 -->
      {#each LABEL_TICKS as label (label.seconds)}
        <text
          x={secondsToX(label.seconds)}
          y={BOT + 15}
          text-anchor={label.seconds === 0 ? 'start' : label.seconds === maxSeconds ? 'end' : 'middle'}
          fill="var(--tf-muted)"
          font-size="7.5"
          font-weight="600"
          class="tf-fade"
          style={`--d:${0.25 + label.seconds * 0.001}s`}>{label.text}</text
        >
      {/each}
      <text
        x={X1}
        y={BOT + 28}
        text-anchor="end"
        fill="var(--tf-muted)"
        font-size="7.5"
        font-weight="600"
        letter-spacing=".08em"
        class="tf-fade"
        style="--d:.5s">炸制时间</text
      >
    </svg>

    <div class="tf-readout" aria-live="polite">
      <span class="tf-readout-main">
        <span class="tf-readout-num tf-num">{active.tick}</span>
        <span class="tf-readout-unit">炸制时间</span>
      </span>
      <div class="tf-readout-cell">
        <span class="tf-readout-key">含水率</span>
        <span class="tf-readout-val tf-num">{active.moisturePct}%</span>
      </div>
      <div class="tf-readout-cell">
        <span class="tf-readout-key">脂质率</span>
        <span class="tf-readout-val tf-num">{active.lipidPct}%</span>
      </div>
      <span class="tf-readout-note">悬停曲线或在下面选一个时刻，这里给出该点的含水率与脂质率。</span>
    </div>

    <div class="tf-chips" role="group" aria-label="选择炸制时刻">
      {#each FRYING_CURVE as point, index (point.id)}
        <button
          type="button"
          class="tf-chip"
          aria-pressed={index === pinned}
          onclick={() => (pinned = index)}
        >
          {point.tick}
        </button>
      {/each}
    </div>
  </div>
</Card>
