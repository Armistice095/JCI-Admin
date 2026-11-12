import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { loadEnv } from 'vite';

// Origines autorisées par la CSP, lues dans les variables VITE_* (fichier .env en local, variables « Build » sur Cloudflare).
const env = { ...loadEnv(process.env.NODE_ENV ?? 'production', process.cwd(), 'VITE_'), ...process.env };
const origin = (u) => { try { return new URL(u ?? '').origin; } catch { return null; } };
const api = origin(env.VITE_API_URL);
const sb = origin(env.VITE_SUPABASE_URL);
const connect = ["'self'", api, sb, sb && sb.replace('https://', 'wss://')].filter(Boolean);

/** SPA : back-office derrière authentification, pas de SSR. */
export default {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({ fallback: 'index.html' }),
    csp: {
      mode: 'hash',
      directives: {
        'default-src': ['self'],
        'script-src': ['self'],
        'style-src': ['self', 'unsafe-inline', 'https://fonts.googleapis.com'],
        'font-src': ['self', 'data:', 'https://fonts.gstatic.com'],
        'img-src': ['self', 'data:', 'blob:', 'https:'],
        'connect-src': connect,
        'object-src': ['none'],
        'base-uri': ['self'],
        'form-action': ['self']
      }
    }
  }
};
