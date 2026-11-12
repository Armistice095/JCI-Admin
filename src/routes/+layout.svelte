<script lang="ts">
  import '../styles/tokens.css';
  import '../styles/base.css';
  import { onMount } from 'svelte';
  import type { Snippet } from 'svelte';
  import Toaster from '$lib/components/Toaster.svelte';
  import { theme } from '$lib/stores/theme.svelte';
  import { initAuth } from '$lib/auth/auth.svelte';

  let { children }: { children: Snippet } = $props();
  onMount(() => {
    theme.init();
    // Sur /definir-mot-de-passe la session est temporaire : on ne charge pas le profil.
    void initAuth(location.pathname.startsWith('/definir-mot-de-passe'));
  });
</script>

<svelte:head><title>JCI Comé Excellence · Administration</title></svelte:head>

{@render children()}
<Toaster />
