<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icon from './Icon.svelte';
  interface Props { open: boolean; title: string; onclose: () => void; children: Snippet; footer?: Snippet; wide?: boolean }
  let { open, title, onclose, children, footer, wide = false }: Props = $props();
  let dlg = $state<HTMLDialogElement>();
  $effect(() => {
    if (!dlg) return;
    if (open && !dlg.open) dlg.showModal();
    if (!open && dlg.open) dlg.close();
  });
</script>

<dialog bind:this={dlg} class:wide {onclose} oncancel={onclose} onclick={(e) => e.target === dlg && onclose()} aria-labelledby="modal-title">
  <header>
    <h2 id="modal-title">{title}</h2>
    <button class="ib" onclick={onclose} aria-label="Fermer"><Icon name="close" /></button>
  </header>
  <div class="body">{@render children()}</div>
  {#if footer}<footer>{@render footer()}</footer>{/if}
</dialog>

<style>
  dialog { border: 0; border-radius: var(--radius-card); padding: 0; width: min(520px, calc(100vw - 32px)); background: var(--card); color: var(--ink); box-shadow: 0 24px 60px rgba(10, 8, 30, 0.3); }
  dialog.wide { width: min(760px, calc(100vw - 32px)); }
  dialog::backdrop { background: rgba(10, 8, 30, 0.5); }
  header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px 0; }
  h2 { font-size: 18px; }
  .body { padding: 18px 24px; }
  footer { display: flex; justify-content: flex-end; gap: 10px; padding: 0 24px 22px; flex-wrap: wrap; }
  .ib { width: 44px; height: 44px; border-radius: var(--radius); border: 1px solid var(--line); background: none; color: var(--ink); display: grid; place-items: center; cursor: pointer; }
</style>
