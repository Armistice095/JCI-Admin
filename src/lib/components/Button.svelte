<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';

  interface Props extends HTMLButtonAttributes {
    variant?: 'primary' | 'outline' | 'danger';
    size?: 'md' | 'sm';
    block?: boolean;
    href?: string;
    target?: string;
    loading?: boolean;
    children: Snippet;
  }
  let { variant = 'primary', size = 'md', block = false, href, target, loading = false, children, disabled, ...rest }: Props = $props();
</script>

{#if href}
  <a class="btn {variant} {size}" class:block {href} {target} rel={target === '_blank' ? 'noopener noreferrer' : undefined}>
    {@render children()}
  </a>
{:else}
  <button class="btn {variant} {size}" class:block disabled={disabled || loading} aria-busy={loading} {...rest}>
    {@render children()}
  </button>
{/if}

<style>
  .btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 8px;
    min-height: 44px; padding: 0 20px; border-radius: var(--radius);
    border: 1.5px solid var(--ink); background: var(--ink); color: var(--bg);
    font: 700 15px var(--font); text-decoration: none; cursor: pointer;
  }
  .btn.outline { background: none; color: var(--ink); }
  .btn.danger { background: var(--err); border-color: var(--err); color: #fff; }
  .btn.sm { min-height: 36px; padding: 0 14px; font-size: 14px; }
  .btn.block { width: 100%; }
  .btn:disabled { background: var(--soft); border-color: var(--line); color: var(--mut); cursor: wait; }
</style>
