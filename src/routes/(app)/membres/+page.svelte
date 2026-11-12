<script lang="ts">
  import Avatar from '$lib/components/Avatar.svelte';
  import Badge from '$lib/components/Badge.svelte';
  import Button from '$lib/components/Button.svelte';
  import Card from '$lib/components/Card.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import ErrorState from '$lib/components/ErrorState.svelte';
  import MemberModal from '$lib/components/MemberModal.svelte';
  import Modal from '$lib/components/Modal.svelte';
  import PageHeader from '$lib/components/PageHeader.svelte';
  import Pagination from '$lib/components/Pagination.svelte';
  import SearchInput from '$lib/components/SearchInput.svelte';
  import Table from '$lib/components/Table.svelte';
  import { api, unwrap, type Schemas } from '$lib/api/client';
  import { ApiError } from '$lib/api/errors';
  import { session } from '$lib/stores/session.svelte';
  import { toasts as toast } from '$lib/stores/toast.svelte';
  import { Resource } from '$lib/utils/resource.svelte';
  import { initials } from '$lib/utils/format';
  import { role as roleLabel } from '$lib/utils/labels';

  type User = Schemas['User'];
  const allowed = $derived(session.can('user.manage'));

  let q = $state('');
  let page = $state(1);
  const res = new Resource(() => unwrap(api.GET('/users', { params: { query: { page, pageSize: 10, ...(q && { q }) } } })));
  const rolesRes = new Resource(() => unwrap(api.GET('/roles')));
  const eventsRes = new Resource(() => unwrap(api.GET('/events', { params: { query: { pageSize: 100 } } })));
  $effect(() => { if (allowed) void res.load(); });
  $effect(() => { if (allowed) { void rolesRes.load(); void eventsRes.load(); } });
  const events = $derived((eventsRes.data?.data ?? []).map((e) => ({ id: e.id, title: e.title })));
  const evTitle = (id: string | null) => (id ? (events.find((e) => e.id === id)?.title ?? 'Événement') : null);

  // Modale d'invitation / modification
  let form = $state<{ open: boolean; member: User | null }>({ open: false, member: null });
  // Confirmation d'une action sur un compte
  let confirm = $state<{ kind: 'disable' | 'enable' | 'reset'; user: User } | null>(null);
  let busy = $state(false);
  let err = $state('');

  const TEXT = {
    disable: { title: 'Désactiver ce compte ?', ok: 'Désactiver', done: 'Compte désactivé.' },
    enable: { title: 'Réactiver ce compte ?', ok: 'Réactiver', done: 'Compte réactivé.' },
    reset: { title: 'Réinitialiser le mot de passe ?', ok: 'Envoyer l’e-mail', done: 'E-mail de réinitialisation envoyé.' }
  } as const;

  async function run() {
    if (!confirm || busy) return;
    const { kind, user } = confirm;
    busy = true; err = '';
    try {
      const path = { userId: user.id };
      if (kind === 'disable') await unwrap(api.POST('/users/{userId}/disable', { params: { path } }));
      else if (kind === 'enable') await unwrap(api.POST('/users/{userId}/enable', { params: { path } }));
      else await unwrap(api.POST('/users/{userId}/reset-password', { params: { path } }));
      toast.ok(TEXT[kind].done); confirm = null; void res.reload();
    } catch (e) { err = e instanceof ApiError ? e.message : 'Une erreur est survenue. Réessayez.'; }
    finally { busy = false; }
  }
</script>

<svelte:head><title>Membres · JCI Comé Excellence</title></svelte:head>

<PageHeader title="Membres">
  {#snippet actions()}<Button onclick={() => (form = { open: true, member: null })} disabled={!rolesRes.data}>Inviter un membre</Button>{/snippet}
</PageHeader>

{#if !allowed}
  <Card><EmptyState title="Accès restreint" text="Seuls les administrateurs gèrent les membres." /></Card>
{:else}
  <Card>
    <div class="bar"><SearchInput width={400} placeholder="Rechercher un nom ou un e-mail" bind:value={q} onsearch={() => (page = 1)} /></div>
    {#if res.error && !res.data}
      <ErrorState error={res.error} onretry={res.reload} />
    {:else if !res.data}
      <div class="sk" style="height:300px;border-radius:12px"></div>
    {:else if res.data.data.length === 0}
      {#if q}
        <EmptyState title="Aucun résultat" text="Aucun membre ne correspond à cette recherche.">
          <Button variant="outline" onclick={() => { q = ''; page = 1; }}>Effacer la recherche</Button>
        </EmptyState>
      {:else}<EmptyState title="Aucun membre" text="Invitez le premier membre de l’équipe." />{/if}
    {:else}
      <div class:busy={res.loading}>
        <Table minWidth={860}>
          <thead><tr><th>Membre</th><th>Rôles</th><th>Statut</th><th class="num">Actions</th></tr></thead>
          <tbody>
            {#each res.data.data as u (u.id)}
              {@const self = u.id === session.me?.id}
              <tr>
                <td>
                  <div class="who"><Avatar text={initials(u.firstName, u.lastName)} /><div><b>{u.firstName} {u.lastName}</b>{#if self}<span class="you">&nbsp;(vous)</span>{/if}<small>{u.email}</small></div></div>
                </td>
                <td>
                  <div class="rl">{#each u.roles as g (g.id)}<span class="rb"><Badge {...roleLabel(g.roleCode)} />{#if g.eventId}<small>{evTitle(g.eventId)}</small>{/if}</span>{/each}</div>
                </td>
                <td><Badge tone={u.status === 'ACTIVE' ? 'ok' : 'neutral'} label={u.status === 'ACTIVE' ? 'Actif' : 'Désactivé'} /></td>
                <td class="num">
                  <div class="act">
                    <Button size="sm" variant="outline" onclick={() => (form = { open: true, member: u })} disabled={!rolesRes.data}>Modifier</Button>
                    <Button size="sm" variant="outline" onclick={() => { err = ''; confirm = { kind: 'reset', user: u }; }}>Mot de passe</Button>
                    {#if u.status === 'ACTIVE'}
                      {#if !self}<Button size="sm" variant="outline" onclick={() => { err = ''; confirm = { kind: 'disable', user: u }; }}>Désactiver</Button>{/if}
                    {:else}
                      <Button size="sm" variant="outline" onclick={() => { err = ''; confirm = { kind: 'enable', user: u }; }}>Réactiver</Button>
                    {/if}
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </Table>
        <Pagination {...res.data.meta} onpage={(p) => (page = p)} />
      </div>
    {/if}
  </Card>

  <MemberModal open={form.open} member={form.member} roles={rolesRes.data ?? []} {events} onclose={() => (form.open = false)} onchanged={() => res.reload()} />

  <Modal open={!!confirm} title={confirm ? TEXT[confirm.kind].title : ''} onclose={() => (confirm = null)}>
    {#if confirm}
      <p>
        {#if confirm.kind === 'disable'}<b>{confirm.user.firstName} {confirm.user.lastName}</b> ne pourra plus se connecter et ses sessions en cours seront fermées. Vous pourrez réactiver le compte à tout moment.
        {:else if confirm.kind === 'enable'}<b>{confirm.user.firstName} {confirm.user.lastName}</b> pourra de nouveau se connecter.
        {:else}Un e-mail permettant de choisir un nouveau mot de passe sera envoyé à <b>{confirm.user.email}</b>.{/if}
      </p>
      {#if err}<p class="ban" role="alert">{err}</p>{/if}
    {/if}
    {#snippet footer()}
      <Button variant="outline" onclick={() => (confirm = null)}>Annuler</Button>
      <Button variant={confirm?.kind === 'disable' ? 'danger' : 'primary'} onclick={run} loading={busy}>{confirm ? TEXT[confirm.kind].ok : ''}</Button>
    {/snippet}
  </Modal>
{/if}

<style>
  .bar { margin-bottom: 16px; }
  .who { display: flex; gap: 12px; align-items: center; }
  .who small { display: block; color: var(--mut); font-size: 13px; }
  .you { color: var(--mut); font-weight: 500; }
  .rl { display: flex; gap: 6px 10px; flex-wrap: wrap; }
  .rb { display: inline-flex; flex-direction: column; align-items: flex-start; gap: 2px; }
  .rb small { font-size: 12px; color: var(--mut); }
  .act { display: inline-flex; gap: 8px; justify-content: flex-end; }
  .ban { border: 1.5px solid var(--err); color: var(--err); border-radius: 10px; padding: 10px 12px; font-weight: 700; }
  .busy { opacity: 0.6; transition: opacity 0.15s; }
  .sk { background: linear-gradient(90deg, var(--soft), var(--line), var(--soft)); background-size: 200% 100%; animation: sh 1.2s linear infinite; }
  @keyframes sh { to { background-position: -200% 0; } }
</style>
