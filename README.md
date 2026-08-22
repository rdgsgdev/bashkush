# 🥣 Bashkush

Application web **mobile-first** de **création et planification de plats** avec **génération automatique de liste de courses**.

- 🍽️ Créez vos plats (manuellement ou par **import JSON**), avec photo, ingrédients, étapes et infos nutritionnelles.
- 📅 **Planifiez** vos repas sur un calendrier (plages de dates, portions, statut).
- 🛒 La **liste de courses** se génère automatiquement à partir du planning, **regroupée par rayons**, agrégée et éditable.
- 👤 **Onboarding** à la première connexion (objectifs, activité, santé, alimentation…) puis **page profil** modifiable avec photo.

> 100 % en français · connexion **Google** · pensé mobile d'abord.

---

## 🔐 Authentification (Google)

L'application exige une connexion via **Supabase Auth** avec le provider **Google** (pas de création de compte courriel/mot de passe).

> ℹ️ Le provider Apple pourrait être ajouté plus tard, mais il nécessite un compte Apple Developer payant (99 $/an).

### 1. Activer le provider dans Supabase
- **Google** : dashboard Supabase → **Authentication → Providers → Google** → activer, puis renseigner le *Client ID* et le *Client Secret* d'une application OAuth Google (console Google Cloud → Credentials → OAuth Client ID, type *Web application* ; URI de redirection autorisée : `https://VOTRE-PROJET.supabase.co/auth/v1/callback`).

### 2. URLs de redirection
Dans **Authentication → URL Configuration**, ajoutez l'URL du site dans *Redirect URLs* :
- local : `http://localhost:5173`
- prod : l'URL Render du frontend (ex : `https://bashkush.onrender.com`)

### 3. Variables d'environnement frontend
Renseignez `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` (voir `frontend/.env.example`).

Côté backend, chaque requête `/api/*` (sauf `/health`) doit porter un jeton `Authorization: Bearer <token>` valide — le middleware `backend/src/middleware/auth.ts` vérifie la session auprès de Supabase et renvoie `401` sinon.

> ℹ️ Les données (plats, calendrier, listes de courses) sont **scopées à la famille** : chaque utilisateur voit uniquement les données de sa famille (invitation par courriel depuis la page profil). Un utilisateur sans famille obtient un espace solo créé automatiquement à la première utilisation.

---

## 🧱 Architecture

```
bashkush/
├── backend/    API Node.js + Express + TypeScript + Prisma  →  hébergée sur Render (web service)
└── frontend/   SPA React + Vite + TypeScript + Tailwind     →  hébergée sur Render (static site)
```

| Côté            | Techno                                            | Rôle |
|-----------------|---------------------------------------------------|------|
| **Frontend**    | React 18, Vite 5, TypeScript, Tailwind CSS        | UI mobile-first, routes, modales |
|                 | React Router, TanStack Query, Zustand, Axios      | Navigation, cache serveur, état UI |
| **Backend**     | Node.js 20, Express, TypeScript                   | API REST, validation, orchestration |
|                 | Prisma (→ PostgreSQL)                             | ORM + transactions atomiques |
|                 | @supabase/supabase-js                             | Stockage des images (Storage) |
| **Base de données** | Supabase (PostgreSQL)                         | Tables + Storage pour les images |

La logique métier critique — *« planifier un plat → générer/mettre à jour la liste de courses »* — s'exécute dans des **transactions Prisma atomiques** (`backend/src/lib/groceryEngine.ts`).

---

## 🚀 Démarrage rapide (local)

Vous avez besoin de **Node.js ≥ 20** et d'un compte **Supabase** (gratuit).

1. **Supabase** — créez un projet et récupérez les clés.
   👉 Suivez pas à pas : [`backend/README.md`](./backend/README.md#1--configurer-supabase)

2. **Backend**
   ```bash
   cd backend
   cp .env.example .env          # renseignez les valeurs Supabase
   npm install
   npx prisma db push            # crée les tables
   npm run seed                  # charge rayons + 3 plats d'exemple
   npm run dev                   # http://localhost:4000
   ```

3. **Frontend**
   ```bash
   cd frontend
   cp .env.example .env          # VITE_API_URL + clés Supabase (auth)
   npm install
   npm run dev                   # http://localhost:5173
   ```

Ouvrez **http://localhost:5173** 🎉

---

## 📴 Mode hors ligne (offline)

L'application reste consultable et en partie modifiable **sans réseau** ou pendant le **réveil du serveur Render** (free tier en veille) :

- **Chargement instantané** : les données (plats, planning, liste de courses, profil) sont persistées dans **IndexedDB** (`frontend/src/api/persist.ts`) et restaurées immédiatement au chargement, puis revalidées en arrière-plan quand le serveur répond.
- **PWA** : un service worker met en cache le shell applicatif (`vite-plugin-pwa`) — la page se charge même hors ligne et l'app est installable sur l'écran d'accueil. Il est **actif aussi en `npm run dev`** (`devOptions.enabled`) pour permettre de tester le mode hors ligne en développement. *En production : aucun réglage nécessaire.*
- **File d'actions** (`frontend/src/offline/queue.ts`) : quand le serveur ne répond pas, les actions de la **liste de courses** (cocher, ajouter, modifier, supprimer, archiver/restaurer), les **favoris** et l'**édition du profil** sont appliquées localement puis mises en file ; elles sont **rejouées automatiquement** au retour du serveur (sonde santé `/api/health`, `frontend/src/offline/connection.ts`).
- **Réveil proactif** : un ping santé est envoyé à l'ouverture de l'app et au retour au premier plan pour réveiller le serveur Render le plus tôt possible.
- **Images** : logos et icônes sont précachés ; les images distantes (photos de profil et de plats sur **Supabase Storage**, avatars Google) sont mises en cache au premier affichage en ligne (`CacheFirst`) et donc revoyables hors ligne. Une image jamais affichée en ligne est remplacée par un repli (initiale).

### Règles de synchronisation

- Les requêtes rejouables utilisent des **valeurs absolues** (`checked`, `isFavorite`) et des ids générés côté client → un rejeu ne crée pas de doublon (le backend renvoie l'item existant si l'`id` est déjà pris).
- **404** au rejeu = l'élément a été supprimé entre-temps → l'action est considérée synchronisée ; autre erreur 4xx = conflit → l'action est abandonnée (journal console).
- Nécessitent une connexion (désactivés hors ligne avec mention explicite) : génération IA, planification de repas (le moteur de liste de courses tourne côté serveur), uploads de photos, invitations famille.
- Conflits multi-appareils : **dernière écriture gagne** (le serveur reste autoritaire au moment du rejeu).

---

## 📚 Documentation détaillée

- **[backend/README.md](./backend/README.md)** — configuration Supabase, base de données, seed, lancement local, **déploiement Render** + Storage.
- **[frontend/README.md](./frontend/README.md)** — lancement local, variables d'environnement, **déploiement Render (static site)**.

---

## 🗺️ Fonctionnalités par page

| Page              | Contenu |
|-------------------|---------|
| **Accueil**       | Carrousel de plats (favoris en tête) · calendrier (aujourd'hui actif) · aperçu liste de courses (items non achetés, cocher = acheté) |
| **Mes plats**     | Liste des plats (photo + nom) · cœur favori · ajout/édition via la modale |
| **Calendrier**    | Calendrier mensuel · cartes des plats planifiés du jour actif · ajout/édition via la modale |
| **Liste de courses** | Items groupés par rayon · cocher/éditer/supprimer/ajouter · archivage partiel ou total · onglet « Archivés » (restaurer/supprimer) |
| **Analyses**      | Scan de code-barres (caméra, photo ou saisie manuelle) · analyse alimentaire (Open Food Facts) ou cosmétique (Open Beauty Facts) · historique familial |

### Analyse de produits (façon Yuka, calcul 100 % côté client)

- **Alimentaire** (`lib/productAnalysis`) : base Nutri-Score mappée /100, repli sur le Nutri-Score officiel OFF quand les nutriments sont incomplets (score estimé, signalé), pénalités additifs / NOVA 4 / huile de palme, bonus bio / Éco-Score A-B. Critères affichés : calories, sucres, graisses saturées, sodium, fibres, protéines, fruits & légumes, degré de transformation (NOVA), huile de palme, Éco-Score, bio, additifs.
- **Cosmétique** (`lib/cosmeticAnalysis`) : la composition INCI fournie par Open Beauty Facts est confrontée à une base locale (~130 ingrédients + motifs PEG/parabens/EDTA/siloxanes, sources CosIng·ANSES·ECHA·CIR) ; pénalités par ingrédient controversé, bonus bio, critères parfum/allergènes/vegan.
- **Base additifs** (`lib/additives`) : ~320 fiches couvrant quasi intégralement E100–E1520 (sources OFF·EFSA·ANSES·CIRC·règlement UE 1129/2011), variantes résolues vers la fiche de base (`E322i` → lécithines).
- Les scans sont stockés en base (table `product_scans`, colonne `product_type` = `food`|`cosmetic`). Après toute évolution du schéma Prisma : `npx prisma db push` (backend).

### Modales
- **MealEditionModal** : import JSON, photo, favori, ingrédients/étapes éditables, **quantités dynamiques selon le nombre de portions**.
- **MealPlanningModal** : carrousel de plats, plage de dates (du/au), portions (1–10), statut → **génère automatiquement la liste de courses**.

### Import JSON généré par une IA

Les plats peuvent être générés par une IA externe (ChatGPT, etc.) puis importés via « Importer un JSON ». Pour que les **apports par portion** du plat suivent les quantités (ex. passer de 4 à 3 œufs), l'IA doit renseigner les apports **de chaque ingrédient** — pour la quantité indiquée :

```json
{
  "name": "Omelette aux champignons",
  "servings": 2,
  "ingredients": [
    {
      "id": "oeufs", "name": "Œufs", "quantity": 4, "unit": "pièce", "aisle": "proteines",
      "nutrition": { "calories": 280, "protein": 24, "fat": 20, "quantity": 4 }
    },
    {
      "id": "champignons", "name": "Champignons", "quantity": 200, "unit": "g", "aisle": "fruits_legumes",
      "nutrition": { "calories": 44, "protein": 6, "carbs": 6, "fiber": 3, "quantity": 200 }
    }
  ],
  "steps": [{ "stepNumber": 1, "instruction": "Faire revenir les champignons, puis les œufs." }]
}
```

- `nutrition.quantity` (optionnel) : quantité pour laquelle les valeurs sont données — par défaut, la `quantity` de l'ingrédient.
- Les apports par ingrédient sont stockés **en arrière-plan** (non affichés dans le détail du plat) et restent modifiables dans la modale d'édition (bloc « Apports » replié de chaque ingrédient).
- Les apports par portion du plat sont recalculés en continu dans la modale, puis côté backend à l'enregistrement : **Σ (apports d'un ingrédient × quantité actuelle ÷ quantité de référence) ÷ portions**. Les plats sans apports par ingrédient conservent leur nutrition globale existante.

### Complétion automatique des apports (Sonar)

Lors de l'**ajout manuel** d'un ingrédient (nom + quantité + unité renseignés), le backend interroge **Sonar** (Perplexity AI) et remplit automatiquement les apports de l'ingrédient — les champs restent modifiables à la main. Modifier le **nom**, la **quantité** ou l'**unité** re-questionne l'IA (après un délai de frappe) ; changer le **rayon** ou les notes n'a aucun effet. Requête : `POST /api/ai/ingredient-nutrition` `{ name, quantity, unit }`.

> 💡 La **génération de plat par IA** (« Générer avec IA ») renseigne elle aussi les apports de chaque ingrédient en arrière-plan — les apports par portion du plat en découlent et suivent les quantités à l'édition.

> ⚙️ Configuration : renseignez `PERPLEXITY_API_KEY` (et éventuellement `PERPLEXITY_MODEL`, défaut `sonar`) dans `backend/.env` — voir `.env.example`. Sans clé, la complétion échoue silencieusement et les champs restent saisissables manuellement.

---

## 🔐 Sécurité / secrets

- Les **secrets Supabase** (`SERVICE_ROLE_KEY`, `DATABASE_URL`) ne doivent **jamais** être exposés côté frontend.
- En production, définissez-les comme **variables d'environnement** chiffrées sur Render (jamais dans le dépôt Git).
- `.env` est ignoré par Git (voir `.gitignore`).

---

## 📦 Déploiement en production

Tout est décrit dans les README backend/frontend. En résumé :

1. Base de données + Storage sur **Supabase** (voir `backend/README.md`).
2. API sur **Render** (web service, plan gratuit) via `render.yaml`.
3. Frontend sur **Render** (static site, plan gratuit) via `render.yaml`.

Un fichier **[`render.yaml`](./render.yaml)** (Blueprint) est fourni pour déployer les deux services en une commande :
```bash
render blueprint deploy
```

---

## 📄 Licence

Projet personnel. Adaptez-le librement à vos besoins.
