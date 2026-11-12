<script lang="ts">
  import type { Snippet } from 'svelte';
  interface Props { title: string; subtitle?: string; children: Snippet }
  let { title, subtitle, children }: Props = $props();
</script>

<div class="lg">
  <div class="lc">
    <h1>{title}</h1>
    {#if subtitle}<p class="sub">{subtitle}</p>{/if}
    {@render children()}
  </div>
</div>

<style>
  .lg {
    min-height: 100vh; display: grid; place-items: center; padding: 24px;
    background:
      radial-gradient(600px 420px at 8% 10%, rgba(91, 141, 239, 0.18), transparent),
      radial-gradient(520px 420px at 92% 12%, rgba(255, 194, 51, 0.2), transparent),
      radial-gradient(620px 440px at 88% 95%, rgba(255, 138, 107, 0.17), transparent),
      radial-gradient(520px 420px at 8% 92%, rgba(122, 106, 240, 0.17), transparent),
      var(--page);
  }
  .lc { width: 100%; max-width: 420px; background: var(--card); border-radius: 20px; padding: 40px 36px; box-shadow: var(--sh); }
  h1 { text-align: center; text-transform: uppercase; letter-spacing: 0.01em; font-size: 28px; }
  .sub { text-align: center; margin: 8px 0 24px; }
  @media (max-width: 480px) { .lc { padding: 28px 22px; } }
</style>
