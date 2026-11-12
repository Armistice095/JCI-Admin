import { api, unwrap, type Schemas } from '$lib/api/client';
import { ApiError } from '$lib/api/errors';

export type FileKind = 'pdf' | 'image' | 'share';
export type TicketFile = Schemas['TicketFile'];

const wait = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => { clearTimeout(t); reject(new DOMException('Annulé', 'AbortError')); }, { once: true });
  });

/**
 * Lien de téléchargement d'un fichier de billet (URL signée, valable 15 min : à ouvrir tout de suite, jamais mémorisée).
 * Le serveur répond 202 tant que le fichier n'est pas prêt : on réessaie toutes les 2,5 s (30 s maximum).
 * `onPending` est appelé dès la première réponse « en préparation ».
 */
export async function fetchTicketFile(ticketId: string, kind: FileKind, opts: { signal?: AbortSignal; onPending?: () => void; tries?: number; delayMs?: number } = {}): Promise<{ file: TicketFile; waited: boolean }> {
  const { signal, onPending, tries = 12, delayMs = 2500 } = opts;
  let waited = false;
  for (let i = 0; i < tries; i++) {
    const data = await unwrap(api.GET('/tickets/{ticketId}/files/{kind}', { params: { path: { ticketId, kind } }, signal }));
    if ('url' in data) return { file: data, waited };
    if (!waited) { waited = true; onPending?.(); }
    await wait(delayMs, signal);
  }
  throw new ApiError(504, 'UNKNOWN', 'Le billet est encore en préparation. Réessayez dans un instant.');
}
