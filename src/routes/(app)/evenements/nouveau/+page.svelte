<script lang="ts">
  import EventForm from '$lib/components/EventForm.svelte';
  import Card from '$lib/components/Card.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import Button from '$lib/components/Button.svelte';
  import { session } from '$lib/stores/session.svelte';
</script>

<svelte:head><title>Nouvel événement · JCI Comé Excellence</title></svelte:head>

{#if session.can('event.create')}
  <EventForm mode="create" />
{:else}
  <Card>
    <EmptyState title="Accès restreint" text="Vous n’avez pas la permission de créer un événement.">
      <Button href="/evenements">Retour aux événements</Button>
    </EmptyState>
  </Card>
{/if}
