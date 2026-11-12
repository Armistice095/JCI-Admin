<script lang="ts">
  import Icon from './Icon.svelte';
  interface Props { value?: string; placeholder?: string; label?: string; delay?: number; width?: number; onsearch?: (q: string) => void }
  let { value = $bindable(''), placeholder = 'Rechercher', label, delay = 300, width = 300, onsearch }: Props = $props();
  let timer: ReturnType<typeof setTimeout>;
  function input() {
    clearTimeout(timer);
    timer = setTimeout(() => onsearch?.(value.trim()), delay);
  }
</script>

<label class="sr" style="width:{width}px">
  <span class="vh">{label ?? placeholder}</span>
  <input type="search" bind:value {placeholder} oninput={input} />
  <Icon name="search" />
</label>

<style>
  .sr { display: flex; align-items: center; gap: 8px; border: 1px solid var(--line); border-radius: 12px; padding: 0 16px; min-height: 44px; color: var(--mut); max-width: 100%; margin: 0; font-weight: 500; }
  .sr:focus-within { border-color: var(--acc); }
  input { flex: 1; min-width: 0; border: 0; background: none; font: 500 14px var(--font); color: var(--ink); min-height: 40px; padding: 0; outline: 0; }
</style>
