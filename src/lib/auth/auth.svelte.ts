import { goto } from '$app/navigation';
import { api, configureAuth, unwrap } from '$lib/api/client';
import { ApiError } from '$lib/api/errors';
import { session } from '$lib/stores/session.svelte';
import { DEMO_ME } from '$lib/dev/demo';
import { setRemember, supabase, supabaseConfigured } from './supabase';

export const BAD_CREDENTIALS = 'Adresse e-mail ou mot de passe incorrect.';

/** Accepte uniquement un chemin interne (évite une redirection ouverte via ?redirect=). */
export function safeRedirect(path: string | null | undefined): string {
  return path && path.startsWith('/') && !path.startsWith('//') && !path.startsWith('/connexion') ? path : '/';
}

/** Mode démo : développement local sans Supabase configuré. */
export const demoMode = import.meta.env.DEV && !supabaseConfigured;

let initialised = false;

async function accessToken(): Promise<string | null> {
  const { data } = await supabase().auth.getSession();
  return data.session?.access_token ?? null;
}

async function refreshToken(): Promise<string | null> {
  const { data, error } = await supabase().auth.refreshSession();
  return error ? null : (data.session?.access_token ?? null);
}

function redirectToLogin() {
  session.clear();
  const here = location.pathname + location.search;
  const target = here === '/' || here.startsWith('/connexion') ? '/connexion' : `/connexion?redirect=${encodeURIComponent(here)}`;
  void goto(target);
}

/** Charge le profil (`GET /me`). Lève une ApiError : 403 = compte non activé ou désactivé. */
export async function loadMe() {
  const me = await unwrap(api.GET('/me'));
  session.set(me);
  return me;
}

/**
 * À appeler une fois au démarrage : branche le client API sur Supabase et restaure la session.
 * `skipProfile` : sur /definir-mot-de-passe, on ne charge pas le profil (session temporaire).
 */
export async function initAuth(skipProfile = false) {
  if (initialised) return;
  initialised = true;

  if (demoMode) {
    session.set(DEMO_ME);
    return;
  }
  if (!supabaseConfigured) {
    session.set(null);
    return;
  }

  configureAuth({ getToken: accessToken, refresh: refreshToken, onSessionLost: redirectToLogin });

  // Déconnexion depuis un autre onglet ou jeton définitivement invalide.
  supabase().auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') session.clear();
  });

  const token = await accessToken();
  if (!token || skipProfile) {
    session.set(null);
    return;
  }
  try {
    await loadMe();
  } catch (e) {
    // 401 déjà traité par le client (refresh puis retour à la connexion) ; 403/réseau : pas de session utilisable.
    session.set(null);
    if (!(e instanceof ApiError) || e.status !== 403) return;
    await supabase().auth.signOut();
  }
}

/** Connexion e-mail + mot de passe puis chargement du profil. Lève une Error au message affichable. */
export async function signIn(email: string, password: string, remember: boolean) {
  if (demoMode) {
    session.set(DEMO_ME);
    return;
  }
  setRemember(remember);
  const { error } = await supabase().auth.signInWithPassword({ email: email.trim(), password });
  if (error) {
    // 400 = identifiants invalides ; on ne distingue pas e-mail inconnu / mot de passe faux.
    if (error.status === 400 || error.code === 'invalid_credentials') throw new Error(BAD_CREDENTIALS);
    if (error.status === 429) throw new Error('Trop de tentatives. Patientez un instant avant de réessayer.');
    throw new Error('Connexion impossible pour le moment. Réessayez dans un instant.');
  }
  try {
    await loadMe();
  } catch (e) {
    await supabase().auth.signOut();
    session.clear();
    if (e instanceof ApiError) throw new Error(e.message);
    throw e;
  }
}

export async function signOut() {
  try {
    if (supabaseConfigured) await supabase().auth.signOut();
  } finally {
    session.clear();
    await goto('/connexion');
  }
}

/** « Mot de passe oublié » : toujours la même réponse, que le compte existe ou non. */
export async function sendPasswordReset(email: string) {
  if (demoMode) return;
  const { error } = await supabase().auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${location.origin}/definir-mot-de-passe`
  });
  if (error?.status === 429) throw new Error('Trop de demandes. Patientez un instant avant de réessayer.');
  // Autres erreurs ignorées volontairement : ne pas révéler l'existence d'un compte.
}

/** Définit le mot de passe depuis un lien d'invitation / de réinitialisation, puis charge le profil. */
export async function setPassword(password: string) {
  const { error } = await supabase().auth.updateUser({ password });
  if (error) {
    if (error.code === 'same_password') throw new Error('Choisissez un mot de passe différent de l’ancien.');
    if (error.code === 'weak_password') throw new Error('Ce mot de passe est trop faible. Utilisez au moins 8 caractères, avec lettres et chiffres.');
    throw new Error('Impossible d’enregistrer le mot de passe. Le lien a peut-être expiré.');
  }
  await loadMe();
}

/** Attend une session issue du lien e-mail (Supabase la crée à l'ouverture de la page). */
export async function waitForRecoverySession(timeoutMs = 4000): Promise<boolean> {
  const sb = supabase();
  const has = async () => Boolean((await sb.auth.getSession()).data.session);
  if (await has()) return true;
  return new Promise((resolve) => {
    const { data } = sb.auth.onAuthStateChange((event, s) => {
      if (s && (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        data.subscription.unsubscribe();
        resolve(true);
      }
    });
    setTimeout(async () => {
      data.subscription.unsubscribe();
      resolve(await has());
    }, timeoutMs);
  });
}
