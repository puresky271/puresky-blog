<script lang="ts">
  /**
   * 复选框：父项加两个子项，子项只选一部分时父项显示 indeterminate 中间态横杠。
   *
   * 用 role="checkbox" 加 aria-checked="mixed" 表达中间态，
   * 比给原生 input 设 indeterminate 更好控制样式，读屏也能正确播报。
   */
  import './interactive.css';

  let { config = {} }: { config?: Record<string, unknown> } = $props();
  $effect(() => {
    void config;
  });

  let mail = $state(true);
  let desktop = $state(false);

  const all = $derived(mail && desktop);
  const mixed = $derived(!all && (mail || desktop));

  function toggleParent() {
    const next = !all;
    mail = next;
    desktop = next;
  }
</script>

<div class="gi-demo">
  <div class="gi-checks">
    <button
      type="button"
      class="gi-check"
      role="checkbox"
      aria-checked={mixed ? 'mixed' : all}
      onclick={toggleParent}
    >
      <span class="gi-check-box" aria-hidden="true">
        {#if mixed}
          <span class="gi-check-dash"></span>
        {:else if all}
          <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
            <path
              d="M13.5 4.5 6.5 11.5 2.5 7.5"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"></path>
          </svg>
        {/if}
      </span>
      全部通知
    </button>

    <div class="gi-checks-sub">
      <button
        type="button"
        class="gi-check"
        role="checkbox"
        aria-checked={mail}
        onclick={() => (mail = !mail)}
      >
        <span class="gi-check-box" aria-hidden="true">
          {#if mail}
            <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
              <path
                d="M13.5 4.5 6.5 11.5 2.5 7.5"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"></path>
            </svg>
          {/if}
        </span>
        邮件通知
      </button>

      <button
        type="button"
        class="gi-check"
        role="checkbox"
        aria-checked={desktop}
        onclick={() => (desktop = !desktop)}
      >
        <span class="gi-check-box" aria-hidden="true">
          {#if desktop}
            <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
              <path
                d="M13.5 4.5 6.5 11.5 2.5 7.5"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"></path>
            </svg>
          {/if}
        </span>
        桌面通知
      </button>
    </div>

    <button type="button" class="gi-check" role="checkbox" aria-checked="true" disabled>
      <span class="gi-check-box" aria-hidden="true">
        <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
          <path
            d="M13.5 4.5 6.5 11.5 2.5 7.5"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"></path>
        </svg>
      </span>
      短信通知（已禁用）
    </button>
  </div>

  <p class="gi-hint">
    勾选父项会同时选中下面两项，只选其中一项时父项显示中间态的横杠，最后一项被禁用。
  </p>
</div>
