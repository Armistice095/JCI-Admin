<script lang="ts">
  interface Step { id: string; label: string; done?: boolean }
  interface Props { steps: Step[]; current: string; onselect?: (id: string) => void }
  let { steps, current, onselect }: Props = $props();
</script>

<ol class="wst" aria-label="Étapes">
  {#each steps as s, i (s.id)}
    <li>
      <button class="wsb" class:dn={s.done} aria-current={s.id === current ? 'step' : undefined} onclick={() => onselect?.(s.id)} disabled={!onselect}>
        <b>{#if s.done}✓{:else}{i + 1}{/if}</b><span>{s.label}</span>
      </button>
    </li>
  {/each}
</ol>

<style>
  .wst { display: flex; gap: 8px; overflow-x: auto; padding: 2px; margin: 0; list-style: none; }
  .wsb { display: flex; align-items: center; gap: 10px; border: 0; background: none; padding: 8px 12px 8px 8px; border-radius: 12px; font: 700 14px var(--font); color: var(--mut); cursor: pointer; white-space: nowrap; }
  .wsb:disabled { cursor: default; opacity: 0.85; }
  b { width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; background: var(--soft); font-size: 13px; }
  .wsb[aria-current='step'] { color: var(--ink); background: var(--soft); }
  .wsb[aria-current='step'] b { background: var(--violet); color: #fff; }
  .dn b { background: color-mix(in srgb, var(--ok) 16%, transparent); color: var(--ok); }
  @media (max-width: 700px) { .wsb span { display: none; } .wsb[aria-current='step'] span { display: inline; } }
</style>
