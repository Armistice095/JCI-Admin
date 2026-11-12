<script lang="ts">
  interface Section { id: string; label: string; done?: boolean }
  interface Props { sections: Section[]; active: string }
  let { sections, active }: Props = $props();
  function go(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
</script>

<nav class="sn" aria-label="Sections du formulaire">
  <ol>
    {#each sections as s, i (s.id)}
      <li>
        <button type="button" class:on={active === s.id} aria-current={active === s.id ? 'step' : undefined} onclick={() => go(s.id)}>
          <b class:done={s.done}>{#if s.done}✓{:else}{i + 1}{/if}</b><span>{s.label}</span>
        </button>
      </li>
    {/each}
  </ol>
</nav>

<style>
  .sn { position: sticky; top: 88px; align-self: start; }
  ol { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; }
  button { display: flex; align-items: center; gap: 12px; width: 100%; border: 0; background: none; padding: 10px 12px; border-radius: 12px; font: 700 14px var(--font); color: var(--mut); cursor: pointer; text-align: left; }
  button.on { color: var(--ink); background: var(--soft); }
  b { width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center; background: var(--soft); font-size: 12px; flex: none; }
  button.on b { background: var(--violet); color: #fff; }
  b.done { background: color-mix(in srgb, var(--ok) 16%, transparent); color: var(--ok); }
  @media (max-width: 900px) {
    .sn { position: static; overflow-x: auto; }
    ol { display: flex; }
    button { white-space: nowrap; width: auto; }
  }
</style>
