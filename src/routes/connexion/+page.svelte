<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import AuthCard from '$lib/components/AuthCard.svelte';
  import PasswordInput from '$lib/components/PasswordInput.svelte';
  import Field from '$lib/components/Field.svelte';
  import Button from '$lib/components/Button.svelte';
  import { signIn, safeRedirect, demoMode } from '$lib/auth/auth.svelte';
  import { session } from '$lib/stores/session.svelte';

  let email = $state(demoMode ? 'fatou@jci-come.bj' : '');
  let password = $state(demoMode ? 'motdepasse' : '');
  let remember = $state(false);
  let error = $state('');
  let loading = $state(false);

  const redirect = $derived(safeRedirect(page.url.searchParams.get('redirect')));

  // Déjà connecté : pas de page de connexion.
  $effect(() => {
    if (session.isAuthenticated) void goto(redirect, { replaceState: true });
  });

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    if (loading) return;
    error = '';
    loading = true;
    try {
      await signIn(email, password, remember);
      await goto(redirect, { replaceState: true });
    } catch (err) {
      error = err instanceof Error ? err.message : 'Connexion impossible pour le moment.';
    } finally {
      loading = false;
    }
  }

  const mailto =
    'mailto:admin@jci-come.bj?subject=' + encodeURIComponent('Demande d’identifiants de connexion') +
    '&body=' + encodeURIComponent('Bonjour,\n\nJe souhaite obtenir mes identifiants pour accéder à mon espace membre JCI Comé Excellence.\n\nNom et prénom : \nAdresse e-mail : \n\nMerci.');
</script>

<svelte:head><title>Connexion · JCI Comé Excellence</title></svelte:head>

<AuthCard title="Connexion" subtitle="Accédez à votre espace membre JCI Comé Excellence.">
  {#if error}<div class="al" role="alert">{error}</div>{/if}
  <form onsubmit={submit}>
    <Field label="Adresse e-mail" id="em">
      <input id="em" type="email" required autocomplete="username" bind:value={email} />
    </Field>
    <Field label="Mot de passe" id="pw">
      <PasswordInput id="pw" bind:value={password} />
    </Field>
    <div class="lrow">
      <label class="rm" for="rm"><input id="rm" type="checkbox" bind:checked={remember} />Se souvenir de moi</label>
      <a class="lk" href="/mot-de-passe-oublie">Mot de passe oublié ?</a>
    </div>
    <Button block type="submit" loading={loading}>{loading ? 'Connexion…' : 'Se connecter'}</Button>
  </form>
  <p class="help">Vous n’avez pas d’identifiants de connexion ? <a href={mailto}>Contactez un administrateur pour en obtenir.</a></p>
</AuthCard>

<style>
  .al { border: 1.5px solid var(--err); color: var(--err); border-radius: 10px; padding: 12px 14px; font-weight: 700; margin: 0 0 18px; }
  .lrow { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px 16px; margin: 0 0 20px; }
  .rm { display: flex; align-items: center; gap: 8px; margin: 0; font-weight: 600; font-size: 14px; cursor: pointer; min-height: 24px; }
  .rm input { width: 18px; height: 18px; min-height: 0; margin: 0; padding: 0; accent-color: var(--acc); cursor: pointer; }
  .lk { color: var(--acc); font-weight: 700; text-decoration: none; }
  .help { text-align: center; font-size: 13px; margin: 24px 0 0; }
  .help a { color: var(--acc); font-weight: 700; text-decoration: none; }
</style>
