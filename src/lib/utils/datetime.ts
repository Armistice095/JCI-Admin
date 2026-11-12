import { TIMEZONE } from '$lib/config';

/** Le Bénin est à UTC+1 toute l'année (pas d'heure d'été). */
const OFFSET = '+01:00';
const pad = (n: number) => String(n).padStart(2, '0');

/** Valeur d'un `<input type="datetime-local">` (heure du Bénin) → ISO avec décalage, ex. 2026-10-01T08:00:00+01:00 */
export function localToIso(v: string | null | undefined): string | undefined {
  if (!v) return undefined;
  return `${v.length === 16 ? `${v}:00` : v}${OFFSET}`;
}

/** Instant ISO → valeur `datetime-local` en heure du Bénin ('' si absent) */
export function isoToLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(new Date(iso));
  const g = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
  return `${g('year')}-${g('month')}-${g('day')}T${g('hour')}:${g('minute')}`;
}

/** « La veille à 18h00 » d'une date AAAA-MM-JJ, au format datetime-local (valeur par défaut de clôture, comme le serveur). */
export function eveAt18(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  if (!y || !m || !d) return '';
  const dt = new Date(Date.UTC(y, m - 1, d - 1));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}T18:00`;
}
