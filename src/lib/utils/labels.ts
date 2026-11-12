import type { Schemas } from '$lib/api/client';

export type Tone = 'ok' | 'wait' | 'err' | 'info' | 'neutral';
export interface Label {
  label: string;
  tone: Tone;
}

/** Libellés et couleurs conseillés par le guide (§5). Valeur inconnue → affichage par défaut, jamais d'erreur. */
const fallback = (v: string): Label => ({ label: v, tone: 'neutral' });
const pick = (map: Record<string, Label>, v: string | null | undefined): Label =>
  v ? (map[v] ?? fallback(v)) : { label: '—', tone: 'neutral' };

const EVENT_STATUS: Record<Schemas['EventStatus'], Label> = {
  DRAFT: { label: 'Brouillon', tone: 'info' },
  PUBLISHED: { label: 'Publié', tone: 'ok' },
  CLOSED: { label: 'Clôturé', tone: 'neutral' },
  CANCELLED: { label: 'Annulé', tone: 'err' }
};
const SALES_STATUS: Record<Schemas['SalesStatus'], Label> = {
  OPEN: { label: 'Billetterie ouverte', tone: 'ok' },
  NOT_OPEN: { label: 'Billetterie non ouverte', tone: 'wait' },
  CLOSED: { label: 'Billetterie fermée', tone: 'neutral' }
};
const ORDER_STATUS: Record<Schemas['OrderStatus'], Label> = {
  PAID: { label: 'Payée', tone: 'ok' },
  PENDING_PAYMENT: { label: 'En attente', tone: 'wait' },
  PAYMENT_IN_PROGRESS: { label: 'En attente', tone: 'wait' },
  FAILED: { label: 'Échouée', tone: 'err' },
  EXPIRED: { label: 'Expirée', tone: 'neutral' },
  REFUNDED: { label: 'Remboursée', tone: 'info' },
  REFUND_REQUIRED: { label: 'À rembourser', tone: 'err' },
  CANCELLED: { label: 'Annulée', tone: 'neutral' }
};
const PAYMENT_METHOD: Record<Schemas['PaymentMethod'], Label> = {
  MOBILE_MONEY_MTN: { label: 'Mobile Money (MTN)', tone: 'neutral' },
  MOBILE_MONEY_MOOV: { label: 'Mobile Money (Moov)', tone: 'neutral' },
  MOBILE_MONEY_OTHER: { label: 'Mobile Money', tone: 'neutral' },
  MOBILE_MONEY_DIRECT: { label: 'Mobile Money direct', tone: 'neutral' },
  CARD: { label: 'Carte bancaire', tone: 'neutral' },
  CASH: { label: 'Espèces', tone: 'neutral' },
  UNKNOWN: { label: '—', tone: 'neutral' }
};
const TICKET_STATUS: Record<Schemas['TicketStatus'], Label> = {
  VALID: { label: 'Valide', tone: 'ok' },
  USED: { label: 'Utilisé', tone: 'info' },
  CANCELLED: { label: 'Annulé', tone: 'neutral' },
  REFUNDED: { label: 'Remboursé', tone: 'info' }
};
const PAYMENT_STATUS: Record<Schemas['PaymentStatus'], Label> = {
  PENDING: { label: 'En attente', tone: 'wait' },
  PAID: { label: 'Payé', tone: 'ok' },
  FAILED: { label: 'Échoué', tone: 'err' },
  EXPIRED: { label: 'Expiré', tone: 'neutral' },
  REFUNDED: { label: 'Remboursé', tone: 'info' },
  REFUND_REQUIRED: { label: 'À rembourser', tone: 'err' }
};
const PRESENCE: Record<Schemas['Presence'], Label> = {
  UPCOMING: { label: 'À venir', tone: 'info' },
  PRESENT: { label: 'Présent', tone: 'ok' },
  CANCELLED: { label: 'Annulé', tone: 'neutral' }
};
const EMAIL_DELIVERY: Record<Schemas['EmailDelivery'], Label> = {
  DELIVERED: { label: 'Délivré', tone: 'ok' },
  SENT: { label: 'Envoyé', tone: 'info' },
  QUEUED: { label: 'En file', tone: 'wait' },
  DEFERRED: { label: 'Différé', tone: 'wait' },
  SOFT_BOUNCE: { label: 'Rebond', tone: 'err' },
  HARD_BOUNCE: { label: 'Rebond', tone: 'err' },
  BLOCKED: { label: 'Problème', tone: 'err' },
  SPAM: { label: 'Problème', tone: 'err' },
  FAILED: { label: 'Problème', tone: 'err' },
  NOT_SENT: { label: 'Pas encore envoyé', tone: 'neutral' },
  NOT_REQUESTED: { label: 'Non demandé', tone: 'neutral' }
};
const AVAILABILITY: Record<Schemas['CategoryAvailability'], Label> = {
  AVAILABLE: { label: 'Disponible', tone: 'ok' },
  SOLD_OUT: { label: 'Épuisé', tone: 'err' },
  NOT_STARTED: { label: 'Vente pas encore ouverte', tone: 'wait' },
  ENDED: { label: 'Vente terminée', tone: 'neutral' },
  DISABLED: { label: 'Désactivée', tone: 'neutral' }
};
const ROLE: Record<Schemas['RoleCode'], Label> = {
  ADMIN: { label: 'Administrateur', tone: 'info' },
  PRESIDENT: { label: 'Président local', tone: 'info' },
  ORGANIZER: { label: 'Organisateur', tone: 'wait' },
  SELLER: { label: 'Vendeur', tone: 'ok' },
  GATE_AGENT: { label: 'Agent d’accueil', tone: 'wait' }
};
const EVENT_CATEGORY: Record<Schemas['EventCategory'], string> = {
  CONFERENCE: 'Conférence',
  FORMATION: 'Formation',
  ATELIER: 'Atelier',
  NETWORKING: 'Networking',
  GALA: 'Gala',
  AUTRE: 'Autre'
};

export const eventStatus = (v?: string | null) => pick(EVENT_STATUS, v);
export const salesStatus = (v?: string | null) => pick(SALES_STATUS, v);
export const orderStatus = (v?: string | null) => pick(ORDER_STATUS, v);
export const paymentMethod = (v?: string | null) => pick(PAYMENT_METHOD, v);
export const ticketStatus = (v?: string | null) => pick(TICKET_STATUS, v);
export const paymentStatus = (v?: string | null) => pick(PAYMENT_STATUS, v);
export const presence = (v?: string | null) => pick(PRESENCE, v);
export const emailDelivery = (v?: string | null) => pick(EMAIL_DELIVERY, v);
export const availability = (v?: string | null) => pick(AVAILABILITY, v);
export const role = (v?: string | null) => pick(ROLE, v);
export const eventCategoryLabel = (v: string) => EVENT_CATEGORY[v as Schemas['EventCategory']] ?? v;
export const EVENT_CATEGORIES = Object.entries(EVENT_CATEGORY).map(([value, label]) => ({ value, label }));
