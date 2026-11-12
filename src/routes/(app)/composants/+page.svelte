<script lang="ts">
  import PageHeader from '$lib/components/PageHeader.svelte';
  import Card from '$lib/components/Card.svelte';
  import KpiCard from '$lib/components/KpiCard.svelte';
  import Badge from '$lib/components/Badge.svelte';
  import Button from '$lib/components/Button.svelte';
  import Field from '$lib/components/Field.svelte';
  import SearchInput from '$lib/components/SearchInput.svelte';
  import Segmented from '$lib/components/Segmented.svelte';
  import Pagination from '$lib/components/Pagination.svelte';
  import ProgressBar from '$lib/components/ProgressBar.svelte';
  import Table from '$lib/components/Table.svelte';
  import Modal from '$lib/components/Modal.svelte';
  import Stepper from '$lib/components/Stepper.svelte';
  import ErrorState from '$lib/components/ErrorState.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import Icon from '$lib/components/Icon.svelte';
  import { ICONS } from '$lib/components/icons';
  import { toasts } from '$lib/stores/toast.svelte';
  import { orderStatus, eventStatus, salesStatus } from '$lib/utils/labels';
  import { formatXof } from '$lib/utils/format';

  // Page de développement : catalogue des composants (accessible en dev uniquement).
  let tab = $state<'all' | 'paid' | 'failed'>('all');
  let page = $state(1);
  let open = $state(false);
  let step = $state('infos');
  const steps = [
    { id: 'infos', label: 'Informations', done: true },
    { id: 'affiche', label: 'Affiche' },
    { id: 'org', label: 'Organisateurs' },
    { id: 'billets', label: 'Billetterie' }
  ];
</script>

<PageHeader title="Composants" subtitle="Catalogue de développement (visible uniquement en mode dev)." />

<div class="stack">
  <div class="k4">
    <KpiCard value={formatXof(779000)} label="Recettes confirmées" icon="wallet-k" color="blue" />
    <KpiCard value="55 %" label="Taux de remplissage" icon="users-k" color="coral" />
    <KpiCard value="180" label="Billets émis" icon="ticket-k" color="amber" />
    <KpiCard value="12" label="Événements" icon="calendar-k" color="purple" loading />
  </div>

  <Card title="Badges" subtitle="Libellés/couleurs du guide §5">
    <div class="row">
      {#each ['PAID', 'PENDING_PAYMENT', 'FAILED', 'REFUNDED', 'REFUND_REQUIRED', 'EXPIRED'] as s (s)}
        <Badge {...orderStatus(s)} />
      {/each}
      <Badge {...eventStatus('PUBLISHED')} /><Badge {...eventStatus('DRAFT')} /><Badge {...salesStatus('NOT_OPEN')} />
      <Badge {...orderStatus('VALEUR_INCONNUE')} />
    </div>
  </Card>

  <Card title="Boutons, champs, filtres">
    {#snippet actions()}<Button variant="outline" size="sm">Action</Button>{/snippet}
    <div class="row">
      <Button>Modifier</Button><Button variant="outline">Page publique</Button><Button loading>Envoi…</Button>
      <Button onclick={() => (open = true)}>Ouvrir la modale</Button>
      <Button variant="outline" onclick={() => toasts.ok('Enregistré')}>Toast</Button>
    </div>
    <div class="row sp">
      <SearchInput placeholder="Rechercher une commande ou un acheteur" />
      <Segmented label="Statut" bind:value={tab} options={[{ value: 'all', label: 'Toutes', count: 104 }, { value: 'paid', label: 'Payée', count: 92 }, { value: 'failed', label: 'Échouée', count: 7 }]} />
    </div>
    <div class="form">
      <Field label="Titre de l’événement" id="t" required error="Ce champ est obligatoire."><input id="t" type="text" placeholder="Ex. Leadership & Impact" /></Field>
      <Field label="Maximum par commande" id="m" hint="Entre 1 et 10 billets."><input id="m" type="number" value="5" /></Field>
    </div>
    <Stepper {steps} current={step} onselect={(id) => (step = id)} />
  </Card>

  <Card title="Tableau et pagination">
    <Table>
      <thead><tr><th>Commande</th><th>Acheteur</th><th class="num">Montant</th><th>Statut</th></tr></thead>
      <tbody>
        <tr><td><b>CMD-2400</b><small>FP-41820</small></td><td>Koffi Ahoussou</td><td class="num">{formatXof(6000)}</td><td><Badge {...orderStatus('PAID')} /></td></tr>
        <tr><td><b>CMD-2399</b><small>FP-41819</small></td><td>Luc Mensah</td><td class="num">{formatXof(10000)}</td><td><Badge {...orderStatus('FAILED')} /></td></tr>
      </tbody>
    </Table>
    <Pagination {page} pageSize={10} total={104} totalPages={11} onpage={(p) => (page = p)} />
    <ProgressBar value={142} max={250} label="Billets émis" />
  </Card>

  <Card title="États">
    <ErrorState error="Connexion impossible. Vérifiez votre réseau et réessayez." onretry={() => {}} />
    <EmptyState title="Aucun événement" text="Créez votre premier événement pour commencer." />
  </Card>

  <Card title="Icônes">
    <div class="row">{#each Object.keys(ICONS) as n (n)}<span class="ic" title={n}><Icon name={n} size={24} /></span>{/each}</div>
  </Card>
</div>

<Modal {open} title="Inviter un membre" onclose={() => (open = false)}>
  <Field label="Adresse e-mail" id="e"><input id="e" type="email" /></Field>
  {#snippet footer()}<Button variant="outline" onclick={() => (open = false)}>Annuler</Button><Button onclick={() => (open = false)}>Inviter</Button>{/snippet}
</Modal>

<style>
  .stack { display: grid; gap: 20px; }
  .k4 { display: grid; gap: 20px; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); }
  .row { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
  .sp { margin: 16px 0; }
  .form { display: grid; gap: 0 16px; grid-template-columns: 2fr 1fr; margin-top: 16px; }
  .ic { display: grid; place-items: center; width: 44px; height: 44px; border: 1px solid var(--line); border-radius: 10px; }
</style>
