<script lang="ts">
  let {
    value,
    max,
    onchange,
  }: {
    value: number;
    max: number;
    onchange: (value: number) => void;
  } = $props();
  const progress = $derived(max > 0 ? (value / max) * 100 : 0);
</script>

<div class="slider" style="--progress: {progress}%">
  <input
    type="range"
    min="0"
    {max}
    {value}
    oninput={(event) => onchange(Number(event.currentTarget.value))}
    aria-label="动画步骤"
    aria-valuetext={`第 ${value + 1} 步，共 ${max + 1} 步`}
  />
</div>

<style>
  .slider { display: flex; align-items: center; height: 1.75rem; }
  input { width: 100%; height: 1.75rem; margin: 0; appearance: none; background: transparent; cursor: pointer; }
  input::-webkit-slider-runnable-track {
    height: 4px;
    border-radius: 999px;
    background: linear-gradient(to right, var(--accent) 0 var(--progress), color-mix(in oklab, var(--fg) 12%, transparent) var(--progress) 100%);
  }
  input::-moz-range-track { height: 4px; border-radius: 999px; background: color-mix(in oklab, var(--fg) 12%, transparent); }
  input::-moz-range-progress { height: 4px; border-radius: 999px; background: var(--accent); }
  input::-webkit-slider-thumb {
    width: 14px;
    height: 14px;
    margin-top: -5px;
    appearance: none;
    border: 3px solid var(--surface);
    border-radius: 999px;
    background: var(--accent);
    box-shadow: 0 0 0 1px var(--accent), var(--shadow-sm);
    transition: transform 160ms var(--ease-spring), box-shadow 160ms ease;
  }
  input::-moz-range-thumb { width: 10px; height: 10px; border: 3px solid var(--surface); border-radius: 999px; background: var(--accent); box-shadow: 0 0 0 1px var(--accent); }
  input:hover::-webkit-slider-thumb, input:focus-visible::-webkit-slider-thumb { transform: scale(1.15); box-shadow: 0 0 0 4px var(--accent-soft); }
  input:focus-visible { outline: none; }
  @media (prefers-reduced-motion: reduce) { input::-webkit-slider-thumb { transition: none; } }
</style>
