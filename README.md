# JCI Comé Excellence — Administration (frontend)

SvelteKit 5 (runes) · SPA (`adapter-static`) · TypeScript · client API généré depuis `contrat/openapi.yaml`.

## Démarrer
```bash
npm install
cp .env.example .env      # renseigner VITE_API_URL, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
npm run dev               # http://localhost:5173
npm run check             # svelte-check (types)
npm run build             # génère ./build (fichiers statiques)
```
Si `VITE_SUPABASE_*` est vide en `npm run dev`, l'application passe en **mode démo** (profil Administrateur factice, aucun appel réseau). Dès que `.env` est renseigné, la vraie authentification s'applique. La page `/composants` (dev) est le catalogue des composants.

## Mettre à jour le contrat API
Déposer le nouveau `openapi.yaml` dans `contrat/`, puis `npm run api:types`. Les écarts apparaissent à la compilation (`npm run check`).

## Structure
```
src/
  styles/        tokens.css (thèmes clair/sombre repris de la maquette), base.css
  lib/
    api/         client.ts (openapi-fetch + unwrap + refresh 401), errors.ts, schema.d.ts (généré)
    components/  Button, Badge, Card, KpiCard, Field, SearchInput, Segmented, Pagination, Table, Modal,
                 Stepper, Tabs, Topbar, Toaster, EmptyState, ErrorState, ComingSoon, Icon…
    stores/      session (profil /me + can()), theme, toast
    utils/       format (XOF, dates heure du Bénin), labels (statuts → libellé/couleur), permissions
  routes/
    (app)/       zone connectée : layout + Topbar, tableau de bord, événements, vente physique, membres
    connexion/, mot-de-passe-oublie/, definir-mot-de-passe/   (hors zone connectée)
    lib/auth/    supabase.ts (client, « se souvenir de moi »), auth.svelte.ts (connexion, /me, déconnexion, mot de passe)
contrat/         openapi.yaml, GUIDE_FRONTEND.md, CHANGELOG.md (v0.2.0)
```

## Conventions
- Affichage/masquage selon `session.can('event.publish')` ; le serveur reste seul juge (403).
- Erreurs API : `unwrap(api.GET(...))` lève une `ApiError` (`code`, `message` FR, `fields` pour les 422).
- Données dont la route n'existe pas encore (guide §9) : bloc `ComingSoon`, jamais de chiffres recalculés côté client.
- Aucun `{@html}` sur des données de l'API.

## Feuille de route
1. ✅ Socle
2. ✅ Authentification
3. ✅ Événements : liste (tableau/cartes) et fiche (Informations, Billetterie, Paiements)
4. ✅ Création / modification d'un événement, affiches, catégories de billets
5. ✅ Vente physique
6. ✅ Membres (utilisateurs et rôles)
7. ✅ Billets (fichiers, renvoi), détail de commande, annulation de billet, clôture / annulation d'événement — contrat v0.3.0 
8. ✅ Participants (liste, filtres, export, fiche billet) — contrat v0.4.0 
9. ✅ Vue d'ensemble d'un événement — contrat v0.5.0 (ce zip)
10. Tableau de bord, participants, vue d'ensemble… au fil des routes livrées par le backend

## Authentification (étape 2)
- Connexion par le SDK Supabase, puis `GET /me` ; le profil et les permissions sont dans `session` (`session.can(...)`).
- 401 : un rafraîchissement de session puis une seule nouvelle tentative ; sinon retour à `/connexion?redirect=…`.
- 403 sur `/me` : le message du serveur est affiché, la session Supabase est fermée.
- « Se souvenir de moi » : coché → jeton dans `localStorage` (conservé) ; décoché → `sessionStorage` (effacé à la fermeture de l'onglet).
- Supabase doit autoriser, dans *Authentication → URL Configuration*, `<origine>/definir-mot-de-passe` comme URL de redirection (invitation et réinitialisation).

## Événements (étape 3)
- `/evenements` : onglets de statut (compteurs via `meta.statusCounts`), recherche, filtre billetterie, vue tableau/cartes (mémorisée), pagination. Le serveur filtre déjà selon les droits : rien n'est filtré côté client.
- `/evenements/[id]` : en-tête + onglets. Vue d'ensemble, Participants et Communication affichent « à venir » (routes non livrées). L'onglet Paiements n'apparaît que si `order.read`.
- Billetterie : fermer / rouvrir (permission `ticketing.manage`, événement publié). Brouillon : bouton Publier (permission `event.publish`), les champs manquants d'un 422 sont listés.
- `Resource` (`lib/utils/resource.svelte.ts`) : chargement réactif qui garde les données pendant un rechargement et ignore les réponses obsolètes.

## Création / modification (étape 4)
- `EventForm` sert aux deux écrans. Création : `POST /events` (toujours en brouillon, `publish:false`), puis envoi des affiches, puis `POST …/publish` si « Publier ». Un nouvel essai après échec partiel fait un `PATCH` (jamais de doublon).
- Validation locale avant tout appel ; erreurs 422 du serveur rattachées aux champs (`details.fields`, indices de lignes remappés car les lignes vides ne sont pas envoyées).
- Clôture de billetterie : préremplie à « la veille à 18h00 » (comme le serveur) tant qu'elle n'est pas modifiée. Dates de billetterie envoyées avec le décalage `+01:00`.
- Affiches : JPG/PNG, 2 Mo, 5 max ; à la création elles partent après l'événement (couverture choisie en premier) ; en modification, chaque action est immédiate.
- Catégories : saisies à la création, ensuite gérées dans l'onglet Billetterie (ajout, modification des champs changés, activation, suppression avec message si des billets sont vendus).
- Sortie de page avec modifications non enregistrées : confirmation.
- Routes : `evenements/[id]/(fiche)/…` (en-tête + onglets) et `evenements/[id]/modifier` (plein écran).

## Vente physique (étape 5)
- `/vente-physique` (permission `sale.create`) : assistant Billets → Participants → Paiement → Confirmation, avec récapitulatif fixe. Seuls les événements publiés dont la billetterie est ouverte sont proposés ; sinon état vide.
- Disponibilités lues sur `GET /events/{id}/ticketing` (`remaining`, `availability`). Maximum 10 billets par vente (contrat) ; la logique est dans `lib/features/saleWizard.svelte.ts`.
- `POST /physical-sales` : `Idempotency-Key` (UUID) créée à l'ouverture et **réutilisée** tant que la requête est identique (réseau coupé, double clic) ; 201 et 200 (rejeu) sont traités comme un succès. `paymentReceivedConfirmed: true` envoyé après la case de confirmation obligatoire.
- Le premier participant sert d'acheteur (le contrat exige un `buyer`). Téléphone et e-mail facultatifs ; `sendEmail` n'est vrai que si un e-mail est saisi.
- Erreurs : 422 rattachées aux champs (`tickets.N.…`, `buyer.email`, `paymentReference`), 409 `SALES_CLOSED` / `QUOTA_EXCEEDED` / `MAX_PER_ORDER_EXCEEDED` → retour à l'étape 1 et rechargement des disponibilités, 409 `DUPLICATE_REQUEST` → nouvelle clé.
- Mobile Money : la référence est exigée par l'interface (facultative côté contrat). À confirmer avec l'équipe métier.
- Fichiers des billets : voir « Billets et commandes (étape 7) ».

## Membres (étape 6)
- `/membres` (permission `user.manage`) : liste paginée avec recherche (`q`, côté serveur), badges de rôles (avec l'événement si le rôle est limité), statut Actif / Désactivé.
- Invitation : `POST /users` (au moins un rôle). `ADMIN` et `PRESIDENT` sont globaux ; les autres rôles proposent un événement (`eventScope = OWN_OR_ASSIGNED` lu sur `GET /roles`). Le compte reçoit un e-mail menant à `/definir-mot-de-passe`.
- Modification : `PATCH /users/{id}` n'envoie que les champs changés (e-mail non modifiable). Rôles (permission `role.manage`) : attribution et retrait appliqués immédiatement, avec confirmation avant retrait.
- Désactiver / réactiver / réinitialiser le mot de passe : confirmation puis `POST`. Pas de bouton « Désactiver » sur son propre compte ; le 409 du serveur (dernier administrateur) s'affiche dans la fenêtre.
- Le contrat n'offre pas de filtre par statut sur `GET /users` : il n'y en a donc pas dans l'interface (un filtre côté client fausserait la pagination).
- `Button` : nouvelle variante `danger`.

## Billets, commandes, événements (étape 7 — contrat v0.3.0)
- Le contrat est passé en **v0.3.0** (`contrat/`, types régénérés avec `npm run api:types`).
- `TicketActions` : boutons PDF / Image (`GET /tickets/{id}/files/{kind}`) et « Renvoyer » (`POST /tickets/{id}/resend`, permission `ticket.resend`, limite 5/heure → 429 expliqué). Le serveur répond **202** tant que les fichiers ne sont pas prêts : l'interface réessaie toutes les 2,5 s (30 s max) en affichant « Préparation… », puis propose un lien « Ouvrir ». Les URL sont signées (15 min) : jamais mémorisées.
- Écran de succès de la vente physique : fichiers et renvoi par billet.
- Détail d'une commande (onglet Paiements → « Détails », `GET /orders/{id}`) : acheteur, billets, paiements, rappel que le remboursement se fait dans FedaPay. Annulation d'un billet valide (`POST /tickets/{id}/cancel`, permission `ticket.cancel`, motif ≥ 3 caractères).
- Fiche événement : boutons **Clôturer** (`event.close`) et **Annuler l'événement** (`event.cancel`, motif obligatoire), pour un événement publié uniquement.
- À prévoir côté application publique (pas dans ce projet) : la page `/billet/:token` (cible du QR code) et les liens de téléchargement de `/commande/:reference` (guide §1 et §7.6).

## Participants (étape 8 — contrat v0.4.0)
- Onglet visible avec la permission `participant.read` (sinon masqué). `GET /events/{id}/participants` : recherche multi-mots (`q`), filtre catégorie, filtre de présence avec pastilles (`meta.counts`, qui ne bouge pas quand on clique), tri par nom / catégorie / billet / date d'achat, pagination. Le « N° » est le rang dans la liste.
- Statut d'e-mail (`emailStatus`) et de présence affichés en badges ; valeurs inconnues : libellé brut, jamais d'erreur.
- « Voir le billet » (`GET /tickets/{id}`) : titulaire, présence (qui a scanné, quand), commande et paiement, historique des e-mails, fichiers PDF / image et renvoi.
- Export CSV / Excel (permission `participant.export`) : `fetch` avec le jeton puis téléchargement du blob, avec les filtres et le tri en cours. 422 au-delà de 10 000 lignes : message et conseil d'affiner les filtres. Le PDF n'existe pas encore côté API.

## Vue d'ensemble (étape 9 — contrat v0.5.0)
- `GET /events/{id}/overview` : 4 KPI (recettes, visiteurs, billets émis / capacité, places restantes), ventes par catégorie (barre `vendus / quota`, réservations en cours, recettes), activité récente (10 derniers billets émis, scannés ou annulés, heure relative ; un clic ouvre la fiche du billet).
- Aucun calcul côté client : tout vient du serveur. Selon les droits, `revenueXof` peut être `null` (affiché « — », toujours le cas pour un brouillon) et `activity` peut être `null` (message « réservée »).
- Pas de bouton « Actualiser » (absent des maquettes) : la vue se recharge discrètement au retour sur l’onglet (après 30 s).
- Reste « à venir » côté API : tableau de bord global, présences, communication, exports PDF.

## Étape 10 — Tableau de bord (contrat v0.8.0)

Page `/` (permission `dashboard.view`, sinon « Accès restreint » avec lien vers la vente physique ou les événements) :
- **4 KPI** (`GET /dashboard`) : recettes (« — » si `null`, jamais « 0 »), taux de remplissage (« — » si `null`), billets émis, événements.
- **Ventes** : courbe lissée avec infobulle, boutons 7 / 30 jours (`range`). Sans droit financier la courbe passe automatiquement en nombre de billets.
- **Billets par catégorie** : anneau + légende (`ticketsByCategory`, « Autres » regroupé par l'API).
- **Derniers paiements** : `GET /payments` (11 par page, recherche acheteur/référence). Un 403 (pas de `finance.view`) affiche « Accès restreint » dans la carte.
- **Événements proches** (5 max, lien vers la fiche, progression « 142 sur 250 billets émis ») · **Ventes physiques récentes** (`GET /physical-sales?pageSize=3`, carte masquée si 403 ; « Voir tout » → `/vente-physique`).
- États : chargement (squelettes), erreur avec « Réessayer », vide (« Aucun événement pour le moment »).
- Le contrat embarqué passe de 0.5.0 à **0.8.0** (types régénérés : `npm run api:types`).

À noter : `GET /payments` ne filtre qu'un statut à la fois ; la carte affiche donc tous les statuts (y compris « En attente »), avec le badge de statut.

## Déploiement — Cloudflare Workers (`admin.jcicomee.org`)

Application monopage statique (`adapter-static`) servie par Cloudflare Workers (assets). `wrangler.jsonc` renvoie toute adresse inconnue vers `index.html` (routeur côté navigateur) et déclare le domaine `admin.jcicomee.org`.

1. **Git** : `git init -b main && git add . && git commit -m "Administration JCI"`, dépôt **privé**, `git remote add origin … && git push -u origin main`.
2. **Cloudflare** → Workers & Pages → *Import a repository*. Build : `npm run build` · Deploy : `npx wrangler deploy` · nom du Worker : `jci-admin`.
3. **Variables « Build »** (obligatoires : elles sont figées dans le code à la construction, y compris dans la CSP) : `VITE_API_URL=https://api.jcicomee.org`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (clé **anon** uniquement). Après un changement de variable : relancer un build.
4. **Supabase** → Authentication → URL Configuration : *Site URL* = `https://admin.jcicomee.org` ; *Redirect URLs* : `https://admin.jcicomee.org/definir-mot-de-passe` (invitations et réinitialisations).
5. **Backend** : CORS `https://admin.jcicomee.org`.
6. Test local sous Cloudflare : `npm run preview` ; sans Git : `npm run deploy` (après `npx wrangler login`).

Sécurité intégrée : CSP (scripts du site uniquement ; API et Supabase lues dans les variables), anti-iframe, HSTS, `noindex` partout (`robots.txt`, en-tête, balise). Le thème clair/sombre suit automatiquement le système (aucun réglage manuel).

## Étape 12 — Documents de l'événement
Onglet « Informations », bloc **Documents** : `GET /events/{id}/reports` (4 cartes, grisées si `available: false`) et `GET /events/{id}/reports/{kind}` (PDF téléchargé via `fetch` + jeton). Contrat v0.12.0.
