<script lang="ts">
  /** Courbe des ventes (maquette : tracé lissé, dégradé, infobulle au survol). Données : un point par jour. */
  interface Props {
    points: { date: string; value: number }[];
    format: (n: number) => string;   // infobulle : « 12 000 XOF » / « 5 billets »
    tick: (n: number) => string;     // graduations de l'axe Y
    integer?: boolean;               // graduations entières (billets)
    label: string;                   // description pour les lecteurs d'écran
  }
  let { points, format, tick, integer = false, label }: Props = $props();

  const MO = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  const dayLabel = (iso: string) => { const [, m, d] = iso.split('-').map(Number); return `${d} ${MO[m - 1]}`; };

  let box = $state(688);
  const W = $derived(Math.max(420, Math.round(box)));
  const H = 280, L = 44, R = 14, T = 14, B = 30;
  const N = $derived(points.length);
  const vals = $derived(points.map((p) => p.value));
  const mx = $derived(Math.max(0, ...vals));

  /** Échelle « ronde » : 4 intervalles réguliers, entiers pour les billets. */
  const M = $derived.by(() => {
    if (mx <= 0) return 4;
    const raw = (mx * 1.05) / 4;
    const p = 10 ** Math.floor(Math.log10(raw));
    const steps = integer ? [1, 2, 5, 10] : [1, 2, 2.5, 5, 10];
    return steps.map((k) => k * p).find((s) => s >= raw && (!integer || Number.isInteger(s)))! * 4 || 4;
  });
  const x = (i: number) => (N < 2 ? L : L + ((W - L - R) * i) / (N - 1));
  const y = (t: number) => T + (H - T - B) * (1 - t / M);
  const P = $derived(vals.map((v, i) => [x(i), y(v)] as const));
  const clampY = (t: number) => Math.min(y(0), Math.max(T, t));
  const d = $derived.by(() => {
    if (P.length === 0) return '';
    let s = `M${P[0]}`;
    for (let i = 0; i < P.length - 1; i++) {
      const a = P[i - 1] ?? P[i], b = P[i], c = P[i + 1], e = P[i + 2] ?? c;
      s += `C${b[0] + (c[0] - a[0]) / 6},${clampY(b[1] + (c[1] - a[1]) / 6)} ${c[0] - (e[0] - b[0]) / 6},${clampY(c[1] - (e[1] - b[1]) / 6)} ${c[0]},${c[1]}`;
    }
    return s;
  });
  const ticks = $derived([0, 1, 2, 3, 4].map((k) => (M * k) / 4));
  const stp = $derived(Math.max(1, Math.ceil(N / 6)));

  let hover = $state<number | null>(null);
  function move(e: PointerEvent) {
    const r = (e.currentTarget as HTMLElement).querySelector('svg')!.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    hover = N < 2 ? 0 : Math.max(0, Math.min(N - 1, Math.round((px - L) / ((W - L - R) / (N - 1)))));
  }
</script>

<div class="cw" bind:clientWidth={box} onpointermove={move} onpointerleave={() => (hover = null)} role="presentation">
  <svg viewBox="0 0 {W} {H}" role="img" aria-label={label} style="width:100%;height:auto;display:block;touch-action:pan-y">
    <defs>
      <linearGradient id="lg1" gradientUnits="userSpaceOnUse" x1={L} x2={W - R}><stop offset="0" stop-color="#3fb8f0" /><stop offset="1" stop-color="#7a6af0" /></linearGradient>
      <linearGradient id="ar1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7a6af0" stop-opacity=".2" /><stop offset="1" stop-color="#3fb8f0" stop-opacity="0" /></linearGradient>
    </defs>
    {#each ticks as t}
      <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="var(--line)" stroke-width="1" />
      <text class="ax" x={L - 8} y={y(t) + 4} text-anchor="end">{tick(t)}</text>
    {/each}
    {#if N > 0}
      <path d="{d}L{x(N - 1)},{y(0)}L{x(0)},{y(0)}Z" fill="url(#ar1)" />
      <path {d} fill="none" stroke="url(#lg1)" stroke-width="3.5" stroke-linecap="round" />
    {/if}
    {#each points as p, i}
      {#if i % stp === 0}<text class="ax" x={x(i)} y={H - 8} text-anchor="middle">{dayLabel(p.date)}</text>{/if}
    {/each}
    {#if hover !== null && P[hover]}
      <g transform="translate({P[hover][0]} 0)">
        <line y1={T} y2={y(0)} stroke="var(--mut)" stroke-dasharray="3 4" />
        <circle cy={P[hover][1]} r="6" fill="var(--card)" stroke="#7a6af0" stroke-width="3" />
      </g>
    {/if}
  </svg>
  {#if hover !== null && P[hover]}
    <div class="tt" style="left:{(P[hover][0] / W) * 100}%;top:{(P[hover][1] / H) * 100}%"><b>{dayLabel(points[hover].date)}</b>{format(points[hover].value)}</div>
  {/if}
</div>

<style>
  .cw { position: relative; }
  .ax { fill: var(--mut); font: 600 12px var(--font); }
  .tt { position: absolute; transform: translate(-50%, calc(-100% - 14px)); background: var(--ink); color: var(--bg); padding: 6px 10px; border-radius: 8px; font-size: 13px; font-weight: 600; pointer-events: none; white-space: nowrap; line-height: 1.3; }
  .tt b { display: block; font-size: 12px; opacity: 0.8; }
</style>
