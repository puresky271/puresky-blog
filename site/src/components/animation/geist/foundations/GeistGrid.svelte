<script lang="ts">
  /**
   * Geist 网格演示。
   *
   * 六个控件：列数、行数、预览宽度、参考线、单元格风格、十字交叉点。
   * 网格本体用 CSS grid 画，参考线是 1px 虚线，交叉点是每个交点上的小十字。
   * 参考线颜色和原站调试态一致（琥珀色细虚线），十字用灰色。
   */
  import { onMount } from 'svelte';

  import '../base.css';
  import '../utilities.css';
  import './common.css';
  import './grid.css';

  type Theme = 'light' | 'dark';
  type PreviewId = 'desktop' | 'tablet' | 'phone';
  type GuideMode = 'both' | 'columns' | 'rows' | 'off';
  type CellStyle = 'blank' | 'solid' | 'dashed';

  const COLUMN_OPTIONS = [3, 4, 6, 12];
  const ROW_OPTIONS = [2, 3, 4, 5, 6];
  const PREVIEW_OPTIONS: { id: PreviewId; label: string }[] = [
    { id: 'desktop', label: '桌面' },
    { id: 'tablet', label: '平板' },
    { id: 'phone', label: '手机' },
  ];
  const GUIDE_OPTIONS: { id: GuideMode; label: string }[] = [
    { id: 'both', label: '行 + 列' },
    { id: 'columns', label: '仅列' },
    { id: 'rows', label: '仅行' },
    { id: 'off', label: '关' },
  ];
  const CELL_OPTIONS: { id: CellStyle; label: string }[] = [
    { id: 'blank', label: '空白' },
    { id: 'solid', label: '实心色块' },
    { id: 'dashed', label: 'dashed' },
  ];

  interface GridCell {
    index: number;
    col: number;
    row: number;
  }

  let { config = {} }: { config?: Record<string, unknown> } = $props();
  // 目前没有配置项；在 effect 里读一下，既保留后续扩展的口子，也避开 state_referenced_locally 警告
  $effect(() => {
    void config;
  });

  let localTheme: Theme = $state('light');
  let columns = $state(4);
  let rows = $state(3);
  let preview: PreviewId = $state('desktop');
  let guideMode: GuideMode = $state('both');
  let cellStyle: CellStyle = $state('blank');
  let crossOn = $state(true);

  onMount(() => {
    localTheme = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
  });

  const gridCells = $derived(
    Array.from({ length: columns * rows }, (_, index) => ({
      index: index + 1,
      col: (index % columns) + 1,
      row: Math.floor(index / columns) + 1,
    }))
  );

  /** 竖向参考线在 1..列数-1 的分界处。 */
  const columnGuides = $derived(Array.from({ length: columns - 1 }, (_, index) => index + 1));

  /** 横向参考线在 1..行数-1 的分界处。 */
  const rowGuides = $derived(Array.from({ length: rows - 1 }, (_, index) => index + 1));

  /** 十字交叉点：每一根行、列线的交会处，包含四条外边框上的端点。 */
  const crossPoints = $derived(
    Array.from({ length: (columns + 1) * (rows + 1) }, (_, index) => ({
      key: `${index}-${columns}`,
      col: index % (columns + 1),
      row: Math.floor(index / (columns + 1)),
    }))
  );

  const showColumnGuides = $derived(guideMode === 'both' || guideMode === 'columns');
  const showRowGuides = $derived(guideMode === 'both' || guideMode === 'rows');

  const previewLabel = $derived(PREVIEW_OPTIONS.find((item) => item.id === preview)?.label ?? '桌面');
  const guideLabel = $derived(GUIDE_OPTIONS.find((item) => item.id === guideMode)?.label ?? '行 + 列');
  const cellLabel = $derived(CELL_OPTIONS.find((item) => item.id === cellStyle)?.label ?? '空白');

  function setTheme(theme: Theme): void {
    localTheme = theme;
  }
</script>

<div class="gf-root" data-theme={localTheme}>
  <div class="geist-demo snapshot-root">
    <div class="gf-toolbar">
      <div class="gf-toolbar-title">
        <span class="gf-toolbar-label">网格</span>
        <span class="gf-toolbar-zh">参考线是 1px 细虚线，交叉点用灰色小十字标出</span>
      </div>
      <div class="gf-toolbar-right">
        <div class="gf-seg" role="group" aria-label="演示亮暗主题">
          <button
            type="button"
            class="gf-seg-btn"
            aria-pressed={localTheme === 'light'}
            onclick={() => setTheme('light')}>亮</button>
          <button
            type="button"
            class="gf-seg-btn"
            aria-pressed={localTheme === 'dark'}
            onclick={() => setTheme('dark')}>暗</button>
        </div>
      </div>
    </div>

    <div class="gf-grid" data-preview={preview} data-cell-style={cellStyle}>
      <div class="gf-grid-controls">
        <div class="gf-field">
          <span class="gf-field-label">列数</span>
          <div class="gf-seg" role="group" aria-label="列数">
            {#each COLUMN_OPTIONS as option (option)}
              <button
                type="button"
                class="gf-seg-btn"
                aria-pressed={columns === option}
                onclick={() => (columns = option)}
              >{option}</button>
            {/each}
          </div>
        </div>

        <div class="gf-field">
          <span class="gf-field-label">行数</span>
          <div class="gf-select-wrap">
            <select class="gf-select" aria-label="行数" bind:value={rows}>
              {#each ROW_OPTIONS as option (option)}
                <option value={option}>{option} 行</option>
              {/each}
            </select>
          </div>
        </div>

        <div class="gf-field">
          <span class="gf-field-label">预览宽度</span>
          <div class="gf-seg" role="group" aria-label="预览宽度">
            {#each PREVIEW_OPTIONS as option (option.id)}
              <button
                type="button"
                class="gf-seg-btn"
                aria-pressed={preview === option.id}
                onclick={() => (preview = option.id)}
              >{option.label}</button>
            {/each}
          </div>
        </div>

        <div class="gf-field">
          <span class="gf-field-label">参考线</span>
          <div class="gf-select-wrap">
            <select class="gf-select" aria-label="参考线" bind:value={guideMode}>
              {#each GUIDE_OPTIONS as option (option.id)}
                <option value={option.id}>{option.label}</option>
              {/each}
            </select>
          </div>
        </div>

        <div class="gf-field">
          <span class="gf-field-label">单元格风格</span>
          <div class="gf-seg" role="group" aria-label="单元格风格">
            {#each CELL_OPTIONS as option (option.id)}
              <button
                type="button"
                class="gf-seg-btn"
                aria-pressed={cellStyle === option.id}
                onclick={() => (cellStyle = option.id)}
              >{option.label}</button>
            {/each}
          </div>
        </div>

        <div class="gf-field">
          <span class="gf-field-label">十字交叉点</span>
          <div class="gf-seg" role="group" aria-label="十字交叉点">
            <button type="button" class="gf-seg-btn" aria-pressed={crossOn} onclick={() => (crossOn = true)}>开</button>
            <button type="button" class="gf-seg-btn" aria-pressed={!crossOn} onclick={() => (crossOn = false)}>关</button>
          </div>
        </div>
      </div>

      <div class="gf-grid-stage">
        <div class="gf-grid-canvas" aria-hidden="true">
          <div class="gf-grid-guides">
            {#if showColumnGuides}
              {#each columnGuides as line (line)}
                <span class="gf-guide gf-guide--y" style:left={`${(line / columns) * 100}%`}></span>
              {/each}
            {/if}
            {#if showRowGuides}
              {#each rowGuides as line (line)}
                <span class="gf-guide gf-guide--x" style:top={`${(line / rows) * 100}%`}></span>
              {/each}
            {/if}
          </div>

          <div class="gf-grid-cells" style:--gf-cols={columns} style:--gf-rows={rows}>
            {#each gridCells as cell (cell.index)}
              <div class="gf-grid-cell">
                <span class="gf-grid-cell-index">{cell.index}</span>
              </div>
            {/each}
          </div>

          {#if crossOn}
            <div class="gf-grid-crosses">
              {#each crossPoints as point (point.key)}
                <span
                  class="gf-cross"
                  style:left={`${(point.col / columns) * 100}%`}
                  style:top={`${(point.row / rows) * 100}%`}
                ></span>
              {/each}
            </div>
          {/if}
        </div>
      </div>

      <p class="gf-grid-meta">
        {columns} 列 × {rows} 行 · {previewLabel} · 参考线 {guideLabel} · 单元格 {cellLabel} · 十字交叉点{crossOn ? '开' : '关'}
      </p>
    </div>
  </div>
</div>
