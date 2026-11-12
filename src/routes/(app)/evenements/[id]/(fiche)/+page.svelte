<script lang="ts">
  import Card from '$lib/components/Card.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import ErrorState from '$lib/components/ErrorState.svelte';
  import Icon from '$lib/components/Icon.svelte';
  import KpiCard from '$lib/components/KpiCard.svelte';
  import ProgressBar from '$lib/components/ProgressBar.svelte';
  import TicketDetailModal from '$lib/components/TicketDetailModal.svelte';
  import { api, unwrap, type Schemas } from '$lib/api/client';
  import { getEventContext } from '$lib/features/eventContext';
  import { session } from '$lib/stores/session.svelte';
  import { Resource } from '$lib/utils/resource.svelte';
  import { formatNumber, formatRelativeTime, formatXof } from '$lib/utils/format';

  type Activity = NonNullable<Schemas['EventOverview']['activity']>[number];
  const ctx = getEventContext();
  const id = $derived(ctx.event.id);

  const res = new Resource(() => unwrap(api.GET('/events/{eventId}/overview', { params: { path: { eventId: id } } })));
  $effect(() => { void res.load(); });
  // N'affiche jamais les chiffres d'un autre événement pendant un changement de page
  const ov = $derived(res.data && res.data.eventId === id ? res.data : undefined);

  // Pas de bouton « Actualiser » (absent des maquettes) : on recharge discrètement au retour sur l'onglet.
  let lastLoad = Date.now();
  $effect(() => { if (res.data) lastLoad = Date.now(); });
  $effect(() => {
    const back = () => { if (document.visibilityState === 'visible' && Date.now() - lastLoad > 30_000) void res.reload(); };
    document.addEventListener('visibilitychange', back);
    window.addEventListener('focus', back);
    return () => { document.removeEventListener('visibilitychange', back); window.removeEventListener('focus', back); };
  });

  const draft = $derived(ctx.event.status === 'DRAFT');
  const canOpenTicket = $derived(session.can('participant.read', id));
  let ticketId = $state<string | null>(null);

  const KINDS: Record<Activity['type'], { title: string; icon: string; tone: string }> = {
    TICKET_ISSUED: { title: 'Billet émis', icon: 'ticket-k', tone: 'amber' },
    TICKET_CHECKED_IN: { title: 'Billet scanné à l’entrée', icon: 'check', tone: 'green' },
    TICKET_CANCELLED: { title: 'Billet annulé', icon: 'close', tone: 'red' }
  };
  const kind = (t: string) => KINDS[t as Activity['type']] ?? { title: 'Billet', icon: 'ticket-k', tone: 'amber' };
</script>

{#if res.error && !ov}
  <ErrorState error={res.error} onretry={res.reload} />
{:else}
  <div class="k4">
    <KpiCard value={ov ? formatXof(ov.kpis.revenueXof) : '…'} label="Recettes confirmées" icon="wallet-k" color="blue" />
    <KpiCard value={ov ? formatNumber(ov.kpis.views) : '…'} label="Visiteurs" icon="users-k" color="purple" />
    <KpiCard value={ov ? `${formatNumber(ov.kpis.ticketsIssued)} / ${formatNumber(ov.kpis.capacity)}` : '…'} label="Billets émis" icon="ticket-k" color="amber" />
    <KpiCard value={ov ? formatNumber(ov.kpis.remaining) : '…'} label="Places restantes" icon="bag-k" color="coral" />
  </div>

  <div class="row">
    <Card title="Ventes par catégorie">
      {#if !ov}
        <div class="sk" style="height:200px;border-radius:12px"></div>
      {:else if ov.categories.length === 0}
        <EmptyState title="Aucune catégorie" text="Ajoutez des catégories de billets dans l’onglet Billetterie." />
      {:else}
        <ul class="cats">
          {#each ov.categories as c (c.id)}
            <li class:off={!c.isActive}>
              <div class="l1"><b>{c.name}{#if !c.isActive}<small>&nbsp;· désactivée</small>{/if}</b><span>{formatXof(c.priceXof)}</span></div>
              <ProgressBar value={c.sold} max={c.quota} label="{c.name} : {c.sold} vendus sur {c.quota}" />
              <div class="l2">
                <small>{formatNumber(c.sold)} sur {formatNumber(c.quota)} billets{c.reserved > 0 ? ` · ${formatNumber(c.reserved)} en cours de paiement` : ''}</small>
                <b>{formatXof(c.revenueXof)}</b>
              </div>
            </li>
          {/each}
        </ul>
        {#if draft}<p class="hint">Les recettes s’affichent dès la publication de l’événement.</p>{/if}
      {/if}
    </Card>

    <Card title="Activité récente">
      {#if !ov}
        <div class="sk" style="height:200px;border-radius:12px"></div>
      {:else if ov.activity === null}
        <p class="hint">L’activité détaillée est réservée aux personnes qui peuvent consulter les participants.</p>
      {:else if ov.activity.length === 0}
        <EmptyState title="Aucune activité" text="Les billets émis, scannés ou annulés apparaîtront ici." />
      {:else}
        <ul class="act">
          {#each ov.activity as a (a.type + a.ticketId + a.at)}
            {@const k = kind(a.type)}
            <li>
              <span class="ic {k.tone}">{#if k.icon === 'check'}<b class="ck" aria-hidden="true">✓</b>{:else}<Icon name={k.icon} size={20} />{/if}</span>
              <div class="tx">
                <b>{k.title}</b>
                <small>{a.holderName}, {a.category}</small>
              </div>
              <time datetime={a.at}>{formatRelativeTime(a.at)}</time>
              {#if canOpenTicket}<button class="ov" aria-label="Voir le billet {a.ticketNumber}" onclick={() => (ticketId = a.ticketId)}></button>{/if}
            </li>
          {/each}
        </ul>
      {/if}
    </Card>
  </div>
  <TicketDetailModal {ticketId} onclose={() => (ticketId = null)} />
{/if}

<style>
  .k4 { display: grid; gap: 20px; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); }
  .row { display: grid; gap: 20px; }
  @media (min-width: 1000px) { .row { grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); } }
  .cats, .act { list-style: none; margin: 0; padding: 0; }
  .cats li { padding: 14px 0; border-top: 1px solid var(--line); }
  .cats li:first-child { border-top: 0; padding-top: 0; }
  .cats li.off { opacity: 0.65; }
  .l1, .l2 { display: flex; justify-content: space-between; gap: 12px; align-items: baseline; }
  small { color: var(--mut); font-size: 13px; }
  .l2 b { font-size: 15px; }
  .act li { position: relative; display: flex; gap: 14px; align-items: center; padding: 12px 0; border-top: 1px solid var(--line); }
  .act li:first-child { border-top: 0; padding-top: 0; }
  .tx { flex: 1; min-width: 0; }
  .tx small { display: block; overflow-wrap: anywhere; }
  time { color: var(--mut); font-size: 13px; white-space: nowrap; }
  .ic { width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; flex: none; }
  .ic.amber { background: color-mix(in srgb, var(--c-amber) 14%, transparent); color: var(--c-amber); }
  .ic.green { background: color-mix(in srgb, var(--ok) 14%, transparent); color: var(--ok); }
  .ic.red { background: color-mix(in srgb, var(--err) 12%, transparent); color: var(--err); }
  .ic.amber :global(svg) { fill: currentColor; stroke: none; }
  .ck { font-size: 20px; line-height: 1; }
  .ov { position: absolute; inset: 0; border: 0; background: none; cursor: pointer; border-radius: 10px; }
  .ov:hover { background: color-mix(in srgb, var(--soft) 60%, transparent); }
  .hint { color: var(--mut); font-size: 14px; margin: 12px 0 0; }
  .sk { background: linear-gradient(90deg, var(--soft), var(--line), var(--soft)); background-size: 200% 100%; animation: sh 1.2s linear infinite; }
  @keyframes sh { to { background-position: -200% 0; } }
</style>
