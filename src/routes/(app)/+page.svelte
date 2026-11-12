<script lang="ts">
  import KpiCard from '$lib/components/KpiCard.svelte';
  import Card from '$lib/components/Card.svelte';
  import Segmented from '$lib/components/Segmented.svelte';
  import SalesChart from '$lib/components/SalesChart.svelte';
  import DonutChart from '$lib/components/DonutChart.svelte';
  import Table from '$lib/components/Table.svelte';
  import Badge from '$lib/components/Badge.svelte';
  import SearchInput from '$lib/components/SearchInput.svelte';
  import Pagination from '$lib/components/Pagination.svelte';
  import ProgressBar from '$lib/components/ProgressBar.svelte';
  import EventCover from '$lib/components/EventCover.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import ErrorState from '$lib/components/ErrorState.svelte';
  import Button from '$lib/components/Button.svelte';
  import Icon from '$lib/components/Icon.svelte';
  import { api, unwrap, ApiError } from '$lib/api/client';
  import { Resource } from '$lib/utils/resource.svelte';
  import { session } from '$lib/stores/session.svelte';
  import { orderStatus, salesStatus, paymentMethod } from '$lib/utils/labels';
  import { formatXof, formatNumber, formatDateTime, formatRelativeDay } from '$lib/utils/format';

  const allowed = $derived(session.can('dashboard.view'));

  // ── Tableau de bord (KPI, ventes, catégories, événements proches)
  let range = $state<'7' | '30'>('30');
  const dash = new Resource(() => unwrap(api.GET('/dashboard', { params: { query: { range } } })));
  $effect(() => { if (allowed) void dash.load(); });

  // ── Derniers paiements (finance.view, sinon 403 → message), pagination 11 comme la maquette
  let q = $state('');
  let page = $state(1);
  const pay = new Resource(() => unwrap(api.GET('/payments', { params: { query: { page, pageSize: 11, ...(q && { q }) } } })));
  $effect(() => { if (allowed) void pay.load(); });
  const payForbidden = $derived(pay.error instanceof ApiError && pay.error.status === 403);

  // ── Ventes physiques récentes
  const phys = new Resource(() => unwrap(api.GET('/physical-sales', { params: { query: { pageSize: 3 } } })));
  $effect(() => { if (allowed) void phys.load(); });
  const physForbidden = $derived(phys.error instanceof ApiError && phys.error.status === 403);

  const d = $derived(dash.data);
  const money = $derived(d?.sales.totalRevenueXof !== null && d?.sales.points.some((p) => p.revenueXof !== null));
  const empty = $derived(!!d && d.kpis.eventsCount === 0 && d.upcomingEvents.length === 0 && d.sales.totalTickets === 0);
  const chartPoints = $derived(d?.sales.points.map((p) => ({ date: p.date, value: money ? (p.revenueXof ?? 0) : p.tickets })) ?? []);
  const chartLabel = $derived(
    d ? `Courbe des ventes sur ${d.sales.range} jours, total ${money ? formatXof(d.sales.totalRevenueXof) : `${d.sales.totalTickets} billets`}` : ''
  );
  const pct = (n: number | null | undefined) => (n === null || n === undefined ? '—' : `${n} %`);
</script>

<svelte:head><title>Tableau de bord · JCI Comé Excellence</title></svelte:head>

<h1 class="vh">Tableau de bord</h1>

{#if !allowed}
  <Card><EmptyState title="Accès restreint" text="Le tableau de bord est réservé aux administrateurs, aux présidents locaux et aux organisateurs.">
    {#if session.can('sale.create')}<Button href="/vente-physique">Aller à la vente physique</Button>{:else}<Button href="/evenements">Voir les événements</Button>{/if}
  </EmptyState></Card>
{:else if dash.error && !d}
  <div class="em" role="alert"><h2>Impossible de charger le tableau de bord</h2><ErrorState error={dash.error} onretry={dash.reload} /></div>
{:else if !d}
  <div class="k4">{#each [0, 1, 2, 3] as i (i)}<div class="sk" style="height:98px;border-radius:18px"></div>{/each}</div>
  <div class="row2"><div class="sk" style="height:380px;border-radius:18px"></div><div class="sk" style="height:380px;border-radius:18px"></div></div>
  <div class="sk" style="height:320px;border-radius:18px;margin-top:20px"></div>
{:else if empty}
  <Card><EmptyState title="Aucun événement pour le moment" text="Créez votre premier événement pour ouvrir la billetterie.">
    {#if session.can('event.create')}<Button href="/evenements/nouveau">Créer un événement</Button>{/if}
  </EmptyState></Card>
{:else}
  <div class="k4">
    <KpiCard value={formatXof(d.kpis.revenueXof)} label="Recettes confirmées" icon="wallet-k" color="blue" hint="Paiements confirmés uniquement" />
    <KpiCard value={pct(d.kpis.fillRatePercent)} label="Taux de remplissage" icon="users-k" color="coral" hint="Billets vendus sur le nombre de places (événements publiés ou clôturés)" />
    <KpiCard value={formatNumber(d.kpis.ticketsIssued)} label="Billets émis" icon="ticket-k" color="amber" hint="Un billet par participant" />
    <KpiCard value={formatNumber(d.kpis.eventsCount)} label="Événements" icon="calendar-k" color="purple" hint="Publiés ou clôturés" />
  </div>

  <div class="row2">
    <Card title="Ventes">
      {#snippet actions()}
        <Segmented label="Période" value={range} options={[{ value: '7', label: '7 jours' }, { value: '30', label: '30 jours' }]} onchange={(v) => (range = v)} />
      {/snippet}
      <div class:busy={dash.loading}>
        <SalesChart
          points={chartPoints}
          label={chartLabel}
          integer={!money}
          format={(n) => (money ? formatXof(n) : `${n} billet${n > 1 ? 's' : ''}`)}
          tick={(n) => (money ? (n >= 1000 ? `${n / 1000} k` : String(n)) : String(n))}
        />
      </div>
    </Card>
    <Card title="Billets par catégorie" subtitle="Tous événements confondus">
      <DonutChart items={d.ticketsByCategory.categories} total={d.ticketsByCategory.total} />
    </Card>
  </div>

  <div class="cols">
    <Card class="pays" title="Derniers paiements">
      {#snippet actions()}
        {#if !payForbidden}<SearchInput width={260} placeholder="Rechercher ici" label="Rechercher par acheteur ou référence" bind:value={q} onsearch={() => (page = 1)} />{/if}
      {/snippet}
      {#if payForbidden}
        <EmptyState title="Accès restreint" text="Vous n’avez pas accès aux paiements." />
      {:else if pay.error && !pay.data}
        <ErrorState error={pay.error} onretry={pay.reload} />
      {:else if !pay.data}
        <div class="sk" style="height:300px;border-radius:12px"></div>
      {:else if pay.data.data.length === 0}
        <EmptyState title={q ? 'Aucun résultat' : 'Aucun paiement'} text={q ? 'Aucun paiement ne correspond à votre recherche.' : 'Les paiements apparaîtront ici dès le premier achat.'} />
      {:else}
        <div class:busy={pay.loading}>
          <Table minWidth={720}>
            <thead><tr><th>Référence FedaPay</th><th>Acheteur</th><th>Billets</th><th class="num">Montant</th><th>Statut</th><th>Date</th></tr></thead>
            <tbody>
              {#each pay.data.data as o (o.id)}
                <tr>
                  <td>{o.providerReference ?? o.reference}</td>
                  <td><b>{o.buyerName}</b></td>
                  <td>{o.items}</td>
                  <td class="num">{formatXof(o.amountXof)}</td>
                  <td><Badge {...orderStatus(o.status)} /></td>
                  <td>{formatRelativeDay(o.createdAt)}</td>
                </tr>
              {/each}
            </tbody>
          </Table>
          <Pagination {...pay.data.meta} onpage={(p) => (page = p)} />
        </div>
      {/if}
    </Card>

    <div class="stk">
      <Card title="Événements proches">
        {#if d.upcomingEvents.length === 0}
          <p class="mut">Aucun événement à venir.</p>
        {:else}
          <div class="ls">
            {#each d.upcomingEvents as e (e.id)}
              <a class="li ev" href="/evenements/{e.id}">
                <EventCover url={e.coverUrl} size={64} />
                <div class="body">
                  <b>{e.title}</b>
                  <small>{formatDateTime(e.startsAt)}</small>
                  {#if e.salesStatus}<Badge {...salesStatus(e.salesStatus)} />{/if}
                  <ProgressBar value={e.ticketsIssued} max={e.capacity} label="{e.ticketsIssued} billets émis sur {e.capacity}" />
                  <small>{e.ticketsIssued} sur {e.capacity} billets émis</small>
                </div>
              </a>
            {/each}
          </div>
        {/if}
      </Card>

      {#if !physForbidden}
        <Card title="Ventes physiques récentes">
          {#snippet actions()}<a class="lk" href="/vente-physique">Voir tout</a>{/snippet}
          {#if phys.error && !phys.data}
            <ErrorState error={phys.error} onretry={phys.reload} />
          {:else if !phys.data}
            <div class="sk" style="height:120px;border-radius:12px"></div>
          {:else if phys.data.data.length === 0}
            <p class="mut">Aucune vente physique pour le moment.</p>
          {:else}
            <div class="ls">
              {#each phys.data.data as v (v.id)}
                <div class="li c">
                  <span class="ci {v.paymentMethod === 'CASH' ? 'cash' : 'momo'}"><Icon name={v.paymentMethod === 'CASH' ? 'wallet-k' : 'phone'} size={20} /></span>
                  <div class="body"><b>{v.buyerName}</b><small>{paymentMethod(v.paymentMethod).label}{v.soldBy ? `, par ${v.soldBy}` : ''} · {formatRelativeDay(v.createdAt)}</small></div>
                  <b>{formatXof(v.amountXof)}</b>
                </div>
              {/each}
            </div>
          {/if}
        </Card>
      {/if}
    </div>
  </div>
{/if}

<style>
  .vh { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
  .k4 { display: grid; gap: 20px; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); }
  .row2, .cols { display: grid; gap: 20px; margin-top: 20px; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); }
  .stk { display: grid; gap: 20px; align-content: start; }
  :global(.pays) { display: flex; flex-direction: column; }
  .busy { opacity: 0.6; transition: opacity 0.15s; }
  .mut { color: var(--mut); margin: 0; }
  .ls > * { display: flex; gap: 14px; padding: 14px 0; border-top: 1px solid var(--line); }
  .ls > :first-child { border-top: 0; padding-top: 0; }
  .li { color: inherit; text-decoration: none; }
  .li.c { align-items: center; justify-content: space-between; }
  .body { flex: 1; min-width: 0; }
  .body small { display: block; color: var(--mut); font-size: 13px; }
  .ci { width: 44px; height: 44px; border-radius: 50%; display: grid; place-items: center; flex: none; background: color-mix(in srgb, currentColor 12%, transparent); }
  .ci :global(svg) { fill: none; }
  .ci.cash { color: var(--c-amber); } .ci.momo { color: var(--c-purple); }
  .lk { color: var(--acc); font-weight: 700; font-size: 14px; text-decoration: none; }
  .em { text-align: center; padding: 56px 20px; }
  .sk { background: linear-gradient(90deg, var(--soft), var(--line), var(--soft)); background-size: 200% 100%; animation: sh 1.2s linear infinite; }
  @keyframes sh { to { background-position: -200% 0; } }
  @media (max-width: 1100px) { .row2, .cols { grid-template-columns: minmax(0, 1fr); } }
</style>
