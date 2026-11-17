<script lang="ts">
  /**
   * 单选组：三个套餐二选一里挑一个，选中项圆点变实心。
   *
   * 用 role="radiogroup" + role="radio" 表达，焦点在组内用上下左右方向键移动并立即选中，
   * Home 和 End 跳到首尾，Tab 只停在当前选中项上。
   */
  import { tick } from 'svelte';
  import './interactive.css';

  let { config = {} }: { config?: Record<string, unknown> } = $props();
  $effect(() => {
    void config;
  });

  const OPTIONS = ['免费计划', '专业计划', '企业计划'];

  let selected = $state(1);
  let groupEl = $state<HTMLDivElement>();

  async function select(index: number) {
    selected = index;
    await tick();
    groupEl?.querySelector<HTMLButtonElement>(`[data-radio="${index}"]`)?.focus();
  }

  function onKeydown(event: KeyboardEvent) {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'Home') {
      void select(0);
      return;
    }
    if (event.key === 'End') {
      void select(OPTIONS.length - 1);
      return;
    }
    const forward = event.key === 'ArrowRight' || event.key === 'ArrowDown';
    void select((selected + (forward ? 1 : -1) + OPTIONS.length) % OPTIONS.length);
  }
</script>

<div class="gi-demo">
  <div
    bind:this={groupEl}
    class="gi-radios"
    role="radiogroup"
    tabindex="-1"
    aria-label="套餐"
    onkeydown={onKeydown}
  >
    {#each OPTIONS as option, index (option)}
      <button
        type="button"
        class="gi-radio"
        role="radio"
        data-radio={index}
        aria-checked={selected === index}
        tabindex={selected === index ? 0 : -1}
        onclick={() => select(index)}
      >
        <span class="gi-radio-dot" aria-hidden="true"></span>
        {option}
      </button>
    {/each}
  </div>

  <p class="gi-hint">点击选中一个选项，选中项圆点变成实心，上下左右方向键也能在组内切换。</p>
</div>
