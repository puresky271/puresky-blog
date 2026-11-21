<script lang="ts">
  /**
   * LipidBars.svelte — 卡 4：八种炸物与参照料理的脂质对照。
   *
   * 图型来自 lieflat-charts 的 F1 Rung Bars（basics-gallery.html 的
   * 「Revenue by plan, rung by rung」卡，渲染代码见 B1 · rung bars 注释块）：
   * 少类目比较、单位可数、数值直接写在柱端。
   * 这里把竖柱翻译成横轨：一条横轨 = 一种炸物，柱长从 0 起算、不断轴，
   * 天妇罗用主角色，参照料理退到浅一档蓝，数值标签放在柱端外侧。
   * hover / 键盘聚焦 / 点击钉住一条横轨时，图下读数条给出食品编号与调理方式。
   */
  import { onMount } from 'svelte';

  import { LIPID_AXIS, LIPID_BARS, type LipidEntry } from '@/lib/animations/tempura';

  import Card from './Card.svelte';
  import { createChartReveal } from './reveal.svelte';

  const reveal = createChartReveal();

  // ── 几何：720 × 332 的通栏画布，八条横轨 ──
  const VB_W = 720;
  const VB_H = 332;
  const LABEL_X = 150;
  const X0 = 162;
  const X1 = 648;
  const ROW_TOP = 56;
  const ROW_GAP = 30;
  const BAR_H = 15;
  const AXIS_Y = 296;

  const { maxG, tickG } = LIPID_AXIS;
  const valueToX = (value: number) => X0 + (value / maxG) * (X1 - X0);

  /** 从低到高排，柱子自然长成一条上升的台阶。 */
  const ROWS = [...LIPID_BARS]
    .sort((a, b) => a.value - b.value)
    .map((entry, index) => ({
      entry,
      y: ROW_TOP + index * ROW_GAP,
      width: valueToX(entry.value) - X0,
    }));

  const TICKS = Array.from({ length: maxG / tickG + 1 }, (_, index) => index * tickG);

  /** 颜色只编码「天妇罗还是参照料理」，数值由柱长和标签承担，不再给炸猪排单开第三档。 */
  function barColor(entry: LipidEntry): string {
    return entry.group === 'tempura' ? 'var(--tf-hero)' : 'var(--tf-bar-ref)';
  }

  // ── 状态：悬停预览、键盘聚焦、点击钉住 ──
  let hovered = $state<string | null>(null);
  let focused = $state<string | null>(null);
  let pinned = $state<string | null>('tonkatsu');
  let chartEl: HTMLDivElement | undefined = $state();

  const activeId = $derived(hovered ?? focused ?? pinned);
  const active = $derived<LipidEntry | null>(LIPID_BARS.find((entry) => entry.id === activeId) ?? null);

  function togglePin(id: string) {
    pinned = pinned === id ? null : id;
  }

  const svgLabel = `八种炸物每 100 克可食部的脂质含量，从低到高：${ROWS.map(
    (row) => `${row.entry.label} ${row.entry.value.toFixed(1)} 克`
  ).join('，')}。天妇罗用最深的蓝色，参照料理用浅一档的蓝。`;

  onMount(() => {
    if (!chartEl) return;
    return reveal.observe(chartEl);
  });
</script>

<Card
  wide
  title="天妇罗的油停在衣上，含油量不到炸猪排的一半"
  sub="脂质含量（g / 100 g 可食部）· 一条横轨 = 一种炸物 · 数值从低到高 · 深蓝 = 天妇罗，浅蓝 = 参照料理"
  src="RUNG BARS · PORCELAIN · MEXT 2023"
  replay={reveal.replay}
>
  <div class="tf-chart" class:tf-in={reveal.run} bind:this={chartEl}>
    <div class="tf-scroll">
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} role="img" aria-label={svgLabel}>
        <!-- 顶部图例 -->
        <text
          x="0"
          y="24"
          fill="var(--tf-muted)"
          font-size="8"
          font-weight="600"
          letter-spacing=".06em"
          class="tf-fade"
          style="--d:.1s">脂质 · g</text
        >
        <g class="tf-fade" style="--d:.15s">
          <rect x="520" y="16" width="18" height="10" rx="5" fill="var(--tf-hero)" />
          <text x="544" y="25" fill="var(--tf-muted)" font-size="8" font-weight="600">天妇罗</text>
          <rect x="596" y="16" width="18" height="10" rx="5" fill="var(--tf-bar-ref)" />
          <text x="620" y="25" fill="var(--tf-muted)" font-size="8" font-weight="600">参照料理</text>
        </g>

        <!-- 横轨与柱身 -->
        {#each ROWS as row, rowIndex (row.entry.id)}
          {@const entry = row.entry}
          {@const isActive = entry.id === activeId}
          {@const color = barColor(entry)}
          <g
            class="tf-row"
            role="button"
            tabindex="0"
            aria-pressed={entry.id === pinned}
            aria-label={`${entry.label}，每 100 克可食部含脂质 ${entry.value.toFixed(1)} 克。${entry.note}`}
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
            <title>{entry.label} · 每 100 克可食部含脂质 {entry.value.toFixed(1)} 克 · 食品编号 {entry.foodCode}</title>

            <!-- 空轨：浅色圆角横条，只做环境结构 -->
            <rect
              x={X0}
              y={row.y - BAR_H / 2}
              width={X1 - X0}
              height={BAR_H}
              rx={BAR_H / 2}
              fill="var(--tf-track)"
              class="tf-fade"
              style={`--d:${0.1 + rowIndex * 0.05}s`}
            />

            <!-- 柱身：长度与克数严格成正比，从 0 起算不断轴 -->
            <rect
              x={X0}
              y={row.y - (BAR_H + (isActive ? 2 : 0)) / 2}
              width={row.width}
              height={BAR_H + (isActive ? 2 : 0)}
              rx={(BAR_H + (isActive ? 2 : 0)) / 2}
              fill={color}
              class="tf-grow-x"
              style={`--d:${0.2 + rowIndex * 0.07}s`}
            />

            <!-- 左侧类目名 -->
            <text
              x={LABEL_X}
              y={row.y - 1}
              text-anchor="end"
              fill="var(--tf-ink)"
              font-size={isActive ? 11 : 10.5}
              font-weight={isActive ? 800 : 700}
              class="tf-fade tf-row-label"
              style={`--d:${0.16 + rowIndex * 0.05}s`}>{entry.label}</text
            >
            <text
              x={LABEL_X}
              y={row.y + 11}
              text-anchor="end"
              fill="var(--tf-muted)"
              font-size="7.5"
              class="tf-fade"
              style={`--d:${0.2 + rowIndex * 0.05}s`}>{entry.jaLabel}</text
            >

            <!-- 数值标签放在柱端外侧 -->
            <text
              x={row.width + X0 + 8}
              y={row.y + 4}
              text-anchor="start"
              fill="var(--tf-ink)"
              font-size="10.5"
              font-weight="800"
              class="tf-fade tf-num"
              style={`--d:${0.55 + rowIndex * 0.05}s`}>{entry.value.toFixed(1)}</text
            >
          </g>
        {/each}

        <!-- 底部刻度轴：0 起算，每 5 克一格 -->
        <line
          x1={X0}
          y1={AXIS_Y}
          x2={X1}
          y2={AXIS_Y}
          stroke="var(--tf-grid)"
          stroke-width="1"
          class="tf-fade"
          style="--d:.2s"
        />
        {#each TICKS as tick (tick)}
          <line
            x1={valueToX(tick)}
            y1={AXIS_Y}
            x2={valueToX(tick)}
            y2={AXIS_Y + 5}
            stroke="var(--tf-grid)"
            stroke-width="1"
            class="tf-fade"
            style="--d:.22s"
          />
          <text
            x={valueToX(tick)}
            y={AXIS_Y + 17}
            text-anchor="middle"
            fill="var(--tf-muted)"
            font-size="7.5"
            font-weight="600"
            class="tf-fade"
            style="--d:.24s">{tick}</text
          >
        {/each}
        <text
          x={X0}
          y={VB_H - 8}
          text-anchor="start"
          fill="var(--tf-muted)"
          font-size="7"
          letter-spacing=".06em"
          class="tf-fade"
          style="--d:.85s">柱长从 0 起算 · 不断轴 · 数字 = 每 100 克可食部脂质克数</text
        >
      </svg>
    </div>

    <div class="tf-readout" aria-live="polite">
      {#if active}
        <span class="tf-readout-main">
          <span class="tf-readout-num tf-num">{active.value.toFixed(1)}</span>
          <span class="tf-readout-unit">g / 100 g</span>
        </span>
        <div class="tf-readout-cell">
          <span class="tf-readout-key">{active.label} · {active.jaLabel}</span>
          <span class="tf-readout-val">{active.group === 'tempura' ? '天妇罗' : '参照料理'}</span>
        </div>
        <div class="tf-readout-cell">
          <span class="tf-readout-key">食品编号</span>
          <span class="tf-readout-val tf-num">{active.foodCode}</span>
        </div>
        <span class="tf-readout-note">{active.note}</span>
      {:else}
        <span class="tf-hint">悬停或聚焦一条横轨查看食品编号与调理方式，点击可以把这一条钉住。</span>
      {/if}
    </div>
  </div>
</Card>
