<script lang="ts">
  import { page } from '$app/state';
  import type { Snippet } from 'svelte';
  import Badge from '$lib/components/Badge.svelte';
  import Button from '$lib/components/Button.svelte';
  import Tabs from '$lib/components/Tabs.svelte';
  import EventCover from '$lib/components/EventCover.svelte';
  import ErrorState from '$lib/components/ErrorState.svelte';
  import Icon from '$lib/components/Icon.svelte';
  import EventStateActions from '$lib/components/EventStateActions.svelte';
  import { api, unwrap } from '$lib/api/client';
  import { ApiError } from '$lib/api/errors';
  import { Resource } from '$lib/utils/resource.svelte';
  import { session } from '$lib/stores/session.svelte';
  import { toasts } from '$lib/stores/toast.svelte';
  import { eventStatus, salesStatus } from '$lib/utils/labels';
  import { formatLocalDate, timeToLabel } from '$lib/utils/format';
  import { setEventContext, FIELD_LABELS } from '$lib/features/eventContext';

  let { children }: { children: Snippet } = $props();
  const id = $derived(page.params.id ?? '');

  const res = new Resource(() => unwrap(api.GET('/events/{eventId}', { params: { path: { eventId: id } } })));
  $effect(() => { void res.load(); });

  setEventContext({
    get event() { return ev!; },
    reload: () => res.reload()
  });

  const base = $derived(`/evenements/${id}`);
  const tabs = $derived([
    { href: base, label: 'Vue d’ensemble' },
    { href: `${base}/informations`, label: 'Informations' },
    { href: `${base}/billetterie`, label: 'Billetterie' },
    ...(session.can('participant.read', id) ? [{ href: `${base}/participants`, label: 'Participants' }] : []),
    ...(session.can('order.read', id) ? [{ href: `${base}/paiements`, label: 'Paiements' }] : []),
    { href: `${base}/communication`, label: 'Communication' }
  ]);
  // La page « modifier » a son propre écran : pas d'onglet actif.
  const current = $derived(page.url.pathname);

  // Évite d'afficher un autre événement pendant le chargement après un changement d'identifiant.
  const ev = $derived(res.data?.id === id ? res.data : undefined);
  const when = $derived.by(() => {
    if (!ev) return '';
    const date = ev.date ? formatLocalDate(ev.date) : 'Date à définir';
    const hours = ev.startTime && ev.endTime ? `, ${timeToLabel(ev.startTime)} à ${timeToLabel(ev.endTime)}` : '';
    const where = [ev.venueName, ev.city].filter(Boolean).join(', ');
    return `${date}${hours}${where ? `, ${where}` : ''}`;
  });
  const editable = $derived(!!ev && (ev.status === 'DRAFT' || ev.status === 'PUBLISHED') && session.can('event.update', id));
  const canPublish = $derived(!!ev && ev.status === 'DRAFT' && session.can('event.publish', id));

  let publishing = $state(false);
  async function publish() {
    publishing = true;
    try {
      await unwrap(api.POST('/events/{eventId}/publish', { params: { path: { eventId: id } } }));
      toasts.ok('Événement publié.');
      await res.reload();
    } catch (e) {
      if (e instanceof ApiError && e.isValidation) {
        const missing = Object.keys(e.fields).map((f) => FIELD_LABELS[f] ?? f);
        toasts.error(`Publication impossible : complétez ${missing.join(', ') || 'les champs obligatoires'}.`);
      } else {
        toasts.error(e instanceof Error ? e.message : 'Publication impossible.');
      }
    } finally {
      publishing = false;
    }
  }
</script>

<svelte:head><title>{ev ? `${ev.title} · ` : ''}Événements · JCI Comé Excellence</title></svelte:head>

<a class="bk" href="/evenements"><Icon name="chevron-left" size={18} />Événements</a>

{#if res.error && !ev}
  {#if res.error.status === 404}
    <div class="cd nf">
      <h1>Événement introuvable</h1>
      <p>Cet événement n’existe pas ou vous n’y avez pas accès.</p>
      <Button href="/evenements">Retour aux événements</Button>
    </div>
  {:else}
    <ErrorState error={res.error} onretry={res.reload} />
  {/if}
{:else if !ev}
  <div class="sk" style="height:200px;border-radius:18px"></div>
  <div class="sk" style="height:320px;border-radius:18px;margin-top:20px"></div>
{:else}
  <header class="cd fh">
    <div class="fht">
      <div class="id">
        <EventCover url={ev.coverUrl} size={88} radius={16} />
        <div>
          <h1>{ev.title}</h1>
          <div class="fb">
            <Badge {...eventStatus(ev.status)} />
            {#if ev.salesStatus}<Badge {...salesStatus(ev.salesStatus)} />{/if}
          </div>
          <small>{when}</small>
        </div>
      </div>
      <div class="fa">
        {#if ev.publicUrl}<Button variant="outline" href={ev.publicUrl} target="_blank"><Icon name="external" />Page publique</Button>{/if}
        <EventStateActions event={ev} onchanged={() => res.reload()} />
        {#if canPublish}<Button variant="outline" onclick={publish} loading={publishing}>Publier</Button>{/if}
        {#if editable}<Button href="{base}/modifier">Modifier</Button>{/if}
      </div>
    </div>
    <Tabs {tabs} {current} label="Sections de l’événement" />
  </header>

  <div class="content">{@render children()}</div>
{/if}

<style>
  .bk { display: inline-flex; align-items: center; gap: 6px; color: var(--mut); font-weight: 700; text-decoration: none; min-height: 44px; margin-bottom: 8px; }
  .bk:hover { color: var(--ink); }
  .cd { background: var(--card); border-radius: var(--radius-card); padding: 24px; box-shadow: var(--sh); }
  .fh { padding-bottom: 0; overflow: hidden; }
  .fht { display: flex; justify-content: space-between; gap: 20px; flex-wrap: wrap; align-items: center; }
  .id { display: flex; gap: 20px; align-items: center; min-width: 0; }
  h1 { margin: 0 0 8px; font-size: clamp(22px, 3vw, 28px); line-height: 1.2; font-weight: 800; }
  .fb { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; }
  small { color: var(--mut); font-size: 14px; }
  .fa { display: flex; gap: 10px; flex-wrap: wrap; }
  .content { margin-top: 20px; display: grid; gap: 20px; }
  .nf { text-align: center; padding: 56px 20px; }
  .sk { background: linear-gradient(90deg, var(--soft), var(--line), var(--soft)); background-size: 200% 100%; animation: sh 1.2s linear infinite; }
  @keyframes sh { to { background-position: -200% 0; } }
</style>
