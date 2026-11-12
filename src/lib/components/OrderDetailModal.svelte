<script lang="ts">
  import Badge from './Badge.svelte';
  import Button from './Button.svelte';
  import ErrorState from './ErrorState.svelte';
  import Field from './Field.svelte';
  import Modal from './Modal.svelte';
  import TicketActions from './TicketActions.svelte';
  import { api, unwrap, type Schemas } from '$lib/api/client';
  import { ApiError } from '$lib/api/errors';
  import { session } from '$lib/stores/session.svelte';
  import { toasts } from '$lib/stores/toast.svelte';
  import { Resource } from '$lib/utils/resource.svelte';
  import { formatDateTime, formatXof } from '$lib/utils/format';
  import { orderStatus, paymentMethod, paymentStatus, ticketStatus } from '$lib/utils/labels';

  type Ticket = Schemas['OrderTicket'];
  interface Props { orderId: string | null; onclose: () => void; onchanged?: () => void }
  let { orderId, onclose, onchanged }: Props = $props();

  const res = new Resource(() => unwrap(api.GET('/orders/{orderId}', { params: { path: { orderId: orderId! } } })));
  $effect(() => { if (orderId) void res.load(); });
  const o = $derived(res.data && res.data.id === orderId ? res.data : undefined);

  const canCancel = $derived(!!o && session.can('ticket.cancel', o.eventId));
  const canResend = $derived(!!o && session.can('ticket.resend', o.eventId));

  // Annulation d'un billet
  let target = $state<Ticket | null>(null), reason = $state(''), busy = $state(false), err = $state('');
  function ask(t: Ticket) { target = t; reason = ''; err = ''; }
  async function cancel() {
    if (!target || busy) return;
    if (reason.trim().length < 3) { err = 'Indiquez un motif (3 caractères minimum).'; return; }
    busy = true; err = '';
    try {
      await unwrap(api.POST('/tickets/{ticketId}/cancel', { params: { path: { ticketId: target.ticketId } }, body: { reason: reason.trim() } }));
      toasts.ok(`Billet ${target.ticketNumber} annulé.`); target = null;
      await res.reload(); onchanged?.();
    } catch (e) {
      err = e instanceof ApiError ? (e.fields.reason ?? e.message) : 'Une erreur est survenue. Réessayez.';
    } finally { busy = false; }
  }
  const refundNote = $derived(!!o && (o.status === 'REFUND_REQUIRED' || o.payments.some((p) => p.status === 'REFUND_REQUIRED')));
</script>

<Modal open={!!orderId} wide title={o ? `Commande ${o.reference}` : 'Commande'} {onclose}>
  {#if res.error && !o}
    <ErrorState error={res.error} onretry={res.reload} />
  {:else if !o}
    <div class="sk" style="height:260px;border-radius:12px"></div>
  {:else}
    <div class="top">
      <Badge {...orderStatus(o.status)} />
      <span class="mut">{o.channel === 'PHYSICAL' ? 'Vente physique' : 'Achat en ligne'} · {formatDateTime(o.createdAt)}</span>
    </div>
    <dl class="kv">
      <div><dt>Acheteur</dt><dd>{o.buyerName}</dd></div>
      <div><dt>E-mail</dt><dd>{o.buyerEmail ?? '—'}</dd></div>
      <div><dt>Téléphone</dt><dd>{o.buyerPhone ?? '—'}</dd></div>
      <div><dt>Montant</dt><dd><b>{formatXof(o.amountXof)}</b></dd></div>
      <div><dt>Mode de paiement</dt><dd>{paymentMethod(o.paymentMethod).label}</dd></div>
      {#if o.providerReference}<div><dt>Référence de transaction</dt><dd>{o.providerReference}</dd></div>{/if}
      {#if o.soldBy}<div><dt>Vendu par</dt><dd>{o.soldBy}</dd></div>{/if}
    </dl>
    {#if refundNote}<p class="warn" role="status">Un paiement est à rembourser : le remboursement se fait dans le tableau de bord FedaPay, pas dans cette application.</p>{/if}

    <h3>Billets ({o.tickets.length})</h3>
    {#if o.tickets.length === 0}<p class="mut">Aucun billet émis pour cette commande.</p>{/if}
    <ul class="tk">
      {#each o.tickets as t (t.ticketId)}
        <li>
          <div class="who">
            <b>{t.fullName}</b>
            <small>{t.category} · {t.ticketNumber}{t.checkedInAt ? ` · entré le ${formatDateTime(t.checkedInAt)}` : ''}</small>
            {#if t.email || t.phone}<small>{[t.email, t.phone].filter(Boolean).join(' · ')}</small>{/if}
          </div>
          <Badge {...ticketStatus(t.ticketStatus)} />
          <div class="acts">
            <TicketActions ticketId={t.ticketId} valid={t.ticketStatus === 'VALID' || t.ticketStatus === 'USED'} canResend={canResend && t.ticketStatus === 'VALID'} email={t.email ?? o.buyerEmail} />
            {#if canCancel && t.ticketStatus === 'VALID'}<Button size="sm" variant="outline" onclick={() => ask(t)}>Annuler le billet</Button>{/if}
          </div>
        </li>
      {/each}
    </ul>

    <h3>Paiements</h3>
    {#if o.payments.length === 0}<p class="mut">Aucun paiement enregistré.</p>{/if}
    <ul class="pm">
      {#each o.payments as p, i (i)}
        <li>
          <Badge {...paymentStatus(p.status)} />
          <span>{paymentMethod(p.method).label} · attendu {formatXof(p.expectedAmountXof)}{p.confirmedAmountXof !== null ? ` · reçu ${formatXof(p.confirmedAmountXof)}` : ''}</span>
          <small>{p.confirmedAt ? formatDateTime(p.confirmedAt) : ''}{p.failureReason ? ` · ${p.failureReason}` : ''}</small>
        </li>
      {/each}
    </ul>
  {/if}
  {#snippet footer()}<Button variant="outline" onclick={onclose}>Fermer</Button>{/snippet}
</Modal>

<Modal open={!!target} title="Annuler ce billet ?" onclose={() => (target = null)}>
  {#if target}
    <p><b>{target.fullName}</b> · {target.ticketNumber}. Le billet sera refusé à l’entrée et la place sera remise en vente.</p>
    <p class="warn">Le remboursement d’argent n’est pas géré par l’application : il se fait dans le tableau de bord FedaPay.</p>
    {#if err}<p class="ban" role="alert">{err}</p>{/if}
    <Field label="Motif de l’annulation" id="tc-reason" required hint="Conservé dans l’historique (3 caractères minimum).">
      <textarea id="tc-reason" rows="3" maxlength="500" bind:value={reason}></textarea>
    </Field>
  {/if}
  {#snippet footer()}
    <Button variant="outline" onclick={() => (target = null)}>Garder le billet</Button>
    <Button variant="danger" onclick={cancel} loading={busy}>Annuler le billet</Button>
  {/snippet}
</Modal>

<style>
  .top { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; margin-bottom: 14px; }
  .mut, small { color: var(--mut); }
  small { display: block; font-size: 13px; }
  .kv { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 12px 20px; margin: 0 0 16px; }
  .kv dt { color: var(--mut); font-size: 13px; }
  .kv dd { margin: 2px 0 0; overflow-wrap: anywhere; }
  h3 { font-size: 15px; font-weight: 800; margin: 20px 0 8px; }
  .tk, .pm { list-style: none; margin: 0; padding: 0; }
  .tk li { display: grid; grid-template-columns: 1fr auto; gap: 8px 12px; align-items: center; padding: 12px 0; border-top: 1px solid var(--line); }
  .tk .acts { grid-column: 1 / -1; display: flex; gap: 8px; flex-wrap: wrap; }
  .pm li { display: flex; gap: 6px 12px; flex-wrap: wrap; align-items: center; padding: 10px 0; border-top: 1px solid var(--line); }
  .pm small { display: inline; }
  .warn { background: color-mix(in srgb, var(--wait) 14%, transparent); border-radius: 10px; padding: 10px 12px; font-size: 14px; }
  .ban { border: 1.5px solid var(--err); color: var(--err); border-radius: 10px; padding: 10px 12px; font-weight: 700; }
  textarea { width: 100%; }
  .sk { background: linear-gradient(90deg, var(--soft), var(--line), var(--soft)); background-size: 200% 100%; animation: sh 1.2s linear infinite; }
  @keyframes sh { to { background-position: -200% 0; } }
</style>
