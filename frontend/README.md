# Frontend Bashkush

SPA **React + Vite + TypeScript**, UI **mobile-first** avec **Tailwind CSS**.

## Sommaire
1. [Prérequis](#prérequis)
2. [Configuration `.env`](#1--configuration-env)
3. [Lancer en local](#2--lancer-en-local)
4. [Structure du projet](#3--structure-du-projet)
5. [Déploiement sur Render (static site)](#4--déploiement-sur-render-static-site)
6. [Dépannage](#5--dépannage)

---

## Prérequis

- **Node.js ≥ 18** (idéalement 20)
- **npm**
- Le **backend Bashkush** démarré (voir [`../backend/README.md`](../backend/README.md)).

---

## 1. Configuration `.env`

```bash
cp .env.example .env
```

| Variable | Description | Exemple |
|---|---|---|
| `VITE_API_URL` | URL de l'API backend (sans `/api`) | `http://localhost:4000` |
| `VITE_SUPABASE_URL` | Project URL Supabase (auth Apple / Google) | `https://xxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Clé anon (publique) du projet Supabase | `eyJhbGci...` |

Les clés Supabase se trouvent dans le dashboard : **Settings → API**.
Voir le README racine pour activer les providers **Apple / Google** (Authentication → Providers).

En production, cette valeur sera l'URL publique du web service Render
(ex : `https://bashkush-api.onrender.com`).

---

## 2. Lancer en local

```bash
npm install
npm run dev
```

→ **http://localhost:5173**

> ⚠️ Démarrez d'abord le backend (`cd ../backend && npm run dev`).
> Le frontend appelle `${VITE_API_URL}/api/*`.

### Scripts npm

| Script | Rôle |
|---|---|
| `npm run dev` | Serveur de développement Vite (HMR) |
| `npm run build` | Build de production (`tsc -b && vite build`) → `dist/` |
| `npm run preview` | Prévisualiser le build localement |
| `npm run typecheck` | Vérification des types |

---

## 3. Structure du projet

```
src/
├── api/              Client Axios + hooks TanStack Query (meals, mealPlans, grocery)
├── components/
│   ├── layout/       AppShell, Header, BurgerMenu
│   ├── meals/        MealCarousel, MealCard, FavoriteButton
│   ├── calendar/     Calendar (grille mensuelle + pastilles)
│   ├── grocery/      GroceryItemRow, GroceryItemModal
│   ├── modals/       Modal (bottom-sheet), MealEditionModal, MealPlanningModal
│   └── ui/           Button, Feedback, FormControl, NumberStepper
├── lib/              utils (dates, formatage), options (enums), plans (helpers), client Supabase (auth)
├── pages/            LoginPage, HomePage, MealsPage, CalendarPage, GroceryListPage
├── store/            uiStore (menu burger), authStore (session Supabase)
├── types/            Types partagés + libellés FR
├── router.tsx        Routes React Router
├── App.tsx           Providers (QueryClient + Router + AppShell)
└── main.tsx          Point d'entrée
```

### Navigation & modales
Les routes utilisent des **query params** pour ouvrir les modales (partageables / bouton retour géré) :
- `/meals?meal=<id>` (édition) ou `?meal=new` (création) → `MealEditionModal`
- `/calendar?date=YYYY-MM-DD` (jour actif) et `?plan=<id>` / `?plan=new` → `MealPlanningModal`

---

## 4. Déploiement sur Render (static site)

### Option A — Blueprint
Le fichier [`render.yaml`](../render.yaml) (racine du dépôt) crée aussi le static site.
Après création du Blueprint, renseignez `VITE_API_URL` (URL publique de l'API).

### Option B — Manuel
1. Render → **New +** → **Static Site** → connectez le dépôt.
2. **Settings** :
   - **Root Directory** : `frontend`
   - **Build Command** : `npm install && npm run build`
   - **Publish Directory** : `dist`
   - **Plan** : Free
3. **Environment variables** :
   - `VITE_API_URL` = URL publique du backend (ex : `https://bashkush-api.onrender.com`)
   - `VITE_SUPABASE_URL` = Project URL Supabase
   - `VITE_SUPABASE_ANON_KEY` = clé anon Supabase
4. **Create Static Site**.
5. **Routing SPA** : ajoutez une **redirect/rewrite** pour que toute route serve `index.html` :
   - **Redirects/Rewrites** → `/*` → `/index.html` (Action : Rewrite).
   > Avec le Blueprint `render.yaml`, cette règle est déjà configurée (`routes: rewrite /* → /index.html`).

### Vérifications post-déploiement
- Ouvrez l'URL Render du frontend → la page d'accueil charge.
- Vérifiez que le **carrousel de plats** affiche les données (sinon : problème `VITE_API_URL` ou CORS backend).
- Testez une création de plat + planification → la liste de courses doit se remplir.

---

## 5. Dépannage

| Problème | Solution |
|---|---|
| Page blanche / « network error » | Vérifiez `VITE_API_URL` et que le backend est en ligne (le plan gratuit Render met ~30 s à se réveiller). |
| Erreur CORS dans la console | Côté backend, ajoutez l'URL du frontend dans `FRONTEND_URL`. |
| 404 au refresh sur `/meals` ou `/calendar` | La règle de **rewrite SPA** (`/* → /index.html`) est manquante côté Render. |
| Modale ne s'ouvre pas | Les modales s'ouvrent via query param (`?meal=`, `?plan=`) ; vérifiez l'URL. |
| Les images ne s'affichent pas | Le bucket Supabase `meals-images` doit être **public**. |
| Erreur au clic sur « Continuer avec Apple / Google » | Provider non activé dans Supabase (Authentication → Providers) ou URL de redirection manquante (Authentication → URL Configuration). |
