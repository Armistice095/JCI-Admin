<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import type { Snippet } from 'svelte';
  import Topbar from '$lib/components/Topbar.svelte';
  import { session } from '$lib/stores/session.svelte';

  let { children }: { children: Snippet } = $props();

  // Garde de routes : tant que la session n'est pas restaurée on attend ; sans session → connexion.
  $effect(() => {
    if (session.ready && !session.isAuthenticated) {
      const here = page.url.pathname + page.url.search;
      void goto(here === '/' ? '/connexion' : `/connexion?redirect=${encodeURIComponent(here)}`, { replaceState: true });
    }
  });
</script>

{#if session.isAuthenticated}
  <Topbar />
  <main>{@render children()}</main>
{:else}
  <div class="boot" role="status" aria-live="polite">Chargement…</div>
{/if}

<style>
  main { padding: 32px 40px 48px; max-width: 1600px; margin: 0 auto; }
  .boot { min-height: 100vh; display: grid; place-items: center; color: var(--mut); font-weight: 600; }
  @media (max-width: 900px) { main { padding: 20px 16px 40px; } }
</style>
