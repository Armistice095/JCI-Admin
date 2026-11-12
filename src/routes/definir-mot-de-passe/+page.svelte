<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import AuthCard from '$lib/components/AuthCard.svelte';
  import PasswordInput from '$lib/components/PasswordInput.svelte';
  import Field from '$lib/components/Field.svelte';
  import Button from '$lib/components/Button.svelte';
  import { setPassword, waitForRecoverySession, signOut } from '$lib/auth/auth.svelte';
  import { supabaseConfigured } from '$lib/auth/supabase';

  type State = 'checking' | 'form' | 'invalid';
  let view = $state<State>('checking');
  let pwd = $state('');
  let confirm = $state('');
  let fieldError = $state('');
  let error = $state('');
  let loading = $state(false);

  onMount(async () => {
    view = supabaseConfigured && (await waitForRecoverySession()) ? 'form' : 'invalid';
  });

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    if (loading) return;
    error = fieldError = '';
    if (pwd.length < 8) return void (fieldError = 'Le mot de passe doit contenir au moins 8 caractères.');
    if (pwd !== confirm) return void (fieldError = 'Les deux mots de passe ne correspondent pas.');
    loading = true;
    try {
      await setPassword(pwd);
      await goto('/', { replaceState: true });
    } catch (err) {
      error = err instanceof Error ? err.message : 'Une erreur est survenue.';
      // Mot de passe enregistré mais compte non activé (403) : on ferme la session temporaire.
      if (/administrateur/i.test(error)) await signOut();
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head><title>Définir le mot de passe · JCI Comé Excellence</title></svelte:head>

{#if view === 'checking'}
  <AuthCard title="Mot de passe"><p class="c" role="status">Vérification du lien…</p></AuthCard>
{:else if view === 'invalid'}
  <AuthCard title="Lien invalide">
    <p class="c">Ce lien est invalide ou a expiré. Demandez un nouveau lien depuis la page de connexion.</p>
    <Button block href="/mot-de-passe-oublie">Recevoir un nouveau lien</Button>
  </AuthCard>
{:else}
  <AuthCard title="Nouveau mot de passe" subtitle="Choisissez le mot de passe de votre espace membre.">
    {#if error}<div class="al" role="alert">{error}</div>{/if}
    <form onsubmit={submit}>
      <Field label="Nouveau mot de passe" id="np" hint="Au moins 8 caractères."><PasswordInput id="np" bind:value={pwd} autocomplete="new-password" minlength={8} /></Field>
      <Field label="Confirmer le mot de passe" id="cp" error={fieldError}><PasswordInput id="cp" bind:value={confirm} autocomplete="new-password" /></Field>
      <Button block type="submit" {loading}>Enregistrer le mot de passe</Button>
    </form>
  </AuthCard>
{/if}

<style>
  .c { text-align: center; }
  .al { border: 1.5px solid var(--err); color: var(--err); border-radius: 10px; padding: 12px 14px; font-weight: 700; margin: 0 0 18px; }
</style>
