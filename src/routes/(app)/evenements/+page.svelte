<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import Button from '$lib/components/Button.svelte';
  import Badge from '$lib/components/Badge.svelte';
  import Card from '$lib/components/Card.svelte';
  import Segmented from '$lib/components/Segmented.svelte';
  import SearchInput from '$lib/components/SearchInput.svelte';
  import Pagination from '$lib/components/Pagination.svelte';
  import ProgressBar from '$lib/components/ProgressBar.svelte';
  import Table from '$lib/components/Table.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import ErrorState from '$lib/components/ErrorState.svelte';
  import EventCover from '$lib/components/EventCover.svelte';
  import Icon from '$lib/components/Icon.svelte';
  import { api, unwrap, type Schemas } from '$lib/api/client';
  import { Resource } from '$lib/utils/resource.svelte';
  import { session } from '$lib/stores/session.svelte';
  import { eventStatus, salesStatus } from '$lib/utils/labels';
  import { formatDate, formatXof, formatNumber } from '$lib/utils/format';

  type StatusTab = 'ALL' | Schemas['EventStatus'];
  type SalesFilter = 'all' | 'open' | 'not_open' | 'closed';
  type View = 'table' | 'grid';

  let status = $state<StatusTab>('ALL');
  let sales = $state<SalesFilter>('all');
  let q = $state('');
  let page = $state(1);
  let view = $state<View>('table');

  onMount(() => {
    try {
      const saved = sessionStorage.getItem('jci-events-view');
      view = saved === 'grid' || saved === 'table' ? saved : matchMedia('(max-width:700px)').matches ? 'grid' : 'table';
    } catch {
      view = 'table';
    }
  });
  function setView(v: View) {
    view = v;
    page = 1;
    try { sessionStorage.setItem('jci-events-view', v); } catch {}
  }

  const pageSize = $derived(view === 'grid' ? 12 : 10);

  const list = new Resource(() =>
    unwrap(
      api.GET('/events', {
        params: {
          query: {
            page,
            pageSize,
            sort: '-startsAt',
            ...(status !== 'ALL' && { status }),
            ...(sales !== 'all' && { sales }),
            ...(q && { q })
          }
        }
      })
    )
  );
  $effect(() => { void list.load(); });

  const counts = $derived(list.data?.meta.statusCounts ?? {});
  const count = (k: string) => counts[k] ?? 0;
  const tabs = $derived([
    { value: 'ALL' as const, label: 'Tous', count: count('ALL') },
    { value: 'DRAFT' as const, label: 'Brouillon', count: count('DRAFT') },
    { value: 'PUBLISHED' as const, label: 'Publié', count: count('PUBLISHED') },
    { value: 'CLOSED' as const, label: 'Clôturé', count: count('CLOSED') },
    { value: 'CANCELLED' as const, label: 'Annulé', count: count('CANCELLED') }
  ]);

  const filtered = $derived(status !== 'ALL' || sales !== 'all' || q !== '');
  const noEventAtAll = $derived(!!list.data && count('ALL') === 0 && !filtered);

  function reset() { status = 'ALL'; sales = 'all'; q = ''; page = 1; }
  const open = (id: string) => goto(`/evenements/${id}`);
  const dateOf = (e: Schemas['EventSummary']) => (e.startsAt ? formatDate(e.startsAt) : '—');
  const place = (e: Schemas['EventSummary']) => [e.venueName, e.city].filter(Boolean).join(', ');
</script>

<svelte:head><title>Événements · JCI Comé Excellence</title></svelte:head>

<h1 class="vh">Événements</h1>

<Card>
  <div class="top">
    <Segmented label="Statut de publication" options={tabs} bind:value={status} onchange={() => (page = 1)} />
    {#if session.can('event.create')}
      <Button href="/evenements/nouveau"><Icon name="plus" />Créer un événement</Button>
    {/if}
  </div>
  <div class="evf">
    <SearchInput placeholder="Rechercher un événement" bind:value={q} onsearch={() => (page = 1)} />
    <label class="sel">
      <span class="vh">Filtrer par billetterie</span>
      <select bind:value={sales} onchange={() => (page = 1)}>
        <option value="all">Billetterie : toutes</option>
        <option value="open">Billetterie ouverte</option>
        <option value="not_open">Billetterie non ouverte</option>
        <option value="closed">Billetterie fermée</option>
      </select>
    </label>
    <div class="vt" role="group" aria-label="Mode d’affichage">
      <button aria-pressed={view === 'table'} aria-label="Vue tableau" onclick={() => setView('table')}><Icon name="list" /></button>
      <button aria-pressed={view === 'grid'} aria-label="Vue cartes" onclick={() => setView('grid')}><Icon name="grid" /></button>
    </div>
  </div>
</Card>

<div class="body" class:busy={list.loading && !!list.data} aria-busy={list.loading}>
  {#if list.error && !list.data}
    <ErrorState error={list.error} onretry={list.reload} />
  {:else if !list.data}
    <div class="sk" style="height:420px;border-radius:18px"></div>
  {:else if noEventAtAll}
    <Card>
      <EmptyState title="Aucun événement pour le moment" text="Créez votre premier événement pour ouvrir la billetterie.">
        {#if session.can('event.create')}<Button href="/evenements/nouveau">Créer un événement</Button>{/if}
      </EmptyState>
    </Card>
  {:else if list.data.data.length === 0}
    <Card>
      <EmptyState title="Aucun résultat" text="Aucun événement ne correspond à ces filtres.">
        <Button variant="outline" onclick={reset}>Réinitialiser les filtres</Button>
      </EmptyState>
    </Card>
  {:else}
    {#if list.error}<ErrorState error={list.error} onretry={list.reload} />{/if}
    {#if view === 'table'}
      <Card>
        <Table minWidth={860}>
          <thead>
            <tr><th>Événement</th><th>Date</th><th>Statut</th><th>Billetterie</th><th class="num">Vues</th><th>Billets émis</th><th class="num">Recettes</th><th><span class="vh">Ouvrir</span></th></tr>
          </thead>
          <tbody>
            {#each list.data.data as e (e.id)}
              {@const st = eventStatus(e.status)}
              {@const ss = e.salesStatus ? salesStatus(e.salesStatus) : null}
              <tr class="rw" onclick={() => open(e.id)}>
                <td>
                  <div class="en">
                    <EventCover url={e.coverUrl} size={56} />
                    <div><a href="/evenements/{e.id}" onclick={(ev) => ev.stopPropagation()}><b>{e.title}</b></a><small>{place(e) || '—'}</small></div>
                  </div>
                </td>
                <td>{dateOf(e)}</td>
                <td><Badge {...st} /></td>
                <td>{#if ss}<Badge tone={ss.tone} label={ss.label.replace('Billetterie ', '').replace(/^./, (c) => c.toUpperCase())} />{:else}—{/if}</td>
                <td class="num">{e.status === 'DRAFT' ? '—' : formatNumber(e.views)}</td>
                <td class="tk"><b>{e.ticketsIssued}</b> / {e.capacity}<ProgressBar value={e.ticketsIssued} max={e.capacity} label="Billets émis" /></td>
                <td class="num">{formatXof(e.revenueXof)}</td>
                <td class="ch"><Icon name="chevron-right" /></td>
              </tr>
            {/each}
          </tbody>
        </Table>
        <Pagination {...list.data.meta} onpage={(p) => (page = p)} />
      </Card>
    {:else}
      <div class="egr">
        {#each list.data.data as e (e.id)}
          {@const st = eventStatus(e.status)}
          {@const ss = e.salesStatus ? salesStatus(e.salesStatus) : null}
          <article class="ec">
            <div class="em2">
              <EventCover url={e.coverUrl} ratio="16/10" radius={0} />
              <span class="eo"><Badge {...st} /></span>
            </div>
            <div class="eb">
              <h3>{e.title}</h3>
              <small>{[dateOf(e), place(e)].filter((x) => x && x !== '—').join(', ') || 'Date à définir'}</small>
              {#if ss}<div class="sb"><Badge {...ss} /></div>{/if}
              <ProgressBar value={e.ticketsIssued} max={e.capacity} label="Billets émis" />
              <small>{e.ticketsIssued} sur {e.capacity} billets émis</small>
              <div class="es">
                <div><small>Recettes</small><b>{formatXof(e.revenueXof)}</b></div>
                <div><small>Présents</small><b>{e.presentCount ?? '—'}</b></div>
              </div>
              <Button variant="outline" block href="/evenements/{e.id}">Ouvrir</Button>
            </div>
          </article>
        {/each}
      </div>
      <Pagination {...list.data.meta} onpage={(p) => (page = p)} />
    {/if}
  {/if}
</div>

<style>
  .top { display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; align-items: center; }
  .evf { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; margin-top: 16px; }
  .sel { margin: 0; }
  .sel select { min-height: 44px; font: 600 14px var(--font); border: 1px solid var(--line); border-radius: 12px; padding: 0 12px; background: var(--card); color: var(--ink); width: auto; }
  .vt { margin-left: auto; display: inline-flex; background: var(--soft); border-radius: 10px; padding: 3px; }
  .vt button { width: 40px; height: 38px; border: 0; border-radius: 8px; background: none; color: var(--mut); cursor: pointer; display: grid; place-items: center; }
  .vt button[aria-pressed='true'] { background: var(--card); color: var(--ink); box-shadow: 0 1px 3px rgba(22, 16, 63, 0.18); }
  .body { margin-top: 20px; display: grid; gap: 20px; transition: opacity 0.15s; }
  .body.busy { opacity: 0.6; }
  .sk { background: linear-gradient(90deg, var(--soft), var(--line), var(--soft)); background-size: 200% 100%; animation: sh 1.2s linear infinite; }
  @keyframes sh { to { background-position: -200% 0; } }
  .rw { cursor: pointer; }
  .en { display: flex; align-items: center; gap: 14px; }
  .en a { color: var(--ink); text-decoration: none; }
  .en small { display: block; color: var(--mut); font-size: 13px; }
  .tk { min-width: 150px; }
  .ch { color: var(--mut); }
  .egr { display: grid; gap: 20px; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); }
  .ec { background: var(--card); border-radius: var(--radius-card); box-shadow: var(--sh); overflow: hidden; display: flex; flex-direction: column; }
  .em2 { position: relative; }
  .eo { position: absolute; top: 12px; left: 12px; }
  .eo :global(.bd) { background: var(--card); }
  .eb { padding: 18px; flex: 1; display: flex; flex-direction: column; }
  h3 { margin: 0 0 2px; font-size: 17px; font-weight: 800; }
  .eb small { display: block; color: var(--mut); font-size: 13px; }
  .sb { margin: 10px 0 0; }
  .es { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 12px 0 16px; }
  .es b { display: block; font-size: 15px; }
  .eb :global(.btn) { margin-top: auto; }
</style>
