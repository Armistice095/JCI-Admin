<script lang="ts">
  import Badge from '$lib/components/Badge.svelte';
  import Button from '$lib/components/Button.svelte';
  import Card from '$lib/components/Card.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import ErrorState from '$lib/components/ErrorState.svelte';
  import Pagination from '$lib/components/Pagination.svelte';
  import SearchInput from '$lib/components/SearchInput.svelte';
  import Table from '$lib/components/Table.svelte';
  import TicketDetailModal from '$lib/components/TicketDetailModal.svelte';
  import { api, unwrap, type Schemas } from '$lib/api/client';
  import { ApiError } from '$lib/api/errors';
  import { getEventContext } from '$lib/features/eventContext';
  import { session } from '$lib/stores/session.svelte';
  import { toasts } from '$lib/stores/toast.svelte';
  import { Resource } from '$lib/utils/resource.svelte';
  import { formatDateTime, formatNumber, formatXof } from '$lib/utils/format';
  import { emailDelivery, orderStatus, paymentMethod, presence as presenceLabel } from '$lib/utils/labels';

  type Presence = Schemas['Presence'];
  type Sort = 'number' | 'name' | 'purchasedAt' | 'category';
  const ctx = getEventContext();
  const eventId = $derived(ctx.event.id);
  const allowed = $derived(session.can('participant.read', eventId));
  const canExport = $derived(session.can('participant.export', eventId));

  let q = $state('');
  let categoryId = $state('');
  let presence = $state<Presence | ''>('');
  let sort = $state<Sort>('number');
  let dir = $state<'asc' | 'desc'>('asc');
  let page = $state(1);
  const PAGE_SIZE = 10;

  const filters = $derived({ ...(q && { q }), ...(categoryId && { categoryId }), ...(presence && { presence }), sort, dir });
  const res = new Resource(() =>
    unwrap(api.GET('/events/{eventId}/participants', { params: { path: { eventId }, query: { page, pageSize: PAGE_SIZE, ...filters } } }))
  );
  $effect(() => { if (allowed) void res.load(); });

  // Catégories pour le filtre (les droits de lecture de la billetterie peuvent différer : en cas d'erreur on masque le filtre)
  const cats = new Resource(() => unwrap(api.GET('/events/{eventId}/ticketing', { params: { path: { eventId } } })));
  $effect(() => { if (allowed) void cats.load(); });

  const counts = $derived(res.data?.meta.counts);
  const chips: { v: Presence | ''; label: string; key: 'ALL' | Presence }[] = [
    { v: '', label: 'Tous', key: 'ALL' },
    { v: 'UPCOMING', label: 'À venir', key: 'UPCOMING' },
    { v: 'PRESENT', label: 'Présents', key: 'PRESENT' },
    { v: 'CANCELLED', label: 'Annulés', key: 'CANCELLED' }
  ];
  const filtered = $derived(!!q || !!categoryId || !!presence);
  const reset = () => { q = ''; categoryId = ''; presence = ''; page = 1; };
  function sortBy(s: Sort) {
    if (sort === s) dir = dir === 'asc' ? 'desc' : 'asc';
    else { sort = s; dir = 'asc'; }
    page = 1;
  }
  const arrow = (s: Sort) => (sort === s ? (dir === 'asc' ? ' ↑' : ' ↓') : ' ↕');
  const ariaSort = (s: Sort) => (sort === s ? (dir === 'asc' ? 'ascending' : 'descending') : 'none');

  // Export : fetch avec le jeton puis téléchargement du blob (un lien simple n'enverrait pas l'en-tête Authorization)
  let exporting = $state<'csv' | 'xlsx' | null>(null);
  async function exportFile(format: 'csv' | 'xlsx') {
    if (exporting) return;
    exporting = format;
    try {
      const blob = (await unwrap(
        api.GET('/events/{eventId}/participants/export', { params: { path: { eventId }, query: { format, ...filters } }, parseAs: 'blob' })
      )) as unknown as Blob;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `participants-${ctx.event.slug ?? eventId}.${format}`;
      document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      toasts.ok('Export téléchargé.');
    } catch (e) {
      toasts.error(e instanceof ApiError && e.status === 422 ? `${e.message} Affinez les filtres (10 000 lignes maximum).` : e instanceof Error ? e.message : 'Export impossible.');
    } finally { exporting = null; }
  }

  let ticketId = $state<string | null>(null);
</script>

{#if !allowed}
  <Card><EmptyState title="Accès restreint" text="Vous n’avez pas accès à la liste des participants de cet événement." /></Card>
{:else}
  <Card title={counts ? `Participants · ${formatNumber(counts.ALL)}` : 'Participants'}>
    {#snippet actions()}
      {#if canExport}
        <Button size="sm" variant="outline" onclick={() => exportFile('csv')} loading={exporting === 'csv'}>Exporter CSV</Button>
        <Button size="sm" variant="outline" onclick={() => exportFile('xlsx')} loading={exporting === 'xlsx'}>Exporter Excel</Button>
      {/if}
    {/snippet}

    <div class="bar">
      <SearchInput width={400} placeholder="Nom, e-mail, téléphone ou référence" bind:value={q} onsearch={() => (page = 1)} />
      {#if cats.data && cats.data.categories.length > 1}
        <select aria-label="Catégorie" bind:value={categoryId} onchange={() => (page = 1)}>
          <option value="">Toutes les catégories</option>
          {#each cats.data.categories as c (c.id)}<option value={c.id}>{c.name}</option>{/each}
        </select>
      {/if}
    </div>
    <div class="chips" role="group" aria-label="Filtrer par présence">
      {#each chips as c (c.key)}
        <button class="chip" aria-pressed={presence === c.v} onclick={() => { presence = c.v; page = 1; }}>
          {#if c.v === ''}<span class="all">{c.label}</span>{:else}<Badge {...presenceLabel(c.v)} label={c.label} />{/if}
          <b>{counts ? formatNumber(counts[c.key]) : 0}</b>
        </button>
      {/each}
    </div>

    {#if res.error && !res.data}
      <ErrorState error={res.error} onretry={res.reload} />
    {:else if !res.data}
      <div class="sk" style="height:320px;border-radius:12px"></div>
    {:else if res.data.data.length === 0}
      {#if filtered}
        <EmptyState title="Aucun résultat" text="Aucun participant ne correspond à ces critères.">
          <Button variant="outline" onclick={reset}>Réinitialiser les filtres</Button>
        </EmptyState>
      {:else}<EmptyState title="Aucun participant" text="Les participants apparaîtront ici dès l’émission des premiers billets." />{/if}
    {:else}
      <div class:busy={res.loading}>
        <Table minWidth={1180}>
          <thead>
            <tr>
              <th>N°</th>
              <th aria-sort={ariaSort('name')}><button class="th" onclick={() => sortBy('name')}>Participant{arrow('name')}</button></th>
              <th aria-sort={ariaSort('category')}><button class="th" onclick={() => sortBy('category')}>Catégorie{arrow('category')}</button></th>
              <th aria-sort={ariaSort('number')}><button class="th" onclick={() => sortBy('number')}>Billet{arrow('number')}</button></th>
              <th class="num">Montant</th>
              <th>Paiement</th>
              <th>Présence</th>
              <th aria-sort={ariaSort('purchasedAt')}><button class="th" onclick={() => sortBy('purchasedAt')}>Achat{arrow('purchasedAt')}</button></th>
              <th>E-mail</th>
              <th class="num"></th>
            </tr>
          </thead>
          <tbody>
            {#each res.data.data as p, i (p.ticketId)}
              <tr>
                <td>{(res.data.meta.page - 1) * res.data.meta.pageSize + i + 1}</td>
                <td><b>{p.lastName} {p.firstName}</b><small>{[p.phone, p.email].filter(Boolean).join(' · ') || '—'}</small></td>
                <td>{p.category}</td>
                <td>{p.ticketNumber}<small>{p.orderReference}</small></td>
                <td class="num">{formatXof(p.amountXof)}</td>
                <td><Badge {...orderStatus(p.paymentStatus)} /><small>{paymentMethod(p.paymentMethod).label}</small></td>
                <td><Badge {...presenceLabel(p.presence)} />{#if p.checkedInAt}<small>{formatDateTime(p.checkedInAt)}</small>{/if}</td>
                <td>{formatDateTime(p.purchasedAt)}</td>
                <td><Badge {...emailDelivery(p.emailStatus)} /></td>
                <td class="num"><Button size="sm" variant="outline" onclick={() => (ticketId = p.ticketId)} aria-label="Voir le billet {p.ticketNumber}">Voir le billet</Button></td>
              </tr>
            {/each}
          </tbody>
        </Table>
        <Pagination {...res.data.meta} onpage={(n) => (page = n)} />
      </div>
    {/if}
  </Card>
  <TicketDetailModal {ticketId} onclose={() => (ticketId = null)} />
{/if}

<style>
  .bar { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
  .bar select { width: auto; flex: 0 1 260px; min-width: 200px; }
  .chips { display: flex; gap: 8px 14px; flex-wrap: wrap; margin-bottom: 12px; align-items: center; }
  .chip { display: inline-flex; align-items: center; gap: 8px; border: 0; background: none; padding: 4px; border-radius: 99px; cursor: pointer; font: 700 15px var(--font); color: var(--ink); }
  .chip[aria-pressed='true'] { box-shadow: 0 0 0 2px var(--ink); }
  .all { background: var(--soft); border-radius: 99px; padding: 3px 11px; font-size: 14px; }
  .th { border: 0; background: none; font: inherit; color: inherit; cursor: pointer; padding: 0; white-space: nowrap; }
  .busy { opacity: 0.6; transition: opacity 0.15s; }
  .sk { background: linear-gradient(90deg, var(--soft), var(--line), var(--soft)); background-size: 200% 100%; animation: sh 1.2s linear infinite; }
  @keyframes sh { to { background-position: -200% 0; } }
</style>
