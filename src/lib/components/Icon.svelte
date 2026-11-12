<script lang="ts">
  import { ICONS } from './icons';
  interface Props { name: string; size?: number; label?: string }
  let { name, size = 20, label }: Props = $props();
</script>

<svg
  class="i"
  width={size}
  height={size}
  viewBox="0 0 24 24"
  role={label ? 'img' : undefined}
  aria-label={label}
  aria-hidden={label ? undefined : 'true'}
>
  <!-- Contenu statique extrait de la maquette (jamais de données API) : {@html} sans risque ici. -->
  {@html ICONS[name] ?? ''}
</svg>

<style>
  .i { stroke: currentColor; fill: none; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; flex: none; }
</style>
