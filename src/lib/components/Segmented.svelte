<script lang="ts" generics="T extends string">
  interface Option { value: T; label: string; count?: number }
  interface Props { options: Option[]; value: T; label: string; onchange?: (v: T) => void }
  let { options, value = $bindable(), label, onchange }: Props = $props();
</script>

<div class="seg" role="group" aria-label={label}>
  {#each options as o (o.value)}
    <button type="button" aria-pressed={value === o.value} onclick={() => { value = o.value; onchange?.(o.value); }}>
      {o.label}{#if o.count !== undefined}<span class="ct">{o.count}</span>{/if}
    </button>
  {/each}
</div>

<style>
  .seg { display: inline-flex; background: var(--soft); border-radius: 10px; padding: 3px; max-width: 100%; overflow-x: auto; }
  button { min-height: 36px; padding: 0 12px; border: 0; border-radius: 8px; background: none; color: var(--mut); font: 600 13px var(--font); cursor: pointer; white-space: nowrap; }
  button[aria-pressed='true'] { background: var(--card); color: var(--ink); box-shadow: 0 1px 3px rgba(22, 16, 63, 0.18); }
  .ct { display: inline-block; background: color-mix(in srgb, currentColor 12%, transparent); border-radius: 99px; padding: 0 7px; margin-left: 4px; font-size: 12px; }
</style>
