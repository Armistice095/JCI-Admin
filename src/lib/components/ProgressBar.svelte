<script lang="ts">
  interface Props { value: number; max: number; label?: string }
  let { value, max, label }: Props = $props();
  const pct = $derived(max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0);
</script>

<div class="pb" role="progressbar" aria-valuemin="0" aria-valuemax={max} aria-valuenow={value} aria-label={label}>
  <i style="width:{pct}%"></i>
</div>

<style>
  .pb { height: 6px; border-radius: 3px; background: var(--line); margin: 8px 0 4px; overflow: hidden; }
  i { display: block; height: 100%; border-radius: 3px; background: linear-gradient(90deg, #5b8def, #7a6af0); }
</style>
