<script lang="ts">
  /**
   * OilTempDumbbell.svelte — 卡 1：六类食材的适宜油温区间。
   *
   * 图型来自 lieflat-charts 的 F12 Dumbbell Queue（basics-gallery.html 的
   * 「Onboarding, before and after the redesign」卡，渲染代码见 C8 · dumbbell queue 注释块）：
   * 一行一条细轨，两端圆珠，区间段连成一条粗线，串珠 = 真实单位。
   * 这里把「改版前后」翻译成「区间下限与上限」：温度位置本身表达读数，不再另加装饰。
   * hover / 键盘聚焦 / 点击钉住一行时，该行加粗并在图下读数条给出区间与食材说明。
   */
  import { onMount } from 'svelte';

  import { OIL_TEMPS, OIL_TEMP_AXIS, type OilTempId, type OilTempRange } from '@/lib/animations/tempura';

  import Card from './Card.svelte';
  import { createChartReveal } from './reveal.svelte';

  const reveal = createChartReveal();

  // ── 几何：360 × 244 的半宽画布，六行区间 ──
  const VB_W = 360;
  const VB_H = 244;
  const LABEL_X = 96;
  const X0 = 108;
  const X1 = 346;
  const ROW_TOP = 44;
  const ROW_GAP = 29;
  const AXIS_Y = 216;

  const { minC, maxC, tickC } = OIL_TEMP_AXIS;
  const tempToX = (celsius: number) => X0 + ((celsius - minC) / (maxC - minC)) * (X1 - X0);

  const TICKS = Array.from(
    { length: Math.round((maxC - minC) / tickC) + 1 },
    (_, index) => minC + index * tickC
  );

  const ROWS = OIL_TEMPS.map((entry, index) => ({
    entry,
    y: ROW_TOP + index * ROW_GAP,
  }));

  // ── 状态：悬停预览、键盘聚焦、点击钉住，三者取优先级最高的那个 ──
  let hovered = $state<OilTempId | null>(null);
  let focused = $state<OilTempId | null>(null);
  let pinned = $state<OilTempId | null>('fish');
  let chartEl: HTMLDivElement | undefined = $state();

  const activeId = $derived(hovered ?? focused ?? pinned);
  const active = $derived<OilTempRange | null>(OIL_TEMPS.find((entry) => entry.id === activeId) ?? null);

  /** 天妇罗图版的主角色只给最烫的一档，其余统一用主数据蓝。 */
  function rowColor(entry: OilTempRange): string {
    return entry.hero ? 'var(--tf-hero)' : 'var(--tf-data)';
  }

  function togglePin(id: OilTempId) {
    pinned = pinned === id ? null : id;
  }

  const svgLabel = `六类食材的适宜油温区间：${OIL_TEMPS.map(
    (entry) => `${entry.label} ${entry.lowC} 到 ${entry.highC} 摄氏度`
  ).join('，')}。颜色最深的一档是鱼介。`;

  onMount(() => {
    if (!chartEl) return;
    return reveal.observe(chartEl);
  });
</script>

<Card
  title="鱼介往 180 度走，根菜停在 160 度"
  sub="横轴 = 油温（°C）· 左珠 = 区间下限，右珠 = 上限 · 一档 = 一类食材 · 高亮的一档 = 鱼介"
  src="DUMBBELL QUEUE · PORCELAIN · MAFF / JOPA"
  replay={reveal.replay}
>
  <div class="tf-chart" class:tf-in={reveal.run} bind:this={chartEl}>
    <svg viewBox={`0 0 ${VB_W} ${VB_H}`} role="img" aria-label={svgLabel}>
      <!-- 底部温度轴 -->
      <line
        x1={X0}
        y1={AXIS_Y}
        x2={X1}
        y2={AXIS_Y}
        stroke="var(--tf-grid)"
        stroke-width="1"
        class="tf-fade"
        style="--d:.15s"
      />
      {#each TICKS as tick (tick)}
        <line
          x1={tempToX(tick)}
          y1={AXIS_Y}
          x2={tempToX(tick)}
          y2={AXIS_Y + 5}
          stroke="var(--tf-grid)"
          stroke-width="1"
          class="tf-fade"
          style="--d:.18s"
        />
        <text
          x={tempToX(tick)}
          y={AXIS_Y + 17}
          text-anchor="middle"
          fill="var(--tf-muted)"
          font-size="7.5"
          font-weight="600"
          class="tf-fade"
          style="--d:.2s">{tick}</text
        >
      {/each}
      <text
        x={X1}
        y="30"
        text-anchor="end"
        fill="var(--tf-muted)"
        font-size="7.5"
        font-weight="600"
        letter-spacing=".06em"
        class="tf-fade"
        style="--d:.2s">油温 °C</text
      >

      {#each ROWS as row, rowIndex (row.entry.id)}
        {@const entry = row.entry}
        {@const isActive = entry.id === activeId}
        {@const lowX = tempToX(entry.lowC)}
        {@const highX = tempToX(entry.highC)}
        {@const color = rowColor(entry)}
        <g
          class="tf-row"
          role="button"
          tabindex="0"
          aria-pressed={entry.id === pinned}
          aria-label={`${entry.label}，适宜油温 ${entry.lowC} 到 ${entry.highC} 摄氏度。${entry.note}`}
          onpointerenter={() => (hovered = entry.id)}
          onpointerleave={() => (hovered = null)}
          onfocus={() => (focused = entry.id)}
          onblur={() => (focused = null)}
          onclick={() => togglePin(entry.id)}
          onkeydown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              togglePin(entry.id);
            } else if (event.key === 'Escape') {
              pinned = null;
            }
          }}
        >
          <title>{entry.label} · {entry.lowC} 到 {entry.highC}°C · {entry.note}</title>

          <!-- 细轨 -->
          <line
            x1={X0}
            y1={row.y}
            x2={X1}
            y2={row.y}
            stroke="var(--tf-track)"
            stroke-width={isActive ? 1.6 : 1.2}
            class="tf-fade"
            style={`--d:${0.1 + rowIndex * 0.06}s`}
          />

          <!-- 区间段：一条粗线，长度与区间严格成正比 -->
          <line
            x1={lowX}
            y1={row.y}
            x2={highX}
            y2={row.y}
            stroke={color}
            stroke-width={isActive ? 6 : 4.6}
            stroke-linecap="butt"
            class="tf-fade"
            style={`--d:${0.2 + rowIndex * 0.07}s`}
          />

          <!-- 两端圆珠 -->
          <circle
            cx={lowX}
            cy={row.y}
            r={isActive ? 5.2 : 4.4}
            fill={color}
            stroke="var(--bg)"
            stroke-width="1.4"
            class="tf-pop"
            style={`--d:${0.3 + rowIndex * 0.07}s`}
          />
          <circle
            cx={highX}
            cy={row.y}
            r={isActive ? 5.2 : 4.4}
            fill={color}
            stroke="var(--bg)"
            stroke-width="1.4"
            class="tf-pop"
            style={`--d:${0.34 + rowIndex * 0.07}s`}
          />

          <!-- 左侧类目名 -->
          <text
            x={LABEL_X}
            y={row.y - 3}
            text-anchor="end"
            fill="var(--tf-ink)"
            font-size={isActive ? 10 : 9.2}
            font-weight={isActive ? 800 : 600}
            class="tf-fade tf-row-label"
            style={`--d:${0.12 + rowIndex * 0.06}s`}>{entry.label}</text
          >
          <text
            x={LABEL_X}
            y={row.y + 9}
            text-anchor="end"
            fill="var(--tf-muted)"
            font-size="7.5"
            class="tf-fade"
            style={`--d:${0.16 + rowIndex * 0.06}s`}>{entry.jaLabel}</text
          >

          <!-- 读数只在当前行展开，避免五组数字挤在一起 -->
          {#if isActive}
            <text
              x={lowX - 8}
              y={row.y - 9}
              text-anchor="end"
              fill="var(--tf-ink)"
              font-size="9"
              font-weight="800"
              class="tf-fade"
              style="--d:0s">{entry.lowC}</text
            >
            <text
              x={highX + 8}
              y={row.y - 9}
              text-anchor="start"
              fill="var(--tf-ink)"
              font-size="9"
              font-weight="800"
              class="tf-fade"
              style="--d:0s">{entry.highC}</text
            >
          {/if}
        </g>
      {/each}
    </svg>

    <div class="tf-readout" aria-live="polite">
      {#if active}
        <span class="tf-readout-main">
          <span class="tf-readout-num tf-num">{active.lowC}</span>
          <span class="tf-readout-unit">到 {active.highC} °C</span>
        </span>
        <div class="tf-readout-cell">
          <span class="tf-readout-key">{active.label} · {active.jaLabel}</span>
          <span class="tf-readout-val">{active.hero ? '最烫的一档' : '区间端点'}</span>
        </div>
        <span class="tf-readout-note">{active.note}</span>
      {:else}
        <span class="tf-hint">悬停或聚焦一行查看区间读数，点击可以把这一行钉住。</span>
      {/if}
    </div>
  </div>
</Card>
