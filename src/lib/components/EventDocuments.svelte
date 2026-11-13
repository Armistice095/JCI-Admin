<script lang="ts">
  import Button from './Button.svelte';
  import Icon from './Icon.svelte';
  import ErrorState from './ErrorState.svelte';
  import { api, unwrap } from '$lib/api/client';
  import { networkError, toApiError } from '$lib/api/errors';
  import { Resource } from '$lib/utils/resource.svelte';
  import { toasts } from '$lib/stores/toast.svelte';

  type Kind = 'participants' | 'ticketing' | 'attendance' | 'payments';
  let { eventId, slug }: { eventId: string; slug: string } = $props();

  const res = new Resource(() => unwrap(api.GET('/events/{eventId}/reports', { params: { path: { eventId } } })));
  $effect(() => { void res.load(); });

  const color: Record<Kind, string> = { participants: 'var(--c-blue)', ticketing: 'var(--c-purple)', attendance: 'var(--c-amber)', payments: 'var(--c-coral)' };

  function save(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  // Téléchargement : fetch avec le jeton (un lien simple n'enverrait pas l'en-tête Authorization), puis blob.
  let busy = $state<string | null>(null);
  async function pdf(kind: Kind) {
    if (busy) return;
    busy = kind + ':pdf';
    try {
      let r;
      try {
        r = await api.GET('/events/{eventId}/reports/{kind}', { params: { path: { eventId, kind } }, parseAs: 'blob' });
      } catch { throw networkError(); }
      if (r.error !== undefined || !r.response.ok) {
        // L'erreur arrive en Blob, en texte ou déjà décodée selon le type de contenu.
        let body: unknown = r.error;
        if (body instanceof Blob) body = await body.text().catch(() => '');
        if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = undefined; } }
        throw toApiError(r.response.status, body, r.response.headers.get('Retry-After'));
      }
      const cd = r.response.headers.get('Content-Disposition') ?? '';
      const name = /filename="?([^";]+)/.exec(cd)?.[1] ?? `${kind}-${slug}.pdf`;
      save(r.data as unknown as Blob, name);
      toasts.ok('Document téléchargé.');
    } catch (e) {
      toasts.error(e instanceof Error ? e.message : 'Téléchargement impossible.');
    } finally { busy = null; }
  }

</script>

<section>
  <h2 class="dh">Documents</h2>
  {#if res.error && !res.data}
    <ErrorState error={res.error} onretry={() => res.reload()} />
  {:else if res.data}
    <div class="grid">
      {#each res.data.data as d (d.kind)}
        <article class="doc" class:off={!d.available}>
          <span class="ci" style="color: {color[d.kind]}"><Icon name="file" size={22} /></span>
          <h3>{d.title}</h3>
          <p>{d.description}</p>
          <div class="btns">
            {#if d.formats.includes('pdf')}
              <Button variant="outline" size="sm" disabled={!d.available || (busy !== null && busy !== d.kind + ':pdf')} loading={busy === d.kind + ':pdf'} onclick={() => pdf(d.kind)}
                title={d.available ? undefined : 'Indisponible : événement en brouillon ou droit manquant'}>
                <Icon name="download" size={16} />PDF
              </Button>
            {/if}
          </div>
          {#if !d.available}<small>Indisponible pour cet événement ou pour votre rôle.</small>{/if}
        </article>
      {/each}
    </div>
  {:else}
    <div class="grid">{#each [1, 2, 3, 4] as n (n)}<div class="doc sk" aria-hidden="true"></div>{/each}</div>
  {/if}
</section>

<style>
  .dh { font-size: 16px; margin: 4px 0 12px; }
  .grid { display: grid; gap: 20px; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }
  .doc { background: var(--card); border-radius: var(--radius-card); box-shadow: var(--sh); padding: 28px 30px; display: flex; flex-direction: column; gap: 6px; }
  .doc.off { opacity: 0.6; }
  .doc.sk { min-height: 200px; background: var(--soft); box-shadow: none; }
  .ci { width: 50px; height: 50px; border-radius: 50%; display: grid; place-items: center; background: color-mix(in srgb, currentColor 14%, transparent); margin-bottom: 12px; }
  .ci :global(svg) { fill: currentColor; stroke: none; }
  h3 { margin: 0; font-size: 17px; }
  p { margin: 0 0 10px; color: var(--mut); }
  small { color: var(--mut); font-size: 12px; }
  .btns { display: flex; gap: 10px; flex-wrap: wrap; margin-top: auto; }
</style>
