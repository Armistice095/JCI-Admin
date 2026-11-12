<script lang="ts">
  import Card from '$lib/components/Card.svelte';
  import Button from '$lib/components/Button.svelte';
  import Badge from '$lib/components/Badge.svelte';
  import Table from '$lib/components/Table.svelte';
  import Modal from '$lib/components/Modal.svelte';
  import CategoryModal from '$lib/components/CategoryModal.svelte';
  import Icon from '$lib/components/Icon.svelte';
  import type { Schemas } from '$lib/api/client';
  import ErrorState from '$lib/components/ErrorState.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import { api, unwrap } from '$lib/api/client';
  import { Resource } from '$lib/utils/resource.svelte';
  import { getEventContext } from '$lib/features/eventContext';
  import { session } from '$lib/stores/session.svelte';
  import { toasts } from '$lib/stores/toast.svelte';
  import { availability, salesStatus } from '$lib/utils/labels';
  import { formatDate, formatDateTime, formatXof } from '$lib/utils/format';

  const ctx = getEventContext();
  const ev = $derived(ctx.event);
  const eventId = $derived(ev.id);

  const res = new Resource(() => unwrap(api.GET('/events/{eventId}/ticketing', { params: { path: { eventId } } })));
  $effect(() => { void res.load(); });

  const t = $derived(res.data);
  const canManage = $derived(session.can('ticketing.manage', eventId) && ev.status === 'PUBLISHED');
  const canEditCats = $derived(session.can('ticketing.manage', eventId) && (ev.status === 'DRAFT' || ev.status === 'PUBLISHED'));
  let catModal = $state<{ open: boolean; category: Schemas['Category'] | null }>({ open: false, category: null });
  async function catSaved(message: string) {
    catModal.open = false;
    toasts.ok(message);
    await Promise.all([res.reload(), ctx.reload()]);
  }
  const canClose = $derived(canManage && t?.salesStatus === 'OPEN');
  const canReopen = $derived(canManage && !!t?.manuallyClosed);

  let confirm = $state<'close' | 'reopen' | null>(null);
  let busy = $state(false);
  async function run() {
    if (!confirm) return;
    busy = true;
    const action = confirm;
    try {
      const path = action === 'close' ? '/events/{eventId}/ticketing/close' : '/events/{eventId}/ticketing/reopen';
      res.data = await unwrap(api.POST(path, { params: { path: { eventId } } }));
      toasts.ok(action === 'close' ? 'Billetterie fermée.' : 'Billetterie rouverte.');
      confirm = null;
      await ctx.reload(); // met à jour le badge « Billetterie » de l'en-tête
    } catch (e) {
      toasts.error(e instanceof Error ? e.message : 'Action impossible.');
      confirm = null;
      await res.reload();
    } finally {
      busy = false;
    }
  }

  const period = (s: string | null, e: string | null) =>
    s || e ? `${s ? formatDate(s) : 'Ouverture'} → ${e ? formatDate(e) : 'clôture'}` : 'Période de la billetterie';
</script>

{#if res.error && !t}
  <ErrorState error={res.error} onretry={res.reload} />
{:else if !t}
  <div class="sk" style="height:140px;border-radius:18px"></div>
  <div class="sk" style="height:260px;border-radius:18px"></div>
{:else}
  <Card title="État de la billetterie">
    {#snippet actions()}
      {#if canClose}<Button variant="outline" onclick={() => (confirm = 'close')}>Fermer la billetterie</Button>{/if}
      {#if canReopen}<Button variant="outline" onclick={() => (confirm = 'reopen')}>Rouvrir la billetterie</Button>{/if}
    {/snippet}
    <div class="bi">
      <div><small>Statut</small>{#if t.salesStatus}<Badge {...salesStatus(t.salesStatus)} />{:else}<b>—</b>{/if}</div>
      <div><small>Ouverture</small><b>{formatDateTime(t.salesOpensAt)}</b></div>
      <div><small>Clôture</small><b>{formatDateTime(t.salesClosesAt)}</b></div>
      <div><small>Maximum par commande</small><b>{t.maxPerOrder} billet{t.maxPerOrder > 1 ? 's' : ''}</b></div>
    </div>
    {#if t.manuallyClosed}<p class="note">La billetterie a été fermée manuellement.</p>{/if}
  </Card>

  <Card title="Catégories de billets">
    {#snippet actions()}
      {#if canEditCats}<Button variant="outline" onclick={() => (catModal = { open: true, category: null })}><Icon name="plus" size={16} />Ajouter une catégorie</Button>{/if}
    {/snippet}
    {#if t.categories.length === 0}
      <EmptyState title="Aucune catégorie" text="Ajoutez au moins une catégorie de billets pour ouvrir la vente." />
    {:else}
      <Table minWidth={860}>
        <thead>
          <tr><th>Catégorie</th><th class="num">Prix</th><th class="num">Quota</th><th class="num">Vendus</th><th class="num">Restants</th><th>Période de vente</th><th>Conditions</th><th>Statut</th>{#if canEditCats}<th><span class="vh">Actions</span></th>{/if}</tr>
        </thead>
        <tbody>
          {#each t.categories as c (c.id)}
            <tr>
              <td><b>{c.name}</b></td>
              <td class="num">{formatXof(c.priceXof)}</td>
              <td class="num">{c.quota}</td>
              <td class="num">{c.sold}</td>
              <td class="num">{c.remaining}{#if c.reserved > 0}<small>{c.reserved} en cours de paiement</small>{/if}</td>
              <td>{period(c.saleStartsAt, c.saleEndsAt)}</td>
              <td>{c.conditions || 'Aucune'}</td>
              <td><Badge {...availability(c.availability)} /></td>
              {#if canEditCats}<td><Button variant="outline" size="sm" onclick={() => (catModal = { open: true, category: c })}>Modifier</Button></td>{/if}
            </tr>
          {/each}
        </tbody>
      </Table>
      <p class="tot">Capacité totale : <b>{t.totalCapacity} billets</b> · Recettes si tout est vendu : <b>{formatXof(t.potentialRevenueXof)}</b></p>
    {/if}
  </Card>
{/if}

<CategoryModal open={catModal.open} {eventId} category={catModal.category} onclose={() => (catModal.open = false)} onsaved={catSaved} />

<Modal
  open={confirm !== null}
  title={confirm === 'close' ? 'Fermer la billetterie ?' : 'Rouvrir la billetterie ?'}
  onclose={() => !busy && (confirm = null)}
>
  {#if confirm === 'close'}
    <p>Plus aucun nouvel achat ne sera possible. Les paiements déjà en cours ne sont pas interrompus. Vous pourrez la rouvrir tant que la date de clôture n’est pas dépassée.</p>
  {:else}
    <p>Les ventes reprendront immédiatement. Si la date de clôture est déjà passée, modifiez-la d’abord.</p>
  {/if}
  {#snippet footer()}
    <Button variant="outline" onclick={() => (confirm = null)} disabled={busy}>Annuler</Button>
    <Button onclick={run} loading={busy}>{confirm === 'close' ? 'Fermer la billetterie' : 'Rouvrir la billetterie'}</Button>
  {/snippet}
</Modal>

<style>
  .bi { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 20px; }
  .bi small { display: block; color: var(--mut); font-size: 13px; margin-bottom: 4px; }
  .note { margin: 16px 0 0; font-size: 14px; }
  .tot { margin: 16px 0 0; padding: 12px 14px; background: var(--soft); border-radius: 10px; color: var(--ink); }
  .sk { background: linear-gradient(90deg, var(--soft), var(--line), var(--soft)); background-size: 200% 100%; animation: sh 1.2s linear infinite; }
  @keyframes sh { to { background-position: -200% 0; } }
</style>
