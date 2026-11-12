<script lang="ts">
  import Card from '$lib/components/Card.svelte';
  import Badge from '$lib/components/Badge.svelte';
  import Table from '$lib/components/Table.svelte';
  import SearchInput from '$lib/components/SearchInput.svelte';
  import Pagination from '$lib/components/Pagination.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import ErrorState from '$lib/components/ErrorState.svelte';
  import Button from '$lib/components/Button.svelte';
  import OrderDetailModal from '$lib/components/OrderDetailModal.svelte';
  import { api, unwrap } from '$lib/api/client';
  import { Resource } from '$lib/utils/resource.svelte';
  import { getEventContext } from '$lib/features/eventContext';
  import { session } from '$lib/stores/session.svelte';
  import { orderStatus, paymentMethod } from '$lib/utils/labels';
  import { formatRelativeDay, formatXof } from '$lib/utils/format';

  type Filter = 'ALL' | 'PAID' | 'PENDING' | 'FAILED' | 'REFUNDED' | 'REFUND_REQUIRED';
  const ctx = getEventContext();
  const eventId = $derived(ctx.event.id);
  const allowed = $derived(session.can('order.read', eventId));

  let status = $state<Filter>('ALL');
  let q = $state('');
  let page = $state(1);

  const res = new Resource(() =>
    unwrap(
      api.GET('/events/{eventId}/orders', {
        params: {
          path: { eventId },
          query: { page, pageSize: 10, ...(status !== 'ALL' && { status }), ...(q && { q }) }
        }
      })
    )
  );
  $effect(() => { if (allowed) void res.load(); });

  const counts = $derived(res.data?.meta.statusCounts ?? {});
  const chips = $derived(
    ([
      { v: 'ALL', label: 'Toutes', tone: 'neutral' },
      { v: 'PAID', label: 'Payée', tone: 'ok' },
      { v: 'PENDING', label: 'En attente', tone: 'wait' },
      { v: 'FAILED', label: 'Échouée', tone: 'err' },
      { v: 'REFUNDED', label: 'Remboursée', tone: 'info' },
      // « À rembourser » : mis en évidence seulement s'il y en a (guide §5)
      { v: 'REFUND_REQUIRED', label: 'À rembourser', tone: 'err' }
    ] as const).filter((c) => c.v !== 'REFUND_REQUIRED' || (counts.REFUND_REQUIRED ?? 0) > 0)
  );
  const pick = (v: Filter) => { status = v; page = 1; };
  let detailId = $state<string | null>(null);
  const refundCount = $derived(counts.REFUND_REQUIRED ?? 0);
</script>

{#if !allowed}
  <Card><EmptyState title="Accès restreint" text="Vous n’avez pas accès aux commandes et paiements de cet événement." /></Card>
{:else}
  <Card title="Commandes et transactions">
    {#if refundCount > 0}
      <div class="alert" role="status"><b>{refundCount} commande{refundCount > 1 ? 's' : ''} à rembourser.</b> Paiement reçu mais places indisponibles : le remboursement se fait dans le tableau de bord FedaPay.</div>
    {/if}
    <div class="bar">
      <SearchInput width={400} placeholder="Rechercher une commande ou un acheteur" bind:value={q} onsearch={() => (page = 1)} />
    </div>
    <div class="chips" role="group" aria-label="Filtrer par statut">
      {#each chips as c (c.v)}
        <button class="chip" aria-pressed={status === c.v} onclick={() => pick(c.v)}>
          {#if c.v === 'ALL'}<span class="all">{c.label}</span>{:else}<Badge tone={c.tone} label={c.label} />{/if}
          <b>{counts[c.v] ?? 0}</b>
        </button>
      {/each}
    </div>

    {#if res.error && !res.data}
      <ErrorState error={res.error} onretry={res.reload} />
    {:else if !res.data}
      <div class="sk" style="height:300px;border-radius:12px"></div>
    {:else if res.data.data.length === 0}
      {#if status === 'ALL' && !q}
        <EmptyState title="Aucune commande" text="Les commandes apparaîtront ici dès le premier achat." />
      {:else}
        <EmptyState title="Aucun résultat" text="Aucune commande ne correspond à ces critères.">
          <Button variant="outline" onclick={() => { status = 'ALL'; q = ''; page = 1; }}>Réinitialiser les filtres</Button>
        </EmptyState>
      {/if}
    {:else}
      <div class:busy={res.loading}>
        <Table minWidth={820}>
          <thead>
            <tr><th>Commande</th><th>Acheteur</th><th>Billets</th><th class="num">Montant</th><th>Mode de paiement</th><th>Statut</th><th>Date</th><th class="num"></th></tr>
          </thead>
          <tbody>
            {#each res.data.data as o (o.id)}
              <tr>
                <td><b>{o.reference}</b>{#if o.providerReference}<small>{o.providerReference}</small>{/if}</td>
                <td><b>{o.buyerName}</b>{#if o.soldBy}<small>Vendu par {o.soldBy}</small>{/if}</td>
                <td>{o.items}</td>
                <td class="num">{formatXof(o.amountXof)}</td>
                <td>{paymentMethod(o.paymentMethod).label}</td>
                <td><Badge {...orderStatus(o.status)} /></td>
                <td>{formatRelativeDay(o.createdAt)}</td>
                <td class="num"><Button size="sm" variant="outline" onclick={() => (detailId = o.id)} aria-label="Voir la commande {o.reference}">Détails</Button></td>
              </tr>
            {/each}
          </tbody>
        </Table>
        <Pagination {...res.data.meta} onpage={(p) => (page = p)} />
      </div>
    {/if}
  </Card>
  <OrderDetailModal orderId={detailId} onclose={() => (detailId = null)} onchanged={() => res.reload()} />
{/if}

<style>
  .alert { border: 1.5px solid var(--err); border-radius: 10px; padding: 12px 14px; margin-bottom: 16px; color: var(--err); }
  .alert b { font-weight: 800; }
  .bar { margin-bottom: 16px; }
  .chips { display: flex; gap: 8px 14px; flex-wrap: wrap; margin-bottom: 12px; align-items: center; }
  .chip { display: inline-flex; align-items: center; gap: 8px; border: 0; background: none; padding: 4px; border-radius: 99px; cursor: pointer; font: 700 15px var(--font); color: var(--ink); }
  .chip[aria-pressed='true'] { box-shadow: 0 0 0 2px var(--ink); }
  .all { background: var(--soft); border-radius: 99px; padding: 3px 11px; font-size: 14px; }
  .busy { opacity: 0.6; transition: opacity 0.15s; }
  .sk { background: linear-gradient(90deg, var(--soft), var(--line), var(--soft)); background-size: 200% 100%; animation: sh 1.2s linear infinite; }
  @keyframes sh { to { background-position: -200% 0; } }
</style>
