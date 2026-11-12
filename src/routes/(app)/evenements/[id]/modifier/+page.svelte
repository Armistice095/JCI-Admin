<script lang="ts">
  import { page } from '$app/state';
  import EventForm from '$lib/components/EventForm.svelte';
  import Card from '$lib/components/Card.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import ErrorState from '$lib/components/ErrorState.svelte';
  import Button from '$lib/components/Button.svelte';
  import { api, unwrap } from '$lib/api/client';
  import { Resource } from '$lib/utils/resource.svelte';
  import { session } from '$lib/stores/session.svelte';

  const id = $derived(page.params.id ?? '');
  const ev = new Resource(() => unwrap(api.GET('/events/{eventId}', { params: { path: { eventId: id } } })));
  const tk = new Resource(() => unwrap(api.GET('/events/{eventId}/ticketing', { params: { path: { eventId: id } } })));
  $effect(() => { void ev.load(); });
  // La billetterie préremplit les dates ; sans droit « ticketing.manage » le formulaire n'a pas cette section.
  $effect(() => { if (session.can('ticketing.manage', id)) void tk.load(); else tk.loading = false; });

  const ready = $derived(ev.data?.id === id && (!session.can('ticketing.manage', id) || (!!tk.data && !tk.loading)));
  const editable = $derived(!!ev.data && (ev.data.status === 'DRAFT' || ev.data.status === 'PUBLISHED') && session.can('event.update', id));
</script>

<svelte:head><title>Modifier l’événement · JCI Comé Excellence</title></svelte:head>

{#if ev.error && !ev.data}
  <ErrorState error={ev.error} onretry={ev.reload} />
{:else if tk.error && session.can('ticketing.manage', id) && !tk.data}
  <ErrorState error={tk.error} onretry={tk.reload} />
{:else if !ready}
  <div class="sk" style="height:520px;border-radius:18px"></div>
{:else if !editable}
  <Card>
    <EmptyState title="Modification impossible" text="Un événement clôturé ou annulé ne peut plus être modifié, ou vous n’avez pas la permission de le modifier.">
      <Button href="/evenements/{id}">Retour à l’événement</Button>
    </EmptyState>
  </Card>
{:else}
  {#key ev.data!.id}
    <EventForm mode="edit" event={ev.data} ticketing={tk.data} />
  {/key}
{/if}

<style>
  .sk { background: linear-gradient(90deg, var(--soft), var(--line), var(--soft)); background-size: 200% 100%; animation: sh 1.2s linear infinite; }
  @keyframes sh { to { background-position: -200% 0; } }
</style>
