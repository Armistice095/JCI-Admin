<script lang="ts">
  import { toasts } from '$lib/stores/toast.svelte';
</script>

<div class="tz" role="status" aria-live="polite">
  {#each toasts.items as t (t.id)}
    <div class="t {t.tone}">
      <span>{t.message}</span>
      <button onclick={() => toasts.dismiss(t.id)} aria-label="Fermer">×</button>
    </div>
  {/each}
</div>

<style>
  .tz { position: fixed; right: 16px; bottom: 16px; display: grid; gap: 8px; z-index: 100; max-width: min(380px, calc(100vw - 32px)); }
  .t { display: flex; gap: 12px; align-items: center; justify-content: space-between; background: var(--ink); color: var(--bg); padding: 12px 14px; border-radius: var(--radius); font-weight: 600; box-shadow: 0 12px 32px rgba(10, 8, 30, 0.25); }
  .t.err { background: var(--err); color: #fff; }
  button { border: 0; background: none; color: inherit; font-size: 20px; cursor: pointer; line-height: 1; }
</style>
