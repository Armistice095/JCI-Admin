<script lang="ts">
  import type { Tone } from '$lib/utils/labels';
  interface Props { tone?: Tone; label: string; dot?: boolean }
  let { tone = 'neutral', label, dot = true }: Props = $props();
</script>

<span class="bd {tone}">{#if dot}<i></i>{/if}{label}</span>

<style>
  .bd {
    display: inline-flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 700;
    border-radius: 99px; padding: 3px 11px; white-space: nowrap;
    background: color-mix(in srgb, var(--mut) 12%, transparent); color: var(--mut);
  }
  i { width: 7px; height: 7px; border-radius: 50%; background: currentColor; }
  .ok { background: color-mix(in srgb, var(--ok) 13%, transparent); color: var(--ok); }
  .wait { background: color-mix(in srgb, var(--wait) 14%, transparent); color: var(--wait); }
  .err { background: color-mix(in srgb, var(--err) 12%, transparent); color: var(--err); }
  .info { background: color-mix(in srgb, var(--acc) 12%, transparent); color: var(--acc); }
</style>
