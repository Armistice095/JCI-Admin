import createClient, { type Middleware } from 'openapi-fetch';
import type { paths, components } from './schema';
import { API_URL } from '$lib/config';
import { ApiError, networkError, toApiError } from './errors';

export type Schemas = components['schemas'];
export type Me = Schemas['Me'];

/**
 * Fournisseur du jeton d'accès, branché par la couche d'authentification (étape 2).
 * `refresh` est appelé UNE fois sur 401 ; s'il renvoie un jeton, la requête est rejouée.
 */
const auth: {
  getToken: () => string | null | Promise<string | null>;
  refresh: () => Promise<string | null>;
  onSessionLost: () => void;
} = {
  getToken: () => null,
  refresh: async () => null,
  onSessionLost: () => {}
};

export function configureAuth(handlers: Partial<typeof auth>) {
  Object.assign(auth, handlers);
}

const middleware: Middleware = {
  async onRequest({ request }) {
    const token = await auth.getToken();
    if (token) request.headers.set('Authorization', `Bearer ${token}`);
    return request;
  },
  async onResponse({ request, response }) {
    if (response.status !== 401 || request.headers.get('x-retried')) return response;
    const token = await auth.refresh();
    if (!token) {
      auth.onSessionLost();
      return response;
    }
    // Une seule nouvelle tentative avec le jeton rafraîchi.
    const retry = new Request(request, { headers: new Headers(request.headers) });
    retry.headers.set('Authorization', `Bearer ${token}`);
    retry.headers.set('x-retried', '1');
    const res = await fetch(retry);
    if (res.status === 401) auth.onSessionLost();
    return res;
  }
};

export const api = createClient<paths>({ baseUrl: `${API_URL}/api/v1` });
api.use(middleware);

/**
 * Appelle l'API et renvoie directement les données, ou lève une `ApiError`.
 * Exemple : `const events = await unwrap(api.GET('/events', { params: { query: { status: 'PUBLISHED' } } }))`
 */
export async function unwrap<T>(
  call: Promise<{ data?: T; error?: unknown; response: Response }>
): Promise<T> {
  let res;
  try {
    res = await call;
  } catch {
    throw networkError();
  }
  if (res.error !== undefined || !res.response.ok) {
    throw toApiError(res.response.status, res.error, res.response.headers.get('Retry-After'));
  }
  return res.data as T;
}

export { ApiError };
