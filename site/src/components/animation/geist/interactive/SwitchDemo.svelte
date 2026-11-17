<script lang="ts">
  /**
   * 开关：原站的 Switch 其实是分段选择器，两三个互斥选项拼成一条灰色轨道，
   * 选中项浮起一块白色底片。这里做一组可用的和一组禁用的。
   */
  import { tick } from 'svelte';
  import './interactive.css';

  let { config = {} }: { config?: Record<string, unknown> } = $props();
  $effect(() => {
    void config;
  });

  const OPTIONS = ['源码', '输出'];

  let selected = $state(0);
  let groupEl = $state<HTMLDivElement>();

  async function select(index: number) {
    selected = index;
    await tick();
    groupEl?.querySelector<HTMLButtonElement>(`[data-switch="${index}"]`)?.focus();
  }

  function onKeydown(event: KeyboardEvent) {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const forward = event.key === 'ArrowRight' || event.key === 'ArrowDown';
    void select((selected + (forward ? 1 : -1) + OPTIONS.length) % OPTIONS.length);
  }
</script>

<div class="gi-demo">
  <div class="gi-switch-grid">
    <div class="gi-switch-block">
      <span class="gi-label">视图</span>
      <div
        bind:this={groupEl}
        class="gi-seg"
        role="radiogroup"
        tabindex="-1"
        aria-label="视图"
        onkeydown={onKeydown}
      >
        {#each OPTIONS as option, index (option)}
          <button
            type="button"
            class="gi-seg-option"
            role="radio"
            data-switch={index}
            aria-checked={selected === index}
            tabindex={selected === index ? 0 : -1}
            onclick={() => select(index)}
          >
            {option}
          </button>
        {/each}
      </div>
    </div>

    <div class="gi-switch-block">
      <span class="gi-label">禁用态</span>
      <div class="gi-seg" role="radiogroup" tabindex="-1" aria-label="禁用态示例">
        {#each OPTIONS as option, index (option)}
          <button
            type="button"
            class="gi-seg-option"
            role="radio"
            aria-checked={index === 1}
            tabindex={index === 1 ? 0 : -1}
            disabled
          >
            {option}
          </button>
        {/each}
      </div>
    </div>
  </div>

  <p class="gi-hint">
    点击切换分段选项，选中项会浮起一块带阴影的底片，左右方向键也能切换，禁用的那一组只能看不能点。
  </p>
</div>

<style>
  .gi-switch-grid {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 24px;
  }

  .gi-switch-block {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
</style>
