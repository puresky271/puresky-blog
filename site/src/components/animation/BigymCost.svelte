<script lang="ts">
  /**
   * 成本散点：复刻原站 #board 里「A score is a point on a cost curve」那一块。
   *
   * 横轴是一次 session 在服务商报价单上的花费（对数刻度），纵轴是 9 个 core 任务的平均成功率。
   * 同一个模型跑了几档思考强度就是一条线穿过的几个点。指着某个点：这条线上的其它点变灰，
   * 从坐标轴拉出两条虚线，右上角写成功率、下边写成本，旁边跟一个提示框。
   *
   * 坐标全部用原站 SVG 里算好的值（viewBox 1100×420，左边界 56，横轴在 368），
   * 不重算，免得和原站位置对不上。
   */

  import { onMount } from 'svelte';

  import { loadJson, styleValue, type CostData, type CostPoint, type CostSeries, type ViewId } from './bigym/data';
  import './bigym/base.css';

  let { config = {} }: { config?: Record<string, unknown> } = $props();
  $effect(() => { void config; });

  import './bigym/cost.css';

  const SETS: { id: ViewId; label: string }[] = [
    { id: 'all', label: '20 tasks' },
    { id: 'core', label: '9 core' },
    { id: 'ext', label: '11 extended' },
  ];

  let data = $state<CostData | null>(null);
  let view = $state<ViewId>('core');
  let error = $state('');
  let hover = $state<{ series: CostSeries; point: CostPoint } | null>(null);
  let tip = $state<{ left: number; top: number; flip: boolean } | null>(null);
  let svgElement = $state<SVGSVGElement | null>(null);
  let wrapElement = $state<HTMLDivElement | null>(null);

  onMount(async () => {
    try {
      data = await loadJson<CostData>('data/bigym2/cost.json');
    } catch {
      error = '成本散点加载失败，请刷新页面重试。';
    }
  });

  const current = $derived(data ? data[view] : null);

  function colorOf(style: string | undefined): string {
    return styleValue(style, '--c').replace(/var\(--series-/g, 'var(--bm-series-').replace(/var\(--bar\)/g, 'var(--bm-bar)');
  }

  /** 把 SVG 坐标换成页面像素，用来摆浮动提示框。 */
  function locate(point: CostPoint) {
    if (!svgElement || !wrapElement) return;
    const svgRect = svgElement.getBoundingClientRect();
    const wrapRect = wrapElement.getBoundingClientRect();
    const scale = svgRect.width / 1100;
    const left = Number(point.x) * scale + (svgRect.left - wrapRect.left);
    const top = Number(point.y) * scale + (svgRect.top - wrapRect.top);
    tip = { left, top, flip: left + 230 > svgRect.width + (svgRect.left - wrapRect.left) };
  }

  function enter(series: CostSeries, point: CostPoint) {
    hover = { series, point };
    locate(point);
  }

  function leave() {
    hover = null;
    tip = null;
  }

  /** 坐标读数：成功率写纵轴尽头，成本写横轴下方，和原站位置一致。 */
  const guide = $derived.by(() => {
    if (!hover || !current) return null;
    const x = Number(hover.point.x);
    const y = Number(hover.point.y);
    const x0 = Number(current.x0);
    const axis = Number(current.axisY);
    const score = `${hover.point.score}%`;
    const cost = `$${hover.point.cost}`;
    return {
      x,
      y,
      x0,
      axis,
      score,
      cost,
      scoreWidth: score.length * 7.6 + 18,
      costWidth: cost.length * 7.6 + 18,
      color: colorOf(hover.series.style),
    };
  });

  function switchTo(id: ViewId) {
    hover = null;
    tip = null;
    view = id;
  }
</script>

<div class="bm-demo bm-cost">
  {#if error}
    <p class="bm-error">{error}</p>
  {:else if !data || !current}
    <p class="bm-loading">成本散点加载中。</p>
  {:else}
    <div class="bm-cost-head">
      <div class="bm-seg" role="group" aria-label="Task set">
        {#each SETS as set (set.id)}
          <button type="button" aria-pressed={view === set.id} onclick={() => switchTo(set.id)}>{set.label}</button>
        {/each}
      </div>
    </div>

    <p class="bm-sub">
      横轴是跑一次 session 在服务商报价单上的花费，纵轴是三套任务集上的平均成功率，对数刻度。
      同一个模型跑了几档思考强度，就是一条线穿过的那几个点。
    </p>

    <div class="bm-cost-wrap" class:bm-hovering={hover !== null} bind:this={wrapElement}>
      <div class="bm-scroll">
        <svg
          class="bm-cost-chart"
          viewBox={current.viewBox}
          role="img"
          aria-label={current.aria}
          bind:this={svgElement}
          onpointerleave={leave}
        >
          {#each current.grid as grid (grid.y1 + '-' + grid.x1)}
            <line
              class="bm-grid"
              class:bm-dash={grid.dash}
              x1={grid.x1}
              x2={grid.x2}
              y1={grid.y1}
              y2={grid.y2}
            />
          {/each}
          {#each current.ticks as tick (tick.text + tick.x + tick.y)}
            <text class="bm-tick" x={tick.x} y={tick.y} text-anchor={tick.anchor}>{tick.text}</text>
          {/each}
          {#each current.axis as axis (axis)}
            <text class="bm-axis" x="564" y="412" text-anchor="middle">{axis}</text>
          {/each}

          {#each current.labels as label (label.id)}
            <text
              class="bm-lab"
              class:bm-on={hover?.series.id === label.id}
              style={`--c:${colorOf(label.style)}`}
              x={label.x}
              y={label.y}
              text-anchor={label.anchor}
            >{label.text}</text>
          {/each}

          {#each current.series as series (series.id)}
            <g
              class="bm-series"
              class:bm-on={hover?.series.id === series.id}
              style={`--c:${colorOf(series.style)}`}
            >
              {#if series.pathD}
                <path class="bm-join" d={series.pathD} />
              {/if}
              {#each series.points as point (point.x + '-' + point.y)}
                <g
                  class="bm-hit"
                  tabindex="0"
                  role="button"
                  aria-label={point.aria}
                  onpointerenter={() => enter(series, point)}
                  onfocus={() => enter(series, point)}
                  onblur={leave}
                >
                  <circle class="bm-zone" cx={point.x} cy={point.y} r="15" />
                  <circle
                    class="bm-pt"
                    cx={point.x}
                    cy={point.y}
                    r={hover?.point === point ? 8 : 6}
                  />
                </g>
              {/each}
            </g>
          {/each}

          {#if guide}
            <g class="bm-guide bm-show" style={`--c:${guide.color}`}>
              <line class="bm-gl-x" x1={guide.x0} x2={guide.x} y1={guide.y} y2={guide.y} />
              <line class="bm-gl-y" x1={guide.x} x2={guide.x} y1={guide.y} y2={guide.axis} />
              <rect
                class="bm-rb-y"
                x={guide.x0 - 9 - guide.scoreWidth}
                y={guide.y - 11}
                width={guide.scoreWidth}
                height="22"
                rx="3"
              />
              <text class="bm-rd-y" x={guide.x0 - 10} y={guide.y + 4} text-anchor="end">{guide.score}</text>
              <rect
                class="bm-rb-x"
                x={guide.x - guide.costWidth / 2}
                y={guide.axis + 2}
                width={guide.costWidth}
                height="22"
                rx="3"
              />
              <text class="bm-rd-x" x={guide.x} y={guide.axis + 18} text-anchor="middle">{guide.cost}</text>
            </g>
          {/if}
        </svg>
      </div>

      {#if hover && tip}
        <div
          class="bm-ctip bm-on"
          class:bm-flip={tip.flip}
          style={`--c:${colorOf(hover.series.style)};left:${tip.left}px;top:${tip.top}px`}
        >
          <span class="bm-ctip-name"><i></i>{hover.point.name}</span>
          <span class="bm-ctip-eff">{hover.point.effort ? hover.point.effort[0].toUpperCase() + hover.point.effort.slice(1) : ''} effort</span>
        </div>
      {/if}
    </div>
  {/if}
</div>
