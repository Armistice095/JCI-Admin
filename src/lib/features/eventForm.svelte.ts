import type { components } from '$lib/api/schema';
import { eveAt18, isoToLocalInput, localToIso } from '$lib/utils/datetime';

type Schemas = components['schemas'];
type EventFields = Schemas['EventFields'];

export const DEFAULT_ORGANIZER = { name: 'JCI Comé Excellence', description: 'Organisation de jeunes citoyens actifs' };

let seq = 0;
const key = () => ++seq;

export interface ProgRow { key: number; time: string; label: string }
export interface OrgRow { key: number; name: string; description: string }
export interface CatRow { key: number; name: string; price: number | null; quota: number | null; conditions: string }
export type Errors = Record<string, string>;

const blank = (s: string) => s.trim() === '';

/** État et règles du formulaire d'événement (création et modification). */
export class EventFormState {
  title = $state('');
  category = $state<Schemas['EventCategory']>('CONFERENCE');
  description = $state('');
  date = $state('');
  startTime = $state('08:00');
  endTime = $state('17:00');
  venueName = $state('');
  city = $state('');
  programme = $state<ProgRow[]>([]);
  organizers = $state<OrgRow[]>([{ key: key(), ...DEFAULT_ORGANIZER }]);
  opensAt = $state('');
  closesAt = $state('');
  closesTouched = $state(false);
  maxPerOrder = $state<number | null>(5);
  categories = $state<CatRow[]>([]);
  errors = $state<Errors>({});

  /** Valeurs initiales (modification) à partir de la fiche et de l'état de billetterie. */
  static from(ev: Schemas['EventDetail'], t?: Schemas['TicketingState']): EventFormState {
    const f = new EventFormState();
    f.title = ev.title;
    f.category = ev.category;
    f.description = ev.description ?? '';
    f.date = ev.date ?? '';
    f.startTime = ev.startTime ?? '08:00';
    f.endTime = ev.endTime ?? '17:00';
    f.venueName = ev.venueName ?? '';
    f.city = ev.city ?? '';
    f.programme = ev.programme.map((p) => ({ key: key(), time: p.time, label: p.label }));
    f.organizers = ev.organizers.map((o) => ({ key: key(), name: o.name, description: o.description ?? '' }));
    if (t) {
      f.opensAt = isoToLocalInput(t.salesOpensAt);
      f.closesAt = isoToLocalInput(t.salesClosesAt);
      f.closesTouched = true;
      f.maxPerOrder = t.maxPerOrder;
    }
    return f;
  }

  // ───── Lignes répétables ─────
  addProgramme() { this.programme.push({ key: key(), time: '', label: '' }); }
  removeProgramme(k: number) { this.programme = this.programme.filter((r) => r.key !== k); }
  addOrganizer() { this.organizers.push({ key: key(), name: '', description: '' }); }
  removeOrganizer(k: number) { this.organizers = this.organizers.filter((r) => r.key !== k); }
  addCategory() {
    // Première catégorie préremplie comme dans la maquette (Standard, 3 000 XOF)
    this.categories.push(this.categories.length === 0 ? { key: key(), name: 'Standard', price: 3000, quota: null, conditions: '' } : { key: key(), name: '', price: null, quota: null, conditions: '' });
  }
  removeCategory(k: number) { this.categories = this.categories.filter((r) => r.key !== k); }

  /** Clôture par défaut = veille à 18h00, tant que l'utilisateur ne l'a pas modifiée (comme le serveur). */
  syncDefaultClose() {
    if (!this.closesTouched && this.date) this.closesAt = eveAt18(this.date);
  }

  get capacity() {
    return this.categories.reduce((s, c) => s + (c.quota && c.quota > 0 ? c.quota : 0), 0);
  }
  get potentialRevenue() {
    return this.categories.reduce((s, c) => s + (c.quota && c.price && c.quota > 0 && c.price > 0 ? c.quota * c.price : 0), 0);
  }

  /** Empreinte pour détecter les modifications non enregistrées. */
  snapshot(): string {
    const { title, category, description, date, startTime, endTime, venueName, city, programme, organizers, opensAt, closesAt, maxPerOrder, categories } = this;
    return JSON.stringify({ title, category, description, date, startTime, endTime, venueName, city, programme, organizers, opensAt, closesAt, maxPerOrder, categories });
  }

  // ───── Validation ─────
  validate(forPublish: boolean, opts: { withCategories: boolean; withTicketing: boolean }): Errors {
    const e: Errors = {};
    const t = this.title.trim();
    if (!t) e.title = 'Le titre est obligatoire.';
    else if (t.length < 3) e.title = 'Le titre doit contenir au moins 3 caractères.';
    else if (t.length > 150) e.title = 'Le titre ne doit pas dépasser 150 caractères.';
    if (this.description.length > 5000) e.description = 'La description ne doit pas dépasser 5 000 caractères.';
    if (this.venueName.length > 150) e.venueName = 'Le nom du lieu ne doit pas dépasser 150 caractères.';
    if (this.city.length > 100) e.city = 'La ville ne doit pas dépasser 100 caractères.';

    if (forPublish) {
      if (blank(this.description)) e.description = 'La description est obligatoire pour publier.';
      if (!this.date) e.date = 'La date est obligatoire pour publier.';
      if (!this.startTime) e.startTime = 'L’heure de début est obligatoire.';
      if (!this.endTime) e.endTime = 'L’heure de fin est obligatoire.';
      if (blank(this.venueName)) e.venueName = 'Le nom du lieu est obligatoire pour publier.';
      if (blank(this.city)) e.city = 'La ville est obligatoire pour publier.';
    }
    if (this.startTime && this.endTime && this.endTime <= this.startTime) e.endTime = 'La fin doit être après le début.';

    this.programme.forEach((r, i) => {
      if (blank(r.time) && blank(r.label)) return;
      if (blank(r.time)) e[`programme.${r.key}.time`] = 'Indiquez l’heure.';
      if (blank(r.label)) e[`programme.${r.key}.label`] = 'Indiquez le libellé.';
      else if (r.label.length > 200) e[`programme.${r.key}.label`] = '200 caractères maximum.';
    });
    if (this.programme.filter((r) => !(blank(r.time) && blank(r.label))).length > 30) e.programme = '30 lignes maximum.';

    this.organizers.forEach((r) => {
      if (blank(r.name) && blank(r.description)) return;
      if (blank(r.name)) e[`organizers.${r.key}.name`] = 'Indiquez le nom de l’organisateur.';
      else if (r.name.length > 120) e[`organizers.${r.key}.name`] = '120 caractères maximum.';
      if (r.description.length > 200) e[`organizers.${r.key}.description`] = '200 caractères maximum.';
    });

    if (opts.withTicketing) {
      if (this.maxPerOrder === null || !Number.isInteger(this.maxPerOrder) || this.maxPerOrder < 1 || this.maxPerOrder > 10) {
        e['ticketing.maxPerOrder'] = 'Entre 1 et 10 billets.';
      }
      if (forPublish) {
        if (!this.opensAt) e['ticketing.salesOpensAt'] = 'L’ouverture de la billetterie est obligatoire pour publier.';
        if (!this.closesAt) e['ticketing.salesClosesAt'] = 'La clôture de la billetterie est obligatoire pour publier.';
      }
      if (this.opensAt && this.closesAt && this.closesAt <= this.opensAt) e['ticketing.salesClosesAt'] = 'La clôture doit être après l’ouverture.';
    }

    if (opts.withCategories) {
      const used = this.categories.filter((c) => !(blank(c.name) && c.price === null && c.quota === null && blank(c.conditions)));
      if (used.length > 10) e.categories = '10 catégories maximum.';
      const seen = new Set<string>();
      for (const c of used) {
        const name = c.name.trim();
        if (!name) e[`categories.${c.key}.name`] = 'Indiquez le nom.';
        else if (name.length > 60) e[`categories.${c.key}.name`] = '60 caractères maximum.';
        else if (seen.has(name.toLowerCase())) e[`categories.${c.key}.name`] = 'Ce nom est déjà utilisé.';
        seen.add(name.toLowerCase());
        if (c.price === null || !Number.isInteger(c.price) || c.price < 1) e[`categories.${c.key}.priceXof`] = 'Prix minimum : 1 XOF (pas de billets gratuits).';
        else if (c.price > 10_000_000) e[`categories.${c.key}.priceXof`] = 'Prix trop élevé.';
        if (c.quota === null || !Number.isInteger(c.quota) || c.quota < 1) e[`categories.${c.key}.quota`] = 'Quota minimum : 1.';
        else if (c.quota > 100_000) e[`categories.${c.key}.quota`] = '100 000 maximum.';
        if (c.conditions.length > 300) e[`categories.${c.key}.conditions`] = '300 caractères maximum.';
      }
    }
    return e;
  }

  // ───── Corps de requête ─────
  /**
   * Corps de requête + correspondance « indice envoyé → clé de ligne », pour rattacher aux bons champs
   * les erreurs du serveur (ex. `programme.1.label` se réfère à la 2ᵉ ligne *envoyée*, lignes vides exclues).
   */
  build(opts: { withCategories: boolean; withTicketing: boolean; patch: boolean }) {
    const progRows = this.programme.filter((r) => !(blank(r.time) && blank(r.label)));
    const orgRows = this.organizers.filter((r) => !(blank(r.name) && blank(r.description)));
    const catRows = this.categories.filter((c) => !(blank(c.name) && c.price === null && c.quota === null && blank(c.conditions)));

    const body: EventFields & { categories?: Schemas['CategoryInput'][] } = {
      title: this.title.trim(),
      category: this.category,
      programme: progRows.map((r) => ({ time: r.time, label: r.label.trim() })),
      organizers: orgRows.map((r) => ({ name: r.name.trim(), ...(blank(r.description) ? {} : { description: r.description.trim() }) }))
    };
    // En création, les champs vides sont omis ; en modification, un champ vidé est envoyé vide.
    const text = (k: 'description' | 'venueName' | 'city', v: string) => {
      if (opts.patch || !blank(v)) body[k] = v.trim();
    };
    text('description', this.description);
    text('venueName', this.venueName);
    text('city', this.city);
    if (this.date) body.date = this.date;
    if (this.startTime) body.startTime = this.startTime;
    if (this.endTime) body.endTime = this.endTime;
    if (opts.withTicketing) {
      body.ticketing = {
        ...(this.opensAt ? { salesOpensAt: localToIso(this.opensAt) } : {}),
        ...(this.closesAt ? { salesClosesAt: localToIso(this.closesAt) } : {}),
        ...(this.maxPerOrder ? { maxPerOrder: this.maxPerOrder } : {})
      };
    }
    if (opts.withCategories && catRows.length) {
      body.categories = catRows.map((c) => ({
        name: c.name.trim(),
        priceXof: c.price as number,
        quota: c.quota as number,
        ...(blank(c.conditions) ? {} : { conditions: c.conditions.trim() })
      }));
    }
    return { body, maps: { programme: progRows.map((r) => r.key), organizers: orgRows.map((r) => r.key), categories: catRows.map((c) => c.key) } };
  }

  /** Rattache les erreurs du serveur (`details.fields`) aux champs affichés. Renvoie celles sans champ visible. */
  applyServerErrors(fields: Record<string, string>, maps: { programme: number[]; organizers: number[]; categories: number[] }): string[] {
    const mapped: Errors = {};
    const orphans: string[] = [];
    for (const [path, message] of Object.entries(fields)) {
      const m = path.match(/^(programme|organizers|categories)\.(\d+)\.(.+)$/);
      if (m) {
        const k = maps[m[1] as keyof typeof maps][Number(m[2])];
        if (k !== undefined) { mapped[`${m[1]}.${k}.${m[3]}`] = message; continue; }
      }
      if (['title', 'description', 'date', 'startTime', 'endTime', 'venueName', 'city', 'ticketing.salesOpensAt', 'ticketing.salesClosesAt', 'ticketing.maxPerOrder'].includes(path)) mapped[path] = message;
      else orphans.push(message);
    }
    this.errors = mapped;
    return orphans;
  }
}
