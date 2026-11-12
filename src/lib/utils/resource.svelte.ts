import { ApiError, networkError } from '$lib/api/errors';

/**
 * Chargement de données réactif : garde les anciennes données pendant un rechargement
 * et ignore les réponses obsolètes (changement rapide de filtre/page).
 * Usage : `const r = new Resource(() => unwrap(api.GET(...)));  $effect(() => { void r.load(); });`
 * Les valeurs lues de façon synchrone dans `fetcher` (filtres, page…) déclenchent le rechargement.
 */
export class Resource<T> {
  data = $state<T>() as T | undefined;
  error = $state<ApiError | null>(null);
  loading = $state(true);
  #seq = 0;
  #fetcher: () => Promise<T>;

  constructor(fetcher: () => Promise<T>) {
    this.#fetcher = fetcher;
  }

  async load(): Promise<void> {
    const id = ++this.#seq;
    this.loading = true;
    let promise: Promise<T>;
    try {
      promise = this.#fetcher(); // la partie synchrone enregistre les dépendances réactives
    } catch (e) {
      return this.#fail(id, e);
    }
    try {
      const value = await promise;
      if (id !== this.#seq) return;
      this.data = value;
      this.error = null;
      this.loading = false;
    } catch (e) {
      this.#fail(id, e);
    }
  }

  #fail(id: number, e: unknown) {
    if (id !== this.#seq) return;
    this.error = e instanceof ApiError ? e : networkError();
    this.loading = false;
  }

  reload = () => this.load();
}
