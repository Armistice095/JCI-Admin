<script lang="ts">
  import Card from '$lib/components/Card.svelte';
  import Button from '$lib/components/Button.svelte';
  import Badge from '$lib/components/Badge.svelte';
  import ComingSoon from '$lib/components/ComingSoon.svelte';
  import Icon from '$lib/components/Icon.svelte';
  import { getEventContext } from '$lib/features/eventContext';
  import { session } from '$lib/stores/session.svelte';
  import { eventStatus, eventCategoryLabel } from '$lib/utils/labels';
  import { formatLocalDate, timeToLabel } from '$lib/utils/format';

  const ctx = getEventContext();
  const ev = $derived(ctx.event);
  const editable = $derived((ev.status === 'DRAFT' || ev.status === 'PUBLISHED') && session.can('event.update', ev.id));
  const cover = $derived(ev.posters.find((p) => p.isCover) ?? ev.posters[0]);
  const others = $derived(ev.posters.filter((p) => p.id !== cover?.id));
  const empty = '—';
</script>

<div class="cols">
  <Card title="Informations générales">
    {#snippet actions()}{#if editable}<Button variant="outline" size="sm" href="/evenements/{ev.id}/modifier">Modifier</Button>{/if}{/snippet}
    <dl class="kv">
      <dt>Titre</dt><dd>{ev.title}</dd>
      <dt>Catégorie</dt><dd>{eventCategoryLabel(ev.category)}</dd>
      <dt>Statut</dt><dd><Badge {...eventStatus(ev.status)} /></dd>
      <dt>Description</dt><dd class="txt">{ev.description || empty}</dd>
      <dt>Date</dt><dd>{ev.date ? formatLocalDate(ev.date) : empty}</dd>
      <dt>Horaires</dt><dd>{ev.startTime && ev.endTime ? `${timeToLabel(ev.startTime)} à ${timeToLabel(ev.endTime)}` : empty}</dd>
      <dt>Lieu</dt><dd>{[ev.venueName, ev.city].filter(Boolean).join(', ') || empty}</dd>
      <dt>Programme</dt>
      <dd>
        {#if ev.programme.length}
          <ul class="prog">{#each ev.programme as l, i (i)}<li><b>{timeToLabel(l.time)}</b> {l.label}</li>{/each}</ul>
        {:else}{empty}{/if}
      </dd>
      {#if ev.contactEmail || ev.contactPhone}
        <dt>Contact</dt><dd>{[ev.contactEmail, ev.contactPhone].filter(Boolean).join(' · ')}</dd>
      {/if}
      <dt>Créé par</dt><dd>{ev.createdBy}</dd>
    </dl>
  </Card>

  <div class="stk">
    <Card title="Affiche">
      {#if cover}
        <img class="poster" src={cover.url} alt="Affiche de {ev.title}" loading="lazy" />
        {#if others.length}
          <div class="thumbs">{#each others as p (p.id)}<img src={p.url} alt="" loading="lazy" />{/each}</div>
        {/if}
      {:else}
        <p class="none">Aucune affiche pour le moment.</p>
      {/if}
    </Card>
    <Card title="Organisateurs">
      {#if ev.organizers.length}
        <ul class="ls">
          {#each ev.organizers as o, i (i)}
            <li><span class="ci"><Icon name="calendar-k" size={20} /></span><div><b>{o.name}</b>{#if o.description}<small>{o.description}</small>{/if}</div></li>
          {/each}
        </ul>
      {:else}<p class="none">Aucun organisateur renseigné.</p>{/if}
    </Card>
  </div>
</div>

<section>
  <h2 class="dh">Documents</h2>
  <ComingSoon text="Les exports (liste des participants, rapport de billetterie, liste des présences, journal des paiements) arrivent avec une prochaine version de l’API." />
</section>

<style>
  .cols { display: grid; gap: 20px; }
  @media (min-width: 1000px) { .cols { grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); } }
  .stk { display: grid; gap: 20px; align-content: start; }
  .kv { display: grid; grid-template-columns: 170px 1fr; gap: 14px 16px; margin: 0; }
  .kv dt { color: var(--mut); font-weight: 600; }
  .kv dd { margin: 0; min-width: 0; overflow-wrap: anywhere; }
  .txt { white-space: pre-line; }
  .prog { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; }
  .poster { width: 100%; border-radius: 12px; display: block; }
  .thumbs { display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
  .thumbs img { width: 64px; height: 80px; object-fit: cover; border-radius: 8px; }
  .none { margin: 0; }
  .ls { list-style: none; margin: 0; padding: 0; display: grid; gap: 14px; }
  .ls li { display: flex; gap: 14px; align-items: center; }
  .ls small { display: block; color: var(--mut); font-size: 13px; }
  .ci { width: 44px; height: 44px; border-radius: 50%; display: grid; place-items: center; flex: none; color: var(--c-blue); background: color-mix(in srgb, currentColor 12%, transparent); }
  .ci :global(svg) { fill: currentColor; stroke: none; }
  .dh { font-size: 16px; margin: 4px 0 12px; }
  @media (max-width: 600px) { .kv { grid-template-columns: 1fr; gap: 2px; } .kv dd { margin-bottom: 12px; } }
</style>
