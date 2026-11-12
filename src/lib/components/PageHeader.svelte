<script lang="ts">
  import type { Snippet } from 'svelte';
  interface Props { title: string; subtitle?: string; actions?: Snippet }
  let { title, subtitle, actions }: Props = $props();
</script>

<div class="ph">
  <div>
    <h1>{title}</h1>
    {#if subtitle}<p>{subtitle}</p>{/if}
  </div>
  {#if actions}<div class="act">{@render actions()}</div>{/if}
</div>

<style>
  .ph { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; justify-content: space-between; margin-bottom: 24px; }
  p { margin: 4px 0 0; }
  .act { display: flex; gap: 10px; flex-wrap: wrap; }
</style>
