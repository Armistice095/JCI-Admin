<script lang="ts">
  import Button from './Button.svelte';
  import Field from './Field.svelte';
  import Modal from './Modal.svelte';
  import { api, unwrap } from '$lib/api/client';
  import { ApiError } from '$lib/api/errors';
  import { fetchTicketFile, type FileKind } from '$lib/features/ticketFiles';
  import { toasts } from '$lib/stores/toast.svelte';

  interface Props {
    ticketId: string;
    /** Billet encore valable : seuls ses fichiers sont utiles et le renvoi n'est possible que pour lui. */
    valid?: boolean;
    canResend?: boolean;
    /** Adresse proposée pour le renvoi (bénéficiaire ou acheteur) ; vide = le serveur choisit. */
    email?: string | null;
  }
  let { ticketId, valid = true, canResend = false, email = null }: Props = $props();

  type State = { busy: boolean; pending: boolean; url?: string; expires?: number };
  const kinds: { kind: Extract<FileKind, 'pdf' | 'image'>; label: string }[] = [
    { kind: 'pdf', label: 'PDF' },
    { kind: 'image', label: 'Image' }
  ];
  let st = $state<Record<string, State>>({});
  let ctrl: AbortController | null = null;
  $effect(() => () => ctrl?.abort());

  function message(e: unknown) {
    if (e instanceof DOMException && e.name === 'AbortError') return '';
    if (e instanceof ApiError && e.status === 404) return 'Billet introuvable ou accès refusé.';
    return e instanceof Error ? e.message : 'Une erreur est survenue.';
  }

  async function open(kind: FileKind) {
    if (st[kind]?.busy) return;
    ctrl ??= new AbortController();
    st[kind] = { busy: true, pending: false };
    try {
      const { file, waited } = await fetchTicketFile(ticketId, kind, { signal: ctrl.signal, onPending: () => (st[kind] = { busy: true, pending: true }) });
      if (!waited) {
        // Réponse immédiate : on ouvre tout de suite (l'URL signée expire en 15 min).
        const a = document.createElement('a');
        a.href = file.url; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.download = file.fileName;
        document.body.append(a); a.click(); a.remove();
        st[kind] = { busy: false, pending: false };
      } else {
        // Après une attente, le navigateur peut bloquer l'ouverture automatique : on affiche un lien à cliquer.
        st[kind] = { busy: false, pending: false, url: file.url, expires: new Date(file.expiresAt).getTime() };
      }
    } catch (e) {
      st[kind] = { busy: false, pending: false };
      const m = message(e); if (m) toasts.error(m);
    }
  }
  const live = (k: string) => (st[k]?.url && (st[k].expires ?? 0) > Date.now() ? st[k] : undefined);

  // Renvoi par e-mail
  let rOpen = $state(false), to = $state(''), rBusy = $state(false), rErr = $state('');
  const EMAIL = /^\S+@\S+\.\S+$/;
  function openResend() { to = email ?? ''; rErr = ''; rOpen = true; }
  async function resend() {
    if (rBusy) return;
    if (to.trim() && !EMAIL.test(to.trim())) { rErr = 'Adresse e-mail invalide.'; return; }
    rBusy = true; rErr = '';
    try {
      await unwrap(api.POST('/tickets/{ticketId}/resend', { params: { path: { ticketId } }, body: to.trim() ? { toEmail: to.trim() } : {} }));
      toasts.ok('Billet renvoyé par e-mail.'); rOpen = false;
    } catch (e) {
      rErr = e instanceof ApiError && e.status === 429 ? 'Limite atteinte : 5 renvois par heure pour ce billet. Réessayez plus tard.' : message(e);
    } finally { rBusy = false; }
  }
</script>

{#if valid}
  <div class="ta">
    {#each kinds as k (k.kind)}
      {#if live(k.kind)}
        <a class="btn-l" href={live(k.kind)!.url} target="_blank" rel="noopener noreferrer" download>Ouvrir {k.label}</a>
      {:else}
        <Button size="sm" variant="outline" onclick={() => open(k.kind)} loading={st[k.kind]?.busy} aria-label="Télécharger le billet en {k.label}">
          {st[k.kind]?.pending ? 'Préparation…' : k.label}
        </Button>
      {/if}
    {/each}
    {#if canResend}<Button size="sm" variant="outline" onclick={openResend}>Renvoyer</Button>{/if}
  </div>
{/if}

<Modal open={rOpen} title="Renvoyer le billet par e-mail" onclose={() => (rOpen = false)}>
  {#if rErr}<p class="ban" role="alert">{rErr}</p>{/if}
  <Field label="Adresse e-mail" id="rs-to" optional hint="Laissez vide pour utiliser l’adresse du bénéficiaire, sinon celle de l’acheteur.">
    <input id="rs-to" type="email" bind:value={to} autocomplete="off" />
  </Field>
  {#snippet footer()}
    <Button variant="outline" onclick={() => (rOpen = false)}>Annuler</Button>
    <Button onclick={resend} loading={rBusy}>Envoyer</Button>
  {/snippet}
</Modal>

<style>
  .ta { display: inline-flex; gap: 6px; flex-wrap: wrap; }
  .btn-l { display: inline-flex; align-items: center; min-height: 36px; padding: 0 14px; border-radius: var(--radius); border: 1.5px solid var(--ok); color: var(--ok); font: 700 14px var(--font); text-decoration: none; }
  .ban { border: 1.5px solid var(--err); color: var(--err); border-radius: 10px; padding: 10px 12px; font-weight: 700; margin: 0 0 14px; }
</style>
