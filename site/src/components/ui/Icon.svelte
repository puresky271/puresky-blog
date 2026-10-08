<script lang="ts">
  /**
   * Icon.svelte — 客户端图标。传入 icons.generated 里的命名导出，
   * 而不是名字字符串，这样没用到的图标不会进包。
   */
  import type { IconData } from '@/lib/icons.generated';

  let {
    icon,
    size = 18,
    class: className = '',
    label,
  }: { icon: IconData; size?: number; class?: string; label?: string } = $props();
</script>

<svg
  xmlns="http://www.w3.org/2000/svg"
  width={size}
  height={size}
  viewBox="0 0 {icon.size} {icon.size}"
  class="shrink-0 {className}"
  aria-hidden={label ? undefined : 'true'}
  aria-label={label}
  role={label ? 'img' : undefined}
>
  {@html icon.body}
</svg>
