<script lang="ts">
  import Icon from './Icon.svelte';
  interface Props { url: string | null | undefined; size?: number; ratio?: string; radius?: number }
  let { url, size, ratio, radius = 12 }: Props = $props();
  const style = $derived(
    `${size ? `width:${size}px;height:${size}px;` : 'width:100%;'}${ratio ? `aspect-ratio:${ratio};` : ''}border-radius:${radius}px`
  );
</script>

{#if url}
  <img src={url} alt="" loading="lazy" {style} />
{:else}
  <span class="ph0" {style} aria-hidden="true"><Icon name="calendar-k" size={size && size < 60 ? 28 : 44} /></span>
{/if}

<style>
  img { object-fit: cover; flex: none; display: block; }
  .ph0 { display: grid; place-items: center; color: #fff; background: linear-gradient(135deg, #7a6af0, #5b8def); flex: none; }
  .ph0 :global(svg) { fill: currentColor; stroke: none; }
</style>
