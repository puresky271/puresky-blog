<script lang="ts">
  /**
   * 对抗蒸馏收录文章里那张交互折线图的 1:1 复刻。
   *
   * 原站是 Vega-Lite 图表：两个标签页（ExploitBench / SEC-bench Pro），每个基准
   * 4 条线 × 8 个推理预算，蓝线是用推理摘要训练的基线，黄线是用完整推理轨迹训练的路线，
   * 虚线是监督微调之后，实线是强化学习之后。数据从原站 RSC payload 原样抽出，
   * 放在 public/data/adversarial-distillation/chart.json。
   *
   * 交互：点标签切换基准（切换时线段从左往右扫出来、点依次弹出），
   * 鼠标停在点上显示 tooltip（Training data / Training stage / 推理预算 / 能力覆盖率）。
   * 原站图表没有 tooltip，这一条是方便读数的补充；其余视觉参数照原站量。
   */

  import { onMount } from 'svelte';

  import { loadJson, type AdvdBenchmark, type AdvdData, type AdvdSeries } from './data';
  import './advd.css';

  let { config = {} }: { config?: Record<string, unknown> } = $props();
  $effect(() => {
    void config;
  });

  let data = $state<AdvdData | null>(null);
  let error = $state('');
  let active = $state(0);
  let hover = $state<{ series: number; point: number } | null>(null);
  let svgElement = $state<SVGSVGElement | null>(null);

  onMount(async () => {
    try {
      data = await loadJson<AdvdData>('data/adversarial-distillation/chart.json');
    } catch {
      error = '图表数据加载失败，请刷新页面重试。';
    }
  });

  /** 绘图区几何照原站 SVG：675×450 画布，绘图区 (74,11) 起，576×357。 */
  const GEO = { width: 675, height: 450, left: 74, top: 11, plotWidth: 576, plotHeight: 357 } as const;
  const Y_TICKS = [0, 10, 20, 30, 40];

  const bench = $derived(data ? data.benchmarks[active] : null);
  const budgets = $derived(data ? data.budgets : []);

  const xOf = (index: number) => GEO.left + (index / (budgets.length - 1)) * GEO.plotWidth;
  const yOf = (score: number) => GEO.top + (1 - score / 40) * GEO.plotHeight;

  function pathOf(series: AdvdSeries): string {
    return series.values
      .map((score, index) => `${index === 0 ? 'M' : 'L'}${xOf(index).toFixed(2)},${yOf(score).toFixed(2)}`)
      .join('');
  }

  function colorOf(series: AdvdSeries): string {
    return series.color === 'blue' ? 'var(--advd-blue)' : 'var(--advd-yellow)';
  }

  function dashOf(series: AdvdSeries): string | undefined {
    return series.dash === 'none' ? undefined : series.dash;
  }

  function select(index: number, focus = false) {
    if (!data || index === active) return;
    active = index;
    hover = null;
    if (focus) {
      const button = document.getElementById(`advd-tab-${index}`);
      button?.focus();
    }
  }

  function onTabKeydown(event: KeyboardEvent) {
    if (!data) return;
    const last = data.benchmarks.length - 1;
    let next = active;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = active === 0 ? last : active - 1;
    else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = active === last ? 0 : active + 1;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = last;
    else return;
    event.preventDefault();
    select(next, true);
  }

  /** 指针位置换成画布坐标，找最近的数据点（阈值 24 画布像素）。 */
  function onPointerMove(event: PointerEvent) {
    if (!bench || !svgElement) return;
    const rect = svgElement.getBoundingClientRect();
    if (!rect.width) return;
    const scale = GEO.width / rect.width;
    const x = (event.clientX - rect.left) * scale;
    const y = (event.clientY - rect.top) * scale;
    let best: { series: number; point: number; distance: number } | null = null;
    bench.series.forEach((series, seriesIndex) => {
      series.values.forEach((score, pointIndex) => {
        const dx = xOf(pointIndex) - x;
        const dy = yOf(score) - y;
        const distance = Math.hypot(dx, dy);
        if (distance <= 24 && (!best || distance < best.distance)) best = { series: seriesIndex, point: pointIndex, distance };
      });
    });
    hover = best ? { series: (best as { series: number }).series, point: (best as { point: number }).point } : null;
  }

  function clearHover() {
    hover = null;
  }

  const hovered = $derived.by(() => {
    if (!bench || !hover) return null;
    const series = bench.series[hover.series];
    const value = series.values[hover.point];
    const budget = budgets[hover.point];
    const x = xOf(hover.point);
    const y = yOf(value);
    const ratio = x / GEO.width;
    const flip = ratio > 0.72 ? 'left' : ratio < 0.28 ? 'right' : 'center';
    return {
      series,
      value,
      budget,
      color: colorOf(series),
      left: `${((x / GEO.width) * 100).toFixed(3)}%`,
      top: `${((y / GEO.height) * 100).toFixed(3)}%`,
      flip,
      x,
      y,
    };
  });

  const captionEn =
    'Cyber benchmark performance after training on exact reasoning traces or reasoning summaries. Each panel compares two runs of the same pretrained student model, as we increase the inference budgets at evaluation time. Blue lines show the user-visible baseline, which included reasoning summaries. Yellow lines show the run trained with exact reasoning traces. Dashed lines show performance after supervised fine-tuning, and solid lines show performance after further reinforcement learning.';
  const captionZh =
    '图 1：上下两个标签页分别是 ExploitBench 和 SEC-bench Pro，点标签可以切换。蓝线是用推理摘要训练的基线，黄线是用完整推理轨迹训练的路线。虚线是监督微调之后，实线是强化学习之后。把鼠标停在点上可以看到具体数值。重点看最右端：黄实线在两张图里都明显高出蓝实线，而且差距随推理预算拉大。';

  const formatBudget = (value: number) => value.toLocaleString('en-US');
  const formatScore = (value: number) => value.toFixed(2);
</script>

<figure class="advd-figure">
  <div class="advd-card">
    {#if error}
      <p class="advd-fallback">{error}</p>
    {:else if data && bench}
      <div class="advd-tabs">
        <div class="advd-tabgroup" role="tablist" aria-label="选择基准" tabindex="-1" onkeydown={onTabKeydown}>
          {#each data.benchmarks as item, index (item.id)}
            <button
              type="button"
              role="tab"
              id={`advd-tab-${index}`}
              aria-selected={index === active}
              aria-controls="advd-panel"
              tabindex={index === active ? 0 : -1}
              class="advd-tab"
              onclick={() => select(index)}
            >
              {item.tab}
            </button>
          {/each}
        </div>
      </div>

      <div id="advd-panel" role="tabpanel" aria-labelledby={`advd-tab-${active}`}>
      <div class="advd-head">
        <p class="advd-title">{bench.title}</p>
      </div>

      <ul class="advd-legend" aria-label="图例">
        {#each bench.series as series (series.id)}
          <li class="advd-legend-item">
            <svg class="advd-swatch" viewBox="0 0 28 16" width="28" height="16" aria-hidden="true">
              <line
                x1="2"
                y1="8"
                x2="26"
                y2="8"
                stroke={colorOf(series)}
                stroke-dasharray={dashOf(series)}
                class="advd-swatch-line"
              />
            </svg>
            <span>{series.label}</span>
          </li>
        {/each}
      </ul>

      <div class="advd-plot-scroll">
        <div class="advd-plot-inner">
          {#key active}
            <svg
              bind:this={svgElement}
              class="advd-plot"
              viewBox="0 0 675 450"
              width="675"
              height="450"
              role="img"
              aria-label={`${bench.title}：四组训练数据在 8 个推理预算下的${bench.yTitle}对比。蓝线是推理摘要，黄线是完整推理轨迹；虚线是监督微调之后，实线是强化学习之后。`}
              onpointermove={onPointerMove}
              onpointerdown={onPointerMove}
              onpointerleave={clearHover}
            >
              <g class="advd-frame">
                <line class="advd-axis-line" x1={GEO.left} y1={GEO.top} x2={GEO.left} y2={GEO.top + GEO.plotHeight} />
                <line
                  class="advd-axis-line"
                  x1={GEO.left}
                  y1={GEO.top + GEO.plotHeight}
                  x2={GEO.left + GEO.plotWidth}
                  y2={GEO.top + GEO.plotHeight}
                />
                {#each Y_TICKS as tick (tick)}
                  <line
                    class="advd-axis-line"
                    x1={GEO.left - 5}
                    y1={yOf(tick)}
                    x2={GEO.left}
                    y2={yOf(tick)}
                  />
                  <text class="advd-axis-label" x={GEO.left - 15} y={yOf(tick) + 4} text-anchor="end">{tick}%</text>
                {/each}
                {#each [0, budgets.length - 1] as index (index)}
                  <line
                    class="advd-axis-line"
                    x1={xOf(index)}
                    y1={GEO.top + GEO.plotHeight}
                    x2={xOf(index)}
                    y2={GEO.top + GEO.plotHeight + 5}
                  />
                  <text
                    class="advd-axis-label"
                    x={xOf(index)}
                    y={GEO.top + GEO.plotHeight + 24}
                    text-anchor="middle">{index === 0 ? 'Lower' : 'Higher'}</text
                  >
                {/each}
                <text
                  class="advd-axis-title"
                  transform={`translate(${GEO.left - 54.8},${GEO.top + GEO.plotHeight / 2}) rotate(-90)`}
                  text-anchor="middle"
                  dy="0.32em"
                >
                  {bench.yTitle}
                </text>
                <text
                  class="advd-axis-title"
                  x={GEO.left + GEO.plotWidth / 2}
                  y={GEO.top + GEO.plotHeight + 46}
                  text-anchor="middle">Inference budget</text
                >
                <text
                  class="advd-axis-title"
                  x={GEO.left + GEO.plotWidth / 2}
                  y={GEO.top + GEO.plotHeight + 65}
                  text-anchor="middle">(weighted output tokens)</text
                >
              </g>

              <g class="advd-marks">
                {#each bench.series as series, seriesIndex (series.id)}
                  <path
                    class="advd-line"
                    d={pathOf(series)}
                    stroke={colorOf(series)}
                    stroke-dasharray={dashOf(series)}
                  />
                  {#each series.values as score, pointIndex (pointIndex)}
                    <circle
                      class="advd-point"
                      cx={xOf(pointIndex)}
                      cy={yOf(score)}
                      r="3.536"
                      fill={series.filled ? colorOf(series) : 'var(--advd-bg)'}
                      stroke={colorOf(series)}
                      style:--i={seriesIndex * 8 + pointIndex}
                    />
                  {/each}
                {/each}
                {#if hovered}
                  <circle
                    class="advd-hover-point"
                    cx={hovered.x}
                    cy={hovered.y}
                    r="5.6"
                    fill={hovered.series.filled ? hovered.color : 'var(--advd-bg)'}
                    stroke={hovered.color}
                  />
                {/if}
              </g>
            </svg>

            {#if hovered}
              <div
                class="advd-tip"
                data-flip={hovered.flip === 'center' ? undefined : hovered.flip}
                style:left={hovered.left}
                style:top={hovered.top}
              >
                <div class="advd-tip-head">
                  <svg class="advd-swatch" viewBox="0 0 28 16" width="28" height="16" aria-hidden="true">
                    <line
                      x1="2"
                      y1="8"
                      x2="26"
                      y2="8"
                      stroke={hovered.color}
                      stroke-dasharray={dashOf(hovered.series)}
                      class="advd-swatch-line"
                    />
                  </svg>
                  <span>{hovered.series.label}</span>
                </div>
                <div class="advd-tip-row"><span>Training data</span><b>{hovered.series.dataLabel}</b></div>
                <div class="advd-tip-row"><span>Training stage</span><b>{hovered.series.stageLabel}</b></div>
                <div class="advd-tip-row">
                  <span>Inference budget (weighted output tokens)</span><b>{formatBudget(hovered.budget)}</b>
                </div>
                <div class="advd-tip-row"><span>{bench.scoreTitle}</span><b>{formatScore(hovered.value)}</b></div>
              </div>
            {/if}
          {/key}
        </div>
      </div>
      </div>
    {:else}
      <p class="advd-fallback">图表加载中…</p>
    {/if}
  </div>

  <figcaption>
    <div class="bi-en" lang="en"><p>{captionEn}</p></div>
    <div class="bi-zh"><p>{captionZh}</p></div>
  </figcaption>
</figure>
