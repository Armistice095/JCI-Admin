<script lang="ts">
  import Icon from './Icon.svelte';
  interface Props { value: string; label: string; icon: string; color?: 'blue' | 'coral' | 'amber' | 'purple'; loading?: boolean; hint?: string }
  let { value, label, icon, color = 'blue', loading = false, hint }: Props = $props();
</script>

<div class="kc" title={hint}>
  <span class="ci {color}"><Icon name={icon} size={32} /></span>
  <div>
    {#if loading}<b class="sk">&nbsp;</b>{:else}<b>{value}</b>{/if}
    <span>{label}</span>
  </div>
</div>

<style>
  .kc { background: var(--card); border-radius: 16px; padding: 28px 30px; display: flex; gap: 22px; align-items: center; box-shadow: var(--sh); }
  .ci { width: 72px; height: 72px; border-radius: 50%; display: grid; place-items: center; flex: none; background: color-mix(in srgb, currentColor 12%, transparent); }
  .ci :global(svg) { fill: currentColor; stroke: none; }
  .blue { color: var(--c-blue); } .coral { color: var(--c-coral); } .amber { color: var(--c-amber); } .purple { color: var(--c-purple); }
  div { min-width: 0; }
  b { display: block; font-size: clamp(24px, 2vw, 30px); line-height: 1.2; font-weight: 700; color: var(--ink); }
  span:not(.ci) { display: block; font-weight: 500; font-size: 16px; color: var(--mut); }
  .sk { width: 120px; border-radius: 6px; background: linear-gradient(90deg, var(--soft), var(--line), var(--soft)); background-size: 200% 100%; animation: sh 1.2s linear infinite; }
  @keyframes sh { to { background-position: -200% 0; } }
</style>
