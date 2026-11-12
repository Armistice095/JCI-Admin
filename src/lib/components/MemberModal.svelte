<script lang="ts">
  import Badge from './Badge.svelte';
  import Button from './Button.svelte';
  import Field from './Field.svelte';
  import Modal from './Modal.svelte';
  import { api, unwrap, type Schemas } from '$lib/api/client';
  import { ApiError } from '$lib/api/errors';
  import { session } from '$lib/stores/session.svelte';
  import { toasts as toast } from '$lib/stores/toast.svelte';
  import { role as roleLabel } from '$lib/utils/labels';

  type User = Schemas['User'];
  type Role = Schemas['Role'];
  type Grant = Schemas['RoleGrant'];
  type RoleCode = Schemas['RoleCode'];
  interface Props {
    open: boolean;
    /** null = invitation d'un nouveau membre */
    member: User | null;
    roles: Role[];
    events: { id: string; title: string }[];
    onclose: () => void;
    /** Appelé après toute modification réussie pour recharger la liste. */
    onchanged: () => void;
  }
  let { open, member, roles, events, onclose, onchanged }: Props = $props();

  const EMAIL = /^\S+@\S+\.\S+$/;
  interface Row { roleCode: RoleCode | ''; eventId: string }
  const create = $derived(member === null);
  const canRoles = $derived(session.can('role.manage'));
  const eventName = (id: string | null) => (id ? (events.find((e) => e.id === id)?.title ?? 'Événement') : 'Tous les événements');
  const scoped = (code: RoleCode | '') => roles.find((r) => r.code === code)?.eventScope === 'OWN_OR_ASSIGNED';

  let first = $state(''), last = $state(''), phone = $state(''), email = $state('');
  let rows = $state<Row[]>([{ roleCode: '', eventId: '' }]);
  let grants = $state<Grant[]>([]);
  let add = $state<Row>({ roleCode: '', eventId: '' });
  let errors = $state<Record<string, string>>({});
  let msg = $state('');
  let busy = $state(false);
  let removing = $state<string | null>(null);

  // Réinitialise le formulaire à chaque ouverture
  $effect(() => {
    if (!open) return;
    errors = {}; msg = ''; busy = false; removing = null;
    add = { roleCode: '', eventId: '' };
    first = member?.firstName ?? ''; last = member?.lastName ?? ''; phone = member?.phone ?? ''; email = member?.email ?? '';
    rows = [{ roleCode: '', eventId: '' }];
    grants = member ? [...member.roles] : [];
  });

  const toBody = (r: Row) => ({ roleCode: r.roleCode as RoleCode, eventId: scoped(r.roleCode) && r.eventId ? r.eventId : null });

  function fail(e: unknown, map: (path: string) => string | null = () => null) {
    if (!(e instanceof ApiError)) { msg = 'Une erreur est survenue. Réessayez.'; return; }
    if (e.code === 'VALIDATION_ERROR') {
      const err: Record<string, string> = {}; const rest: string[] = [];
      for (const [p, m] of Object.entries(e.fields)) { const k = map(p); if (k) err[k] = m; else rest.push(m); }
      errors = err; msg = rest.join(' ') || (Object.keys(err).length ? '' : e.message);
    } else msg = e.message;
  }

  async function save() {
    if (busy) return;
    const err: Record<string, string> = {};
    if (!first.trim()) err.first = 'Prénom requis.';
    if (!last.trim()) err.last = 'Nom requis.';
    if (create) {
      if (!email.trim()) err.email = 'E-mail requis.'; else if (!EMAIL.test(email.trim())) err.email = 'Adresse e-mail invalide.';
      if (!rows.some((r) => r.roleCode)) err.roles = 'Attribuez au moins un rôle.';
    }
    errors = err; msg = '';
    if (Object.keys(err).length) return;
    busy = true;
    try {
      if (member) {
        const body: Schemas['UserUpdate'] = {};
        if (first.trim() !== member.firstName) body.firstName = first.trim();
        if (last.trim() !== member.lastName) body.lastName = last.trim();
        if (phone.trim() !== (member.phone ?? '')) body.phone = phone.trim() || null;
        if (Object.keys(body).length) {
          await unwrap(api.PATCH('/users/{userId}', { params: { path: { userId: member.id } }, body }));
          toast.ok('Membre mis à jour.'); onchanged();
        }
        onclose();
      } else {
        const picked = rows.filter((r) => r.roleCode);
        const u = await unwrap(api.POST('/users', {
          body: { email: email.trim(), firstName: first.trim(), lastName: last.trim(), ...(phone.trim() ? { phone: phone.trim() } : {}), roles: picked.map(toBody) }
        }));
        toast.ok(`Invitation envoyée à ${u.email}.`); onchanged(); onclose();
      }
    } catch (e) {
      fail(e, (p) => ({ email: 'email', firstName: 'first', lastName: 'last', phone: 'phone' } as Record<string, string>)[p] ?? (p.startsWith('roles') ? 'roles' : null));
    } finally { busy = false; }
  }

  async function grant() {
    if (!member || busy) return;
    if (!add.roleCode) { errors = { add: 'Choisissez un rôle.' }; return; }
    errors = {}; msg = ''; busy = true;
    try {
      const g = await unwrap(api.POST('/users/{userId}/roles', { params: { path: { userId: member.id } }, body: toBody(add) }));
      grants = [...grants, g]; add = { roleCode: '', eventId: '' }; toast.ok('Rôle attribué.'); onchanged();
    } catch (e) { fail(e, () => 'add'); } finally { busy = false; }
  }
  async function revoke(g: Grant) {
    if (!member || busy) return;
    errors = {}; msg = ''; busy = true;
    try {
      await unwrap(api.DELETE('/users/{userId}/roles/{grantId}', { params: { path: { userId: member.id, grantId: g.id } } }));
      grants = grants.filter((x) => x.id !== g.id); removing = null; toast.ok('Rôle retiré.'); onchanged();
    } catch (e) { removing = null; fail(e); } finally { busy = false; }
  }
</script>

<Modal {open} title={create ? 'Inviter un membre' : 'Modifier le membre'} {onclose}>
  {#if msg}<p class="ban" role="alert">{msg}</p>{/if}
  <div class="g2">
    <Field label="Prénom" id="m-first" required error={errors.first}><input id="m-first" oninput={() => delete errors.first} type="text" maxlength="80" bind:value={first} /></Field>
    <Field label="Nom" id="m-last" required error={errors.last}><input id="m-last" oninput={() => delete errors.last} type="text" maxlength="80" bind:value={last} /></Field>
  </div>
  <Field label="Adresse e-mail" id="m-email" required={create} error={errors.email} hint={create ? 'Une invitation est envoyée à cette adresse pour définir le mot de passe.' : undefined}>
    <input id="m-email" oninput={() => delete errors.email} type="email" bind:value={email} disabled={!create} autocomplete="off" />
  </Field>
  <Field label="Téléphone" id="m-phone" optional error={errors.phone}><input id="m-phone" oninput={() => delete errors.phone} type="tel" bind:value={phone} /></Field>

  {#if create}
    <fieldset>
      <legend>Rôles *</legend>
      {#each rows as r, i (i)}
        <div class="rr">
          <select aria-label="Rôle {i + 1}" bind:value={r.roleCode} onchange={() => delete errors.roles}>
            <option value="">Choisir un rôle…</option>
            {#each roles as ro (ro.code)}<option value={ro.code}>{ro.name}</option>{/each}
          </select>
          {#if scoped(r.roleCode)}
            <select aria-label="Événement du rôle {i + 1}" bind:value={r.eventId}>
              <option value="">Tous les événements</option>
              {#each events as e (e.id)}<option value={e.id}>{e.title}</option>{/each}
            </select>
          {/if}
          {#if rows.length > 1}<button type="button" class="rm" aria-label="Retirer ce rôle" onclick={() => rows.splice(i, 1)}>×</button>{/if}
        </div>
      {/each}
      {#if errors.roles}<p class="er" role="alert">{errors.roles}</p>{/if}
      {#if rows.length < 10}<Button variant="outline" size="sm" onclick={() => rows.push({ roleCode: '', eventId: '' })}>Ajouter un rôle</Button>{/if}
    </fieldset>
  {:else if canRoles}
    <fieldset>
      <legend>Rôles</legend>
      <ul class="gl">
        {#each grants as g (g.id)}
          <li>
            <span><Badge {...roleLabel(g.roleCode)} /> <small>{eventName(g.eventId)}</small></span>
            {#if removing === g.id}
              <span class="cf">Retirer ? <Button size="sm" variant="danger" onclick={() => revoke(g)} disabled={busy}>Confirmer</Button> <Button size="sm" variant="outline" onclick={() => (removing = null)}>Annuler</Button></span>
            {:else}
              <button type="button" class="lk" aria-label="Retirer le rôle {roleLabel(g.roleCode).label}" onclick={() => (removing = g.id)}>Retirer</button>
            {/if}
          </li>
        {:else}<li><small>Aucun rôle.</small></li>{/each}
      </ul>
      <div class="rr">
        <select aria-label="Nouveau rôle" bind:value={add.roleCode}>
          <option value="">Ajouter un rôle…</option>
          {#each roles as ro (ro.code)}<option value={ro.code}>{ro.name}</option>{/each}
        </select>
        {#if scoped(add.roleCode)}
          <select aria-label="Événement du nouveau rôle" bind:value={add.eventId}>
            <option value="">Tous les événements</option>
            {#each events as e (e.id)}<option value={e.id}>{e.title}</option>{/each}
          </select>
        {/if}
        <Button variant="outline" onclick={grant} disabled={busy || !add.roleCode}>Attribuer</Button>
      </div>
      {#if errors.add}<p class="er" role="alert">{errors.add}</p>{/if}
    </fieldset>
  {/if}

  {#snippet footer()}
    <Button variant="outline" onclick={onclose}>{create ? 'Annuler' : 'Fermer'}</Button>
    <Button onclick={save} loading={busy}>{create ? 'Envoyer l’invitation' : 'Enregistrer'}</Button>
  {/snippet}
</Modal>

<style>
  .g2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0 14px; }
  @media (max-width: 520px) { .g2 { grid-template-columns: 1fr; } }
  .ban { border: 1.5px solid var(--err); color: var(--err); border-radius: 10px; padding: 10px 12px; font-weight: 700; margin: 0 0 14px; }
  .er { color: var(--err); font-size: 13px; font-weight: 700; margin: 6px 0; }
  fieldset { border: 0; padding: 0; margin: 6px 0 0; }
  legend { font-weight: 700; margin-bottom: 8px; padding: 0; }
  .rr { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; align-items: center; }
  .rr select { flex: 1 1 180px; min-width: 0; }
  .rm { width: 44px; height: 44px; border: 1px solid var(--line); border-radius: var(--radius); background: none; color: var(--ink); font-size: 20px; cursor: pointer; }
  .gl { list-style: none; margin: 0 0 12px; padding: 0; }
  .gl li { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--line); flex-wrap: wrap; }
  .gl small { color: var(--mut); }
  .cf { display: inline-flex; gap: 6px; align-items: center; flex-wrap: wrap; font-size: 14px; }
  .lk { border: 0; background: none; color: var(--err); font: 700 14px var(--font); cursor: pointer; padding: 10px 4px; }
</style>
