import { getContext, setContext } from 'svelte';
import type { Schemas } from '$lib/api/client';

export interface EventContext {
  readonly event: Schemas['EventDetail'];
  reload: () => Promise<void>;
}
const KEY = Symbol('event');
export const setEventContext = (c: EventContext) => setContext(KEY, c);
export const getEventContext = () => getContext<EventContext>(KEY);

/** Libellés des champs renvoyés par un 422 à la publication. */
export const FIELD_LABELS: Record<string, string> = {
  title: 'titre', description: 'description', date: 'date', startTime: 'heure de début', endTime: 'heure de fin',
  venueName: 'nom du lieu', city: 'ville'
};
