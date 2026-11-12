<script lang="ts">
  interface Props { text: string; size?: number }
  let { text, size = 36 }: Props = $props();
</script>

<span class="av" style="width:{size}px;height:{size}px;font-size:{Math.round(size * 0.36)}px" aria-hidden="true">{text}</span>

<style>
  .av { border-radius: 50%; background: var(--ink); color: var(--bg); display: grid; place-items: center; font-weight: 800; flex: none; }
</style>
