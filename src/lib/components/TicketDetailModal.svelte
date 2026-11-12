<script lang="ts">
  import Badge from './Badge.svelte';
  import Button from './Button.svelte';
  import ErrorState from './ErrorState.svelte';
  import Modal from './Modal.svelte';
  import TicketActions from './TicketActions.svelte';
  import { api, unwrap } from '$lib/api/client';
  import { session } from '$lib/stores/session.svelte';
  import { Resource } from '$lib/utils/resource.svelte';
  import { formatDateTime, formatXof } from '$lib/utils/format';
  import { emailDelivery, orderStatus, paymentMethod, presence, ticketStatus } from '$lib/utils/labels';

  interface Props { ticketId: string | null; onclose: () => void }
  let { ticketId, onclose }: Props = $props();

  const res = new Resource(() => unwrap(api.GET('/tickets/{ticketId}', { params: { path: { ticketId: ticketId! } } })));
  $effect(() => { if (ticketId) void res.load(); });
  const t = $derived(res.data && res.data.ticketId === ticketId ? res.data : undefined);
  const dash = (v: string | null | undefined) => v || '—';
  const TEMPLATE = { TICKET_CONFIRMATION: 'Confirmation', TICKET_RESEND: 'Renvoi' } as const;
</script>

<Modal open={!!ticketId} wide title={t ? `Billet ${t.ticketNumber}` : 'Billet'} {onclose}>
  {#if res.error && !t}
    <ErrorState error={res.error} onretry={res.reload} />
  {:else if !t}
    <div class="sk" style="height:260px;border-radius:12px"></div>
  {:else}
    <div class="top">
      <Badge {...ticketStatus(t.ticketStatus)} />
      <Badge {...presence(t.presence)} />
      <span class="mut">{t.eventTitle}</span>
    </div>
    <dl class="kv">
      <div><dt>Titulaire</dt><dd><b>{t.holder.firstName} {t.holder.lastName}</b></dd></div>
      <div><dt>E-mail</dt><dd>{dash(t.holder.email)}</dd></div>
      <div><dt>Téléphone</dt><dd>{dash(t.holder.phone)}</dd></div>
      <div><dt>Catégorie</dt><dd>{t.category.name}</dd></div>
      <div><dt>Prix</dt><dd>{formatXof(t.amountXof)}</dd></div>
      <div><dt>Émis le</dt><dd>{formatDateTime(t.issuedAt)}</dd></div>
      {#if t.checkedInAt}<div><dt>Entré le</dt><dd>{formatDateTime(t.checkedInAt)}{t.checkedInBy ? ` · par ${t.checkedInBy}` : ''}</dd></div>{/if}
      {#if t.cancelledAt}<div><dt>Annulé le</dt><dd>{formatDateTime(t.cancelledAt)}{t.cancelledBy ? ` · par ${t.cancelledBy}` : ''}</dd></div>{/if}
      {#if t.cancelReason}<div><dt>Motif d’annulation</dt><dd>{t.cancelReason}</dd></div>{/if}
    </dl>

    <h3>Fichiers du billet</h3>
    {#if !t.filesReady}<p class="mut">Les fichiers sont encore en préparation : le téléchargement patiente quelques secondes si besoin.</p>{/if}
    <TicketActions ticketId={t.ticketId} valid={t.ticketStatus === 'VALID' || t.ticketStatus === 'USED'} canResend={session.can('ticket.resend', t.eventId) && t.ticketStatus === 'VALID'} email={t.holder.email ?? t.order.buyerEmail} />

    <h3>Commande {t.order.reference}</h3>
    <dl class="kv">
      <div><dt>Statut</dt><dd><Badge {...orderStatus(t.order.status)} /></dd></div>
      <div><dt>Canal</dt><dd>{t.order.channel === 'PHYSICAL' ? 'Vente physique' : 'Achat en ligne'}</dd></div>
      <div><dt>Acheteur</dt><dd>{t.order.buyerName}</dd></div>
      <div><dt>E-mail de l’acheteur</dt><dd>{dash(t.order.buyerEmail)}</dd></div>
      <div><dt>Téléphone de l’acheteur</dt><dd>{dash(t.order.buyerPhone)}</dd></div>
      <div><dt>Mode de paiement</dt><dd>{paymentMethod(t.order.paymentMethod).label}</dd></div>
      {#if t.order.paymentReference}<div><dt>Référence de transaction</dt><dd>{t.order.paymentReference}</dd></div>{/if}
      <div><dt>Commande passée le</dt><dd>{formatDateTime(t.order.createdAt)}</dd></div>
      {#if t.order.paidAt}<div><dt>Payée le</dt><dd>{formatDateTime(t.order.paidAt)}</dd></div>{/if}
      {#if t.order.soldBy}<div><dt>Vendu par</dt><dd>{t.order.soldBy}</dd></div>{/if}
    </dl>

    <h3>Historique des e-mails</h3>
    {#if t.emails.length === 0}<p class="mut">Aucun e-mail envoyé pour ce billet.</p>{/if}
    <ul class="em">
      {#each t.emails as m, i (i)}
        <li>
          <Badge {...emailDelivery(m.status)} />
          <span>{TEMPLATE[m.template] ?? m.template} · {m.toEmail}</span>
          <small>{formatDateTime(m.lastEventAt ?? m.sentAt ?? m.createdAt)}{m.attempt > 1 ? ` · tentative ${m.attempt}` : ''}</small>
        </li>
      {/each}
    </ul>
  {/if}
  {#snippet footer()}<Button variant="outline" onclick={onclose}>Fermer</Button>{/snippet}
</Modal>

<style>
  .top { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-bottom: 14px; }
  .mut, small { color: var(--mut); }
  .kv { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 12px 20px; margin: 0 0 8px; }
  .kv dt { color: var(--mut); font-size: 13px; }
  .kv dd { margin: 2px 0 0; overflow-wrap: anywhere; }
  h3 { font-size: 15px; font-weight: 800; margin: 20px 0 8px; }
  .em { list-style: none; margin: 0; padding: 0; }
  .em li { display: flex; gap: 6px 12px; flex-wrap: wrap; align-items: center; padding: 10px 0; border-top: 1px solid var(--line); overflow-wrap: anywhere; }
  .sk { background: linear-gradient(90deg, var(--soft), var(--line), var(--soft)); background-size: 200% 100%; animation: sh 1.2s linear infinite; }
  @keyframes sh { to { background-position: -200% 0; } }
</style>
