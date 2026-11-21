<script lang="ts">
  /**
   * SeasonArcMatrix.svelte — 卡 3：八种天妇罗食材的十二个月旬期。
   *
   * 图型来自 lieflat-charts 的 L4 Arc Matrix（lupi-gallery.html 的
   * 「Eight products land in twelve cities」卡，渲染代码见 ARC MATRIX 注释块）：
   * 一行一种食材，一条地平线弧跨过十二个月，弧上的交点就是月份，
   * 气泡面积 = 该月旬期强度，面积用 Math.sqrt 换算半径。
   * 每个月份列铺一块透明热区，点一下或键盘选中，图下读数条展开八种食材的分数与状态。
   * 舞台是通栏宽卡：720 × 348 的画布，手机上改为横向滚动。
   */
  import { onMount } from 'svelte';

  import { SEASON_MATRIX, seasonState, type SeasonState } from '@/lib/animations/tempura';

  import Card from './Card.svelte';
  import { createChartReveal } from './reveal.svelte';

  const reveal = createChartReveal();

  // ── 几何：720 × 348 的通栏画布，八行十二列 ──
  const VB_W = 720;
  const VB_H = 348;
  const LABEL_X = 112;
  const X0 = 152;
  const STEP = 42;
  const ROW_TOP = 62;
  const ROW_GAP = 29;
  const ARC_H = 14;
  const AXIS_Y = 292;
  const MONTH_COUNT = 12;

  const colX = (monthIndex: number) => X0 + monthIndex * STEP;
  /** 地平线弧：两端落在行基线上，中间抬起，十二个月等距。 */
  const arcDy = (monthIndex: number) => -ARC_H * Math.sin((Math.PI * monthIndex) / (MONTH_COUNT - 1));
  /** 气泡半径：面积与旬期强度成正比。 */
  const bubbleR = (score: number) => 4 * Math.sqrt(Math.max(0, score));

  const ROWS = SEASON_MATRIX.map((entry, index) => ({
    entry,
    y: ROW_TOP + index * ROW_GAP,
    peakIndex: entry.scores.reduce((best, score, monthIndex) => (score > entry.scores[best] ? monthIndex : best), 0),
  }));

  /** 实心气泡按旬期分配明度，一两分的淡季用空心，避免浅色填充在纸面上看不见。 */
  function bubbleFill(score: number): string {
    if (score >= 5) return 'var(--tf-hero)';
    if (score === 4) return 'var(--tf-data)';
    if (score === 3) return 'var(--tf-data-2)';
    return 'none';
  }

  function bubbleStroke(score: number): string {
    return score >= 3 ? 'none' : 'var(--tf-data-2)';
  }

  function horizonPath(baseY: number): string {
    return Array.from({ length: MONTH_COUNT }, (_, monthIndex) => {
      const x = colX(monthIndex);
      const y = baseY + arcDy(monthIndex);
      return `${monthIndex === 0 ? 'M' : 'L'}${x} ${y.toFixed(1)}`;
    }).join(' ');
  }

  // ── 状态：默认停在 1 月；点月份列选中，按 Escape 取消选中（焦点留在当前列） ──
  let pinned = $state<number | null>(0);
  let chartEl: HTMLDivElement | undefined = $state();

  const selectedIndex = $derived(pinned);

  const readings = $derived(
    selectedIndex === null
      ? []
      : SEASON_MATRIX.map((entry) => {
          const score = entry.scores[selectedIndex] ?? 0;
          return { id: entry.id, label: entry.label, score, state: seasonState(score) as SeasonState };
        })
  );

  const peakCount = $derived(readings.filter((reading) => reading.score >= 5).length);

  const summary = $derived.by(() => {
    if (selectedIndex === null) return '';
    if (readings.every((reading) => reading.score <= 2)) return '这个月整体退到淡季';
    if (peakCount >= 2) return `这个月有 ${peakCount} 种食材正当巅峰`;
    if (peakCount === 1) {
      const peak = readings.find((reading) => reading.score >= 5);
      return `${peak?.label ?? '一种食材'}独自登顶，其余还在等`;
    }
    return '这个月没有巅峰旬，大多在正当时与淡季之间';
  });

  const svgLabel = $derived(
    selectedIndex === null
      ? '八种食材的十二月旬期矩阵，当前没有选中月份。点月份列或按 Tab 聚焦列后可以查看该月的旬期读数。'
      : `八种食材的十二月旬期矩阵，当前选中的是 ${selectedIndex + 1} 月：${readings
          .map((reading) => `${reading.label} ${reading.score} 分 ${reading.state}`)
          .join('，')}。`
  );

  function columnNote(monthIndex: number): string {
    return SEASON_MATRIX.map((entry) => `${entry.label} ${entry.scores[monthIndex]} 分`).join(' · ');
  }

  function selectMonth(monthIndex: number) {
    pinned = monthIndex;
  }

  onMount(() => {
    if (!chartEl) return;
    return reveal.observe(chartEl);
  });
</script>

<Card
  wide
  title="春菊从深秋美到早春，鱧只在夏天上场"
  sub="气泡面积 = 该月旬期强度（1 到 5 的编者评分）· 一条弧 = 一种食材 · 空心 = 淡季 · 点月份列看读数"
  src="ARC MATRIX · PORCELAIN · EDITOR'S MONTHLY SCORE"
  replay={reveal.replay}
>
  <div class="tf-chart" class:tf-in={reveal.run} bind:this={chartEl}>
    <div class="tf-scroll">
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} role="img" aria-label={svgLabel}>
        <!-- 选中月份的竖向底色 -->
        {#if selectedIndex !== null}
          <rect
            x={colX(selectedIndex) - STEP / 2}
            y={ROW_TOP - 22}
            width={STEP}
            height={AXIS_Y - ROW_TOP + 22}
            fill="var(--tf-data)"
            fill-opacity="0.05"
            class="tf-fade"
            style="--d:.3s"
          />
        {/if}

        <!-- 八行食材：地平线弧、交点气泡与峰值读数 -->
        {#each ROWS as row, rowIndex (row.entry.id)}
          {@const baseY = row.y}
          <path
            d={horizonPath(baseY)}
            fill="none"
            stroke="var(--tf-grid)"
            stroke-width="1.2"
            pathLength="1"
            class="tf-draw"
            style={`--d:${0.05 + rowIndex * 0.07}s`}
          />
          <text
            x={LABEL_X}
            y={baseY + 3}
            text-anchor="end"
            fill="var(--tf-ink)"
            font-size="10"
            font-weight="800"
            class="tf-fade"
            style={`--d:${0.12 + rowIndex * 0.06}s`}>{row.entry.label}</text
          >
          <text
            x={LABEL_X}
            y={baseY + 13}
            text-anchor="end"
            fill="var(--tf-muted)"
            font-size="7"
            class="tf-fade"
            style={`--d:${0.15 + rowIndex * 0.06}s`}>{row.entry.jaLabel}</text
          >

          {#each row.entry.scores as score, monthIndex (monthIndex)}
            {@const cx = colX(monthIndex)}
            {@const cy = baseY + arcDy(monthIndex)}
            {@const radius = bubbleR(score)}
            <circle
              cx={cx}
              cy={cy}
              r={radius}
              fill={bubbleFill(score)}
              stroke={bubbleStroke(score)}
              stroke-width={score >= 3 ? 0 : 1.2}
              class="tf-pop"
              style={`--d:${0.3 + rowIndex * 0.04 + monthIndex * 0.014}s`}
            >
              <title>{row.entry.label} · {monthIndex + 1} 月 · 旬期 {score}/5 · {seasonState(score)}</title>
            </circle>
            {#if monthIndex === row.peakIndex}
              <text
                x={cx}
                y={cy - radius - 4}
                text-anchor="middle"
                fill="var(--tf-ink)"
                font-size="7.5"
                font-weight="800"
                class="tf-fade"
                style={`--d:${0.75 + rowIndex * 0.04}s`}>{score}</text
              >
            {/if}
          {/each}
        {/each}

        <!-- 月份轴 -->
        <line
          x1={colX(0) - STEP / 2}
          y1={AXIS_Y}
          x2={colX(MONTH_COUNT - 1) + STEP / 2}
          y2={AXIS_Y}
          stroke="var(--tf-grid)"
          stroke-width="1"
          class="tf-fade"
          style="--d:.3s"
        />
        {#each Array.from({ length: MONTH_COUNT }, (_, index) => index) as monthIndex (monthIndex)}
          {@const cx = colX(monthIndex)}
          <line
            x1={cx}
            y1={AXIS_Y}
            x2={cx}
            y2={AXIS_Y + 5}
            stroke="var(--tf-grid)"
            stroke-width="1"
            class="tf-fade"
            style="--d:.3s"
          />
          <text
            x={cx}
            y={AXIS_Y + 17}
            text-anchor="middle"
            fill={monthIndex === selectedIndex ? 'var(--tf-ink)' : 'var(--tf-muted)'}
            font-size="8"
            font-weight={monthIndex === selectedIndex ? 800 : 600}
            class="tf-fade"
            style={`--d:${0.3 + monthIndex * 0.02}s`}>{monthIndex + 1}</text
          >
        {/each}
        <text
          x={colX(MONTH_COUNT - 1) + STEP / 2 + 4}
          y={AXIS_Y + 17}
          text-anchor="start"
          fill="var(--tf-muted)"
          font-size="7"
          font-weight="600"
          class="tf-fade"
          style="--d:.45s">月</text
        >

        <!-- 图例：气泡面积与明度一起编码旬期强度 -->
        <g class="tf-fade" style="--d:.8s">
          <text x="636" y="66" fill="var(--tf-muted)" font-size="8" font-weight="600" letter-spacing=".08em"
            >旬期强度</text
          >
          <circle cx="644" cy="92" r={bubbleR(5)} fill="var(--tf-hero)" />
          <text x="660" y="95" fill="var(--tf-muted)" font-size="7.5">5 巅峰旬</text>
          <circle cx="644" cy="126" r={bubbleR(3)} fill="var(--tf-data-2)" />
          <text x="660" y="129" fill="var(--tf-muted)" font-size="7.5">3 正当时</text>
          <circle cx="644" cy="158" r={bubbleR(1)} fill="none" stroke="var(--tf-data-2)" stroke-width="1.2" />
          <text x="660" y="161" fill="var(--tf-muted)" font-size="7.5">1 淡季</text>
        </g>

        <text
          x={colX(0) - STEP / 2}
          y={VB_H - 8}
          text-anchor="start"
          fill="var(--tf-muted)"
          font-size="7"
          letter-spacing=".06em"
          class="tf-fade"
          style="--d:.9s">气泡面积 = 旬期强度 · 空心 = 淡季 · 一行一种食材跨十二个月</text
        >

        <!-- 月份列热区：透明 rect 盖在整列上，鼠标和键盘都能选中，Escape 取消选中 -->
        {#each Array.from({ length: MONTH_COUNT }, (_, index) => index) as monthIndex (monthIndex)}
          <rect
            x={colX(monthIndex) - STEP / 2}
            y={ROW_TOP - 22}
            width={STEP}
            height={AXIS_Y - ROW_TOP + 22}
            fill="transparent"
            role="button"
            tabindex="0"
            aria-pressed={monthIndex === pinned}
            aria-label={`${monthIndex + 1} 月：${columnNote(monthIndex)}`}
            class="tf-col"
            onclick={() => selectMonth(monthIndex)}
            onkeydown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                selectMonth(monthIndex);
              } else if (event.key === 'Escape') {
                pinned = null;
              }
            }}
          >
            <title>{monthIndex + 1} 月 · {columnNote(monthIndex)}</title>
          </rect>
        {/each}
      </svg>
    </div>

    <div class="tf-readout tf-season-readout" aria-live="polite">
      {#if selectedIndex === null}
        <span class="tf-hint">点月份列查看这个月的八种食材评分，按 Escape 可以取消选中。</span>
      {:else}
        <span class="tf-readout-main">
          <span class="tf-readout-num tf-num">{selectedIndex + 1}</span>
          <span class="tf-readout-unit">月 · 旬期</span>
        </span>
        <span class="tf-season-summary">{summary}</span>
        <div class="tf-season-grid">
          {#each readings as reading (reading.id)}
            <div class="tf-readout-cell">
              <span class="tf-readout-key">{reading.label}</span>
              <span class="tf-readout-val tf-num">
                {reading.score}<span class="tf-season-denom">/5</span>
                <span class="tf-season-state" data-state={reading.state}>{reading.state}</span>
              </span>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>
</Card>

<style>
  .tf-season-denom {
    margin-left: 1px;
    font-size: 9px;
    font-weight: 600;
    color: var(--tf-muted);
  }
  .tf-season-state {
    margin-left: 6px;
    font-size: 9px;
    font-weight: 600;
    color: var(--tf-muted);
  }
  .tf-season-state[data-state='巅峰旬'] {
    color: var(--tf-ink);
  }
  .tf-season-state[data-state='淡季'] {
    color: var(--tf-muted);
  }
</style>
