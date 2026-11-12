import { api, unwrap, type Schemas } from '$lib/api/client';
import { ApiError } from '$lib/api/errors';

export const MAX_POSTERS = 5;
export const MAX_POSTER_BYTES = 2 * 1024 * 1024;

/** Vérifie les fichiers choisis (le serveur revérifie le contenu réel). */
export function checkPosterFiles(files: File[], alreadyCount: number): { valid: File[]; errors: string[] } {
  const valid: File[] = [];
  const errors: string[] = [];
  for (const f of files) {
    if (alreadyCount + valid.length >= MAX_POSTERS) {
      errors.push(`Maximum ${MAX_POSTERS} affiches par événement.`);
      break;
    }
    if (!['image/jpeg', 'image/png'].includes(f.type)) errors.push(`« ${f.name} » : format non supporté (JPG ou PNG uniquement).`);
    else if (f.size > MAX_POSTER_BYTES) errors.push(`« ${f.name} » : fichier trop lourd (2 Mo maximum).`);
    else valid.push(f);
  }
  return { valid, errors };
}

export async function uploadPoster(eventId: string, file: File, isCover = false): Promise<Schemas['Poster']> {
  try {
    return await unwrap(
      api.POST('/events/{eventId}/posters', {
        params: { path: { eventId }, query: isCover ? { isCover: 'true' } : {} },
        body: { file: file as unknown as string },
        // multipart : ne pas fixer Content-Type, le navigateur ajoute la frontière
        bodySerializer: (b: { file: unknown }) => {
          const fd = new FormData();
          fd.append('file', b.file as Blob);
          return fd;
        }
      })
    );
  } catch (e) {
    if (e instanceof ApiError && e.status === 413) throw new ApiError(413, e.code, 'Fichier trop lourd (2 Mo maximum).');
    throw e;
  }
}

export const setCover = (eventId: string, posterId: string) =>
  unwrap(api.PATCH('/events/{eventId}/posters/{posterId}', { params: { path: { eventId, posterId } }, body: { isCover: true } }));

export const deletePoster = (eventId: string, posterId: string) =>
  unwrap(api.DELETE('/events/{eventId}/posters/{posterId}', { params: { path: { eventId, posterId } } }));
