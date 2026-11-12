<script lang="ts">
  import type { Snippet } from 'svelte';
  interface Props { title?: string; subtitle?: string; actions?: Snippet; children: Snippet; class?: string }
  let { title, subtitle, actions, children, class: cls = '' }: Props = $props();
</script>

<section class="cd {cls}">
  {#if title || actions}
    <header class="ch">
      <div>
        {#if title}<h2>{title}</h2>{/if}
        {#if subtitle}<p>{subtitle}</p>{/if}
      </div>
      {#if actions}<div class="act">{@render actions()}</div>{/if}
    </header>
  {/if}
  {@render children()}
</section>

<style>
  .cd { background: var(--card); border-radius: var(--radius-card); padding: 24px; box-shadow: var(--sh); min-width: 0; }
  .ch { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; margin-bottom: 18px; }
  h2 { font-size: 18px; }
  p { margin: 2px 0 0; font-size: 14px; }
  .act { display: flex; gap: 10px; flex-wrap: wrap; }
</style>
