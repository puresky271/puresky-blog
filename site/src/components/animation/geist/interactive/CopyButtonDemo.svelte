<script lang="ts">
  /**
   * 复制按钮：一行命令加一个复制图标，点完图标从复制变对勾，1.5 秒后复原。
   * 原站 CopyButton 只有图标，这里按可读性补上一行等宽文本。
   */
  import { onDestroy } from 'svelte';
  import GiIcon from './GiIcon.svelte';
  import './interactive.css';

  let { config = {} }: { config?: Record<string, unknown> } = $props();
  $effect(() => {
    void config;
  });

  const TEXT = 'npx create-astro@latest my-blog';

  let copied = $state(false);
  let status = $state('');
  let timer: ReturnType<typeof setTimeout> | undefined;

  async function copy() {
    let ok = false;
    try {
      await navigator.clipboard.writeText(TEXT);
      ok = true;
    } catch {
      /* 没有剪贴板权限时退回选中文本再复制 */
      const area = document.createElement('textarea');
      area.value = TEXT;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.append(area);
      area.select();
      ok = document.execCommand('copy');
      area.remove();
    }

    status = ok ? '已复制到剪贴板' : '复制失败，请手动选中文本';
    copied = true;
    clearTimeout(timer);
    timer = setTimeout(() => {
      copied = false;
      status = '';
    }, 1500);
  }

  onDestroy(() => clearTimeout(timer));
</script>

<div class="gi-demo">
  <div class="gi-copy-field">
    <code class="gi-copy-text">{TEXT}</code>
    <button
      type="button"
      class="gi-copy-btn"
      data-copied={copied ? 'true' : undefined}
      aria-label={copied ? '已复制' : '复制命令'}
      onclick={copy}
    >
      <span class="gi-copy-icon">
        <GiIcon name={copied ? 'check' : 'copy'} />
      </span>
    </button>
  </div>

  <p class="gi-status" aria-live="polite">{status}</p>
  <p class="gi-hint">点击右侧图标复制这行命令，按钮会短暂变成对勾，1.5 秒后自动复原。</p>
</div>
