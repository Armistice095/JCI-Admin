<script lang="ts">
  import { tick } from 'svelte';
  import Badge from '$lib/components/Badge.svelte';
  import Button from '$lib/components/Button.svelte';
  import Card from '$lib/components/Card.svelte';
  import TicketActions from '$lib/components/TicketActions.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import ErrorState from '$lib/components/ErrorState.svelte';
  import Field from '$lib/components/Field.svelte';
  import Icon from '$lib/components/Icon.svelte';
  import Modal from '$lib/components/Modal.svelte';
  import { api, unwrap } from '$lib/api/client';
  import { SaleWizard, MAX_TICKETS, type PayMode } from '$lib/features/saleWizard.svelte';
  import { Resource } from '$lib/utils/resource.svelte';
  import { session } from '$lib/stores/session.svelte';
  import { availability, paymentMethod, role, salesStatus } from '$lib/utils/labels';
  import { formatDate, formatXof } from '$lib/utils/format';

  const w = new SaleWizard();
  const allowed = $derived(session.can('sale.create'));

  // Événements publiés (la vente exige aussi une billetterie ouverte)
  const events = new Resource(() =>
    unwrap(api.GET('/events', { params: { query: { status: 'PUBLISHED', upcoming: 'true', sort: 'startsAt', pageSize: 100 } } }))
  );
  $effect(() => { if (allowed) void events.load(); });

  const list = $derived(events.data?.data ?? []);
  const open = $derived(list.filter((e) => e.salesStatus === 'OPEN'));
  const ev = $derived(list.find((e) => e.id === w.eventId));

  // Premier événement ouvert sélectionné par défaut
  $effect(() => { if (!w.eventId && open.length) w.eventId = open[0].id; });

  // Billetterie de l'événement choisi (disponibilités exactes) ; rechargée si le serveur signale un changement.
  const ticketing = new Resource(() => unwrap(api.GET('/events/{eventId}/ticketing', { params: { path: { eventId: w.eventId } } })));
  let loadedFor = '';
  $effect(() => {
    w.refreshTick;
    if (!w.eventId) return;
    const same = loadedFor === w.eventId;
    void ticketing.load().then(() => {
      if (ticketing.data && ticketing.data) w.setCategories(ticketing.data.categories, same);
    });
    loadedFor = w.eventId;
  });
  function chooseEvent(id: string) { w.eventId = id; w.msg = ''; w.errors = {}; }

  const modes: { v: PayMode; label: string; hint: string; icon: string; color: string }[] = [
    { v: 'CASH', label: 'Espèces', hint: 'Le client paie en liquide.', icon: 'wallet-k', color: 'amber' },
    { v: 'MOBILE_MONEY_DIRECT', label: 'Mobile Money', hint: 'Transfert direct vers le compte de l’organisation.', icon: 'phone', color: 'purple' }
  ];
  const steps = $derived(['Billets', 'Participants', 'Paiement', 'Confirmation'].map((label, i) => ({ id: String(i + 1), label, done: i + 1 < w.step || !!w.done })));

  async function scrollToError() {
    await tick();
    const el = document.querySelector<HTMLElement>('.fld.bad, .er');
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    el?.querySelector<HTMLElement>('input')?.focus({ preventScroll: true });
  }
  let dupOpen = $state(false);
  async function next() {
    const r = w.next();
    if (r === 'invalid') return void scrollToError();
    if (r === 'duplicates') dupOpen = true;
    else window.scrollTo({ top: 0 });
  }
  function emitAnyway() { w.dupAck = true; dupOpen = false; void next(); }
  async function submit() {
    await w.submit();
    if (w.done) window.scrollTo({ top: 0 });
    else if (Object.keys(w.errors).length) void scrollToError();
  }

  const nerr = $derived(Object.keys(w.errors).filter((k) => k !== 'q').length);
  const e = (k: string) => w.errors[k];
  const place = $derived(ev ? [ev.venueName, ev.city].filter(Boolean).join(', ') : '');
</script>

<svelte:head><title>Vente physique · JCI Comé Excellence</title></svelte:head>

{#if !allowed}
  <Card><EmptyState title="Accès restreint" text="Vous n’avez pas la permission d’enregistrer des ventes physiques." /></Card>
{:else if events.error && !events.data}
  <h1 class="vh">Vente physique</h1>
  <ErrorState error={events.error} onretry={events.reload} />
{:else if !events.data}
  <h1 class="vh">Vente physique</h1>
  <div class="sk" style="height:90px;border-radius:18px"></div>
  <div class="sk" style="height:480px;border-radius:18px;margin-top:20px"></div>
{:else if open.length === 0 && !w.done}
  <h1 class="vh">Vente physique</h1>
  <Card>
    <EmptyState title="Aucun événement ouvert à la vente" text="La vente physique est possible pour les événements publiés dont la billetterie est ouverte.">
      <Button href="/evenements">Voir les événements</Button>
    </EmptyState>
  </Card>
{:else}
  <div class="vhd">
    <div>
      <h1>Vente physique</h1>
      <small>Vendeur : {session.fullName}, {role(session.roleCodes[0]).label}</small>
    </div>
    <ol class="vst" aria-label="Étapes">
      {#each steps as s, i (s.id)}
        {@const n = i + 1}
        <li class:dn={s.done} class:cur={n === w.step && !w.done}>
          <button type="button" aria-current={n === w.step && !w.done ? 'step' : undefined} disabled={!(n < w.step && !w.done)} onclick={() => w.goTo(n)}>
            <b>{s.done ? '✓' : n}</b><span>{s.label}</span>
          </button>
        </li>
      {/each}
    </ol>
  </div>

  <div class="vlay">
    <section class="cd wm">
      {#if nerr}<div class="eab" role="alert">Corrigez {nerr} champ{nerr > 1 ? 's' : ''} pour continuer.</div>{/if}
      {#if w.msg && w.step !== 1}<div class="eab" role="alert">{w.msg}</div>{/if}

      <!-- ───── 1. Billets ───── -->
      {#if w.step === 1}
        <h2>Billets</h2>
        <div class="fld">
          <label for="v-ev">Événement</label>
          <select id="v-ev" value={w.eventId} onchange={(x) => chooseEvent(x.currentTarget.value)}>
            {#each list as x (x.id)}
              <option value={x.id} disabled={x.salesStatus !== 'OPEN'}>{x.title}{x.startsAt ? ` · ${formatDate(x.startsAt)}` : ''}{x.salesStatus !== 'OPEN' ? ' (billetterie non ouverte)' : ''}</option>
            {/each}
          </select>
        </div>
        {#if ev}
          <div class="evi">
            {#if ev.salesStatus}<Badge {...salesStatus(ev.salesStatus)} />{/if}
            <span><b>{ev.startsAt ? formatDate(ev.startsAt) : '—'}</b></span>
            <span>{place}</span>
          </div>
        {/if}

        {#if w.msg}<p class="note" role="status">{w.msg}</p>{/if}
        {#if ticketing.error && !ticketing.data}
          <ErrorState error={ticketing.error} onretry={ticketing.reload} />
        {:else if !ticketing.data || ticketing.loading && w.categories.length === 0}
          <div class="sk" style="height:140px;border-radius:12px"></div>
        {:else if w.categories.length === 0}
          <p>Aucune catégorie de billets pour cet événement.</p>
        {:else}
          {#each w.categories as c, i (c.id)}
            {@const room = w.room(c)}
            {@const n = w.qty[c.id] ?? 0}
            <div class="vr" class:f={i === 0}>
              <div>
                <b>{c.name}</b> · {formatXof(c.priceXof)}
                <small>{c.availability !== 'AVAILABLE' ? availability(c.availability).label : room <= 5 ? `Plus que ${room} place${room > 1 ? 's' : ''}` : 'Disponible'}</small>
                {#if c.conditions}<small>{c.conditions}</small>{/if}
                {#if n > 0 && n >= room}<p class="nq">Quota atteint pour cette catégorie.</p>{/if}
              </div>
              {#if room === 0}
                <Badge tone={c.availability === 'AVAILABLE' || c.availability === 'SOLD_OUT' ? 'err' : 'neutral'} label={c.availability === 'AVAILABLE' ? 'Épuisé' : availability(c.availability).label} />
              {:else}
                <div class="qs">
                  <button type="button" aria-label="Retirer un billet {c.name}" onclick={() => w.dec(c)} disabled={n === 0}>−</button>
                  <output aria-live="polite">{n}</output>
                  <button type="button" aria-label="Ajouter un billet {c.name}" onclick={() => w.inc(c)} disabled={n >= room || w.count >= MAX_TICKETS}>+</button>
                </div>
              {/if}
            </div>
          {/each}
          {#if e('q')}<p class="er" role="alert">{e('q')}</p>{/if}
          <p class="hn">Maximum {MAX_TICKETS} billets par vente.</p>
        {/if}

      <!-- ───── 2. Participants ───── -->
      {:else if w.step === 2}
        <h2>Participants</h2>
        <p>Un billet par participant.</p>
        {#each w.tickets as cid, k (k)}
          <div class="vpr">
            <h3>Billet {k + 1} · {w.cat(cid)?.name}</h3>
            <div class="g3c">
              <Field label="Prénom" id="v-p{k}0" required error={e(`p${k}0`)}><input id="v-p{k}0" type="text" maxlength="80" autocomplete="off" bind:value={w.people[k].first} /></Field>
              <Field label="Nom" id="v-p{k}1" required error={e(`p${k}1`)}><input id="v-p{k}1" type="text" maxlength="80" autocomplete="off" bind:value={w.people[k].last} /></Field>
              <Field label="Téléphone" id="v-p{k}2" error={e(`p${k}2`)}><input id="v-p{k}2" type="tel" placeholder="Facultatif" bind:value={w.people[k].phone} /></Field>
            </div>
          </div>
        {/each}
        <Field label="E-mail pour l’envoi des billets" id="v-mail" error={e('mail')}><input id="v-mail" type="email" placeholder="Facultatif" bind:value={w.mail} /></Field>

      <!-- ───── 3. Paiement ───── -->
      {:else if w.step === 3}
        <h2>Paiement</h2>
        <div class="due"><span>Montant à encaisser</span><b>{formatXof(w.total)}</b></div>
        {#if e('mode')}<p class="er" role="alert">{e('mode')}</p>{/if}
        <div class="modes">
          {#each modes as m (m.v)}
            <button type="button" class="mdc" aria-pressed={w.mode === m.v} onclick={() => { w.mode = m.v; delete w.errors.mode; }}>
              <span class="ci {m.color}"><Icon name={m.icon} size={20} /></span>
              <span><b>{m.label}</b><small>{m.hint}</small></span>
            </button>
          {/each}
        </div>
        {#if w.mode === 'MOBILE_MONEY_DIRECT'}
          <Field label="Référence de la transaction Mobile Money" id="v-ref" required error={e('ref')}>
            <input id="v-ref" type="text" maxlength="100" placeholder="Ex. MP2610.1845.A12345" bind:value={w.ref} />
          </Field>
        {/if}
        <label class="cfm" class:bad={!!e('ok')}>
          <input type="checkbox" bind:checked={w.confirmed} />
          <span>Je confirme avoir bien reçu {formatXof(w.total)} {w.mode === 'MOBILE_MONEY_DIRECT' ? 'sur Mobile Money' : w.mode === 'CASH' ? 'en espèces' : 'du client'}.</span>
        </label>
        <p class="hn">Les billets ne sont émis qu’après cette confirmation.</p>

      <!-- ───── 4. Confirmation ───── -->
      {:else if w.done}
        <div class="okc">
          <span class="big"><Icon name="check-circle" size={56} /></span>
          <h2>Vente enregistrée</h2>
          <p>Commande {w.done.reference} · {formatXof(w.done.amountXof)} · {paymentMethod(w.done.paymentMethod).label}. Les billets sont émis.</p>
        </div>
        <h3 class="h3">Billets émis</h3>
        <ul class="tks">
          {#each w.done.tickets as t (t.ticketId)}
            <li><span class="ci amber"><Icon name="ticket-k" size={20} /></span><div class="tn"><b>{t.fullName}</b><small>{t.category} · {t.ticketNumber}</small></div><TicketActions ticketId={t.ticketId} canResend={session.can('ticket.resend', w.eventId)} email={t.email ?? w.mail.trim()} /></li>
          {/each}
        </ul>
        <p class="hn">Les fichiers du billet sont préparés quelques secondes après la vente : « Préparation… » s’affiche puis le lien s’ouvre dès qu’il est prêt.</p>
        {#if w.mail.trim()}<p class="hn">Un e-mail avec les billets a été envoyé à {w.mail.trim()}.</p>{/if}
        <div class="end">
          <Button onclick={() => w.reset()}>Nouvelle vente</Button>
          {#if session.can('order.read', w.eventId)}<Button variant="outline" href="/evenements/{w.eventId}/paiements">Voir les paiements</Button>{/if}
        </div>
      {/if}

      {#if !w.done}
        <div class="wf">
          <div>{#if w.step > 1}<Button variant="outline" onclick={() => w.back()} disabled={w.busy}>Retour</Button>{/if}</div>
          <div>
            {#if w.step < 3}
              <Button onclick={next} disabled={w.step === 1 && w.count === 0}>Continuer</Button>
            {:else}
              <Button onclick={submit} loading={w.busy} disabled={!w.confirmed}>{w.busy ? 'Validation en cours…' : 'Valider la vente'}</Button>
            {/if}
          </div>
        </div>
      {/if}
    </section>

    <aside class="vside">
      <section class="cd">
        <h2>Récapitulatif</h2>
        {#if ev}<p class="evn"><b>{ev.title}</b><br />{ev.startsAt ? formatDate(ev.startsAt) : ''}{place ? `, ${place}` : ''}</p>{/if}
        {#if w.count}
          {#each w.categories.filter((c) => (w.qty[c.id] ?? 0) > 0) as c (c.id)}
            <div class="sl"><span>{w.qty[c.id]} × {c.name}</span><span>{formatXof(w.qty[c.id] * c.priceXof)}</span></div>
          {/each}
          <div class="sl t"><span>Total</span><span>{formatXof(w.total)}</span></div>
        {:else}<p>Aucun billet sélectionné.</p>{/if}
        <p class="hn">Vendu par {session.fullName} ({role(session.roleCodes[0]).label})</p>
      </section>
    </aside>
  </div>
{/if}

<Modal open={dupOpen} title="Un nom apparaît plusieurs fois" onclose={() => (dupOpen = false)}>
  <p>Les participants suivants figurent plusieurs fois dans cette vente : {#each w.dupNames as n, i (n)}<b>{n}</b>{i < w.dupNames.length - 1 ? ', ' : ''}{/each}. Vérifiez qu’il ne s’agit pas d’un doublon.</p>
  {#snippet footer()}
    <Button variant="outline" onclick={() => (dupOpen = false)}>Corriger les noms</Button>
    <Button onclick={emitAnyway}>Émettre quand même</Button>
  {/snippet}
</Modal>

<style>
  .sk { background: linear-gradient(90deg, var(--soft), var(--line), var(--soft)); background-size: 200% 100%; animation: sh 1.2s linear infinite; }
  @keyframes sh { to { background-position: -200% 0; } }
  .vhd { display: flex; justify-content: space-between; align-items: center; gap: 20px 32px; flex-wrap: wrap; margin-bottom: 24px; }
  .vhd small { color: var(--mut); }
  .vst { display: flex; align-items: center; list-style: none; margin: 0; padding: 0; overflow-x: auto; }
  .vst li { display: flex; align-items: center; font-weight: 700; color: var(--mut); }
  .vst li + li::before { content: ''; width: 36px; height: 2px; border-radius: 2px; background: var(--line); margin: 0 10px; }
  .vst li.dn + li::before, .vst li.cur + li::before { background: color-mix(in srgb, var(--ok) 40%, var(--line)); }
  .vst button { display: flex; align-items: center; gap: 10px; border: 0; background: none; font: 700 14px var(--font); color: inherit; padding: 4px; cursor: pointer; white-space: nowrap; }
  .vst button:disabled { cursor: default; }
  .vst b { width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; background: var(--soft); font-size: 13px; }
  .vst li.cur { color: var(--ink); }
  .vst li.cur b { background: var(--violet); color: #fff; }
  .vst li.dn b { background: color-mix(in srgb, var(--ok) 16%, transparent); color: var(--ok); }
  @media (max-width: 700px) { .vst span { display: none; } .vst li.cur span { display: inline; } }
  .vlay { display: grid; gap: 20px; }
  @media (min-width: 1000px) { .vlay { grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); align-items: start; } .vside { position: sticky; top: 88px; } }
  .cd { background: var(--card); border-radius: var(--radius-card); padding: 24px; box-shadow: var(--sh); min-width: 0; }
  h2 { font-size: 18px; margin-bottom: 14px; }
  h3 { font-size: 15px; font-weight: 800; margin: 0 0 12px; }
  .h3 { margin-top: 20px; }
  .fld { margin: 0 0 16px; }
  .evi { display: flex; gap: 8px 16px; flex-wrap: wrap; align-items: center; color: var(--mut); font-size: 14px; margin-bottom: 18px; }
  .evi b { color: var(--ink); }
  .vr { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 16px 0; border-top: 1px solid var(--line); }
  .vr.f { border-top: 0; }
  .vr small { display: block; color: var(--mut); font-size: 13px; }
  .nq { color: var(--wait); font-size: 13px; font-weight: 700; margin: 4px 0 0; }
  .qs { display: inline-flex; align-items: center; gap: 4px; }
  .qs button { width: 44px; height: 44px; border-radius: 50%; border: 1.5px solid var(--line); background: none; color: var(--ink); font: 700 20px var(--font); cursor: pointer; }
  .qs button:disabled { color: var(--line); cursor: default; }
  .qs output { min-width: 40px; text-align: center; font-weight: 800; font-size: 18px; }
  .note { background: var(--soft); border-radius: 10px; padding: 14px; color: var(--ink); margin: 0 0 14px; }
  .er { color: var(--err); font-size: 13px; font-weight: 700; margin: 10px 0 0; }
  .hn { color: var(--mut); font-size: 13px; margin: 14px 0 0; }
  .eab { border: 1.5px solid var(--err); color: var(--err); border-radius: 10px; padding: 12px 14px; font-weight: 700; margin: 0 0 18px; }
  .vpr { border: 1px solid var(--line); border-radius: 14px; padding: 16px 16px 0; margin-bottom: 14px; }
  .g3c { display: grid; gap: 0 16px; grid-template-columns: 1fr 1fr 1fr; }
  @media (max-width: 700px) { .g3c { grid-template-columns: 1fr; } }
  .due { display: flex; justify-content: space-between; align-items: center; background: var(--soft); border-radius: 12px; padding: 16px 18px; margin-bottom: 16px; }
  .due b { font-size: 24px; }
  .modes { display: grid; gap: 10px; margin-bottom: 18px; }
  .mdc { display: flex; gap: 14px; align-items: center; text-align: left; border: 1.5px solid var(--line); border-radius: 12px; padding: 14px 16px; background: none; color: var(--ink); font: inherit; cursor: pointer; }
  .mdc[aria-pressed='true'] { border-color: var(--ink); box-shadow: 0 0 0 1px var(--ink); }
  .mdc small { display: block; color: var(--mut); font-size: 13px; font-weight: 500; }
  .ci { width: 44px; height: 44px; border-radius: 50%; display: grid; place-items: center; flex: none; background: color-mix(in srgb, currentColor 12%, transparent); }
  .ci :global(svg) { fill: currentColor; stroke: none; }
  .ci.amber { color: var(--c-amber); } .ci.purple { color: var(--c-purple); }
  .cfm { display: flex; gap: 12px; align-items: flex-start; font-weight: 600; margin: 18px 0 0; cursor: pointer; padding: 12px; border-radius: 10px; border: 1.5px solid transparent; }
  .cfm.bad { border-color: var(--err); }
  .cfm input { width: 20px; height: 20px; min-height: 0; margin: 2px 0 0; accent-color: var(--acc); flex: none; }
  .wf { display: flex; justify-content: space-between; gap: 12px; margin-top: 24px; padding-top: 18px; border-top: 1px solid var(--line); }
  .okc { text-align: center; padding: 8px 0 20px; }
  .big { color: var(--ok); display: inline-block; margin-bottom: 8px; }
  .big :global(svg) { fill: currentColor; stroke: none; }
  .tks { list-style: none; margin: 0 0 18px; padding: 0; display: grid; gap: 12px; }
  .tks li { display: flex; gap: 14px; align-items: center; flex-wrap: wrap; }
  .tn { flex: 1 1 160px; min-width: 0; }
  .tks small { display: block; color: var(--mut); font-size: 13px; }
  .end { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 22px; }
  .evn { margin: 0 0 10px; }
  .sl { display: flex; justify-content: space-between; gap: 12px; padding: 8px 0; border-top: 1px solid var(--line); }
  .sl.t { font-weight: 800; color: var(--ink); }
</style>
