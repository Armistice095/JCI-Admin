import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '$lib/config';

export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

const REMEMBER_KEY = 'jci-remember';

/**
 * « Se souvenir de moi » : session conservée entre les visites (localStorage) ;
 * sinon, session limitée à l'onglet (sessionStorage), effacée à la fermeture.
 */
export function setRemember(remember: boolean) {
  try {
    if (remember) localStorage.setItem(REMEMBER_KEY, '1');
    else localStorage.removeItem(REMEMBER_KEY);
  } catch {}
}
function target(): Storage {
  try {
    return localStorage.getItem(REMEMBER_KEY) === '1' ? localStorage : sessionStorage;
  } catch {
    return sessionStorage;
  }
}
const storage = {
  getItem: (k: string) => {
    try {
      return target().getItem(k) ?? localStorage.getItem(k) ?? sessionStorage.getItem(k);
    } catch {
      return null;
    }
  },
  setItem: (k: string, v: string) => {
    try {
      const t = target();
      (t === localStorage ? sessionStorage : localStorage).removeItem(k);
      t.setItem(k, v);
    } catch {}
  },
  removeItem: (k: string) => {
    try {
      localStorage.removeItem(k);
      sessionStorage.removeItem(k);
    } catch {}
  }
};

let client: SupabaseClient | null = null;

/** Client Supabase (clé ANON publique uniquement). Lève une erreur claire si la configuration manque. */
export function supabase(): SupabaseClient {
  if (!supabaseConfigured) throw new Error('Configuration Supabase manquante (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).');
  client ??= createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { storage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  return client;
}
