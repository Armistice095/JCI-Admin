<script lang="ts">
  import type { Snippet } from 'svelte';
  interface Props { title: string; text?: string; children?: Snippet }
  let { title, text, children }: Props = $props();
</script>

<div class="em">
  <h2>{title}</h2>
  {#if text}<p>{text}</p>{/if}
  {#if children}{@render children()}{/if}
</div>

<style>
  .em { text-align: center; padding: 56px 20px; }
  h2 { margin-bottom: 8px; }
</style>
