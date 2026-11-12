<script lang="ts">
  import Modal from './Modal.svelte';
  import Button from './Button.svelte';
  import Field from './Field.svelte';
  import { api, unwrap, type Schemas } from '$lib/api/client';
  import { ApiError } from '$lib/api/errors';

  interface Props {
    open: boolean;
    eventId: string;
    category?: Schemas['Category'] | null; // absent = création
    onclose: () => void;
    onsaved: (message: string) => void;
  }
  let { open, eventId, category = null, onclose, onsaved }: Props = $props();

  let name = $state('');
  let price = $state<number | null>(null);
  let quota = $state<number | null>(null);
  let conditions = $state('');
  let isActive = $state(true);
  let errors = $state<Record<string, string>>({});
  let formError = $state('');
  let busy = $state(false);
  let confirmDelete = $state(false);

  // Réinitialise le formulaire à chaque ouverture.
  $effect(() => {
    if (!open) return;
    name = category?.name ?? '';
    price = category?.priceXof ?? null;
    quota = category?.quota ?? null;
    conditions = category?.conditions ?? '';
    isActive = category?.isActive ?? true;
    errors = {};
    formError = '';
    confirmDelete = false;
  });

  function validate() {
    const e: Record<string, string> = {};
    const n = name.trim();
    if (!n) e.name = 'Indiquez le nom.';
    else if (n.length > 60) e.name = '60 caractères maximum.';
    if (price === null || !Number.isInteger(price) || price < 1) e.priceXof = 'Prix minimum : 1 XOF (pas de billets gratuits).';
    else if (price > 10_000_000) e.priceXof = 'Prix trop élevé.';
    if (quota === null || !Number.isInteger(quota) || quota < 1) e.quota = 'Quota minimum : 1.';
    else if (quota > 100_000) e.quota = '100 000 maximum.';
    else if (category && quota < category.sold + category.reserved) e.quota = `Le quota ne peut pas être inférieur à ${category.sold + category.reserved} (vendus + réservés).`;
    if (conditions.length > 300) e.conditions = '300 caractères maximum.';
    return e;
  }

  function fail(e: unknown) {
    if (e instanceof ApiError && e.isValidation) {
      errors = e.fields;
      formError = 'Corrigez les champs signalés.';
    } else {
      formError = e instanceof Error ? e.message : 'Action impossible.';
    }
  }

  async function save() {
    errors = validate();
    formError = '';
    if (Object.keys(errors).length) return;
    busy = true;
    try {
      if (!category) {
        await unwrap(api.POST('/events/{eventId}/categories', {
          params: { path: { eventId } },
          body: { name: name.trim(), priceXof: price!, quota: quota!, ...(conditions.trim() ? { conditions: conditions.trim() } : {}) }
        }));
        onsaved('Catégorie ajoutée.');
      } else {
        // Seuls les champs modifiés sont envoyés (absent = inchangé).
        const body: Schemas['CategoryUpdate'] = {};
        if (name.trim() !== category.name) body.name = name.trim();
        if (price !== category.priceXof) body.priceXof = price!;
        if (quota !== category.quota) body.quota = quota!;
        if ((conditions.trim() || null) !== category.conditions) body.conditions = conditions.trim() || null;
        if (isActive !== category.isActive) body.isActive = isActive;
        if (Object.keys(body).length === 0) return onclose();
        await unwrap(api.PATCH('/events/{eventId}/categories/{categoryId}', { params: { path: { eventId, categoryId: category.id } }, body }));
        onsaved('Catégorie modifiée.');
      }
    } catch (e) {
      fail(e);
    } finally {
      busy = false;
    }
  }

  async function remove() {
    if (!category) return;
    busy = true;
    formError = '';
    try {
      await unwrap(api.DELETE('/events/{eventId}/categories/{categoryId}', { params: { path: { eventId, categoryId: category.id } } }));
      onsaved('Catégorie supprimée.');
    } catch (e) {
      confirmDelete = false;
      fail(e);
      if (e instanceof ApiError && e.status === 409) formError += ' Vous pouvez la désactiver à la place.';
    } finally {
      busy = false;
    }
  }
</script>

<Modal {open} title={category ? 'Modifier la catégorie' : 'Ajouter une catégorie'} onclose={() => !busy && onclose()}>
  {#if formError}<div class="al" role="alert">{formError}</div>{/if}
  <form id="cat-form" onsubmit={(e) => { e.preventDefault(); void save(); }} novalidate>
    <Field label="Nom" id="m-name" required error={errors.name}><input id="m-name" type="text" bind:value={name} maxlength="60" /></Field>
    <div class="g2">
      <Field label="Prix (XOF)" id="m-price" required error={errors.priceXof}
        hint={category ? 'Le nouveau prix ne s’applique qu’aux nouvelles commandes.' : undefined}><input id="m-price" type="number" min="1" inputmode="numeric" bind:value={price} /></Field>
      <Field label="Quota" id="m-quota" required error={errors.quota}><input id="m-quota" type="number" min="1" inputmode="numeric" bind:value={quota} /></Field>
    </div>
    <Field label="Conditions ou description" id="m-cond" optional error={errors.conditions}><input id="m-cond" type="text" placeholder="Ex. Justificatif demandé" bind:value={conditions} maxlength="300" /></Field>
    {#if category}
      <label class="chk" for="m-active"><input id="m-active" type="checkbox" bind:checked={isActive} />Catégorie active (proposée à la vente)</label>
    {/if}
  </form>
  {#snippet footer()}
    {#if category}
      {#if confirmDelete}
        <Button variant="outline" onclick={() => (confirmDelete = false)} disabled={busy}>Garder</Button>
        <Button onclick={remove} loading={busy}>Confirmer la suppression</Button>
      {:else}
        <button type="button" class="del" onclick={() => (confirmDelete = true)} disabled={busy}>Supprimer</button>
      {/if}
    {/if}
    {#if !confirmDelete}
      <Button variant="outline" onclick={onclose} disabled={busy}>Annuler</Button>
      <Button type="submit" form="cat-form" loading={busy}>{category ? 'Enregistrer' : 'Ajouter'}</Button>
    {/if}
  {/snippet}
</Modal>

<style>
  .al { border: 1.5px solid var(--err); color: var(--err); border-radius: 10px; padding: 12px 14px; font-weight: 700; margin: 0 0 16px; }
  .g2 { display: grid; gap: 0 16px; grid-template-columns: 1fr 1fr; }
  @media (max-width: 520px) { .g2 { grid-template-columns: 1fr; } }
  .chk { display: flex; align-items: center; gap: 10px; font-weight: 600; cursor: pointer; margin: 0; }
  .chk input { width: 18px; height: 18px; min-height: 0; accent-color: var(--acc); }
  .del { margin-right: auto; border: 0; background: none; color: var(--err); font: 700 15px var(--font); cursor: pointer; padding: 0 8px; min-height: 44px; }
</style>
