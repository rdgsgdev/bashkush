# Bashkush — Plan de tests fonctionnels, E2E & non-régression (en vue d'une automatisation Playwright)

> **Document QA de référence** — Aucun code ici : chaque scénario est décrit en langage métier (préconditions, pas à pas, résultat attendu) pour être ensuite traduit en specs Playwright.
> Application testée : frontend React 18 + Vite (`http://localhost:5173`), backend Express (`http://localhost:4000`), auth Supabase, application 100 % francophone, mobile-first.

---

## 1. Contexte et périmètre

### 1.1 Périmètre couvert

| Module | Description |
|---|---|
| Authentification (`/login`) | Connexion, inscription, mot de passe oublié, Google OAuth, gardes de routes |
| Onboarding (`/onboarding`) | Assistant 7 étapes à la première connexion |
| Navigation | Header, burger menu (mobile), SideNav (desktop), badges, déconnexion |
| Accueil (`/`) | Section « À préparer », carrousel « Mes plats », aperçu « À acheter » |
| Carrousel plats | Scroll tactile custom, flèches, snap, wheel desktop |
| Mes plats (`/meals`) | Recherche, filtres, tri, favoris, cartes |
| CRUD plat | Création manuelle, édition, import JSON, photo, suppression |
| Génération IA | Formulaire, polling job, chat de raffinement, session persistée |
| Planification | Modale 2 étapes, DateRangePicker, statuts, étapes cochables |
| Calendrier (`/calendar`) | Vue mensuelle, plats du jour, deep links |
| Liste de courses (`/grocery`) | Onglets, cocher/éditer/supprimer, archivage, drag & drop, article manuel |
| Profil (`/profil`) | Objectifs, auto-save, photo, famille, suppression de compte |
| Paramètres (`/parametres`) | Listes paramétrables (catégories, unités, magasins, rayons, types), toggles IA |
| Offline / synchronisation | File d'actions IndexedDB, SyncBanner, pull-to-refresh |
| Responsive | Mobile < 640 px, tablette 768–1023 px, desktop ≥ 1024 px |

### 1.2 Hors périmètre (pour l'instant)

- Tests de charge / performance.
- Tests du backend Express en direct (couverts indirectement via l'UI ; une suite API séparée pourra être ajoutée).
- Google OAuth complet (redirection vers un compte Google réel) — seul le déclenchement est testé.
- Temps réel multi-onglets Socket.io : couvert par un seul parcours E2E à 2 contextes.

---

## 2. Stratégie de test

### 2.1 Types de tests

- **Fonctionnel (F)** : vérifie une fonctionnalité isolée, à partir de l'état nécessaire (arrange rapide via deep links ou API).
- **Bout en bout (E2E)** : parcours utilisateur complet traversant plusieurs modules, au plus proche du vrai usage.
- **Non-régression (NR)** : sous-ensemble restreit, exécuté à chaque changement, ciblant les zones récemment modifiées (voir §6) + les chemins critiques.

### 2.2 Priorisation

| Priorité | Définition | Règle d'exécution |
|---|---|---|
| **P1 — Critique** | Chemin critique : login, CRUD plat, planification, liste de courses. Bloque la release si échec. | Smoke + NR + CI à chaque commit/PR |
| **P2 — Important** | Fonctionnalités secondaires mais visibles : filtres, profil, paramètres, offline, responsive | NR étendue / nightly |
| **P3 — Secondaire** | Confort, edge cases rares, accessibilité approfondie | À la demande / release |

### 2.3 Environnements et prérequis

- **Frontend** : `npm run dev` → `http://localhost:5173` (port fixe).
- **Backend** : démarré sur `http://localhost:4000` (sauf scénarios offline explicites). Sonde `/api/health` utilisée par l'app.
- **Base** : Supabase PostgreSQL partagée — les tests doivent créer leurs données de test et les nettoyer (pas de dépendance à des données préexistantes, hors seed des rayons).
- **Comptes de test requis** (à provisionner côté Supabase, voir Annexe B) :
  - `qa-user1@bashkush.test` — onboardé, avec plats/plans/courses.
  - `qa-user2@bashkush.test` — onboardé, « vierge » de données.
  - `qa-new@bashkush.test` — inexistant, pour l'inscription (à recréer/nettoyer).
  - Selon la config Supabase, l'inscription peut nécessiter une confirmation email → le test doit détecter la notice « Compte créé! Vérifiez votre boîte de réception… ».

### 2.4 Exigences d'automatisation Playwright (à respecter dès la première spec)

Ces contraintes découlent de l'analyse du code — **elles conditionnent la fiabilité de toute la suite** :

1. **Service worker PWA actif même en dev** → bloquer les service workers dans le contexte de test (option « block ») pour éviter tout caching parasite entre tests.
2. **IndexedDB persistant** (cache React Query `bashkush-cache`, file offline `bashkush-offline`, sessions IA `bashkush-ai`) → **contexte navigateur frais par test** ; ne jamais réutiliser un contexte entre deux scénarios.
3. **Session Supabase en localStorage** → utiliser la sauvegarde/restauration de l'état de stockage (« storageState ») pour les tests derrière authentification (login une seule fois, réutilisé), sauf scénarios d'auth eux-mêmes.
4. **`window.confirm()` natifs** (~7 usages) → intercepter les dialogues natifs et accepter/refuser selon le scénario.
5. **Deux viewport structurels** : `< 1024 px` (burger, bottom-sheets, pull-to-refresh) vs `≥ 1024 px` (SideNav, panneau latéral droit au lieu des modales) → définir au minimum deux projets Playwright (mobile ~390×844, desktop ~1440×900) + un projet tablette (820×1180) pour la NR responsive.
6. **Animations & inertie** (carrousel, snap, pull-to-refresh, heart-pop) → privilégier les attentes sur l'état final (assertion de visibilité/attribut) plutôt que des timings ; désactiver les animations si un flag le permet.
7. **Drag & drop tactile-first** (PointerSensor, long-press 250 ms, tolérance 8 px) → simuler des événements pointeur maintenus ; le clavier (KeyboardSensor) est aussi actif et plus stable en desktop.
8. **Deep links par query params** (`?details=`, `?plan=`, `?meal=manual`, `?date=`) → à utiliser massivement pour ouvrir les modales directement et raccourcir l'arrange.
9. **Temps réel Socket.io** → pour les tests multi-utilisateurs, utiliser 2 contextes (ou 2 pages) dans le même test.
10. **Anti-rebonds / polling** : apports IA (700 ms), auto-save profil (600 ms), polling job IA (3 s), refresh min. pull-to-refresh (500 ms) → attentes explicites avec timeout ≥ 5 s sur les effets attendus.

### 2.5 Convention d'écriture

Chaque scénario : `ID — Titre` · Type (F/E2E) · Priorité · Préconditions · Pas à pas numéroté · Résultat attendu.
Les libellés entre guillemets (« … ») sont les **textes exacts FR présents dans l'UI** — à utiliser comme sélecteurs prioritaires (voir Annexe A).

---

## 3. Scénarios — Authentification (`/login`)

### AUTH-01 — Connexion avec des identifiants valides
- **Type** : F · **Priorité** : P1 · **Viewport** : mobile + desktop
- **Préconditions** : compte `qa-user1` existant et onboardé ; utilisateur déconnecté.
- **Pas à pas** :
  1. Naviguer vers `/login`.
  2. Renseigner `#email` avec l'email du compte test.
  3. Renseigner `#password` avec le mot de passe valide.
  4. Cliquer sur « Se connecter ».
- **Résultat attendu** : redirection automatique vers `/` ; le header/burger affiche le nom de l'utilisateur ; aucune erreur affichée.

### AUTH-02 — Connexion avec un mot de passe invalide
- **Type** : F · **Priorité** : P1 · **Viewport** : mobile
- **Préconditions** : compte existant.
- **Pas à pas** : renseigner un email valide + un mot de passe erroné → « Se connecter ».
- **Résultat attendu** : bandeau d'erreur rouge avec un message compréhensible traduit (identifiants invalides) ; l'utilisateur reste sur `/login`.

### AUTH-03 — Validation client : email vide
- **Type** : F · **Priorité** : P2
- **Pas à pas** : laisser `#email` vide, renseigner le mot de passe → soumettre.
- **Résultat attendu** : message « Veuillez entrer votre adresse courriel. » ; aucune requête d'authentification envoyée.

### AUTH-04 — Validation client : mot de passe trop court
- **Type** : F · **Priorité** : P2
- **Pas à pas** : email valide + mot de passe de 5 caractères → soumettre.
- **Résultat attendu** : message « Le mot de passe doit contenir au moins 6 caractères. »

### AUTH-05 — Bascule de visibilité du mot de passe
- **Type** : F · **Priorité** : P2
- **Pas à pas** :
  1. Saisir un mot de passe dans `#password`.
  2. Cliquer sur le bouton œil (`aria-label` « Afficher le mot de passe »).
  3. Recliquer (`aria-label` devenu « Masquer le mot de passe »).
- **Résultat attendu** : le mot de passe passe de masqué à visible puis l'inverse ; l'`aria-label` bascule à chaque clic.

### AUTH-06 — Inscription d'un nouveau compte
- **Type** : F · **Priorité** : P1
- **Préconditions** : email jamais utilisé (`qa-new`).
- **Pas à pas** : sur `/login`, cliquer « Pas encore de compte? S'inscrire » → renseigner email + mot de passe (≥ 6 car.) → « S'inscrire ».
- **Résultat attendu** : soit notice verte « Compte créé! Vérifiez votre boîte de réception… » **et** bascule automatique en mode connexion, soit (si confirmation désactivée) session créée et redirection `/onboarding`.

### AUTH-07 — Inscription avec un email déjà existant
- **Type** : F · **Priorité** : P2
- **Pas à pas** : tenter une inscription avec `qa-user1`.
- **Résultat attendu** : bandeau rouge avec l'erreur traduite (compte existant) ; pas de navigation.

### AUTH-08 — Mot de passe oublié : envoi du lien
- **Type** : F · **Priorité** : P2
- **Pas à pas** :
  1. En mode connexion, cliquer « Mot de passe oublié? ».
  2. Vérifier que le champ mot de passe disparaît et que le bouton devient « Envoyer le lien ».
  3. Renseigner l'email → « Envoyer le lien ».
- **Résultat attendu** : notice verte « Si un compte existe pour ce courriel, un lien de réinitialisation vient d'être envoyé. » (message identique que le compte existe ou non — ne pas divulguer l'existence du compte).

### AUTH-09 — Mot de passe oublié : retour à la connexion
- **Type** : F · **Priorité** : P3
- **Pas à pas** : depuis le mode « forgot », cliquer « Retour à la connexion ».
- **Résultat attendu** : retour au formulaire de connexion complet (email + mot de passe), lien « Mot de passe oublié? » à nouveau présent.

### AUTH-10 — Continuer avec Google (déclenchement)
- **Type** : F · **Priorité** : P3 (smoke)
- **Pas à pas** : cliquer « Continuer avec Google ».
- **Résultat attendu** : initiation du parcours OAuth Google (popup/redirect vers Google) — le test s'arrête au domaine Google, pas besoin d'aller plus loin. Vérifier aussi l'état pending (« Connexion… ») au clic.

### AUTH-11 — Utilisateur déjà connecté accédant à `/login`
- **Type** : F · **Priorité** : P1 (garde de route)
- **Préconditions** : session active (storageState).
- **Pas à pas** : naviguer directement vers `/login`.
- **Résultat attendu** : redirection immédiate vers `/`.

### AUTH-12 — Utilisateur non connecté accédant à une page protégée
- **Type** : F · **Priorité** : P1 (garde de route)
- **Cas** : `/`, `/meals`, `/calendar`, `/grocery`, `/profil`, `/parametres` (paramétrable, itérer sur les 6).
- **Résultat attendu** : redirection vers `/login` pour chaque route.

### AUTH-13 — Connexion d'un utilisateur non onboardé
- **Type** : F · **Priorité** : P1
- **Préconditions** : compte avec session valide mais sans `onboardedAt`.
- **Pas à pas** : se connecter avec ce compte.
- **Résultat attendu** : redirection vers `/onboarding` (et non `/`).

### AUTH-14 — États pending lors de la soumission
- **Type** : F · **Priorité** : P3
- **Pas à pas** : ralentir/intercepter la requête d'auth ; soumettre le formulaire.
- **Résultat attendu** : bouton désactivé + libellé dynamique « Connexion… » / « Inscription… » / « Envoi… » selon le mode ; pas de double soumission possible.

### AUTH-15 — Bascules connexion ↔ inscription
- **Type** : F · **Priorité** : P2
- **Pas à pas** : alterner via « Pas encore de compte? S'inscrire » puis « Déjà un compte? Se connecter ».
- **Résultat attendu** : le panneau bascule ; le libellé du bouton, l'`autocomplete` du mot de passe (`current-password` vs `new-password`) et la présence du lien « Mot de passe oublié? » (connexion uniquement) sont cohérents à chaque état.

### AUTH-16 — Rendu responsive de la page login
- **Type** : F · **Priorité** : P2 (NR — page récemment refondue)
- **Pas à pas** : capturer `/login` en 390 px, 768 px, 1440 px.
- **Résultat attendu** : < 768 px = formulaire seul ; ≥ 768 px = vue scindée avec l'illustration `/logo_illustration.png` à droite ; logo horizontal vert/noir visible en haut dans tous les cas ; paddings resserrés en paysage mobile.

---

## 4. Scénarios — Onboarding (`/onboarding`)

### ONB-01 — Démarrage de l'assistant
- **Type** : F · **Priorité** : P1
- **Préconditions** : session valide, profil sans `onboardedAt`.
- **Pas à pas** : naviguer vers `/` (redirection attendue).
- **Résultat attendu** : affichage de `/onboarding`, en-tête « Étape 1/7 », barre de progression à 0/7 %, boutons « Retour » (désactivé à l'étape 1), « Passer » et « Continuer ».

### ONB-02 — Navigation avant/arrière dans les étapes
- **Type** : F · **Priorité** : P1
- **Pas à pas** : compléter l'étape 1 → « Continuer » → « Retour ».
- **Résultat attendu** : l'étape 2 s'affiche (« Étape 2/7 », progression ~14 %) ; le retour réaffiche l'étape 1 **avec les valeurs précédemment saisies conservées**.

### ONB-03 — Bouton « Passer » vide l'étape
- **Type** : F · **Priorité** : P2
- **Pas à pas** : saisir des données à l'étape 1 → naviguer étape 2 → « Retour » → « Passer ».
- **Résultat attendu** : passage à l'étape suivante ; au retour, les champs de l'étape 1 sont vidés.

### ONB-04 — Sélections des choix (radio / chips)
- **Type** : F · **Priorité** : P1
- **Pas à pas** : sur les étapes à choix (corpulence, activité, objectifs, santé, alimentation) : sélectionner une option `SingleChoice`, plusieurs options `MultiChoice`.
- **Résultat attendu** : une seule carte sélectionnable à la fois en choix unique ; plusieurs chips activables en choix multiple ; les sélections sont prises en compte à la fin (persistées dans le profil).

### ONB-05 — Progression cohérente sur les 7 étapes
- **Type** : F · **Priorité** : P2
- **Pas à pas** : dérouler les 7 étapes en notant l'en-tête et la barre à chaque étape.
- **Résultat attendu** : « Étape n/7 » exact à chaque écran, progression croissante continue, dernier bouton libellé « Terminer ».

### ONB-06 — Terminaison → accueil
- **Type** : F · **Priorité** : P1
- **Pas à pas** : compléter jusqu'à « Terminer ».
- **Résultat attendu** : sauvegarde du profil avec `onboardedAt`, redirection vers `/` ; une nouvelle navigation vers `/onboarding` redirige vers `/`.

### ONB-07 — Accès direct à `/onboarding` déjà onboardé
- **Type** : F · **Priorité** : P1 (garde)
- **Préconditions** : `qa-user1` (onboardé).
- **Résultat attendu** : redirection vers `/`.

### ONB-08 — Erreur de sauvegarde à la fin
- **Type** : F · **Priorité** : P2
- **Pas à pas** : couper le backend juste avant « Terminer ».
- **Résultat attendu** : bandeau rouge d'erreur, pas de redirection ; reconnexion du backend puis nouvelle soumission réussit.

---

## 5. Scénarios — Navigation & menus

### NAV-01 — Ouverture/fermeture du menu burger (mobile)
- **Type** : F · **Priorité** : P1 · **Viewport** : mobile uniquement
- **Pas à pas** :
  1. Cliquer le bouton burger (`aria-label` « Ouvrir le menu »).
  2. Fermer via le backdrop, puis rouvrir et fermer avec la touche Échap.
- **Résultat attendu** : drawer latéral gauche (~78 % largeur) sur fond vert : logo blanc, liens Accueil / Mes plats / Calendrier / Liste de courses / Paramètres, bouton « Déconnexion », carte profil, version « Bashkush · v1.0 » ; fermeture effective par backdrop et Échap.

### NAV-02 — Navigation depuis le drawer
- **Type** : F · **Priorité** : P1
- **Pas à pas** : ouvrir le burger → cliquer successivement chaque lien.
- **Résultat attendu** : chaque clic navigue vers la bonne route, ferme le drawer, et la carte profil/lien actif porte l'anneau de sélection.

### NAV-03 — Badges du drawer
- **Type** : F · **Priorité** : P2
- **Préconditions** : compte avec N plats (N > 0) et M articles non cochés (M > 0).
- **Pas à pas** : ouvrir le drawer ; créer un plat via l'UI ; rouvrir le drawer.
- **Résultat attendu** : badges = nombre de plats et nombre d'articles à acheter, mis à jour après création ; (desktop SideNav : badge plafonné à « 99+ » si > 99).

### NAV-04 — Carte profil du menu
- **Type** : F · **Priorité** : P2
- **Résultat attendu** : photo (ou initiale) + nom + email de l'utilisateur connecté affichés dans burger et SideNav.

### NAV-05 — Déconnexion
- **Type** : F · **Priorité** : P1
- **Pas à pas** : se connecter → ouvrir le menu → « Déconnexion ».
- **Résultat attendu** : redirection vers `/login` ; session, file offline et caches purgés ; une navigation directe vers `/` redirige vers `/login` ; le login précédent n'est pas pré-rempli avec un état connecté.

### NAV-06 — SideNav desktop et absence de burger
- **Type** : F · **Priorité** : P1 · **Viewport** : desktop uniquement
- **Résultat attendu** : à ≥ 1024 px : SideNav visible (largeur 256 px), burger absent ; les mêmes liens/badges que le drawer sont présents.

### NAV-07 — Repli/dépli de la SideNav
- **Type** : F · **Priorité** : P2 · **Viewport** : desktop
- **Pas à pas** : survoler la SideNav pour révéler le bouton flottant → cliquer « Replier le menu » → naviguer vers une autre page → revenir.
- **Résultat attendu** : la SideNav passe en mode compact (76 px, icônes seules) ; l'état **persiste** entre les navigations (localStorage) ; le bouton permet de déplier à nouveau.

### NAV-08 — Route inconnue → accueil
- **Type** : F · **Priorité** : P2
- **Pas à pas** : naviguer vers `/route-inexistante`.
- **Résultat attendu** : redirection vers `/`.

### NAV-09 — Panneau latéral droit (DesktopPanel)
- **Type** : F · **Priorité** : P1 · **Viewport** : desktop
- **Pas à pas** : visiter `/meals` et cliquer une carte plat → observer le panneau droit ; visiter `/`, `/profil`, `/parametres`.
- **Résultat attendu** : sur `/meals`, `/calendar`, `/grocery` le panneau affiche la vue détaillée (au lieu d'une modale) + un message d'attente contextuel quand rien n'est sélectionné ; le panneau est **absent** sur `/`, `/profil`, `/parametres`.

### NAV-10 — Header par page
- **Type** : F · **Priorité** : P2
- **Résultat attendu** : titre/sous-titre spécifiques sur chaque page (Mes plats, Calendrier, etc.) ; sur l'accueil mobile : logo inline ; boutons d'action (« Ajouter » sur /meals, « Planifier » sur /calendar) présents, avec libellé complet dès 400 px (`xs`).

---

## 6. Scénarios — Accueil (`/`)

### HOME-01 — Section « À préparer » : contenu et limites
- **Type** : F · **Priorité** : P1
- **Préconditions** : compte avec ≥ 5 plans `a_faire` et ≥ 5 plans `en_preparation`.
- **Résultat attendu** : deux groupes dans l'ordre « En préparation » puis « À faire », **maximum 4 cartes par groupe**, tri du plus proche au plus lointain ; chaque carte affiche image, nom, dates « Du X au Y », portions, type, badge statut coloré (ambre « À faire », sky « En préparation », emerald « Préparé »), compteur « n/m étapes ».

### HOME-02 — Ouverture du détail d'un plan (mobile)
- **Type** : F · **Priorité** : P1 · **Viewport** : mobile
- **Pas à pas** : cliquer une carte de « À préparer ».
- **Résultat attendu** : ouverture de la modale de détails (bottom-sheet) du plat planifié.

### HOME-03 — Ouverture du détail d'un plan (desktop)
- **Type** : F · **Priorité** : P1 · **Viewport** : desktop
- **Pas à pas** : cliquer une carte de « À préparer ».
- **Résultat attendu** : navigation vers `/calendar?date=…&recipe=<planId>` (pas de modale) ; la carte porte un anneau de sélection.

### HOME-04 — Carrousel « Mes plats » : rendu
- **Type** : F · **Priorité** : P1
- **Préconditions** : ≥ 3 plats.
- **Résultat attendu** : liste horizontale de cartes (image ou placeholder dégradé + 🍽️ selon la longueur du nom, nom max 2 lignes, temps, difficulté, bouton favori) ; **première tuile pointillée « Ajouter un plat »** sur l'accueil.

### HOME-05 — Tuile « Ajouter un plat »
- **Type** : F · **Priorité** : P1
- **Pas à pas** : cliquer la tuile « Ajouter un plat ».
- **Résultat attendu** : ouverture de la modale de choix du mode (IA vs Manuel).

### HOME-06 — Clic sur une carte du carrousel
- **Type** : F · **Priorité** : P1
- **Pas à pas** : cliquer une carte plat du carrousel.
- **Résultat attendu** : le détail du plat s'ouvre (modale mobile / panneau desktop).

### HOME-07 — Aperçu « À acheter »
- **Type** : F · **Priorité** : P1
- **Préconditions** : ≥ 8 articles non cochés.
- **Résultat attendu** : exactement 6 articles non cochés affichés max ; un contrôle permet d'accéder à `/grocery`.

### HOME-08 — États vides de l'accueil
- **Type** : F · **Priorité** : P2
- **Préconditions** : compte vierge (`qa-user2`).
- **Résultat attendu** : « Aucun plat à préparer » et « Rien à acheter » affichés (avec leurs appels à l'action), sans erreur console bloquante.

### HOME-09 — SyncBanner en tête
- **Type** : F · **Priorité** : P2 (lié à OFF-01)
- **Résultat attendu** : le bandeau de synchronisation (`role="status"`) apparaît/disparaît en tête de page selon l'état réseau (détails en §17).

---

## 7. Scénarios — Carrousel (module critique — correctif récent)

### CAR-01 — Défilement tactile avec snap
- **Type** : F · **Priorité** : P1 · **Viewport** : mobile
- **Pas à pas** : effectuer un swipe horizontal sur le carrousel (pointer down → move → release).
- **Résultat attendu** : le carrousel suit le doigt, glisse avec inertie puis **s'aligne exactement** sur la carte la plus proche (snap) ; aucune carte coupée en milieu de vue après arrêt.

### CAR-02 — Verrouillage directionnel du drag
- **Type** : F · **Priorité** : P2
- **Pas à pas** : initier un mouvement majoritairement vertical de 30 px avec 5 px de dérive horizontale.
- **Résultat attendu** : le carrousel ne défile pas (seuil directionnel 8 px) ; le scroll vertical de la page reste possible.

### CAR-03 — Flèches : visibilité conditionnelle
- **Type** : F · **Priorité** : P1 (NR)
- **Pas à pas** : comparer 390 px vs 1440 px avec 3 plats, puis 1440 px avec 2 plats.
- **Résultat attendu** : flèches « Précédent »/« Suivant » (`aria-label`) **visibles uniquement si > 2 plats ET viewport ≥ 640 px** ; masquées sinon.

### CAR-04 — Clic flèche = avancer d'une carte
- **Type** : F · **Priorité** : P1 (NR — correctif scroll)
- **Préconditions** : ≥ 4 plats, viewport ≥ 640 px.
- **Pas à pas** : noter la première carte visible → cliquer « Suivant » → cliquer « Précédent ».
- **Résultat attendu** : chaque clic avance/recule **d'exactement une carte** (snap sur la carte suivante), pas d'un pas fixe en pixels ; arrivé en début de liste, « Précédent » ne fait rien (et inversement en fin).

### CAR-05 — Molette desktop
- **Type** : F · **Priorité** : P2 · **Viewport** : desktop
- **Pas à pas** : survoler le carrousel et émettre plusieurs évènements wheel rapprochés, puis attendre.
- **Résultat attendu** : le snap ne se produit qu'après ~140 ms d'inactivité de molette (pas de tremblement pendant le scroll continu).

### CAR-06 — Surlignage de la carte sélectionnée
- **Type** : F · **Priorité** : P2
- **Pas à pas** : ouvrir la modale de planification (qui utilise `selectedId`).
- **Résultat attendu** : la carte du plat sélectionné porte un anneau de surlignage distinct.

### CAR-07 — Défilement programmatique vers un plat
- **Type** : F · **Priorité** : P2
- **Pas à pas** : déclencher le scroll vers un plat éloigné (ex. via la modale de planification / `scrollToId`).
- **Résultat attendu** : le carrousel défile jusqu'à rendre la carte cible visible ; la page défile aussi jusqu'à `[data-meal-id]` si applicable.

### CAR-08 — Accessibilité du carrousel
- **Type** : F · **Priorité** : P3
- **Résultat atteint** : flèches opérables au clavier (Tab + Entrée) avec `aria-label` « Précédent »/« Suivant » ; les cartes sont atteignables au clavier.

---

## 8. Scénarios — Mes plats : liste, recherche, filtres (`/meals`)

### ML-01 — Affichage de la grille
- **Type** : F · **Priorité** : P1
- **Préconditions** : ≥ 5 plats avec métadonnées variées.
- **Résultat attendu** : une carte par plat (vignette 64 px, nom, temps, nb d'ingrédients, bouton favori à droite) ; sous-titre « n sur total plats » cohérent ; effet `active:scale` au press.

### ML-02 — Recherche insensible à la casse et aux accents
- **Type** : F · **Priorité** : P1
- **Pas à pas** : chercher « bol », « BOL », « méditerrANéen » pour un plat nommé « Bol méditerranéen… ».
- **Résultat attendu** : les 3 requêtes retournent le plat ; le compteur se met à jour ; la liste se filtre en direct.

### ML-03 — Effacement de la recherche
- **Type** : F · **Priorité** : P2
- **Pas à pas** : saisir une requête sans résultat → cliquer le bouton d'effacement (`aria-label` « Effacer la recherche »).
- **Résultat attendu** : champ vidé, liste complète restaurée.

### ML-04 — Tri des plats
- **Type** : F · **Priorité** : P1
- **Pas à pas** : appliquer successivement les 3 options du select (`aria-label` « Trier les plats ») : Récents / Nom A–Z / Le plus rapide.
- **Résultat attendu** : ordre des cartes conforme à chaque option (création décroissante ; alphabétique insensible aux accents ; temps total croissant).

### ML-05 — Chips de difficulté et favoris
- **Type** : F · **Priorité** : P1
- **Pas à pas** : activer « Favoris » puis « Facile » / « Moyen » / « Difficile » seuls.
- **Résultat attendu** : filtrage correct (favoris = plats marqués ; difficulté = correspondance exacte) ; chip active visuellement distincte.

### ML-06 — Filtre par catégorie
- **Type** : F · **Priorité** : P2
- **Résultat attendu** : les chips catégories reflètent les catégories des paramètres ; seules les cartes de la catégorie s'affichent.

### ML-07 — Chip « Réinitialiser »
- **Type** : F · **Priorité** : P2
- **Pas à pas** : activer un filtre → vérifier la présence de « Réinitialiser » → cliquer.
- **Résultat attendu** : tous filtres/recherche/tri réinitialisés ; la chip disparaît quand aucun filtre n'est actif.

### ML-08 — États vides
- **Type** : F · **Priorité** : P2
- **Cas** : (a) 0 plat au total → « Aucun plat » + CTA « Créer un plat », barre de filtres masquée ; (b) filtres sans résultat → « Aucun résultat » + « Réinitialiser les filtres ».
- **Résultat attendu** : messages exacts, actions fonctionnelles.

### ML-09 — Favori : ajout/retrait depuis la liste
- **Type** : F · **Priorité** : P1
- **Pas à pas** : cliquer le cœur (`aria-label` « Ajouter aux favoris ») d'un plat non favori → re-cliquer (« Retirer des favoris »).
- **Résultat attendu** : état basculé immédiatement (mutation optimiste, animation cœur), persistant après rechargement ; cohérent avec le filtre « Favoris ».

### ML-10 — Clic carte → détails + deep link
- **Type** : F · **Priorité** : P1
- **Pas à pas** : cliquer une carte → observer l'URL → recharger la page telle quelle.
- **Résultat attendu** : l'URL porte `?details=<id>` ; le rechargement rouvre directement la vue détaillée du même plat ; fermeture retire le paramètre.

### ML-11 — Grille responsive
- **Type** : F · **Priorité** : P2 (NR tablette)
- **Résultat attendu** : 1 colonne < 640 px, **2 colonnes entre 640 et 1023 px**, liste/panneau desktop ≥ 1024 px.

---

## 9. Scénarios — CRUD plat

### MC-01 — Modale de choix du mode
- **Type** : F · **Priorité** : P1
- **Pas à pas** : depuis `/meals`, cliquer « Ajouter » (ou deep link `?meal=new`).
- **Résultat attendu** : modale proposant Génération IA vs Création manuelle ; l'option IA est désactivée avec mention « — connexion requise. » hors ligne ou « — désactivée dans les paramètres. » si le toggle famille est off.

### MC-02 — Création manuelle minimale
- **Type** : F · **Priorité** : P1
- **Pas à pas** : `?meal=manual` → renseigner uniquement le nom → enregistrer.
- **Résultat attendu** : plat créé, visible en tête de `/meals` (tri « Récents ») ; la modale se ferme ; les champs optionnels vides ne bloquent pas.

### MC-03 — Nom obligatoire
- **Type** : F · **Priorité** : P1
- **Pas à pas** : soumettre la création sans nom.
- **Résultat attendu** : erreur « Le nom du plat est obligatoire. » ; aucune requête de création.

### MC-04 — Portions (1–20) et rescaling des quantités
- **Type** : F · **Priorité** : P1
- **Pas à pas** : créer un plat avec 2 ingrédients quantifiés pour 4 portions ; passer le stepper à 8 (« Augmenter »/« Diminuer », `aria-label`) ; tenter 0 et 21.
- **Résultat attendu** : quantités multipliées par 2 lors du passage 4 → 8 ; bornes 1 et 20 respectées.

### MC-05 — Ingrédients : ajout/suppression/options
- **Type** : F · **Priorité** : P1
- **Pas à pas** : ajouter 2 ingrédients (nom, qté, unité, rayon, marque « optionnel », note) → en supprimer un → enregistrer.
- **Résultat attendu** : lignes ajoutées/supprimées correctement, données persistées dans le détail du plat.

### MC-06 — Apports nutritionnels auto-remplis (IA)
- **Type** : F · **Priorité** : P2
- **Pas à pas** : saisir un ingrédient quantifié et patienter > 1 s (debounce 700 ms).
- **Résultat attendu** : le bloc repliable « Apports » se remplit automatiquement (spinner pendant l'appel) pour l'ingrédient.

### MC-07 — Étapes numérotées
- **Type** : F · **Priorité** : P1
- **Pas à pas** : ajouter 3 étapes (instruction + temps) → réordonner/supprimer → enregistrer.
- **Résultat attendu** : numérotation continue 1, 2, 3 dans le détail du plat ; temps affichés.

### MC-08 — Édition d'un plat existant
- **Type** : F · **Priorité** : P1
- **Pas à pas** : ouvrir `?meal=<id>` → modifier nom, description, difficulté, prépa/cuisson (total recalculé) → enregistrer.
- **Résultat attendu** : modifications visibles dans la liste et le détail ; deep link d'édition recharge la modale pré-remplie.

### MC-09 — Import JSON valide
- **Type** : F · **Priorité** : P2
- **Pas à pas** : joindre un fichier JSON d'export de plat.
- **Résultat attendu** : champs pré-remplis avec le contenu du fichier (nom, ingrédients, étapes…).

### MC-10 — Import JSON invalide
- **Type** : F · **Priorité** : P2
- **Pas à pas** : joindre un fichier JSON malformé.
- **Résultat attendu** : message « Fichier JSON invalide… » ; aucun champ modifié.

### MC-11 — Photo de plat
- **Type** : F · **Priorité** : P2
- **Pas à pas** : uploader une image en création → vérifier l'affichage carte/détail ; vérifier le bouton désactivé hors ligne.
- **Résultat attendu** : image téléversée, miniature à jour ; contrôle désactivé avec indication hors ligne.

### MC-12 — Suppression d'un plat
- **Type** : F · **Priorité** : P1
- **Pas à pas** : depuis l'édition d'un plat, déclencher la suppression → accepter le `confirm()` natif.
- **Résultat attendu** : plat retiré de la liste immédiatement ; rechargement confirme la suppression côté serveur.

### MC-13 — Annulation de suppression
- **Type** : F · **Priorité** : P2
- **Pas à pas** : même chose en refusant le `confirm()`.
- **Résultat attendu** : le plat est toujours présent.

### MC-14 — Fermeture des modales
- **Type** : F · **Priorité** : P2
- **Pas à pas** : fermer la modale d'édition via X (`aria-label` « Fermer »), puis Échap, puis backdrop (mobile).
- **Résultat attendu** : fermeture dans les 3 cas, sans sauvegarde des saisies non validées ; le scroll de la page est rétabli.

---

## 10. Scénarios — Génération IA d'un plat

### AI-01 — Formulaire de génération
- **Type** : F · **Priorité** : P1
- **Pas à pas** : ouvrir `?meal=ai`.
- **Résultat attendu** : formulaire complet : sélecteur de membres (cartes avec kcal/protéines/allergies, tag « (moi) »), portions, difficulté, catégorie, chips d'ingrédients souhaités, description libre.

### AI-02 — Génération, polling et aperçu
- **Type** : F · **Priorité** : P1
- **Pas à pas** : remplir le formulaire → lancer la génération.
- **Résultat attendu** : état « Génération du plat en cours… » pendant le job (polling serveur ~3 s), puis aperçu structuré du plat généré (via le composant de détail) sans blocage de l'UI.

### AI-03 — Chat de raffinement
- **Type** : F · **Priorité** : P2
- **Pas à pas** : demander une modification en langage naturel (ex. « sans gluten ») → cliquer une bulle de réponse.
- **Résultat attendu** : la conversation s'enrichit ; le clic sur une bulle la copie et affiche l'indicateur « Copié » ; l'aperçu reflète les ajustements.

### AI-04 — Enregistrement du plat généré
- **Type** : F · **Priorité** : P1
- **Pas à pas** : « Enregistrer le plat » après génération.
- **Résultat attendu** : le plat apparaît dans `/meals` avec l'ensemble des données générées.

### AI-05 — Option IA indisponible hors ligne
- **Type** : F · **Priorité** : P2
- **Résultat attendu** : dans la modale de choix, l'option IA est désactivée avec la mention « — connexion requise. »

### AI-06 — Option IA désactivée par les paramètres
- **Type** : F · **Priorité** : P2
- **Préconditions** : toggle IA famille désactivé dans `/parametres`.
- **Résultat attendu** : mention « — désactivée dans les paramètres. » et option non cliquable.

### AI-07 — Reprise de session IA
- **Type** : F · **Priorité** : P2
- **Pas à pas** : lancer une génération → fermer la modale/recharger l'app pendant que le job tourne → revenir sur l'app.
- **Résultat attendu** : la modale IA se rouvre automatiquement (session IndexedDB, TTL 24 h) et l'utilisateur est re-routé vers `/meals?meal=ai` ; l'état (génération/chat) est restauré.

### AI-08 — Édition d'un plat généré par IA
- **Type** : F · **Priorité** : P3
- **Pas à pas** : ouvrir `?mealai=<id>` sur un plat IA.
- **Résultat attendu** : la modale d'édition IA s'ouvre pré-remplie, modifications enregistrables.

---

## 11. Scénarios — Planification des repas

### PL-01 — Ouverture et étape 1/2
- **Type** : F · **Priorité** : P1
- **Pas à pas** : cliquer « Planifier » (accueil ou `/calendar?plan=new`).
- **Résultat attendu** : modale 2 étapes avec barre « Étape 1/2 » : carrousel de sélection du plat, sélecteur de dates, stepper portions (1–10), selects type de repas et statut.

### PL-02 — Sélection du plat + surlignage
- **Type** : F · **Priorité** : P1
- **Pas à pas** : sélectionner un plat dans le carrousel de la modale.
- **Résultat attendu** : le plat sélectionné porte l'anneau de surlignage (voir CAR-06).

### PL-03 — Plat obligatoire
- **Type** : F · **Priorité** : P2
- **Pas à pas** : tenter de continuer sans sélection de plat.
- **Résultat attendu** : erreur « Sélectionnez un plat dans le carrousel. »

### PL-04 — Sélecteur de dates : jour unique
- **Type** : F · **Priorité** : P1
- **Pas à pas** : cliquer une seule date.
- **Résultat attendu** : un jour unique est sélectionné (début = fin) ; le bouton « Valider » devient actif.

### PL-05 — Sélecteur de dates : plage + erreur
- **Type** : F · **Priorité** : P1
- **Pas à pas** : cliquer une date de début puis une date postérieure (plage valide) ; ensuite construire une plage dont la fin précède le début.
- **Résultat attendu** : plage valide surlignée du début à la fin ; plage invalide → message d'erreur explicite, pas de validation possible.

### PL-06 — Portions et types
- **Type** : F · **Priorité** : P2
- **Résultat attendu** : stepper portions borné 1–10 ; type de repas (petit-déjeuner/dîner/souper…) et statut initial sélectionnables.

### PL-07 — Étape 2 : ingrédients par rayon
- **Type** : F · **Priorité** : P1
- **Pas à pas** : à l'étape 2, cocher/décocher unitairement des ingrédients, puis « tout cocher » / « tout décocher » pour un rayon.
- **Résultat attendu** : cases individuelles et globales cohérentes ; seuls les ingrédients cochés seront ajoutés.

### PL-08 — Quantités éditables à l'étape 2
- **Type** : F · **Priorité** : P2
- **Pas à pas** : modifier une quantité avec une valeur valide puis invalide (vide / non numérique).
- **Résultat attendu** : valeurs valides acceptées ; erreurs de quantité affichées et enregistrement bloqué tant qu'elles persistent.

### PL-09 — Enregistrement → effet sur accueil, calendrier ET courses
- **Type** : F · **Priorité** : P1 (cœur du produit)
- **Pas à pas** : planifier un plat (2 ingrédients cochés) sur une plage de 2 jours → enregistrer.
- **Résultat attendu** : (a) la planification apparaît dans « À préparer » de l'accueil ; (b) elle apparaît sur les 2 jours du calendrier ; (c) les 2 ingrédients sont **ajoutés/fusionnés** dans la liste de courses « À acheter » (quantités cumulées si déjà présents) ; (d) le badge d'articles du menu se met à jour.

### PL-10 — Cycle de statut
- **Type** : F · **Priorité** : P1
- **Pas à pas** : faire évoluer un plan « À faire » → « En préparation » → « Préparé » (depuis le détail/le planning).
- **Résultat attendu** : le badge coloré suit à chaque changement, sur l'accueil et le calendrier ; persistance après rechargement.

### PL-11 — Étapes cochables (contexte planning)
- **Type** : F · **Priorité** : P1
- **Pas à pas** : dans le détail d'un plan, cocher 2 étapes sur 4 → « Réinitialiser ».
- **Résultat attendu** : compteur « 2/4 » à jour (carte + détail), `aria-pressed` correct sur chaque étape ; réinitialisation remet 0/4 ; persistance (le statut est redérivé côté serveur).

### PL-12 — Suppression d'une planification
- **Type** : F · **Priorité** : P1
- **Pas à pas** : supprimer un plan → accepter le `confirm()` natif.
- **Résultat attendu** : retrait de l'accueil et du calendrier ; les articles de courses générés par ce plan ne sont **pas** supprimés silencieusement (comportement actuel à figer : vérifier et documenter).

### PL-13 — Planification indisponible hors ligne
- **Type** : F · **Priorité** : P2
- **Résultat attendu** : bouton/contrôles désactivés avec mention explicite quand le backend est injoignable.

---

## 12. Scénarios — Calendrier (`/calendar`)

### CAL-01 — Affichage du mois courant
- **Type** : F · **Priorité** : P1
- **Résultat attendu** : vue mensuelle du mois courant, le jour actif est sélectionné par défaut, les plats du jour s'affichent en dessous.

### CAL-02 — Navigation entre mois
- **Type** : F · **Priorité** : P1
- **Pas à pas** : mois précédent → mois suivant → revenir au mois courant.
- **Résultat attendu** : changement de mois fluide, jours/plats correctement rechargés, jour sélectionné conservé ou réinitialisé de façon cohérente.

### CAL-03 — Sélection d'un jour
- **Type** : F · **Priorité** : P1
- **Pas à pas** : cliquer un jour avec des plans, puis un jour sans plan.
- **Résultat attendu** : les plats du jour sélectionné s'affichent avec cartes `[data-plan-id]` ; sinon « Aucun plat planifié ce jour ».

### CAL-04 — Deep link date
- **Type** : F · **Priorité** : P2
- **Pas à pas** : naviguer vers `/calendar?date=2026-08-19` (date du jour de test).
- **Résultat attendu** : le calendrier s'ouvre sur le bon mois avec ce jour actif.

### CAL-05 — Ouverture d'une planification existante
- **Type** : F · **Priorité** : P2
- **Pas à pas** : naviguer vers `/calendar?plan=<planId>`.
- **Résultat attendu** : la modale/panneau de planification s'ouvre pré-rempli avec ce plan (édition).

### CAL-06 — Détails recette d'un plan
- **Type** : F · **Priorité** : P2
- **Pas à pas** : cliquer une carte plan → ou via `?recipe=<planId>`.
- **Résultat attendu** : détail du plat planifié (ingrédients, étapes cochables, statut) ; la carte correspondante est surlignée ; scroll automatique vers `[data-plan-id]`.

### CAL-07 — Nouvelle planification depuis le calendrier
- **Type** : F · **Priorité** : P1
- **Pas à pas** : `/calendar?plan=new` → dérouler PL-01→PL-09.
- **Résultat attendu** : identique à PL-09, avec jour présélectionné = jour actif de la vue.

### CAL-08 — Layout tablette
- **Type** : F · **Priorité** : P2 (NR tablette) · **Viewport** : 768–1023 px
- **Résultat attendu** : calendrier et contenu du jour côte à côte (2 colonnes) sans chevauchement.

---

## 13. Scénarios — Liste de courses (`/grocery`)

### GL-01 — Onglet « À acheter » : groupement par rayon
- **Type** : F · **Priorité** : P1
- **Préconditions** : articles répartis sur ≥ 2 rayons (le seed fournit 9 rayons).
- **Résultat attendu** : une carte par rayon avec en-tête (poignée ⋮⋮, nom, compteur d'items) ; articles non cochés uniquement ; ordre des rayons = ordre configuré.

### GL-02 — Cocher / décocher un article
- **Type** : F · **Priorité** : P1
- **Pas à pas** : cliquer la coche (`aria-label` « Marquer acheté ») d'un article → il disparaît de « À acheter » ; le retrouver coché dans les archives après archivage ; le décocher.
- **Résultat attendu** : bascule immédiate, badge du menu mis à jour, persistance après rechargement.

### GL-03 — Édition d'un article (clic sur la ligne)
- **Type** : F · **Priorité** : P1
- **Pas à pas** : cliquer sur la ligne d'un article (`aria-label` « Modifier <nom> »).
- **Résultat attendu** : la modale d'édition s'ouvre pré-remplie ; la ligne est aussi opérable au clavier (Tab + Entrée/Espace).

### GL-04 — Validations de la modale article
- **Type** : F · **Priorité** : P1
- **Pas à pas** : soumettre sans nom → message « Le nom est obligatoire. » ; sans quantité → « La quantité est obligatoire. » ; quantité non numérique → « doit être un nombre ».
- **Résultat attendu** : messages exacts, pas d'enregistrement.

### GL-05 — Champs de la modale article
- **Type** : F · **Priorité** : P2
- **Pas à pas** : vérifier unité, rayon, magasin (chips avec logos), notes.
- **Résultat attendu** : les options proviennent des paramètres (rayons/magassins/unités) ; le logo du magasin sélectionné s'affiche sur la ligne.

### GL-06 — Création d'un article manuel
- **Type** : F · **Priorité** : P1
- **Pas à pas** : ajouter « Chocolat noir, 100, g, Épicerie, Maxi » → enregistrer.
- **Résultat attendu** : l'article apparaît immédiatement dans le rayon choisi, avec quantité et logo ; compteur du rayon incrémenté.

### GL-07 — Suppression d'un article
- **Type** : F · **Priorité** : P1
- **Pas à pas** : bouton poubelle → accepter le `confirm()` ; rejouer en refusant.
- **Résultat attendu** : suppression effective uniquement sur acceptation ; refus = article conservé.

### GL-08 — Archiver les articles cochés
- **Type** : F · **Priorité** : P1
- **Pas à pas** : cocher 2 articles → « Archiver les cochés (2) ».
- **Résultat attendu** : les 2 articles quittent « À acheter » ; visibles dans l'onglet « Archivés » avec leur état coché.

### GL-09 — Tout archiver
- **Type** : F · **Priorité** : P2
- **Pas à pas** : « Tout archiver » → accepter le `confirm()` « Archiver toute la liste actuelle ? ».
- **Résultat attendu** : « À acheter » devient vide (« Liste vide »), tout est dans « Archivés ».

### GL-10 — Onglet « Archivés » : restauration
- **Type** : F · **Priorité** : P1
- **Pas à pas** : restaurer un article unitairement ; puis « Tout restaurer ».
- **Résultat attendu** : les articles reviennent dans « À acheter » dans leurs rayons respectifs, décochés sauf comportement défini ; compteurs à jour.

### GL-11 — Vider les archives
- **Type** : F · **Priorité** : P2
- **Pas à pas** : « Vider les archives » → accepter le `confirm()`.
- **Résultat attendu** : « Aucun article archivé » affiché.

### GL-12 — Drag & drop d'un article au sein d'un rayon
- **Type** : F · **Priorité** : P2
- **Pas à pas** : maintenir un article (pointer down ~250 ms) puis le déplacer avant/après un autre du même rayon.
- **Résultat attendu** : nouvel ordre conservé après rechargement ; overlay flottant pendant le drag.

### GL-13 — Drag & drop d'un article entre rayons
- **Type** : F · **Priorité** : P1
- **Pas à pas** : déplacer un article vers un autre rayon.
- **Résultat attendu** : l'article change de rayon (carte de destination), compteurs des deux rayons mis à jour, persistance confirmée.

### GL-14 — Drag & drop des cartes rayon
- **Type** : F · **Priorité** : P2
- **Pas à pas** : drag de l'en-tête d'une carte rayon (`aria-label` « Déplacer le rayon <nom> ») vers une autre position.
- **Résultat attendu** : ordre des rayons modifié et persistant (appliqué aussi à l'étape 2 de planification).

### GL-15 — Articles d'un plat planifié → fusion de quantités
- **Type** : F · **Priorité** : P1
- **Préconditions** : article « Poulet 500 g » déjà présent.
- **Pas à pas** : planifier un plat nécessitant 500 g de poulet (cf. PL-09).
- **Résultat attendu** : la ligne existante passe à 1 kg (ou équivalent cumulé) sans créer de doublon.

---

## 14. Scénarios — Profil (`/profil`)

### PR-01 — Sections repliables
- **Type** : F · **Priorité** : P2
- **Pas à pas** : ouvrir/fermer chaque section (identité, famille, mesures, activité, objectifs, santé, alimentation, notes).
- **Résultat attendu** : chaque section bascule avec `aria-expanded` cohérent (vrai quand ouverte).

### PR-02 — Objectifs : auto-save différé
- **Type** : F · **Priorité** : P1
- **Pas à pas** : modifier l'objectif kcal → attendre > 1 s sans cliquer de bouton « Enregistrer ».
- **Résultat attendu** : bandeau « Profil enregistré ✓ » apparaît (sauvegarde auto ~600 ms) ; la valeur persiste après rechargement.

### PR-03 — Recalcul automatique des objectifs
- **Type** : F · **Priorité** : P2
- **Pas à pas** : modifier le poids/la taille → cliquer le bouton ↻ (`aria-label` « Recalculer les objectifs »).
- **Résultat attendu** : kcal/protéines recalculés (Mifflin-St Jeor) et cohérents avec les données saisies.

### PR-04 — Photo de profil
- **Type** : F · **Priorité** : P2
- **Pas à pas** : cliquer « Changer la photo » et uploader une image.
- **Résultat attendu** : photo mise à jour dans le profil, le burger/SideNav ; contrôle désactivé hors ligne.

### PR-05 — Champ âge en lecture seule
- **Type** : F · **Priorité** : P3
- **Résultat attendu** : l'âge n'est pas éditable directement (dérivé de la date de naissance).

### PR-06 — Invitations famille : accepter / refuser
- **Type** : F · **Priorité** : P1
- **Préconditions** : une invitation en attente pour le compte test.
- **Pas à pas** : accepter l'invitation ; rejouer le scénario en refusant.
- **Résultat attendu** : acceptation → les données de la famille deviennent visibles (plats/courses partagés) ; refus → invitation retirée, données non partagées.

### PR-07 — Inviter un membre par courriel
- **Type** : F · **Priorité** : P1
- **Pas à pas** : saisir l'email de `qa-user2` → envoyer.
- **Résultat attendu** : message « Membre ajouté ✓ » ; l'invitation apparaît côté `qa-user2` (cf. E2E-05) ; contrôle désactivé hors ligne.

### PR-08 — Suppression de compte
- **Type** : F · **Priorité** : P1
- **Pas à pas** : déclencher la suppression → une **vraie modale** liste les conséquences → confirmer.
- **Résultat attendu** : compte supprimé côté serveur, retour à `/login`, session détruite ; re-tenter de se connecter → identifiants invalides. ⚠️ À exécuter avec un compte jetable dédié.

### PR-09 — Annulation de suppression de compte
- **Type** : F · **Priorité** : P2
- **Résultat attendu** : la fermeture de la modale sans confirmation laisse le compte actif et utilisable.

### PR-10 — Erreur de sauvegarde du profil
- **Type** : F · **Priorité** : P3
- **Pas à pas** : couper le backend puis modifier un champ.
- **Résultat attendu** : pas de « Profil enregistré ✓ » mensonger ; l'erreur est gérée (bandeau/état) et la saisie est rejouable à la reconnexion (voir §17 offline).

---

## 15. Scénarios — Paramètres (`/parametres`)

### ST-01 — Sections et listes paramétrables
- **Type** : F · **Priorité** : P1
- **Résultat attendu** : sections Catégories / Unités / Magasins / Rayons / Types de repas + toggles IA ; chaque section repliable (`aria-expanded`).

### ST-02 — Ajout d'un élément de liste
- **Type** : F · **Priorité** : P1
- **Pas à pas** : ajouter une catégorie « Saison » (ajout inline) → vérifier dans les chips de filtres de `/meals`.
- **Résultat attendu** : l'élément apparaît dans la liste **et** immédiatement consommé par les écrans dépendants.

### ST-03 — Édition inline d'un élément
- **Type** : F · **Priorité** : P2
- **Pas à pas** : cliquer une ligne → modifier le texte → valider avec Entrée ; rejouer en annulant avec Échap.
- **Résultat attendu** : validation par Entrée enregistre ; Échap restaure l'ancienne valeur sans enregistrement.

### ST-04 — Suppression d'un élément
- **Type** : F · **Priorité** : P2
- **Pas à pas** : supprimer l'élément créé en ST-02 → accepter le `confirm()`.
- **Résultat attendu** : retrait de la liste ; les chips/filtres dépendants se mettent à jour.

### ST-05 — Réordonnancement d'une liste
- **Type** : F · **Priorité** : P2
- **Pas à pas** : déplacer (drag) un rayon en première position.
- **Résultat attendu** : nouvel ordre persistant ; l'ordre des cartes rayon de `/grocery` suit.

### ST-06 — Logo de magasin
- **Type** : F · **Priorité** : P3
- **Pas à pas** : uploader un SVG/PNG de logo sur un magasin.
- **Résultat attendu** : logo affiché dans les paramètres, les chips de la modale article et les lignes de courses.

### ST-07 — Toggles IA
- **Type** : F · **Priorité** : P1
- **Pas à pas** : basculer le toggle famille (`role="switch"`), vérifier `aria-checked`.
- **Résultat attendu** : état persistant ; retombée fonctionnelle sur la modale de choix de mode (mention « — désactivée dans les paramètres. », cf. AI-06).

### ST-08 — Nouveau rayon utilisable partout
- **Type** : F · **Priorité** : P1
- **Pas à pas** : créer un rayon « Surgelés » → créer un article dans ce rayon → planifier un plat avec un ingrédient de ce rayon.
- **Résultat attendu** : le rayon est proposé dans la modale article et à l'étape 2 de planification, et la carte apparaît dans `/grocery`.

### ST-09 — Bandeau hors ligne
- **Type** : F · **Priorité** : P3
- **Résultat attendu** : bandeau ambre visible quand le backend est injoignable ; les contrôles d'écriture de listes sont désactivés.

---

## 16. Scénarios — Responsive & layouts

### RSP-01 — Conteneur mobile
- **Type** : F · **Priorité** : P1 · **Viewport** : 390 px
- **Résultat attendu** : contenu centré dans un conteneur max 480 px, burger présent, modales en bottom-sheet arrondi haut, pull-to-refresh actif.

### RSP-02 — Tablette (768–1023 px)
- **Type** : F · **Priorité** : P1 (NR — chantier en cours « WIP responsive tablet »)
- **Pas à pas** : parcourir `/`, `/meals`, `/calendar`, `/grocery` en 820×1180.
- **Résultat attendu** : accueil en 2 colonnes (préparations | carrousel, courses sur 2 colonnes) ; calendrier 2 colonnes ; plats en 2 colonnes ; **pas de SideNav ni DesktopPanel** ; burger toujours présent.

### RSP-03 — Desktop (≥ 1024 px)
- **Type** : F · **Priorité** : P1
- **Résultat attendu** : layout 3 zones (SideNav / contenu / panel 400–420 px selon xl) ; burger absent ; modales remplacées par le panneau droit sur les pages concernées.

### RSP-04 — Bascule des modales selon viewport
- **Type** : F · **Priorité** : P1
- **Pas à pas** : ouvrir le détail d'un plat à 390 px (bottom-sheet) puis à 1440 px (panel) via le même deep link `?details=<id>`.
- **Résultat attendu** : même contenu, conteneur adapté au viewport ; fermeture possible dans les deux modes (X, Échap).

### RSP-05 — Labels des boutons d'action à 400 px
- **Type** : F · **Priorité** : P3
- **Résultat attendu** : sous 400 px les boutons « Ajouter »/« Planifier » n'affichent que l'icône ; libellé complet à partir de 400 px (`xs`).

### RSP-06 — Pull-to-refresh désactivé en desktop
- **Type** : F · **Priorité** : P2
- **Pas à pas** : à ≥ 1024 px, tenter un pull-to-refresh (pointer drag vertical en haut de page).
- **Résultat attendu** : aucun indicateur de refresh, la page ne réagit pas.

---

## 17. Scénarios — Offline & synchronisation

### OFF-01 — Détection hors ligne
- **Type** : F · **Priorité** : P1
- **Pas à pas** : couper le backend (ou simuler l'échec réseau des appels API).
- **Résultat attendu** : SyncBanner affiche « Hors ligne » (rôle status) ; les données déjà consultées restent visibles (cache IndexedDB).

### OFF-02 — Création d'un article hors ligne
- **Type** : F · **Priorité** : P1
- **Préconditions** : `/grocery` déjà chargée (cache chaud).
- **Pas à pas** : passer hors ligne → créer un article manuel.
- **Résultat attendu** : l'article est créé **localement** et visible immédiatement (réponse synthétique) ; le bandeau indique « 1 action en attente » ; pas de blocage ni d'erreur affichée à l'utilisateur.

### OFF-03 — Retour en ligne : rejeu FIFO
- **Type** : F · **Priorité** : P1
- **Pas à pas** : hors ligne, créer 3 articles dans un ordre précis → rétablir le backend.
- **Résultat attendu** : séquence « Connexion au serveur en cours… » → « Synchronisation des modifications… » → « Modifications synchronisées » (disparait après ~3 s) ; les 3 articles existent côté serveur dans l'ordre de création ; aucune trace de doublon.

### OFF-04 — Conflit / erreur 4xx pendant la sync
- **Type** : F · **Priorité** : P2
- **Pas à pas** : hors ligne, créer un article, puis supprimer la ressource correspondante côté serveur ; revenir en ligne.
- **Résultat attendu** : selon le code reçu : 2xx/404 = action considérée OK (retirée de la file), 401 = retentée, 4xx autre = abandonnée (retirée de la file sans rejeu infini), 5xx/réseau = conservée pour re-tentative ultérieure. La file ne boucle pas indéfiniment.

### OFF-05 — Contrôles désactivés hors ligne
- **Type** : F · **Priorité** : P1
- **Pas à pas** : hors ligne, tenter : génération IA, planification, upload photo, invitation famille, ajout d'élément de liste.
- **Résultat attendu** : chaque contrôle est désactivé avec mention explicite (cf. AI-05, PL-13, PR-04, ST-09).

### OFF-06 — Réutilisation du cache hors ligne
- **Type** : F · **Priorité** : P2
- **Pas à pas** : visiter `/meals` en ligne → passer hors ligne → naviguer entre les pages déjà visitées.
- **Résultat attendu** : navigation fluide sur données en cache (7 jours), sans écran d'erreur bloquant.

### OFF-07 — Pull-to-refresh (mobile)
- **Type** : F · **Priorité** : P2 · **Viewport** : mobile
- **Pas à pas** : en haut de page, tirer vers le bas ~80 px puis relâcher ; rejouer en tirant ~30 px.
- **Résultat attendu** : au-delà du seuil (64 px, avec résistance), l'indicateur s'affiche, le refresh dure ≥ 500 ms et les données sont rechargées ; en dessous du seuil, retour élastique sans refresh.

### OFF-08 — Réauthentification pendant la sync
- **Type** : F · **Priorité** : P3
- **Pas à pas** : expirer la session pendant la file offline (retour 401) puis se reconnecter.
- **Résultat attendu** : les actions en attente sont rejouées après reconnexion ; pas de perte silencieuse.

---

## 18. Parcours bout en bout (E2E)

> Ce sont les scénarios « vitrines » de la suite Playwright : ils traversent plusieurs modules et valident les flux métier de bout en bout. Ils s'exécutent avec des données créées par le test lui-même, nettoyées en fin (via API de préférence).

### E2E-01 — Premier usage : inscription → onboarding → accueil
- **Priorité** : P1 · **Viewport** : mobile puis desktop (2 runs)
- **Préconditions** : email jetable inconnu.
- **Pas à pas** :
  1. `/login` → bascule « S'inscrire » → créer le compte (AUTH-06).
  2. Si redirection onboarding : compléter les 7 étapes (dont « Passer » sur une étape) → « Terminer ».
  3. Arrivée sur `/` : vérifier les états vides (« Aucun plat à préparer », « Rien à acheter »).
  4. Ouvrir le burger : vérifier nom/email dans la carte profil, badges à 0.
  5. Se déconnecter → se reconnecter : arrivée directe sur `/` (plus d'onboarding).
- **Attendu** : parcours complet sans erreur ; l'onboarding n'est proposé qu'une seule fois ; la session survit à une déconnexion/reconnexion.

### E2E-02 — Parcours cœur : créer un plat → le planifier → acheter les ingrédients
- **Priorité** : P1 · **Viewport** : mobile (run desktop en NR)
- **Pas à pas** :
  1. Connexion `qa-user1` (storageState).
  2. Accueil → « Ajouter un plat » → choix **manuel**.
  3. Créer « Poulet rôti provençal » : 4 portions, Moyen, 2 ingrédients (poulet 800 g / herbes 20 g, rayon Épicerie), 2 étapes → enregistrer.
  4. Vérifier : plat en tête de `/meals`, badge plats +1 dans le menu.
  5. Accueil → « Planifier » (ou carte → planifier) : sélectionner le plat, plage du jour → jour+2, 4 portions, « Dîner », statut « À faire ».
  6. Étape 2 : tout cocher pour le rayon → enregistrer la planification.
  7. Vérifier accueil : carte « À préparer » visible avec badge ambre.
  8. Vérifier `/grocery` : « Poulet 800 g » + « Herbes 20 g » présents dans le bon rayon.
  9. Marquer les 2 articles achetés → « Archiver les cochés (2) » → vérifier l'onglet « Archivés ».
  10. Calendrier : vérifier le plan sur les 3 jours ; faire évoluer le statut vers « Préparé » ; cocher 1 étape sur 2 → compteur « 1/2 ».
  11. Nettoyage : supprimer la planification puis le plat (confirms acceptés) ; vider les archives.
- **Attendu** : chaque étape laisse l'UI et le serveur dans l'état attendu ; aucune donnée résiduelle après nettoyage.

### E2E-03 — Parcours IA : générer → raffiner → enregistrer → planifier
- **Priorité** : P1 (dégradé P2 si l'IA externe est instable — prévoir un marqueur « long test »)
- **Pas à pas** :
  1. Connexion → `/meals?meal=ai` (via « Ajouter » → IA).
  2. Sélectionner 2 membres, 4 portions, Facile, catégorie, chips « tomate, basilic », description courte → lancer.
  3. Attendre la fin de la génération (polling) sans timeout prématuré (timeout généreux).
  4. Demander un raffinement (« version sans lactose ») → vérifier l'aperçu mis à jour.
  5. « Enregistrer le plat » → le plat existe dans `/meals`.
  6. Le planifier (reprise de PL-01→PL-09) → vérifier les courses.
- **Attendu** : boucle IA complète utilisable ; le plat généré est un plat comme les autres (éditable, planifiable, supprimable).

### E2E-04 — Parcours offline : travailler sans réseau puis synchroniser
- **Priorité** : P1 · **Viewport** : mobile
- **Pas à pas** :
  1. Connexion en ligne, visiter `/grocery` et `/meals` (cache chaud).
  2. Couper le backend → bandeau « Hors ligne ».
  3. Créer 2 articles + 1 plat manuel (si la file le permet pour les plats — sinon articles seulement) + cocher 1 article existant.
  4. Vérifier les créations locales visibles et le compteur d'actions en attente.
  5. Rétablir le backend → attendre « Modifications synchronisées ».
  6. Recharger la page : les 3 actions sont côté serveur ; le badge du menu est cohérent.
- **Attendu** : aucune perte de données, ordre FIFO respecté, aucun doublon.

### E2E-05 — Parcours famille : invitation → acceptation → données partagées
- **Priorité** : P2 (nécessite 2 comptes et 2 contextes)
- **Pas à pas** :
  1. Contexte A : `qa-user1` invite `qa-user2` (PR-07).
  2. Contexte B (navigateur/second contexte, `qa-user2` connecté) : `/profil` → accepter l'invitation (PR-06).
  3. Contexte A : créer un plat / cocher un article de courses.
  4. Contexte B : vérifier l'apparition du plat dans `/meals` et l'état de l'article **sans rechargement manuel** (temps réel Socket.io) — si flaky, tolérer l'apparition après reload et le noter.
  5. Contexte B : retirer/quitte la famille si l'UI le permet ; vérifier l'isolement des données.
- **Attendu** : les plats, listes de courses, rayons et statuts sont partagés entre membres de la famille en quasi temps réel.

### E2E-06 — Parcours session & changement de compte
- **Priorité** : P1 (NR cache — mécanisme de purge)
- **Pas à pas** :
  1. `qa-user1` connecté : visiter `/meals` (cache chaud), noter le nombre de plats.
  2. Déconnexion → connexion `qa-user2` **dans le même navigateur**.
  3. Visiter `/meals`.
- **Attendu** : aucune donnée de `qa-user1` ne « blette » à l'écran (purge du cache au changement de compte via `bashkush:cache-owner`) ; la liste affiche uniquement les plats de `qa-user2`.

### E2E-07 — Parcours filtres & favoris
- **Priorité** : P2
- **Pas à pas** :
  1. Créer (ou réutiliser) 3 plats dont 1 favori, difficultés différentes.
  2. Marquer/un-marquer le favori depuis la liste (ML-09).
  3. Filtrer « Favoris » → 1 plat ; ajouter « Facile » → selon données ; tri « Nom A–Z » ; recherche partielle accentuée ; « Réinitialiser » → état complet.
- **Attendu** : combinaisons de filtres/recherche/tri cohérentes entre elles et avec le compteur « n sur total ».

---

## 19. Suite de non-régression (NR)

### 19.1 Principe

La suite NR = un **sous-ensemble restreint et stable** des scénarios ci-dessus, exécuté à chaque PR. Sélection basée sur les zones récemment modifiées (historique git : *new login page*, *fix carrousel scroll*, *fix cards and enhance menu*, *WIP responsive tablet*) + les chemins critiques du produit.

### 19.2 Composition proposée (~45 scénarios, ~35 en smoke)

| Zone (commit concerné) | Scénarios NR | Raison |
|---|---|---|
| **Login refait** | AUTH-01, 02, 03, 06, 08, 11, 12, 13, 15, 16 | Nouvelle page : couvrir les 3 modes, les gardes et le rendu responsive |
| **Fix carrousel** | CAR-01, 03, 04, 05, 07 | Le correctif de scroll : snap, flèches = 1 carte, wheel, programmatique |
| **Cartes & menu améliorés** | HOME-01, 04, 07 ; ML-01, 09, 10 ; NAV-01, 02, 03, 05, 06, 07 | Rendu des cartes, badges menu, burger/SideNav, déconnexion |
| **Responsive tablette (WIP)** | RSP-01, 02, 03, 04 ; ML-11 ; CAL-08 ; AUTH-16 | Grilles 2 colonnes 768–1023, bascule des layouts à 1024 |
| **Chemin critique produit** (toujours) | E2E-01 (smoke), E2E-02, PL-09, GL-02, GL-06, MC-02, MC-12, OFF-01→03 (E2E-04 réduit) | Créer → planifier → courses → acheter |
| **Gardes & session** | NAV-05, NAV-08, E2E-06 | Redirections, purge cache au changement de compte |

### 19.3 Règles d'exécution

- **Smoke (chaque commit, < 10 min)** : AUTH-01, 12 · NAV-02, 05 · HOME-01, 04 · CAR-04 · MC-02 · PL-09 · GL-02 · GL-06 · E2E-01 · RSP-03.
- **NR complète (chaque PR, ~30–45 min)** : tout le tableau §19.2.
- **Nuit / pré-release** : suite intégrale (tous les scénarios P1 + P2), E2E-03 (IA) et E2E-05 (famille/temps réel) inclus.

---

## 20. Matrice de couverture (synthèse)

| Module | Nb scénarios | P1 | P2 | P3 |
|---|---|---|---|---|
| AUTH | 16 | 6 | 8 | 2 |
| ONB | 8 | 4 | 3 | 1 |
| NAV | 10 | 4 | 6 | — |
| HOME | 9 | 6 | 3 | — |
| CAR (carrousel) | 8 | 4 | 3 | 1 |
| ML (liste plats) | 11 | 6 | 5 | — |
| MC (CRUD plat) | 14 | 7 | 6 | 1 |
| AI (génération IA) | 8 | 3 | 4 | 1 |
| PL (planification) | 13 | 8 | 5 | — |
| CAL (calendrier) | 8 | 4 | 4 | — |
| GL (courses) | 15 | 8 | 6 | 1 |
| PR (profil) | 10 | 4 | 3 | 3 |
| ST (paramètres) | 9 | 4 | 4 | 1 |
| RSP (responsive) | 6 | 4 | 1 | 1 |
| OFF (offline/sync) | 8 | 4 | 3 | 1 |
| E2E (parcours) | 7 | 5 | 2 | — |
| **Total** | **170** | **77** | **66** | **14** *(+13 en double viewport NR)* |

> Ces décomptes incluent les variantes explicites (multi-routes de AUTH-12, multi-états de ML-08, etc.). Le périmètre automatisable en priorité = 77 scénarios P1.

---

## Annexe A — Stratégie de sélecteurs Playwright (sans code)

Priorité des localisateurs, du plus stable au plus fragile — **à respecter dans toutes les futures specs** :

1. **Rôles accessibles + nom accessible** (les plus nombreux dans l'app, tous en français) :
   - `button` « Ouvrir le menu », « Fermer », « Précédent »/« Suivant » (carrousel), « Afficher/Masquer le mot de passe », « Ajouter aux favoris »/« Retirer des favoris », « Marquer acheté »/« Marquer non acheté », « Modifier <nom article> », « Déplacer le rayon <nom> », « Augmenter »/« Diminuer » (steppers), « Recalculer les objectifs », « Changer la photo », « Accepter l'invitation »/« Refuser l'invitation », « Replier/Déplier le menu ».
   - `switch` (toggles IA, vérifier `aria-checked`), `status` (SyncBanner), `textbox` email/mot de passe, `combobox` « Trier les plats ».
2. **IDs** : `#email`, `#password` (login uniquement).
3. **Attributs custom (déjà présents)** : `[data-meal-id="<id>"]` (cartes plats/carrousel), `[data-plan-id="<id>"]` (cartes plans accueil/calendrier).
4. **Textes exacts FR** pour les libellés : « Se connecter », « S'inscrire », « Envoyer le lien », « Ajouter un plat », « Planifier », « Enregistrer la planification », « Archiver les cochés (n) », « Tout restaurer », onglets « À acheter »/« Archivés », statuts « À faire »/« En préparation »/« Préparé », messages d'erreur exacts cités dans les scénarios.
5. **Deep links** (pour l'arrange, pas les assertions) : `?details=`, `?meal=new|manual|ai|<id>`, `?mealai=`, `?editchoice=`, `?plan=new|<id>`, `?recipe=`, `?date=`.
6. À éviter : sélecteurs CSS de structure (classes Tailwind), nth-child, XPath — instables par nature ici.

**Recommandation** : ajouter progressivement des `data-testid` sur les zones sans ancrage stable (grille de plats, cartes rayon, modales) pour diminuer la dépendance aux textes FR.

## Annexe B — Jeux de données & comptes de test

| Ressource | Valeur / règle |
|---|---|
| Compte principal (données riches) | `qa-user1@bashkush.test` — onboardé, ≥ 5 plats variés (dont « Bol méditerranéen polola/sardines » du seed), ≥ 3 plans aux 3 statuts, ≥ 8 articles non cochés sur ≥ 2 rayons |
| Compte vierge | `qa-user2@bashkush.test` — onboardé, aucune donnée (sert aussi au parcours famille) |
| Compte non onboardé | `qa-nb@bashkush.test` — session valide, `onboardedAt` null |
| Compte jetable | `qa-del-<run-id>@bashkush.test` — pour PR-08 (suppression de compte) |
| Plats de test | Noms préfixés `QA — ` pour identification et nettoyage facile |
| Fichiers | 1 plat exporté en JSON **valide** + 1 JSON **corrompu** ; 1 image JPG/PNG réduite ; 1 logo SVG |
| Politique | Chaque test **crée puis nettoie** ses données (API de préférence, UI en dernier recours) ; jamais de dépendance à l'état laissé par un autre test |
| Nettoyage | Suppression des plats/plans/articles « QA — » + purge des archives à la fin des runs ; les comptes sont réinitialisés par script si nécessaire |

## Annexe C — Risques & points de vigilance pour l'automatisation

1. **Service worker PWA en dev** : à bloquer dans le contexte Playwright (caching parasite) — sinon résultats non déterministes.
2. **IndexedDB** : contexte frais par test obligatoire (cache query 7 jours, file offline, sessions IA 24 h).
3. **Carrousel custom** : pas de scroll natif → les actions « scroll into view » standard peuvent être inopérantes ; passer par les flèches (desktop) ou les pointeurs (mobile).
4. **Dialogues natifs** `confirm()` : à gérer systématiquement sous peine de blocage du run.
5. **Temps réels Socket.io** (E2E-05) : risque de flakiness — prévoir repli « après rechargement » marqué comme acceptable en CI.
6. **IA générative** (E2E-03) : latence et non-déterminisme du contenu → n'asserter que des invariantes (plat créé, champs non vides), jamais le contenu textuel généré.
7. **Supabase partagé** : les tests tournent contre une vraie base — isoler par préfixe de données et nettoyer ; ne jamais tester la suppression de compte sur un compte réel.
8. **`maximum-scale=1.0`** (zoom désactivé) : ne pas s'appuyer sur des interactions de pinch-zoom.
9. **Double viewport** : environ la moitié des bugs visuels se manifestent d'un seul côté de la frontière 1024 px — toujours qualifier les scénarios UI par viewport.
10. **Écritures offline « optimistes »** : une écriture qui réussit à l'écran ne signifie pas qu'elle a atteint le serveur — les assertions finales doivent recharger ou interroger l'API pour confirmer.
