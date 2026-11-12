<script lang="ts">
  import Button from './Button.svelte';
  import Field from './Field.svelte';
  import Modal from './Modal.svelte';
  import { api, unwrap, type Schemas } from '$lib/api/client';
  import { ApiError } from '$lib/api/errors';
  import { session } from '$lib/stores/session.svelte';
  import { toasts } from '$lib/stores/toast.svelte';

  interface Props { event: Schemas['EventDetail']; onchanged: () => void | Promise<void> }
  let { event, onchanged }: Props = $props();

  const published = $derived(event.status === 'PUBLISHED');
  const canClose = $derived(published && session.can('event.close', event.id));
  const canCancel = $derived(published && session.can('event.cancel', event.id));

  let kind = $state<'close' | 'cancel' | null>(null), reason = $state(''), busy = $state(false), err = $state('');
  function ask(k: 'close' | 'cancel') { kind = k; reason = ''; err = ''; }
  async function run() {
    if (!kind || busy) return;
    if (kind === 'cancel' && reason.trim().length < 3) { err = 'Indiquez un motif (3 caractères minimum).'; return; }
    busy = true; err = '';
    try {
      const path = { eventId: event.id };
      if (kind === 'close') await unwrap(api.POST('/events/{eventId}/close', { params: { path } }));
      else await unwrap(api.POST('/events/{eventId}/cancel', { params: { path }, body: { reason: reason.trim() } }));
      toasts.ok(kind === 'close' ? 'Événement clôturé.' : 'Événement annulé.');
      kind = null; await onchanged();
    } catch (e) {
      err = e instanceof ApiError ? (e.fields.reason ?? e.message) : 'Une erreur est survenue. Réessayez.';
    } finally { busy = false; }
  }
</script>

{#if canClose}<Button variant="outline" onclick={() => ask('close')}>Clôturer</Button>{/if}
{#if canCancel}<Button variant="outline" onclick={() => ask('cancel')}>Annuler l’événement</Button>{/if}

<Modal open={kind !== null} title={kind === 'close' ? 'Clôturer cet événement ?' : 'Annuler cet événement ?'} onclose={() => (kind = null)}>
  {#if kind === 'close'}
    <p>« {event.title} » passera au statut <b>Clôturé</b> et la billetterie sera fermée. Les billets déjà vendus restent valables.</p>
  {:else}
    <p>« {event.title} » passera au statut <b>Annulé</b>. Cette action est tracée.</p>
    <p class="warn">Les billets déjà vendus ne sont pas remboursés par l’application : les remboursements se font dans le tableau de bord FedaPay.</p>
    <Field label="Motif de l’annulation" id="ev-reason" required hint="3 caractères minimum.">
      <textarea id="ev-reason" rows="3" maxlength="500" bind:value={reason}></textarea>
    </Field>
  {/if}
  {#if err}<p class="ban" role="alert">{err}</p>{/if}
  {#snippet footer()}
    <Button variant="outline" onclick={() => (kind = null)}>Retour</Button>
    <Button variant={kind === 'cancel' ? 'danger' : 'primary'} onclick={run} loading={busy}>{kind === 'close' ? 'Clôturer l’événement' : 'Annuler l’événement'}</Button>
  {/snippet}
</Modal>

<style>
  .warn { background: color-mix(in srgb, var(--wait) 14%, transparent); border-radius: 10px; padding: 10px 12px; font-size: 14px; }
  .ban { border: 1.5px solid var(--err); color: var(--err); border-radius: 10px; padding: 10px 12px; font-weight: 700; margin-top: 12px; }
  textarea { width: 100%; }
</style>
