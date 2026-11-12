<script lang="ts">
  import Icon from './Icon.svelte';
  interface Props { page: number; pageSize: number; total: number; totalPages: number; onpage: (p: number) => void }
  let { page, pageSize, total, totalPages, onpage }: Props = $props();
  const from = $derived(total === 0 ? 0 : (page - 1) * pageSize + 1);
  const to = $derived(Math.min(page * pageSize, total));
  const pages = $derived.by(() => {
    const max = 5;
    let start = Math.max(1, page - 2);
    const end = Math.min(totalPages, start + max - 1);
    start = Math.max(1, end - max + 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  });
</script>

<nav class="pgn" aria-label="Pagination">
  <span>{from}–{to} sur {total}</span>
  {#if totalPages > 1}
    <div>
      <button class="pn" disabled={page <= 1} onclick={() => onpage(page - 1)} aria-label="Page précédente"><Icon name="chevron-left" /></button>
      {#each pages as p (p)}
        <button class="pn" class:on={p === page} aria-current={p === page ? 'page' : undefined} onclick={() => onpage(p)}>{p}</button>
      {/each}
      <button class="pn" disabled={page >= totalPages} onclick={() => onpage(page + 1)} aria-label="Page suivante"><Icon name="chevron-right" /></button>
    </div>
  {/if}
</nav>

<style>
  .pgn { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-top: auto; padding-top: 14px; flex-wrap: wrap; color: var(--mut); font-size: 14px; }
  div { display: flex; gap: 6px; }
  .pn { min-width: 40px; height: 40px; border-radius: 50%; border: 0; background: none; color: var(--ink); font: 700 14px var(--font); cursor: pointer; display: grid; place-items: center; }
  .pn.on { background: var(--violet); color: #fff; }
  .pn:disabled { color: var(--line); cursor: default; }
</style>
