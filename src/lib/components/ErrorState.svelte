<script lang="ts">
  import Button from './Button.svelte';
  import type { ApiError } from '$lib/api/errors';
  interface Props { error: ApiError | Error | string; onretry?: () => void }
  let { error, onretry }: Props = $props();
  const message = $derived(typeof error === 'string' ? error : error.message);
</script>

<div class="al" role="alert">
  <p>{message}</p>
  {#if onretry}<Button variant="outline" size="sm" onclick={onretry}>Réessayer</Button>{/if}
</div>

<style>
  .al { border: 1.5px solid var(--err); border-radius: var(--radius); padding: 14px 16px; display: flex; gap: 14px; align-items: center; justify-content: space-between; flex-wrap: wrap; }
  p { margin: 0; color: var(--err); font-weight: 700; }
</style>
