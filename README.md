# 🥣 Bashkush

Application web **mobile-first** de **création et planification de plats** avec **génération automatique de liste de courses**.

- 🍽️ Créez vos plats (manuellement ou par **import JSON**), avec photo, ingrédients, étapes et infos nutritionnelles.
- 📅 **Planifiez** vos repas sur un calendrier (plages de dates, portions, statut).
- 🛒 La **liste de courses** se génère automatiquement à partir du planning, **regroupée par rayons**, agrégée et éditable.

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

> ℹ️ Les données (plats, calendrier, listes) restent **partagées** entre tous les utilisateurs connectés — l'authentification protège l'accès à l'application.

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

### Modales
- **MealEditionModal** : import JSON, photo, favori, ingrédients/étapes éditables, **quantités dynamiques selon le nombre de portions**.
- **MealPlanningModal** : carrousel de plats, plage de dates (du/au), portions (1–10), statut → **génère automatiquement la liste de courses**.

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
