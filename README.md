# Cocon

> L'organisation du cocon, à deux.

PWA personnelle de gestion partagée pour Wesley et Camille : tâches, courses, agenda, mémoire du foyer.

**Production** : https://cocon-app.netlify.app

## Stack

Next.js 16 (App Router · Turbopack) · TypeScript strict · Tailwind v4 · Firebase (Auth · Firestore · Functions gen 2 · Storage) · Netlify · Anthropic Claude API (Haiku 4.5 pour le parsing IA).

Identité visuelle **Brique Flamme** (dark par défaut, light en option) · polices Funnel Display + Funnel Sans.

## État du projet — fin du sprint 2

### Sprint 1 (clos)
- Auth email-first via magic link Firebase
- Création / rejoindre cocon via lien d'invitation (UUIDv4, 7 jours)
- Module Tasks : CRUD, assignation, échéance, toast undo, filtres + groupage temporel
- Dashboard avec greeting, résumé, tâches du jour, activité récente, avatars membres
- Saisie naturelle via Cloud Function `parseTask` (Claude Haiku 4.5)
- Settings : profil, cocon, apparence (dark/light), compte
- Bottom nav 5 onglets · sync temps réel `onSnapshot` · PWA

### Sprint 3 (livré)
- ✅ **Passkeys WebAuthn** : registration + login via `@simplewebauthn` côté Cloud Functions, Custom Token Firebase Auth pour signin. UI dans `/login` (lookup email → passkey prioritaire si dispo) et `/settings/profile` (listing + register + delete).
- ✅ **Module Courses** : grille des 8 essentiels du foyer, cards par rayon pliables, création avec saisie naturelle IA (`parseShoppingItem`), notes contextuelles, **bottom nav onglet Courses connecté**.
- ✅ **Mode supermarché** : vue duale focus rayon courant + minimap des autres rayons, haptic vibration au check, célébration en fin de session, couplage automatique avec les stocks.
- ✅ **Module Stocks** : 4 niveaux (plein/entamé/bas/épuisé), couplage bi-directionnel avec courses (auto-ajout aux courses quand stock bas, auto-renouvellement à `full` quand l'article lié est acheté en mode supermarché), prédiction simple de renouvellement (rolling 3 derniers intervalles).
- ✅ **Module Mémoire** : 6 types (code/object/contact/manual/warranty/note) avec champs adaptés au type, recherche tokenisée client-side (NFD + prefix match), biométrie WebAuthn pour révéler les codes sensibles, copier presse-papier d'un tap.
- ✅ **Préparations** : 7 templates seedés par défaut, lancement génère N tâches avec `checklistRunId`, page `/preparations`.
- ✅ **Transversaux** : drawer Plus refondu (Mémoire / Stocks / Préparations actifs ; Journal / Assistant IA en « Bientôt »), sous-page `/settings/cocon` étendue avec compteurs des 6 modules + reseed quick-add et templates (owner only).

Notes :
- Pour activer les passkeys, déployer les Cloud Functions (`firebase deploy --only functions`)
- L'IA `parseShoppingItem` utilise Haiku 4.5 (~0,0003 €/appel)
- 118 tests passants, ~36 routes, **30 commits** sur le sprint

### Sprint 2 (livré)
- ✅ **Récurrence des tâches** (RRULE iCal via `rrule`) : presets jours/semaines/mois, picker de jours pour weekly, jour du mois pour monthly. À chaque complétion d'une tâche récurrente, on clone le doc en `done` figé pour l'historique et on avance la `dueDate` du doc actif sur la prochaine occurrence.
- ✅ **Module Calendrier** (`screens-spec §3.6` Variante 1) : mini-mois 6×7 avec dots colorés (primary pour les événements locaux, secondary pour les tâches duedate, highlight pour all-day), jour sélectionné, création + détail d'événements, intégration des tâches en read-only.
- ✅ **OAuth Google Calendar** (read-only, Q2) : Cloud Functions `exchangeGoogleCode`/`syncGoogleCalendar`/`disconnectGoogle`, page `/settings/connectors`, refresh token isolé par owner (`users/{uid}/integrations/google`).
- ✅ **Notifications push FCM** : Cloud Function `sendTaskReminder` (cron 60 min Europe/Paris) avec quiet hours, `sendNotificationTest` callable, sous-page `/settings/notifications`, Service Worker FCM généré dynamiquement par Next.js (config inlinée depuis env vars).
- 🔜 **Passkeys WebAuthn** : reportées au sprint 3. Annonce visible dans `/login`. Voir `docs/feedback_firebase_gotchas.md §14` pour le plan d'attaque.

Coût de fonctionnement : **~0,15 €/mois** sur Anthropic, **0 €** sur Firebase et Netlify (largement sous les quotas gratuits).

## Documentation

Toutes les décisions techniques et UX sont figées dans [`docs/`](./docs) :

- [`architecture-cocon.md`](./docs/architecture-cocon.md) — stack, modèle de données Firestore, règles de sécurité, déploiement
- [`screens-spec.md`](./docs/screens-spec.md) — spécifications fonctionnelles écran par écran
- [`brique-flamme-tokens.md`](./docs/brique-flamme-tokens.md) — design tokens (variables CSS, fonts, gradients)
- [`sprint-1-prompt.md`](./docs/sprint-1-prompt.md) — périmètre du sprint clos

## Prérequis dev

- Node 22+ (testé sur Node 24)
- pnpm 10+ (`npm install -g pnpm`)
- Firebase CLI (`npm install -g firebase-tools`), loggé sur le projet `cocon-app-4680a`
- (Optionnel pour dev local sans quota) Java JDK 21+ pour les Firebase Emulators

## Démarrage

### Mode 1 — Contre la prod (rapide, mais consomme le quota Firebase Auth)

```bash
# Installer les dépendances (frontend)
pnpm install

# Installer les deps des Cloud Functions (projet npm indépendant)
cd functions && npm install && cd ..

# Copier le template d'environnement et remplir les valeurs Firebase
cp .env.local.example .env.local

# Lancer Next.js (http://localhost:3000)
pnpm dev
```

### Mode 2 — Avec les Firebase Emulators (recommandé pour itérer)

Les emulators tournent localement, **aucun quota n'est consommé**, et les magic links ne sont pas envoyés par email — ils sont disponibles via l'API REST de l'emulator.

```bash
# Terminal 1 — Lancer tous les emulators (Auth + Firestore + Functions + Storage)
firebase emulators:start

# Terminal 2 — Lancer Next.js avec NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true dans .env.local
pnpm dev
```

UI Emulator : http://localhost:4000 — onglet Authentication pour voir les users, onglet Firestore pour inspecter les collections.

### Récupérer un magic link depuis l'emulator

Comme l'emulator n'envoie pas vraiment d'email, on lit le lien via son API REST. Snippet PowerShell pratique :

```powershell
function Get-CoconMagicLink {
  $r = Invoke-RestMethod -Uri "http://localhost:9099/emulator/v1/projects/cocon-app-4680a/oobCodes" -Method Get
  $r.oobCodes | Select-Object -Last 1 | ForEach-Object {
    Set-Clipboard $_.oobLink
    Write-Host "Magic link de $($_.email) copié dans le presse-papier !"
  }
}
```

Après avoir saisi l'email sur `/login`, lance `Get-CoconMagicLink` et fais Ctrl+V dans la barre d'adresse Chrome.

## Scripts

| Commande | Effet |
|---|---|
| `pnpm dev` | Dev server Next.js avec Turbopack |
| `pnpm build` | Build production |
| `pnpm start` | Serveur production local (après `build`) |
| `pnpm lint` | ESLint |
| `pnpm test` | Vitest (50 tests sur helpers Firestore, parsing IA, magic link) |
| `pnpm test:watch` | Vitest en mode watch |
| `cd functions && npm run build` | Compile TypeScript des Cloud Functions |
| `firebase emulators:start` | Lance Auth + Firestore + Functions + Storage en local |
| `firebase deploy --only firestore:rules,firestore:indexes` | Déploie les règles et index |
| `firebase deploy --only functions` | Déploie les Cloud Functions |

## Déploiement

Le frontend Next.js est déployé sur **Netlify** via GitHub : chaque push sur `main` déclenche un build automatique. Les variables `NEXT_PUBLIC_FIREBASE_*` sont configurées dans Site settings → Environment variables.

Les services Firebase (rules Firestore, Cloud Functions) sont déployés via `firebase deploy` depuis cette machine.

### Configurer un secret pour les Cloud Functions

```powershell
$tempFile = [System.IO.Path]::GetTempFileName()
[System.IO.File]::WriteAllText($tempFile, "VALEUR_DU_SECRET")
firebase functions:secrets:set NOM_DU_SECRET --project cocon-app-4680a --data-file="$tempFile"
Remove-Item $tempFile -Force
```

(Pour les bash users : équivalent `mktemp` + `firebase functions:secrets:set ... --data-file`.)

## Variables d'env attendues

| Var | Lieu | Bloc |
|---|---|---|
| `NEXT_PUBLIC_FIREBASE_*` (6) | Netlify + `.env.local` | Sprint 1 |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Netlify + `.env.local` | Sprint 2 (Google Calendar) |
| `NEXT_PUBLIC_FCM_VAPID_PUBLIC_KEY` | Netlify + `.env.local` | Sprint 2 (FCM) |

## Secrets Firebase Functions

| Secret | Bloc | Set via |
|---|---|---|
| `ANTHROPIC_API_KEY` | Sprint 1 (`parseTask`) | `firebase functions:secrets:set ANTHROPIC_API_KEY` |
| `GOOGLE_CLIENT_ID` | Sprint 2 (Google Calendar) | idem |
| `GOOGLE_CLIENT_SECRET` | Sprint 2 (Google Calendar) | idem |

## Roadmap des sprints

Sprint 1 (clos) — fondations · **Sprint 2 (clos)** — récurrence + agenda + sync Google + push FCM · Sprint 3 — passkeys + courses + stocks + mémoire + préparations · Sprint 4 — IA voix + journal + suggestions.

Voir [`docs/architecture-cocon.md`](./docs/architecture-cocon.md) §9 pour le détail.
