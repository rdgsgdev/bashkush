# Backend Bashkush

API REST **Node.js + Express + TypeScript**, ORM **Prisma** (→ PostgreSQL Supabase) et **Storage Supabase** pour les images.

## Sommaire
1. [Prérequis](#prérequis)
2. [Configurer Supabase](#1--configurer-supabase)
3. [Configuration `.env`](#2--configuration-env)
4. [Base de données & seed](#3--base-de-données--seed)
5. [Bucket Storage (images)](#4--bucket-storage-images)
6. [Lancer en local](#5--lancer-en-local)
7. [API — endpoints](#6--api--endpoints)
8. [Déploiement sur Render](#7--déploiement-sur-render)
9. [Tests manuels (curl)](#8--tests-manuels-curl)
10. [Dépannage](#9--dépannage)

---

## Prérequis

- **Node.js ≥ 20** (`node -v`)
- **npm** (livré avec Node)
- Un compte **Supabase** (gratuit, https://supabase.com) et un **projet créé**.

---

## 1. Configurer Supabase

> Si vous n'avez pas encore de projet : https://app.supabase.com → **New project**. Gardez la région la plus proche. Notez le **mot de passe base de données** défini à la création.

### a) Récupérer l'URL et les clés
Dans le dashboard Supabase : **Project Settings** (⚙️ en bas à gauche) → **API**.
Récupérez :
- `Project URL` → **SUPABASE_URL**
- `service_role` secret → **SUPABASE_SERVICE_ROLE_KEY** (⚠️ secret serveur, ne jamais exposer côté navigateur)

### b) Récupérer les chaînes de connexion Postgres

> 🧩 Le plus simple : bouton **« Connect »** (en haut du dashboard) → onglet **« ORM »** → **« Prisma »**. Supabase génère directement les deux chaînes prêtes à copier.

Sinon, dans **Project Settings → Database → Connection string**, Supabase fournit plusieurs variantes. **Pour cette application, utilisez impérativement le POOLEUR DE SESSION (port 5432)** :

- **Session pooler** (port `5432`, hôte `*.pooler.supabase.com`) → ✅ compatible avec les **transactions Prisma interactives** (utilisées pour générer la liste de courses).
- ❌ **Transaction pooler** (port `6543`) → **à éviter ici** : il casse les transactions interactives (erreur `P2028 « Transaction not found »`).

Construisez (même hôte `pooler.supabase.com`, port **5432**, **sans** suffixe `?pgbouncer=...`) :
- **DATABASE_URL** = `postgresql://postgres.xxxx:mdp@aws-0-region.pooler.supabase.com:5432/postgres`
- **DIRECT_URL** = idem (le pooleur de session convient pour `prisma db push`)
  ex : `postgresql://postgres.xxxx:mdp@aws-0-region.pooler.supabase.com:5432/postgres`

---

## 2. Configuration `.env`

```bash
cp .env.example .env
```

Renseignez chaque variable :

| Variable | Description | Exemple |
|---|---|---|
| `PORT` | Port du serveur | `4000` |
| `NODE_ENV` | Environnement | `development` |
| `FRONTEND_URL` | Origine(s) frontend (CORS), séparées par `,` | `http://localhost:5173` |
| `SUPABASE_URL` | Project URL Supabase | `https://xxxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé service role | `eyJhbGci...` |
| `SUPABASE_BUCKET` | Nom du bucket Storage | `meals-images` |
| `DATABASE_URL` | Connexion Postgres **pooleur de session** (port 5432) | `postgresql://...:5432/postgres` |
| `DIRECT_URL` | Connexion pour `prisma db push` (pooleur de session) | `postgresql://...:5432/postgres` |

---

## 3. Base de données & seed

```bash
npm install
npx prisma generate      # génère le client Prisma typé
npx prisma db push       # crée/met à jour toutes les tables dans Supabase
npm run seed             # charge les rayons par défaut + 3 plats d'exemple
```

- Le **schéma** est décrit dans [`prisma/schema.prisma`](./prisma/schema.prisma).
- Un export SQL autonome est disponible dans [`prisma/schema.sql`](./prisma/schema.sql) (exécutable directement dans **Supabase Studio → SQL Editor**) si vous préférez ne pas utiliser Prisma.
- Le seed crée aussi le **bol méditerranéen** fourni dans le cahier des charges.

> `prisma db push` utilise `DIRECT_URL` (connexion directe). L'application utilise `DATABASE_URL` (poolée) à l'exécution.

---

## 4. Bucket Storage (images)

Les photos de plats sont stockées dans **Supabase Storage**.

1. Dashboard Supabase → **Storage** → **New bucket**.
2. Nom : **`meals-images`**.
3. Cochez **Public bucket** (lecture publique des images, pas de auth requise pour afficher).
4. Confirmez. (La variable `SUPABASE_BUCKET=meals-images` est déjà dans `.env`.)

> Les uploads s'effectuent côté serveur avec la clé `service_role` ; aucun réglage RLS n'est nécessaire pour un bucket public en lecture.

---

## 5. Lancer en local

```bash
npm run dev
```

- Serveur : **http://localhost:4000**
- Santé : http://localhost:4000/api/health → `{"status":"ok"}`
- Racine : http://localhost:4000/ → liste des endpoints.

### Scripts npm

| Script | Rôle |
|---|---|
| `npm run dev` | Démarre avec hot-reload (`tsx watch`) |
| `npm run build` | Compile TypeScript → `dist/` |
| `npm start` | Lance le build de production (`node dist/index.js`) |
| `npm run seed` | Charge les données d'exemple |
| `npm run db:push` | Synchronise le schéma Prisma avec la BDD |
| `npm run typecheck` | Vérifie les types sans émettre de fichiers |

---

## 6. API — endpoints

Préfixe : `/api`. Toutes les réponses en JSON.

> 🔐 **Authentification** — toutes les routes (sauf `GET /api/health`) exigent un en-tête `Authorization: Bearer <token>` contenant un jeton de session Supabase valide (connexion Apple / Google côté frontend). Le middleware `src/middleware/auth.ts` vérifie le jeton auprès de Supabase et renvoie `401` sinon. Exemple :
> ```bash
> curl -H "Authorization: Bearer $TOKEN" http://localhost:4000/api/meals
> ```

### Repas (`/api/meals`)
| Méthode | Route | Description |
|---|---|---|
| GET | `/meals` | Liste (favoris en 1er, puis date ↓) |
| GET | `/meals/:id` | Détail (ingrédients + étapes) |
| POST | `/meals` | Création (création manuelle **ou** import JSON) |
| PUT | `/meals/:id` | Mise à jour |
| DELETE | `/meals/:id` | Suppression (cascade) |
| PATCH | `/meals/:id/favorite` | Bascule favori |
| POST | `/meals/:id/image` | Upload photo (multipart `image`) → Storage |

### Planification (`/api/meal-plans`)
| Méthode | Route | Description |
|---|---|---|
| GET | `/meal-plans?date=YYYY-MM-DD` | Plans couvrant ce jour |
| GET | `/meal-plans?from=&to=` | Plans intersectant la plage |
| POST | `/meal-plans` | Crée un plan → **génère la liste de courses** |
| PUT | `/meal-plans/:id` | Modifie (recompute liste si repas/portions changent) |
| PATCH | `/meal-plans/:id/status` | Change le statut |
| DELETE | `/meal-plans/:id` | Supprime → met à jour la liste |

### Liste de courses (`/api/grocery-items`, `/api/grocery-aisles`)
| Méthode | Route | Description |
|---|---|---|
| GET | `/grocery-items?archived=false` | `{ items, aisles }` triés |
| POST | `/grocery-items` | Ajoute un item manuel |
| PUT | `/grocery-items/:id` | Modifie un item |
| DELETE | `/grocery-items/:id` | Supprime |
| PATCH | `/grocery-items/:id/check` | Bascule « acheté » |
| POST | `/grocery-items/archive` | `{mode:"checked"\|"all", ids?}` |
| POST | `/grocery-items/unarchive` | `{ids?}` |
| GET/POST/PUT/DELETE | `/grocery-aisles` | Gestion des rayons |

---

## 7. Déploiement sur Render

Deux options : **Blueprint** (recommandé) ou **manuel**.

### Option A — Blueprint (`render.yaml`)
Le fichier [`render.yaml`](../render.yaml) (à la racine du dépôt) décrit les deux services.
1. Poussez le projet sur un dépôt **GitHub/GitLab**.
2. Sur Render : **New** → **Blueprint** → sélectionnez le dépôt.
3. Render crée `bashkush-api` (web service) et `bashkush-web` (static site).
4. Renseignez les variables **manquantes** (`sync: false`) dans le dashboard Render :
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `DIRECT_URL`, `FRONTEND_URL`
   - côté frontend : `VITE_API_URL` (l'URL publique de l'API Render).

### Option B — Manuel (web service)
1. Render → **New +** → **Web Service** → connectez le dépôt.
2. **Settings** :
   - **Root Directory** : `backend`
   - **Build Command** : `npm install && npx prisma generate && npm run build`
   - **Start Command** : `node dist/index.js`
   - **Plan** : Free
   - **Health Check Path** : `/api/health`
3. **Environment variables** (table du §2) — ajoutez-y :
   - `NODE_ENV=production`
   - `PORT=10000` (Render injecte `PORT`, mais on le fixe pour le healthcheck)
4. **Create Web Service**. Le déploiement lance `prisma generate` + build + start.
5. ⚠️ **Premier déploiement uniquement** : créez le schéma et chargez le seed. Soit :
   - en local avec les variables de prod dans `.env` : `npx prisma db push && npm run seed` (la BDD Supabase est partagée), **ou**
   - via le **Shell** Render : `npx prisma db push && npm run seed`.
   > Ensuite, conservez les données ; ne re-seedz pas à chaque déploiement.

### Variables d'environnement en production
| Variable | Valeur en prod |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `10000` (ou laissé à Render) |
| `FRONTEND_URL` | URL publique du frontend Render |
| `SUPABASE_URL` | idem local |
| `SUPABASE_SERVICE_ROLE_KEY` | idem local |
| `DATABASE_URL` | connexion poolée Supabase |
| `DIRECT_URL` | connexion directe Supabase |
| `SUPABASE_BUCKET` | `meals-images` |

> ⚠️ Sur le plan gratuit Render, le service **s'endort** après ~15 min d'inactivité et met ~30–60 s à se réveiller au premier appel. C'est normal.

---

## 8. Tests manuels (curl)

```bash
# Santé
curl http://localhost:4000/api/health

# Liste des plats
curl http://localhost:4000/api/meals

# Créer un plat (import JSON équivalent)
curl -X POST http://localhost:4000/api/meals \
  -H "Content-Type: application/json" \
  -d '{"name":"Test bowl","servings":2,"ingredients":[{"id":"x","name":"Riz","quantity":100,"unit":"g","aisle":"feculents"}],"steps":[]}'

# Planifier → génère la liste de courses
curl -X POST http://localhost:4000/api/meal-plans \
  -H "Content-Type: application/json" \
  -d '{"mealId":"<ID>","fromDate":"2026-08-12","toDate":"2026-08-12","servings":2,"status":"a_faire"}'

# Voir la liste générée
curl "http://localhost:4000/api/grocery-items"
```

---

## 9. Dépannage

| Problème | Solution |
|---|---|
| **P2028 « Transaction not found »** à la planification d'un plat | `DATABASE_URL` pointe vers le **pooleur de transaction (6543)** qui casse les transactions interactives. Passez au **pooleur de session (port 5432)**, sans suffixe `?pgbouncer=...`, puis relancez le backend. |
| `prisma db push` : `too many connections` / erreur TLS | Utilisez le pooleur de session (port 5432, hôte `*.pooler.supabase.com`) pour `DATABASE_URL` et `DIRECT_URL`. |
| `P1003: database does not exist` | Vérifiez que le `DATABASE_URL` pointe bien sur la base `postgres` (suffixe `/postgres`). |
| Upload image 500 | Vérifiez que le bucket `meals-images` existe et est **public**, et que `SUPABASE_SERVICE_ROLE_KEY` est correcte. |
| CORS bloqué côté frontend | Ajoutez l'URL du frontend dans `FRONTEND_URL` (séparateur `,`). |
| Le seed échoue (duplicate) | Les upserts sont idempotents ; si besoin : `npx prisma db push --force-reset` (⚠️ efface les données). |

---

## 🧠 Logique métier — `src/lib/groceryEngine.ts`

Cœur de l'application. Invariant :
- **Ajouter** une planification → pour chaque ingrédient (mis à l'échelle selon les portions), on récupère/crée l'item actif (`nom + unité + rayon`) et on **incrémente** sa quantité (création d'une *contribution*).
- **Supprimer/Modifier** un plan → on décrémente les quantités, supprime les contributions, et retire les items devenus **orphelins** (plus de contribution **et** non créés manuellement).

Tout s'exécute dans une **transaction Prisma** → cohérence garantie, même si plusieurs plans partagent un même ingrédient.
