<script lang="ts">
  interface Tab { href: string; label: string }
  interface Props { tabs: Tab[]; current: string; label?: string }
  let { tabs, current, label = 'Sections' }: Props = $props();
</script>

<nav class="ftabs" aria-label={label}>
  {#each tabs as t (t.href)}
    <a href={t.href} class="ftb" aria-current={current === t.href ? 'page' : undefined}>{t.label}</a>
  {/each}
</nav>

<style>
  .ftabs { display: flex; gap: 4px; overflow-x: auto; margin: 22px -24px 0; padding: 0 24px; border-top: 1px solid var(--line); }
  .ftb { padding: 16px 14px; font: 700 15px var(--font); color: var(--mut); text-decoration: none; white-space: nowrap; position: relative; }
  .ftb:hover, .ftb[aria-current='page'] { color: var(--ink); }
  .ftb[aria-current='page']::after { content: ''; position: absolute; left: 14px; right: 14px; bottom: 0; height: 3px; border-radius: 3px 3px 0 0; background: var(--violet); }
</style>
