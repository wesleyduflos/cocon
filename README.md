# Cocon

> L'organisation du cocon, à deux.

PWA personnelle de gestion partagée pour Wesley et Camille : tâches, courses, agenda, mémoire du foyer.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind v4 · Firebase (Auth, Firestore, Functions gen 2, Storage, FCM) · Netlify · Anthropic Claude API.

Identité visuelle **Brique Flamme** (dark par défaut) · polices Funnel Display + Funnel Sans.

## Documentation

Toutes les décisions techniques et UX sont figées dans [`docs/`](./docs) :

- [`architecture-cocon.md`](./docs/architecture-cocon.md) — stack, modèle de données Firestore, règles de sécurité, déploiement
- [`screens-spec.md`](./docs/screens-spec.md) — spécifications fonctionnelles écran par écran
- [`brique-flamme-tokens.md`](./docs/brique-flamme-tokens.md) — design tokens
- [`sprint-1-prompt.md`](./docs/sprint-1-prompt.md) — périmètre du sprint courant

## Prérequis

- Node 22 ou plus (testé sur Node 24)
- pnpm 10+ (`npm install -g pnpm`)
- Firebase CLI (`npm install -g firebase-tools`), loggé sur le projet `cocon-app-4680a`

## Démarrage local

```bash
# Installer les dépendances
pnpm install
pnpm --dir functions install --ignore-workspace

# Copier le template d'environnement et remplir les valeurs Firebase
cp .env.local.example .env.local

# Lancer Next.js en dev (http://localhost:3000)
pnpm dev

# (Optionnel) Lancer les Firebase Emulators en parallèle
firebase emulators:start
# UI sur http://localhost:4000
```

Les valeurs `NEXT_PUBLIC_FIREBASE_*` sont à récupérer dans Firebase Console → Project settings → Your apps → Web app.

## Scripts

| Commande | Effet |
|---|---|
| `pnpm dev` | Dev server Next.js avec Turbopack |
| `pnpm build` | Build production |
| `pnpm start` | Serveur production local (après `build`) |
| `pnpm lint` | ESLint |
| `pnpm --dir functions build` | Compile les Cloud Functions TypeScript |
| `firebase emulators:start` | Lance les émulateurs Auth + Firestore + Functions + Storage |
| `firebase deploy --only firestore:rules,firestore:indexes` | Déploie les règles et index |
| `firebase deploy --only functions` | Déploie les Cloud Functions |

## Déploiement

Le frontend Next.js est déployé sur **Netlify** via GitHub : chaque push sur `main` déclenche un build. Les variables `NEXT_PUBLIC_FIREBASE_*` doivent être configurées dans le dashboard Netlify (Site settings → Environment variables).

Les services Firebase (Firestore rules, Cloud Functions) sont déployés via `firebase deploy` depuis cette machine.

## Roadmap

Sprint 1 (en cours) — fondations : auth email-first, création/rejoindre cocon, tâches, dashboard minimal, Cloud Function `parseTask`, états vides, PWA basique.

Sprints suivants : voir `docs/architecture-cocon.md` §9.
