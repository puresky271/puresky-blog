<script lang="ts">
  import TreeDiagram from './TreeDiagram.svelte';

  let {
    ids,
    focus,
    activeEdge,
    visitOrder,
    members = new Set<string>(),
    membershipLabel = '在栈中',
    fresh = null,
    ariaLabel,
  }: {
    ids: string[];
    focus: string | null;
    activeEdge: [string, string] | null;
    visitOrder: string[];
    members?: Set<string>;
    membershipLabel?: string;
    fresh?: string | null;
    ariaLabel: string;
  } = $props();
</script>

<div class="tree-panel">
  <TreeDiagram {ids} {focus} {activeEdge} {visitOrder} {members} {fresh} {ariaLabel} />
  <div class="legend">
    <span><i class="dot visited"></i>已访问</span>
    <span><i class="dot member"></i>{membershipLabel}</span>
    <span><i class="dot focus"></i>当前关注</span>
    <span class="hint">编号表示访问顺序</span>
  </div>
</div>

<style>
  .tree-panel { min-width: 0; padding: 0 0 0.65rem; overflow-x: auto; }
  .legend { display: flex; align-items: center; flex-wrap: wrap; gap: 0.4rem 0.8rem; margin-top: 0.35rem; padding-inline: 0.2rem; color: var(--anim-muted); font-size: 0.68rem; }
  .legend > span { display: inline-flex; align-items: center; gap: 0.3rem; }
  .dot { width: 0.6rem; height: 0.6rem; border-radius: 999px; }
  .dot.visited { border: 1px solid var(--accent); background: color-mix(in oklab, var(--accent) 24%, var(--surface)); }
  .dot.member { border: 1px dashed var(--accent-strong); }
  .dot.focus { border: 2px solid var(--accent-strong); background: var(--accent); }
  .legend .hint { margin-left: auto; }
  @media (width < 34rem) { .legend .hint { display: none; } }
</style>
