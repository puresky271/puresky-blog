<script lang="ts">
  import { createRelationAnatomyTrace } from '@/lib/animations/relation-anatomy';

  import AnimationControls from './AnimationControls.svelte';
  import AnimationShell from './AnimationShell.svelte';
  import StepExplanation from './StepExplanation.svelte';
  import type { AnimationProps } from './mount';
  import { createPlayback } from './playback.svelte';

  // 这个演示没有配置项，config 不参与渲染。
  const _props: AnimationProps = $props();

  const trace = createRelationAnatomyTrace();
  const player = createPlayback(() => trace.steps.length);
  const step = $derived(trace.steps[player.index]);

  /** 概念条左侧的图形标记，换成文字之外的第二条线索。 */
  const SCOPE_MARK: Record<string, string> = {
    table: '▭',
    row: '▸',
    column: '▾',
    header: '▤',
    rows: '▦',
  };

  /** 列高亮时，表头上方标出这一列扮演的角色。 */
  const columnPointer = $derived(
    step.focus === 'attribute' ? '属性' : step.focus === 'domain' ? '取值集合' : step.focus === 'primary-key' ? '主键' : '',
  );

  const scopeMark = $derived(SCOPE_MARK[step.scope] ?? '▭');
  const tableLabel = $derived(
    `Artist 关系表，四列分别是 id name year country，三行数据。当前高亮：${step.target}。${step.description}`,
  );
</script>

<AnimationShell title="解剖关系模型的一张表" meta="Artist 表 · 7 个概念">
  <div class="board">
    <p class="focus-bar">
      <span class="focus-mark" aria-hidden="true">{scopeMark}</span>
      <span class="focus-def">{step.definition}</span>
      <span class="focus-target">{step.target}</span>
    </p>

    <div class="table-wrap">
      <div class="anatomy" role="table" aria-label={tableLabel} data-scope={step.scope}>
        <div class="pointer-row" aria-hidden="true">
          {#each trace.columns as column (column.key)}
            <div class="pointer-cell" class:on={step.column === column.key}>
              {#if step.column === column.key}<span>▼ {columnPointer}</span>{/if}
            </div>
          {/each}
        </div>

        <div class="head-row" role="row">
          {#each trace.columns as column (column.key)}
            <div
              role="columnheader"
              data-col={column.key}
              class="head-cell"
              class:on={step.column === column.key}
            >
              <span class="head-main">
                <span class="col-name">{column.label}</span>
                {#if column.primaryKey}
                  <span class="pk-badge">
                    <svg class="key" viewBox="0 0 16 16" aria-hidden="true">
                      <circle cx="4.4" cy="8" r="2.9" fill="none" stroke="currentColor" stroke-width="1.6" />
                      <path
                        d="M7.3 8H14M11.4 8v2.4M13.8 8v2.2"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.6"
                        stroke-linecap="round"
                      />
                    </svg>
                    PK
                  </span>
                {/if}
              </span>
              <small class="col-type">{column.type}</small>
            </div>
          {/each}
        </div>

        <div class="data-body" role="rowgroup">
          {#each trace.rows as row, index (row.id)}
            <div class="data-row" role="row" class:focus={step.row === index}>
              {#each trace.columns as column (column.key)}
                <div
                  role="cell"
                  data-col={column.key}
                  class="cell"
                  class:pk-cell={column.primaryKey}
                  class:on={step.column === column.key}
                >
                  {row[column.key]}
                </div>
              {/each}
            </div>
          {/each}
        </div>
      </div>
    </div>

    <div class="inspector">
      <span class="inspector-label">{step.inspector.label}</span>
      <div class="inspector-body">
        {#if step.inspector.domain}
          <span class="set-ellipsis" aria-hidden="true">…</span>
          {#each step.inspector.domain as item (item.value)}
            <span class="domain-value" class:used={item.used}>
              {item.value}{#if item.used}<i aria-hidden="true">✓</i>{/if}
            </span>
          {/each}
          <span class="set-ellipsis" aria-hidden="true">…</span>
        {:else}
          <code class="inspector-value">{step.inspector.value}</code>
        {/if}
      </div>
      {#if step.inspector.note}<span class="inspector-note">{step.inspector.note}</span>{/if}
    </div>
  </div>

  <StepExplanation
    phase={step.phase}
    description={step.description}
    tone={step.focus === 'primary-key' ? 'success' : 'accent'}
  />

  {#snippet controls()}
    <AnimationControls {player} total={trace.steps.length} />
  {/snippet}
</AnimationShell>

<style>
  .board { display: grid; gap: 0.9rem; }

  .focus-bar {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.25rem 0.6rem;
    margin: 0;
    padding: 0.55rem 0.75rem;
    border: 1px solid var(--anim-line);
    border-left: 3px solid var(--accent);
    border-radius: 8px;
    background: var(--anim-inset);
  }
  .focus-mark {
    color: var(--accent-strong);
    font-size: 0.9rem;
    line-height: 1;
  }
  .focus-def {
    flex: 1 1 14rem;
    min-width: 0;
    color: var(--fg);
    font-size: 0.78rem;
    line-height: 1.65;
  }
  .focus-target {
    padding: 0.12rem 0.5rem;
    border-radius: 999px;
    background: var(--accent-soft);
    color: var(--accent-strong);
    font-size: 0.64rem;
    font-weight: 650;
    white-space: nowrap;
  }

  .table-wrap { overflow-x: auto; padding-block: 0.1rem; }
  .anatomy {
    --table-cols: minmax(3.4rem, 1.05fr) minmax(7rem, 2.1fr) minmax(3.1rem, 1fr) minmax(4.5rem, 1.65fr);
    width: 100%;
    max-width: 34rem;
    min-width: 18rem;
    margin-inline: auto;
    font-family: var(--font-mono);
    font-size: 0.78rem;
    font-variant-numeric: tabular-nums;
  }
  .pointer-row,
  .head-row,
  .data-row {
    display: grid;
    grid-template-columns: var(--table-cols);
    align-items: center;
  }

  .pointer-row { min-height: 1.05rem; }
  .pointer-cell {
    min-width: 0;
    color: var(--accent-strong);
    font-family: var(--font-sans);
    font-size: 0.6rem;
    font-weight: 650;
    text-align: center;
    white-space: nowrap;
  }
  .pointer-cell.on span {
    display: inline-block;
    animation: pointer-drop 220ms var(--ease-out-expo);
  }

  .head-row {
    border-bottom: 1.5px solid var(--anim-line-strong);
    border-radius: 4px 4px 0 0;
  }
  .head-cell {
    min-width: 0;
    padding: 0.35rem 0.45rem 0.5rem;
    text-align: left;
    transition: background-color 200ms ease, box-shadow 200ms ease, color 200ms ease;
  }
  .head-main { display: flex; flex-wrap: wrap; align-items: center; gap: 0.1rem 0.28rem; }
  .col-name { color: var(--fg); font-size: 1em; font-weight: 700; white-space: nowrap; }
  .pk-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.1rem;
    color: var(--accent-strong);
    font-family: var(--font-sans);
    font-size: 0.55rem;
    font-weight: 700;
    letter-spacing: 0.03em;
  }
  .key { width: 0.7rem; height: 0.7rem; flex: none; }
  .col-type {
    display: block;
    margin-top: 0.12rem;
    color: var(--anim-muted);
    font-size: 0.7em;
    font-weight: 400;
    letter-spacing: 0.03em;
    white-space: nowrap;
  }

  .data-body { border-bottom: 1px solid var(--anim-line); }
  .data-row { border-top: 1px solid var(--anim-line); }
  .data-body > .data-row:first-child { border-top: 0; }
  .cell {
    min-width: 0;
    overflow: hidden;
    padding: 0.55rem 0.45rem;
    color: var(--fg);
    font-weight: 500;
    text-overflow: ellipsis;
    white-space: nowrap;
    transition: background-color 200ms ease, color 200ms ease, box-shadow 200ms ease;
  }
  .cell.pk-cell {
    text-decoration: underline;
    text-decoration-color: color-mix(in oklab, var(--accent) 55%, transparent);
    text-decoration-thickness: 1.5px;
    text-underline-offset: 3px;
  }
  [data-col='id'], [data-col='year'] { text-align: center; }

  /* 整张表：外圈描边加全表浅色底 */
  .anatomy[data-scope='table'] {
    border-radius: 6px;
    box-shadow: 0 0 0 2px var(--accent);
  }
  .anatomy[data-scope='table'] :is(.head-cell, .cell) {
    background: color-mix(in oklab, var(--accent) 8%, transparent);
  }
  .anatomy[data-scope='table'] .cell { color: var(--accent-strong); font-weight: 650; }

  /* 一行：左侧色条加整行浅色底 */
  .data-row.focus .cell,
  .cell.on {
    background: color-mix(in oklab, var(--accent) 10%, transparent);
    color: var(--accent-strong);
    font-weight: 650;
  }
  .data-row.focus .cell:first-child { box-shadow: inset 3px 0 0 var(--accent-strong); }

  /* 一列：表头上方指针加整列浅色底 */
  .head-cell.on {
    background: color-mix(in oklab, var(--accent) 11%, transparent);
    box-shadow: inset 0 -2px 0 var(--accent);
  }
  .head-cell.on .col-name { color: var(--accent-strong); }

  /* 表头：描出表头区域，数据行退到次要颜色 */
  .anatomy[data-scope='header'] .head-row {
    background: color-mix(in oklab, var(--accent) 11%, transparent);
    box-shadow: inset 0 0 0 2px var(--accent);
  }
  .anatomy[data-scope='header'] .head-cell .col-name { color: var(--accent-strong); }
  .anatomy[data-scope='header'] .cell { color: var(--anim-muted); font-weight: 400; }

  /* 数据区：把整个 rowgroup 圈成一块 */
  .anatomy[data-scope='rows'] .data-body {
    border-radius: 8px;
    background: color-mix(in oklab, var(--accent) 11%, transparent);
    box-shadow: inset 0 0 0 2px var(--accent);
  }
  .anatomy[data-scope='rows'] .cell { color: var(--accent-strong); font-weight: 650; }

  .inspector {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.3rem 0.75rem;
    min-height: 3.2rem;
    padding: 0.55rem 0.8rem;
    border: 1px solid var(--anim-line);
    border-radius: 8px;
    background: var(--anim-panel);
  }
  .inspector-label {
    flex: none;
    color: var(--anim-muted);
    font-size: 0.64rem;
    font-weight: 650;
    letter-spacing: 0.03em;
  }
  .inspector-body {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.3rem;
    min-width: 0;
  }
  .inspector-value {
    color: var(--fg);
    font-family: var(--font-mono);
    font-size: 0.75rem;
    line-height: 1.65;
    overflow-wrap: anywhere;
  }
  .inspector-note {
    margin-left: auto;
    color: var(--anim-muted);
    font-size: 0.62rem;
    line-height: 1.5;
  }
  .set-ellipsis { color: var(--anim-muted); font-family: var(--font-mono); }
  .domain-value {
    display: inline-flex;
    align-items: center;
    gap: 0.12rem;
    padding: 0.08rem 0.4rem;
    border: 1px solid var(--anim-line);
    border-radius: 5px;
    color: var(--anim-muted);
    font-family: var(--font-mono);
    font-size: 0.72rem;
    transition: border-color 200ms ease, color 200ms ease;
  }
  .domain-value.used {
    border-color: var(--accent);
    color: var(--accent-strong);
    font-weight: 650;
  }
  .domain-value i { color: var(--accent-strong); font-size: 0.6rem; font-style: normal; }

  @keyframes pointer-drop {
    from { opacity: 0; transform: translateY(-3px); }
  }

  @media (width < 40rem) {
    .focus-def { flex-basis: calc(100% - 1.6rem); }
    .focus-target { margin-left: 1.15rem; }
    .anatomy { font-size: 0.75rem; }
    .inspector { min-height: 4.2rem; align-items: flex-start; }
    .inspector-note { margin-left: 0; flex-basis: 100%; }
  }
  @media (prefers-reduced-motion: reduce) {
    .head-cell, .cell, .domain-value { transition: none; }
    .pointer-cell.on span { animation: none; }
  }
</style>
