import { TIMEZONE } from '$lib/config';

const nf = new Intl.NumberFormat('fr-FR');

/** 3000 → « 3 000 XOF » (espace insécable) */
export function formatXof(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  return nf.format(n).replace(/[  ]/g, ' ') + ' XOF';
}

export const formatNumber = (n: number) => nf.format(n);

const tz = { timeZone: TIMEZONE } as const;

/** « 28 nov. 2026 » (heure du Bénin) */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { ...tz, day: 'numeric', month: 'short', year: 'numeric' });
}

/** « 28 nov. 2026, 08h00 » */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const date = d.toLocaleDateString('fr-FR', { ...tz, day: 'numeric', month: 'short', year: 'numeric' });
  return `${date}, ${formatTime(iso)}`;
}

/** « 08h00 » */
export function formatTime(iso: string): string {
  const parts = new Intl.DateTimeFormat('fr-FR', { ...tz, hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(
    new Date(iso)
  );
  const h = parts.find((p) => p.type === 'hour')?.value ?? '00';
  const m = parts.find((p) => p.type === 'minute')?.value ?? '00';
  return `${h}h${m}`;
}

/** « HH:mm » (formulaire) → « 08h00 » */
export const timeToLabel = (t: string) => t.replace(':', 'h');

/** Date relative courte : « Aujourd'hui, 09h12 », « Hier, 18h40 », sinon « 23 oct., 09h02 » */
export function formatRelativeDay(iso: string, now = new Date()): string {
  const key = (d: Date) => d.toLocaleDateString('fr-CA', tz);
  const d = new Date(iso);
  const yesterday = new Date(now.getTime() - 86_400_000);
  if (key(d) === key(now)) return `Aujourd’hui, ${formatTime(iso)}`;
  if (key(d) === key(yesterday)) return `Hier, ${formatTime(iso)}`;
  const day = d.toLocaleDateString('fr-FR', { ...tz, day: 'numeric', month: 'short' });
  return `${day}, ${formatTime(iso)}`;
}

export function initials(first: string, last: string): string {
  return ((first[0] ?? '') + (last[0] ?? '')).toUpperCase();
}

/** Date locale « AAAA-MM-JJ » (sans conversion de fuseau) → « 28 nov. 2026 » */
export function formatLocalDate(date: string | null | undefined): string {
  if (!date) return '—';
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** « à l'instant », « il y a 12 min », « il y a 2 h », « hier », sinon la date (comme sur la maquette). */
export function formatRelativeTime(iso: string, now = new Date()): string {
  const diff = now.getTime() - new Date(iso).getTime();
  if (diff < 60_000) return 'à l’instant';
  const min = Math.floor(diff / 60_000);
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 12) return `il y a ${h} h`;
  const key = (d: Date) => d.toLocaleDateString('fr-CA', tz);
  const d = new Date(iso);
  if (key(d) === key(now)) return `il y a ${h} h`;
  if (key(d) === key(new Date(now.getTime() - 86_400_000))) return 'hier';
  return d.toLocaleDateString('fr-FR', { ...tz, day: 'numeric', month: 'short' });
}
