<script lang="ts">
  import type { Snippet } from 'svelte';
  interface Props { children: Snippet; minWidth?: number }
  let { children, minWidth = 600 }: Props = $props();
</script>

<div class="tw"><table style="min-width:{minWidth}px">{@render children()}</table></div>

<style>
  .tw { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  .tw :global(th) { text-align: left; color: var(--mut); font-weight: 600; padding: 12px 14px; border-bottom: 1px solid var(--line); white-space: nowrap; }
  .tw :global(td) { padding: 14px; white-space: nowrap; }
  .tw :global(th.num), .tw :global(td.num) { text-align: right; }
  .tw :global(tbody tr:nth-child(even)) { background: color-mix(in srgb, var(--soft) 55%, transparent); }
  .tw :global(tbody tr:hover) { background: var(--soft); }
  .tw :global(td small) { display: block; color: var(--mut); font-size: 12px; }
</style>
