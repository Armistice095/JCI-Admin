<script lang="ts">
  import AuthCard from '$lib/components/AuthCard.svelte';
  import Field from '$lib/components/Field.svelte';
  import Button from '$lib/components/Button.svelte';
  import { sendPasswordReset } from '$lib/auth/auth.svelte';

  let email = $state('');
  let sent = $state(false);
  let error = $state('');
  let loading = $state(false);

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    if (loading) return;
    error = '';
    loading = true;
    try {
      await sendPasswordReset(email);
      sent = true; // même message que le compte existe ou non
    } catch (err) {
      error = err instanceof Error ? err.message : 'Envoi impossible. Réessayez.';
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head><title>Mot de passe oublié · JCI Comé Excellence</title></svelte:head>

<AuthCard title="Mot de passe oublié" subtitle="Saisissez votre adresse e-mail. Nous vous enverrons un lien pour choisir un nouveau mot de passe.">
  {#if error}<div class="al" role="alert">{error}</div>{/if}
  <form onsubmit={submit}>
    <Field label="Adresse e-mail" id="oe"><input id="oe" type="email" required autocomplete="username" bind:value={email} /></Field>
    <Button block type="submit" {loading}>Envoyer le lien</Button>
  </form>
  {#if sent}
    <div class="note" role="status">Si un compte existe pour cette adresse, un e-mail vient de partir. Le lien est valable 1 heure.</div>
  {/if}
  <p class="back"><a href="/connexion">Retour à la connexion</a></p>
</AuthCard>

<style>
  .al { border: 1.5px solid var(--err); color: var(--err); border-radius: 10px; padding: 12px 14px; font-weight: 700; margin: 0 0 18px; }
  .note { background: var(--soft); border-radius: 10px; padding: 14px; color: var(--ink); margin-top: 16px; }
  .back { margin: 20px 0 0; text-align: center; }
  .back a { color: var(--acc); font-weight: 700; text-decoration: none; }
</style>
