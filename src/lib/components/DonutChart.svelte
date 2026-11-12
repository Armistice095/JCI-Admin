<script lang="ts">
  interface Props { items: { name: string; count: number; percent: number }[]; total: number }
  let { items, total }: Props = $props();
  const COLORS = ['#5b8def', '#ffc233', '#ff8a6b', '#7a6af0', '#3fb8f0', '#9aa0b8'];
  const r = 84, sw = 20, gp = 10, C = 2 * Math.PI * r;
  const arcs = $derived.by(() => {
    let o = 0;
    const sum = items.reduce((s, i) => s + i.count, 0) || 1;
    return items.map((it, k) => {
      const len = (it.count / sum) * C;
      const dash = Math.max(1, len - gp - sw);
      const off = -(o + gp / 2 + sw / 2);
      o += len;
      return { dash, off, color: COLORS[k % COLORS.length] };
    });
  });
  const summary = $derived(`Répartition de ${total} billets émis : ${items.map((i) => `${i.name} ${i.count}`).join(', ')}`);
</script>

<svg class="dn" viewBox="0 0 220 220" role="img" aria-label={summary}>
  <circle cx="110" cy="110" r={r} fill="none" stroke="var(--soft)" stroke-width={sw} />
  {#each arcs as a}
    <circle cx="110" cy="110" r={r} fill="none" stroke={a.color} stroke-width={sw} stroke-linecap="round"
      stroke-dasharray="{a.dash} {C - a.dash}" stroke-dashoffset={a.off} transform="rotate(-90 110 110)" />
  {/each}
  <text class="big" x="110" y="116">{total}</text>
  <text class="sm" x="110" y="138">billets émis</text>
</svg>
<div class="lgd">
  {#each items as it, k}
    <div><i style="background:{COLORS[k % COLORS.length]}"></i>{it.name}<b>{it.count}</b><span>{it.percent} %</span></div>
  {/each}
</div>

<style>
  .dn { display: block; width: 220px; max-width: 100%; margin: 4px auto 20px; }
  .big { font: 800 34px var(--font); fill: var(--ink); text-anchor: middle; }
  .sm { font: 600 14px var(--font); fill: var(--mut); text-anchor: middle; }
  .lgd { display: grid; gap: 12px; }
  .lgd div { display: flex; align-items: center; gap: 10px; }
  .lgd i { width: 12px; height: 12px; border-radius: 4px; flex: none; }
  .lgd b { margin-left: auto; }
  .lgd span { color: var(--mut); font-size: 13px; min-width: 44px; text-align: right; }
</style>
