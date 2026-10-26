<script lang="ts">
  import FenwickOperationDemo from './FenwickOperationDemo.svelte';
  import type { AnimationProps } from './mount';

  const { config }: AnimationProps = $props();
</script>

<FenwickOperationDemo {config} operation="update" />
