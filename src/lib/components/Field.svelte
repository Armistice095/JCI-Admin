<script lang="ts">
  import type { Snippet } from 'svelte';
  interface Props { label: string; id: string; required?: boolean; optional?: boolean; error?: string; hint?: string; children: Snippet }
  let { label, id, required = false, optional = false, error, hint, children }: Props = $props();
</script>

<div class="fld" class:bad={!!error}>
  <label for={id}>{label}{#if required}&nbsp;*{/if}{#if optional}&nbsp;<small>(facultatif)</small>{/if}</label>
  {@render children()}
  {#if error}<p class="er" id="{id}-err" role="alert">{error}</p>
  {:else if hint}<p class="hn">{hint}</p>{/if}
</div>

<style>
  .fld { margin: 0 0 16px; }
  small { font-weight: 500; color: var(--mut); }
  .bad :global(input), .bad :global(textarea), .bad :global(select) { border-color: var(--err); }
  .er { color: var(--err); font-size: 13px; font-weight: 700; margin: 6px 0 0; }
  .hn { color: var(--mut); font-size: 13px; margin: 6px 0 0; }
</style>
