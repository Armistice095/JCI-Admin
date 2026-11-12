<script lang="ts">
  import { goto, beforeNavigate } from '$app/navigation';
  import { onMount, tick, untrack } from 'svelte';
  import Badge from './Badge.svelte';
  import Button from './Button.svelte';
  import Card from './Card.svelte';
  import Field from './Field.svelte';
  import Icon from './Icon.svelte';
  import PosterManager, { type PosterItem } from './PosterManager.svelte';
  import SectionNav from './SectionNav.svelte';
  import { api, unwrap, type Schemas } from '$lib/api/client';
  import { ApiError } from '$lib/api/errors';
  import { EventFormState } from '$lib/features/eventForm.svelte';
  import { deletePoster, setCover, uploadPoster } from '$lib/features/posters';
  import { FIELD_LABELS } from '$lib/features/eventContext';
  import { session } from '$lib/stores/session.svelte';
  import { toasts } from '$lib/stores/toast.svelte';
  import { EVENT_CATEGORIES, eventStatus } from '$lib/utils/labels';
  import { formatXof, formatNumber } from '$lib/utils/format';

  interface Props {
    mode: 'create' | 'edit';
    event?: Schemas['EventDetail'];
    ticketing?: Schemas['TicketingState'];
  }
  let { mode, event, ticketing }: Props = $props();

  // Valeurs initiales : lues une seule fois (la page recrée le formulaire via {#key} si l'événement change).
  const form = untrack(() => (mode === 'edit' && event ? EventFormState.from(event, ticketing) : new EventFormState()));
  let baseline = $state(form.snapshot());
  let eventId = $state<string | null>(untrack(() => event?.id ?? null));
  let status = $state<Schemas['EventStatus']>(untrack(() => event?.status ?? 'DRAFT'));

  const canPublish = $derived(session.can('event.publish', eventId ?? undefined));
  const canTicketing = $derived(session.can('ticketing.manage', eventId ?? undefined));
  // Les catégories se saisissent ici uniquement à la création (ensuite : onglet Billetterie).
  const withCategories = $derived(mode === 'create' && eventId === null && canTicketing);

  // ───── Affiches ─────
  let remote = $state<Schemas['Poster'][]>(untrack(() => (event?.posters ? [...event.posters] : [])));
  let pending = $state<{ key: number; file: File; url: string }[]>([]);
  let coverKey = $state<string | null>(null);
  let posterBusy = $state(false);
  let pk = 0;

  const posterItems = $derived.by<PosterItem[]>(() => {
    const hasRemoteCover = remote.some((p) => p.isCover);
    const r = remote.map((p) => ({ key: `r:${p.id}`, url: p.url, isCover: p.isCover && coverKey === null, label: 'Affiche' }));
    const l = pending.map((p, i) => ({
      key: `l:${p.key}`,
      url: p.url,
      isCover: coverKey === `l:${p.key}` || (coverKey === null && !hasRemoteCover && i === 0 && remote.length === 0),
      label: p.file.name
    }));
    const all = [...r, ...l];
    if (coverKey?.startsWith('r:')) return all.map((x) => ({ ...x, isCover: x.key === coverKey }));
    return all.map((x) => (coverKey?.startsWith('l:') ? { ...x, isCover: x.key === coverKey } : x));
  });

  async function addPosters(files: File[]) {
    if (eventId && mode === 'edit') {
      posterBusy = true;
      try {
        for (const f of files) remote.push(await uploadPoster(eventId, f));
      } catch (e) {
        toasts.error(e instanceof Error ? e.message : 'Envoi de l’affiche impossible.');
      } finally {
        posterBusy = false;
      }
    } else {
      for (const f of files) pending.push({ key: ++pk, file: f, url: URL.createObjectURL(f) });
    }
  }
  async function removePoster(key: string) {
    if (key.startsWith('l:')) {
      const k = Number(key.slice(2));
      const p = pending.find((x) => x.key === k);
      if (p) URL.revokeObjectURL(p.url);
      pending = pending.filter((x) => x.key !== k);
      if (coverKey === key) coverKey = null;
      return;
    }
    if (!eventId) return;
    posterBusy = true;
    try {
      await deletePoster(eventId, key.slice(2));
      remote = remote.filter((p) => `r:${p.id}` !== key);
    } catch (e) {
      toasts.error(e instanceof Error ? e.message : 'Suppression impossible.');
    } finally {
      posterBusy = false;
    }
  }
  async function makeCover(key: string) {
    if (key.startsWith('l:')) { coverKey = key; return; }
    if (!eventId) return;
    posterBusy = true;
    try {
      await setCover(eventId, key.slice(2));
      remote = remote.map((p) => ({ ...p, isCover: `r:${p.id}` === key }));
      coverKey = null;
    } catch (e) {
      toasts.error(e instanceof Error ? e.message : 'Action impossible.');
    } finally {
      posterBusy = false;
    }
  }
  onMount(() => () => pending.forEach((p) => URL.revokeObjectURL(p.url)));

  /** Envoie les affiches locales (couverture choisie en premier). Renvoie les messages d'échec. */
  async function flushPosters(id: string): Promise<string[]> {
    const failures: string[] = [];
    const order = [...pending].sort((a, b) => Number(`l:${b.key}` === coverKey) - Number(`l:${a.key}` === coverKey));
    for (const p of order) {
      try {
        remote.push(await uploadPoster(id, p.file, `l:${p.key}` === coverKey));
        URL.revokeObjectURL(p.url);
        pending = pending.filter((x) => x.key !== p.key);
      } catch (e) {
        failures.push(`« ${p.file.name} » : ${e instanceof Error ? e.message : 'envoi impossible'}`);
      }
    }
    if (pending.length === 0) coverKey = null;
    return failures;
  }

  // ───── Sauvegarde ─────
  let saving = $state<'draft' | 'publish' | null>(null);
  let formError = $state('');
  let posterFailures = $state<string[]>([]);
  let allowLeave = false;
  const dirty = $derived(form.snapshot() !== baseline || pending.length > 0);

  $effect(() => { form.date; form.syncDefaultClose(); });

  beforeNavigate(({ cancel, type }) => {
    if (allowLeave || !dirty) return;
    if (type === 'leave') cancel();
    else if (!confirm('Des modifications ne sont pas enregistrées. Quitter cette page ?')) cancel();
  });

  async function scrollToError() {
    await tick();
    const el = document.querySelector<HTMLElement>('.fld.bad');
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el?.querySelector<HTMLElement>('input,textarea,select')?.focus({ preventScroll: true });
  }

  async function save(publish: boolean) {
    if (saving) return;
    formError = '';
    posterFailures = [];
    const opts = { withCategories, withTicketing: canTicketing };
    form.errors = form.validate(publish, opts);
    if (Object.keys(form.errors).length) {
      formError = 'Corrigez les champs signalés avant de continuer.';
      return void scrollToError();
    }
    saving = publish ? 'publish' : 'draft';
    let maps = { programme: [] as number[], organizers: [] as number[], categories: [] as number[] };
    try {
      const patch = eventId !== null;
      const built = form.build({ ...opts, patch });
      maps = built.maps;
      if (!eventId) {
        const created = await unwrap(api.POST('/events', { body: { ...built.body, publish: false } }));
        eventId = created.id;
        status = created.status;
        baseline = form.snapshot(); // l'événement existe : un nouvel essai ne le recréera pas
      } else {
        await unwrap(api.PATCH('/events/{eventId}', { params: { path: { eventId } }, body: built.body }));
        baseline = form.snapshot();
      }

      const failures = await flushPosters(eventId);
      if (failures.length) posterFailures = failures;

      if (publish && status === 'DRAFT') {
        const published = await unwrap(api.POST('/events/{eventId}/publish', { params: { path: { eventId } } }));
        status = published.status;
      }

      if (failures.length) {
        toasts.error('Événement enregistré, mais certaines affiches n’ont pas pu être envoyées.');
        return;
      }
      toasts.ok(publish ? 'Événement publié.' : mode === 'create' ? 'Brouillon enregistré.' : 'Modifications enregistrées.');
      allowLeave = true;
      await goto(mode === 'create' ? `/evenements/${eventId}` : `/evenements/${eventId}/informations`);
    } catch (e) {
      if (e instanceof ApiError && e.isValidation) {
        const orphans = form.applyServerErrors(e.fields, maps);
        formError = orphans.length ? orphans.join(' ') : 'Corrigez les champs signalés avant de continuer.';
        if (eventId && publish) formError = `Brouillon enregistré, mais la publication est impossible. ${formError}`;
        void scrollToError();
      } else {
        formError = e instanceof Error ? e.message : 'Enregistrement impossible.';
        if (eventId) formError += ' L’événement est déjà enregistré en brouillon : vous pouvez réessayer.';
      }
    } finally {
      saving = null;
    }
  }

  async function cancel() {
    if (dirty && !confirm('Abandonner les modifications non enregistrées ?')) return;
    allowLeave = true;
    await goto(eventId ? `/evenements/${eventId}` : '/evenements');
  }

  // ───── Navigation latérale ─────
  const ids = ['sec-infos', 'sec-affiche', 'sec-orga', 'sec-billets'];
  let active = $state('sec-infos');
  onMount(() => {
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (vis) active = vis.target.id;
      },
      { rootMargin: '-20% 0px -60% 0px' }
    );
    ids.forEach((id) => { const el = document.getElementById(id); if (el) io.observe(el); });
    return () => io.disconnect();
  });
  const sections = $derived([
    { id: 'sec-infos', label: 'Informations', done: !!form.title.trim() && !!form.description.trim() && !!form.date && !!form.venueName.trim() && !!form.city.trim() },
    { id: 'sec-affiche', label: 'Affiche', done: posterItems.length > 0 },
    { id: 'sec-orga', label: 'Organisateurs', done: form.organizers.some((o) => o.name.trim()) },
    ...(canTicketing ? [{ id: 'sec-billets', label: 'Billetterie', done: !!form.opensAt && !!form.closesAt && (mode === 'edit' || form.categories.length > 0) }] : [])
  ]);

  const err = (k: string) => form.errors[k];
  const st = $derived(eventStatus(status));
</script>

<a class="bk" href={eventId ? `/evenements/${eventId}` : '/evenements'}><Icon name="chevron-left" size={18} />{mode === 'edit' ? 'Retour à l’événement' : 'Événements'}</a>

<div class="head">
  <div>
    <h1>{mode === 'create' ? 'Nouvel événement' : 'Modifier l’événement'}</h1>
    <p class="sub">
      <Badge {...st} />
      {#if status === 'DRAFT'}<span>Pas encore publié : visible uniquement par le bureau.</span>{/if}
    </p>
  </div>
  <div class="act">
    <Button variant="outline" type="button" onclick={cancel} disabled={saving !== null}>Annuler</Button>
    <Button variant="outline" type="button" onclick={() => save(false)} loading={saving === 'draft'} disabled={saving === 'publish'}>
      {status === 'DRAFT' ? 'Enregistrer le brouillon' : 'Enregistrer les modifications'}
    </Button>
    {#if status === 'DRAFT' && canPublish}
      <Button type="button" onclick={() => save(true)} loading={saving === 'publish'} disabled={saving === 'draft'}>Publier</Button>
    {/if}
  </div>
</div>

{#if formError}<div class="al" role="alert">{formError}</div>{/if}
{#if posterFailures.length}
  <div class="al" role="alert">
    <b>Certaines affiches n’ont pas été envoyées :</b>
    <ul>{#each posterFailures as f (f)}<li>{f}</li>{/each}</ul>
    {#if eventId}<a href="/evenements/{eventId}">Voir l’événement</a>{/if}
  </div>
{/if}

<div class="wg">
  <SectionNav {sections} {active} />

  <form class="stack" onsubmit={(e) => { e.preventDefault(); void save(false); }} novalidate>
    <!-- ───── Informations ───── -->
    <section id="sec-infos">
      <Card title="Informations">
        <Field label="Titre de l’événement" id="title" required error={err('title')}>
          <input id="title" type="text" placeholder="Ex. Leadership & Impact" bind:value={form.title} maxlength="150" aria-invalid={!!err('title')} aria-describedby={err('title') ? 'title-err' : undefined} />
        </Field>
        <Field label="Catégorie" id="category">
          <select id="category" bind:value={form.category}>
            {#each EVENT_CATEGORIES as c (c.value)}<option value={c.value}>{c.label}</option>{/each}
          </select>
        </Field>
        <Field label="Description" id="description" required error={err('description')} hint="{form.description.length} / 5 000 caractères">
          <textarea id="description" bind:value={form.description} aria-invalid={!!err('description')}></textarea>
        </Field>

        <h3 class="sub3">Date et lieu</h3>
        <div class="g3">
          <Field label="Date" id="date" required error={err('date')}><input id="date" type="date" bind:value={form.date} /></Field>
          <Field label="Début" id="startTime" required error={err('startTime')}><input id="startTime" type="time" bind:value={form.startTime} /></Field>
          <Field label="Fin" id="endTime" required error={err('endTime')}><input id="endTime" type="time" bind:value={form.endTime} /></Field>
        </div>
        <div class="g2">
          <Field label="Nom du lieu" id="venueName" required error={err('venueName')}><input id="venueName" type="text" placeholder="Ex. Centre des Congrès" bind:value={form.venueName} maxlength="150" /></Field>
          <Field label="Ville" id="city" required error={err('city')}><input id="city" type="text" placeholder="Ex. Comé" bind:value={form.city} maxlength="100" /></Field>
        </div>

        <h3 class="sub3">Programme <small>(facultatif)</small></h3>
        {#if err('programme')}<p class="er">{err('programme')}</p>{/if}
        {#each form.programme as r, i (r.key)}
          <div class="row prog">
            <div class="fld" class:bad={!!err(`programme.${r.key}.time`)}>
              <label class="vh" for="pt{r.key}">Heure de la ligne {i + 1}</label>
              <input id="pt{r.key}" type="time" bind:value={r.time} />
              {#if err(`programme.${r.key}.time`)}<p class="er">{err(`programme.${r.key}.time`)}</p>{/if}
            </div>
            <div class="fld grow" class:bad={!!err(`programme.${r.key}.label`)}>
              <label class="vh" for="pl{r.key}">Libellé de la ligne {i + 1}</label>
              <input id="pl{r.key}" type="text" placeholder="Ex. Accueil et installation" bind:value={r.label} maxlength="200" />
              {#if err(`programme.${r.key}.label`)}<p class="er">{err(`programme.${r.key}.label`)}</p>{/if}
            </div>
            <button type="button" class="ib" aria-label="Retirer la ligne {i + 1}" onclick={() => form.removeProgramme(r.key)}><Icon name="close" /></button>
          </div>
        {/each}
        <Button variant="outline" size="sm" type="button" onclick={() => form.addProgramme()} disabled={form.programme.length >= 30}><Icon name="plus" size={16} />Ajouter une ligne</Button>
      </Card>
    </section>

    <!-- ───── Affiche ───── -->
    <section id="sec-affiche">
      <Card title="Affiches">
        <PosterManager items={posterItems} busy={posterBusy || saving !== null} onadd={addPosters} onremove={removePoster} oncover={makeCover} />
        {#if mode === 'create' && !eventId}<p class="hn">Les affiches sont envoyées à l’enregistrement de l’événement.</p>{/if}
      </Card>
    </section>

    <!-- ───── Organisateurs ───── -->
    <section id="sec-orga">
      <Card title="Organisateurs">
        {#each form.organizers as o, i (o.key)}
          <div class="row">
            <div class="fld grow" class:bad={!!err(`organizers.${o.key}.name`)}>
              <label class="vh" for="on{o.key}">Nom de l’organisateur {i + 1}</label>
              <input id="on{o.key}" type="text" placeholder="Nom" bind:value={o.name} maxlength="120" />
              {#if err(`organizers.${o.key}.name`)}<p class="er">{err(`organizers.${o.key}.name`)}</p>{/if}
            </div>
            <div class="fld grow2" class:bad={!!err(`organizers.${o.key}.description`)}>
              <label class="vh" for="od{o.key}">Description de l’organisateur {i + 1}</label>
              <input id="od{o.key}" type="text" placeholder="Description" bind:value={o.description} maxlength="200" />
              {#if err(`organizers.${o.key}.description`)}<p class="er">{err(`organizers.${o.key}.description`)}</p>{/if}
            </div>
            <button type="button" class="ib" aria-label="Retirer l’organisateur {i + 1}" onclick={() => form.removeOrganizer(o.key)}><Icon name="close" /></button>
          </div>
        {/each}
        <Button variant="outline" size="sm" type="button" onclick={() => form.addOrganizer()} disabled={form.organizers.length >= 10}><Icon name="plus" size={16} />Ajouter un organisateur</Button>
      </Card>
    </section>

    <!-- ───── Billetterie ───── -->
    {#if canTicketing}
      <section id="sec-billets">
        <Card title="Billetterie">
          <div class="g3">
            <Field label="Ouverture" id="opensAt" required error={err('ticketing.salesOpensAt')}><input id="opensAt" type="datetime-local" bind:value={form.opensAt} /></Field>
            <Field label="Clôture" id="closesAt" required error={err('ticketing.salesClosesAt')} hint={form.closesTouched ? undefined : 'Par défaut : la veille de l’événement à 18h00.'}>
              <input id="closesAt" type="datetime-local" bind:value={form.closesAt} oninput={() => (form.closesTouched = true)} />
            </Field>
            <Field label="Maximum par commande" id="maxPerOrder" error={err('ticketing.maxPerOrder')} hint="Entre 1 et 10 billets qu’un acheteur peut prendre d’un coup.">
              <input id="maxPerOrder" type="number" min="1" max="10" bind:value={form.maxPerOrder} />
            </Field>
          </div>

          <h3 class="sub3">Catégories de billets</h3>
          {#if mode === 'edit' || eventId}
            <p>Les catégories se gèrent dans l’onglet <a href="/evenements/{eventId}/billetterie">Billetterie</a> de l’événement.</p>
          {:else}
            {#if err('categories')}<p class="er">{err('categories')}</p>{/if}
            {#each form.categories as c, i (c.key)}
              <div class="cat">
                <div class="g3c">
                  <Field label="Nom" id="cn{c.key}" required error={err(`categories.${c.key}.name`)}><input id="cn{c.key}" type="text" bind:value={c.name} maxlength="60" /></Field>
                  <Field label="Prix (XOF)" id="cp{c.key}" required error={err(`categories.${c.key}.priceXof`)}><input id="cp{c.key}" type="number" min="1" inputmode="numeric" bind:value={c.price} /></Field>
                  <Field label="Quota" id="cq{c.key}" required error={err(`categories.${c.key}.quota`)}><input id="cq{c.key}" type="number" min="1" inputmode="numeric" bind:value={c.quota} /></Field>
                </div>
                <Field label="Conditions ou description" id="cc{c.key}" optional error={err(`categories.${c.key}.conditions`)}><input id="cc{c.key}" type="text" placeholder="Ex. Justificatif demandé" bind:value={c.conditions} maxlength="300" /></Field>
                <button type="button" class="ib rm" aria-label="Retirer la catégorie {i + 1}" onclick={() => form.removeCategory(c.key)}><Icon name="close" /></button>
              </div>
            {/each}
            <Button variant="outline" size="sm" type="button" onclick={() => form.addCategory()} disabled={form.categories.length >= 10}><Icon name="plus" size={16} />Ajouter une catégorie</Button>
            <div class="tot">Capacité totale : <b>{formatNumber(form.capacity)} billets</b><span>Recettes si tout est vendu : <b>{formatXof(form.potentialRevenue)}</b></span></div>
            <p class="hn">Les prix sont en XOF. Les billets gratuits ne sont pas proposés dans cette version.</p>
          {/if}
        </Card>
      </section>
    {/if}
    <button type="submit" class="vh" tabindex="-1">Enregistrer</button>
  </form>
</div>

<style>
  .bk { display: inline-flex; align-items: center; gap: 6px; color: var(--mut); font-weight: 700; text-decoration: none; min-height: 44px; margin-bottom: 8px; }
  .head { display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; align-items: flex-end; padding-bottom: 20px; margin-bottom: 20px; border-bottom: 1px solid var(--line); }
  .sub { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin: 10px 0 0; font-size: 13px; }
  .act { display: flex; gap: 10px; flex-wrap: wrap; }
  .al { border: 1.5px solid var(--err); color: var(--err); border-radius: 10px; padding: 12px 14px; font-weight: 700; margin: 0 0 18px; }
  .al ul { margin: 6px 0; padding-left: 18px; font-weight: 600; }
  .al a { color: var(--err); }
  .wg { display: grid; gap: 24px; grid-template-columns: 220px minmax(0, 1fr); }
  @media (max-width: 900px) { .wg { grid-template-columns: 1fr; } }
  .stack { display: grid; gap: 20px; }
  section { scroll-margin-top: 88px; }
  .sub3 { font-size: 16px; font-weight: 800; margin: 24px 0 12px; }
  .sub3 small { font-weight: 500; color: var(--mut); font-size: 13px; }
  .g3 { display: grid; gap: 0 16px; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); }
  .g3c { display: grid; gap: 0 16px; grid-template-columns: 2fr 1fr 1fr; }
  .g2 { display: grid; gap: 0 16px; grid-template-columns: 1fr 1fr; }
  @media (max-width: 700px) { .g2, .g3c { grid-template-columns: 1fr; } }
  .row { display: flex; gap: 10px; align-items: flex-start; margin-bottom: 4px; }
  .row .fld { margin: 0 0 12px; }
  .prog > .fld:first-child { width: 140px; flex: none; }
  .grow { flex: 1; min-width: 0; }
  .grow2 { flex: 2; min-width: 0; }
  .fld.bad :global(input) { border-color: var(--err); }
  .er { color: var(--err); font-size: 13px; font-weight: 700; margin: 6px 0 0; }
  .hn { color: var(--mut); font-size: 13px; margin: 10px 0 0; }
  .ib { width: 48px; height: 48px; flex: none; border-radius: 10px; border: 1px solid var(--line); background: none; color: var(--ink); display: grid; place-items: center; cursor: pointer; }
  @media (max-width: 700px) { .row { flex-wrap: wrap; } .prog > .fld:first-child { width: 100%; } }
  .cat { position: relative; border: 1px solid var(--line); border-radius: 12px; padding: 16px 64px 4px 16px; margin-bottom: 12px; }
  .cat .rm { position: absolute; top: 16px; right: 12px; }
  .tot { margin-top: 16px; padding: 14px 16px; background: var(--soft); border-radius: 10px; display: flex; gap: 8px 28px; flex-wrap: wrap; }
  .tot b { color: var(--ink); }
  a { color: var(--acc); font-weight: 700; }
</style>
