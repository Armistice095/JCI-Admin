import { api, unwrap, type Schemas } from '$lib/api/client';
import { ApiError } from '$lib/api/errors';

type Category = Schemas['Category'];
type OrderDetail = Schemas['OrderDetail'];
export type PayMode = 'CASH' | 'MOBILE_MONEY_DIRECT';
export interface Person { first: string; last: string; phone: string }

/** Maximum de billets par vente physique (guide §7.3). */
export const MAX_TICKETS = 10;
const EMAIL = /^\S+@\S+\.\S+$/;
const norm = (s: string) => s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const newKey = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`);

/** État et règles de l'assistant « Vente physique » (Billets → Participants → Paiement → Confirmation). */
export class SaleWizard {
  step = $state(1);
  eventId = $state('');
  categories = $state<Category[]>([]);
  qty = $state<Record<string, number>>({});
  people = $state<Person[]>([]);
  mail = $state('');
  mode = $state<PayMode | null>(null);
  ref = $state('');
  confirmed = $state(false);
  errors = $state<Record<string, string>>({});
  msg = $state('');
  busy = $state(false);
  done = $state<OrderDetail | null>(null);
  dupNames = $state<string[]>([]);
  dupAck = $state(false);
  /** Incrémenté quand le serveur indique que les disponibilités ont changé : la page recharge la billetterie. */
  refreshTick = $state(0);

  // Clé d'idempotence : générée à l'ouverture, réutilisée tant que la requête est identique (double clic, réseau instable).
  #key = newKey();
  #lastHash = '';

  get tickets(): string[] {
    return this.categories.flatMap((c) => Array<string>(this.qty[c.id] ?? 0).fill(c.id));
  }
  get count() { return this.tickets.length; }
  get total() { return this.categories.reduce((s, c) => s + (this.qty[c.id] ?? 0) * c.priceXof, 0); }
  cat = (id: string) => this.categories.find((c) => c.id === id);

  /** Nouvel événement choisi ou billetterie rechargée : on repart de zéro côté quantités. */
  setCategories(cats: Category[], keepQty = false) {
    this.categories = cats;
    if (!keepQty) this.qty = {};
    else {
      // Retire les quantités devenues impossibles (quota atteint entre-temps).
      for (const c of cats) if ((this.qty[c.id] ?? 0) > this.room(c)) this.qty[c.id] = this.room(c);
    }
    this.syncPeople();
  }

  /** Places que l'on peut encore sélectionner dans la catégorie (hors sélection des autres catégories). */
  room(c: Category) {
    return c.availability === 'AVAILABLE' ? Math.max(0, c.remaining) : 0;
  }

  inc(c: Category) {
    this.msg = '';
    const n = (this.qty[c.id] ?? 0) + 1;
    if (this.count >= MAX_TICKETS) this.msg = `Maximum de ${MAX_TICKETS} billets par vente atteint.`;
    else if (n > this.room(c)) this.msg = 'Quota atteint : il ne reste plus de place dans cette catégorie.';
    else this.qty[c.id] = n;
    this.errors = {};
    this.syncPeople();
  }
  dec(c: Category) {
    this.msg = '';
    const n = (this.qty[c.id] ?? 0) - 1;
    if (n >= 0) this.qty[c.id] = n;
    this.errors = {};
    this.syncPeople();
  }
  syncPeople() {
    const n = this.count;
    while (this.people.length < n) this.people.push({ first: '', last: '', phone: '' });
    this.people.length = n;
  }

  // ───── Validation par étape ─────
  validateStep(step: number): boolean {
    const e: Record<string, string> = {};
    if (step >= 1 && this.count === 0) e.q = 'Sélectionnez au moins un billet.';
    if (step >= 2) {
      this.people.forEach((p, k) => {
        if (!p.first.trim()) e[`p${k}0`] = 'Prénom requis.';
        if (!p.last.trim()) e[`p${k}1`] = 'Nom requis.';
      });
      if (this.mail.trim() && !EMAIL.test(this.mail.trim())) e.mail = 'Adresse e-mail invalide.';
    }
    if (step >= 3) {
      if (!this.mode) e.mode = 'Choisissez le mode de paiement.';
      if (this.mode === 'MOBILE_MONEY_DIRECT' && !this.ref.trim()) e.ref = 'La référence de la transaction est requise.';
      if (!this.confirmed) e.ok = 'Confirmez la réception du paiement.';
    }
    this.errors = e;
    return Object.keys(e).length === 0;
  }

  /** Noms en double dans la même vente (comparaison sans accents ni casse). */
  duplicates(): string[] {
    const seen = new Set<string>();
    const dup: string[] = [];
    for (const p of this.people) {
      const k = `${norm(p.first)}|${norm(p.last)}`;
      if (seen.has(k)) dup.push(`${p.first.trim()} ${p.last.trim()}`);
      seen.add(k);
    }
    return [...new Set(dup)];
  }

  /** Passe à l'étape suivante si l'étape courante est valide ; signale d'éventuels doublons. */
  next(): 'ok' | 'invalid' | 'duplicates' {
    if (!this.validateStep(this.step)) return 'invalid';
    if (this.step === 2 && !this.dupAck) {
      const d = this.duplicates();
      if (d.length) { this.dupNames = d; return 'duplicates'; }
    }
    this.step++;
    return 'ok';
  }
  back() { this.errors = {}; this.msg = ''; if (this.step > 1 && !this.done) this.step--; }
  goTo(n: number) { if (!this.done && n < this.step) { this.errors = {}; this.msg = ''; this.step = n; } }

  // ───── Envoi ─────
  #body(): Schemas['PhysicalSaleCreate'] {
    const first = this.people[0];
    const mail = this.mail.trim();
    return {
      eventId: this.eventId,
      // Le formulaire ne demande pas d'acheteur distinct : on utilise le premier participant.
      buyer: { firstName: first.first.trim(), lastName: first.last.trim(), ...(first.phone.trim() ? { phone: first.phone.trim() } : {}), ...(mail ? { email: mail } : {}) },
      tickets: this.tickets.map((categoryId, k) => ({
        categoryId,
        firstName: this.people[k].first.trim(),
        lastName: this.people[k].last.trim(),
        ...(this.people[k].phone.trim() ? { phone: this.people[k].phone.trim() } : {})
      })),
      paymentMethod: this.mode!,
      ...(this.mode === 'MOBILE_MONEY_DIRECT' && this.ref.trim() ? { paymentReference: this.ref.trim() } : {}),
      paymentReceivedConfirmed: true,
      sendEmail: !!mail
    };
  }

  async submit(): Promise<void> {
    if (this.busy || this.done) return;
    if (!this.validateStep(3)) return;
    this.busy = true;
    this.msg = '';
    try {
      const body = this.#body();
      const hash = JSON.stringify(body);
      // Même requête qu'au dernier essai → même clé ; données modifiées → nouvelle clé.
      if (hash !== this.#lastHash) this.#key = newKey();
      this.#lastHash = hash;
      this.done = await unwrap(api.POST('/physical-sales', { params: { header: { 'Idempotency-Key': this.#key } }, body }));
      this.step = 4;
    } catch (e) {
      this.#fail(e);
    } finally {
      this.busy = false;
    }
  }

  #fail(e: unknown) {
    if (!(e instanceof ApiError)) { this.msg = 'Une erreur est survenue. Réessayez.'; return; }
    switch (e.code) {
      case 'VALIDATION_ERROR': {
        const err: Record<string, string> = {};
        const orphans: string[] = [];
        for (const [path, message] of Object.entries(e.fields)) {
          let m: RegExpMatchArray | null;
          if ((m = path.match(/^tickets\.(\d+)\.(firstName|lastName|phone|email)$/))) err[`p${m[1]}${m[2] === 'lastName' ? 1 : m[2] === 'firstName' ? 0 : 2}`] = message;
          else if (path === 'buyer.email') err.mail = message;
          else if (path === 'buyer.phone') err['p02'] = message;
          else if (path === 'paymentReference') err.ref = message;
          else orphans.push(message);
        }
        this.errors = err;
        this.msg = orphans.join(' ') || 'Certaines informations sont invalides.';
        const hasPeople = Object.keys(err).some((k) => /^p\d/.test(k) || k === 'mail');
        if (hasPeople && !err.ref) this.step = 2;
        break;
      }
      case 'QUOTA_EXCEEDED':
      case 'SALES_CLOSED':
      case 'MAX_PER_ORDER_EXCEEDED':
      case 'EVENT_NOT_PUBLISHED':
        this.msg = e.message;
        this.step = 1;
        this.refreshTick++;
        break;
      case 'DUPLICATE_REQUEST':
        this.#key = newKey(); // clé déjà utilisée pour autre chose : on repart sur une nouvelle
        this.#lastHash = '';
        this.msg = 'Cette demande a déjà été utilisée. Vérifiez les informations puis validez à nouveau.';
        break;
      default:
        this.msg = e.message;
    }
  }

  reset() {
    this.step = 1; this.qty = {}; this.people = []; this.mail = ''; this.mode = null; this.ref = ''; this.confirmed = false;
    this.errors = {}; this.msg = ''; this.busy = false; this.done = null; this.dupAck = false; this.dupNames = [];
    this.#key = newKey(); this.#lastHash = '';
    this.refreshTick++;
  }
}
