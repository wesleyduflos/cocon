# Cocon · Architecture technique

> Document de référence pour Claude Code. Décisions techniques figées pour le projet Cocon, app de gestion du cocon pour Wesley et Camille.

---

## 1. Vue d'ensemble

### 1.1 Stack technique

| Couche | Choix | Pourquoi |
|---|---|---|
| **Frontend** | Next.js 15 (App Router) + TypeScript + Tailwind + shadcn/ui | Framework moderne, SSR/CSR flexible, écosystème mature |
| **PWA** | next-pwa | Installation sur écran d'accueil Android/iOS, offline-first |
| **Hébergement** | Netlify | Déploiement Git-based, CDN mondial, HTTPS auto, gratuit pour ce projet |
| **Auth** | Firebase Authentication | Magic links + passkeys natifs, gestion utilisateurs gratuite |
| **Base de données** | Firestore (Firebase) | NoSQL temps réel, sync multi-appareils native, offline natif |
| **Stockage fichiers** | Firebase Cloud Storage | Photos packaging, manuels PDF, attachments |
| **Background / IA** | Cloud Functions (Firebase, gen 2) | Parse-task IA, suggestions IA, jobs récurrents (cron via Pub/Sub) |
| **Notifications push** | Firebase Cloud Messaging (FCM) | Web Push natif, gratuit, intégré |
| **IA** | Anthropic Claude API (via Cloud Function) | parse-task, voice transcription multi-intentions, suggestions |
| **Transcription audio** | OpenAI Whisper API (via Cloud Function) | Notes vocales rapides |
| **Email (sprint 2+)** | Firebase Auth gère seul les magic links · invitations partagées manuellement au sprint 1 | Pas besoin de service email externe au démarrage |

### 1.2 Pourquoi cette stack

- **Tu connais déjà Firebase + Netlify** (TRAINOX) → courbe d'apprentissage zéro
- **Aucune infrastructure à gérer** : pas de Docker, pas de Caddy, pas de DNS, pas de serveur
- **HTTPS automatique** dès le premier déploiement → passkeys fonctionnent immédiatement
- **Coût = 0 €** pour usage à 2 personnes (largement sous les quotas gratuits Firebase Spark + Netlify Free)
- **Sync temps réel offerte** : Firestore est natif temps réel, pas besoin de WebSocket à coder
- **Offline natif** : Firestore SDK cache automatiquement et sync au retour en ligne
- **Sécurité gérée** : auth, règles Firestore, certificats SSL, tout est managé par Google/Netlify

### 1.3 Cible utilisateur

- 2 utilisateurs principaux : Wesley + Camille
- Plateformes : Android (mobile principal), Windows (desktop secondaire)
- Usage : quotidien, partagé, parfois offline (en magasin notamment)
- Pas d'ambition commerciale, projet personnel

---

## 2. Organisation du code

### 2.1 Structure du repo

```
cocon/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Routes publiques (login, signup, join)
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── join/[token]/page.tsx
│   ├── (app)/                    # Routes protégées (auth required)
│   │   ├── layout.tsx            # Layout avec bottom nav
│   │   ├── page.tsx              # Dashboard
│   │   ├── tasks/
│   │   ├── shopping/
│   │   ├── shopping/market/      # Mode supermarché
│   │   ├── calendar/
│   │   ├── memory/
│   │   ├── stocks/
│   │   ├── journal/
│   │   ├── assistant/
│   │   └── settings/
│   ├── api/                      # Routes API Next.js (proxies, pas de logique métier lourde)
│   │   └── auth/lookup/route.ts  # Email-first routing
│   └── layout.tsx                # Root layout (theme, fonts)
├── components/
│   ├── ui/                       # shadcn/ui copiés
│   ├── tasks/
│   ├── shopping/
│   └── shared/                   # Toast, FAB, modale, etc.
├── lib/
│   ├── firebase/
│   │   ├── client.ts             # Init SDK client
│   │   ├── auth.ts               # Helpers auth
│   │   ├── firestore.ts          # Helpers Firestore + types
│   │   └── storage.ts            # Helpers Cloud Storage
│   ├── ai/
│   │   ├── parse-task.ts         # Wrapper de la Cloud Function
│   │   └── voice-parse.ts
│   └── utils/
├── hooks/                        # React hooks (useTasks, useShoppingList, etc.)
├── types/                        # Types TypeScript partagés
├── functions/                    # Cloud Functions Firebase (séparé pour déploiement)
│   ├── src/
│   │   ├── parseTask.ts          # Appel Anthropic
│   │   ├── voiceParse.ts         # Whisper + Anthropic
│   │   ├── checklistSuggester.ts # Cron sprint 4
│   │   └── triggers/             # Triggers Firestore (notifications)
│   ├── package.json
│   └── tsconfig.json
├── firestore.rules               # Règles de sécurité Firestore
├── storage.rules                 # Règles de sécurité Cloud Storage
├── firebase.json                 # Config déploiement Firebase
├── netlify.toml                  # Config déploiement Netlify
├── public/
│   ├── manifest.json             # PWA manifest
│   ├── icon-192.png
│   └── icon-512.png
└── package.json
```

### 2.2 Outils dev

- **Node 22 LTS**
- **pnpm** (préféré à npm/yarn pour la rapidité)
- **Firebase CLI** (`firebase-tools`) pour déployer rules + functions + emulators
- **Firebase Emulator Suite** pour le développement local (Firestore + Auth + Functions + Storage en local, zéro coût)
- **Netlify CLI** (optionnel, déploiement automatique via GitHub suffit)
- **TypeScript strict mode**
- **ESLint + Prettier**
- **Vitest** pour les tests unitaires (lib helpers)

---

## 3. Modèle de données Firestore

### 3.1 Principes

Firestore est NoSQL document-based. On organise par **collections** et **documents**, avec **sous-collections** pour les relations 1-N propres.

**Convention de nommage** :
- Collections : pluriel kebab-case (`households`, `tasks`, `shopping-items`)
- Documents : ID auto-générés par Firestore (`autoId()`)
- Champs : camelCase (`createdAt`, `dueDate`, `assigneeId`)
- Timestamps : `Firestore Timestamp` (jamais `Date` JS direct)

### 3.2 Schéma des collections

#### `users/{userId}`
```typescript
{
  id: string,              // = uid Firebase Auth
  email: string,
  displayName: string,
  avatarUrl?: string,
  createdAt: Timestamp,
  preferences: {
    theme: 'dark' | 'light' | 'system',  // default 'dark'
    quietHoursStart: number,              // 22
    quietHoursEnd: number,                // 7
    notificationsEnabled: boolean,
    voiceCaptureEnabled: boolean,
  }
}
```

#### `households/{householdId}`
```typescript
{
  id: string,
  name: string,                          // « Cocon Magnolia »
  emoji?: string,                        // 🏠 par défaut
  createdAt: Timestamp,
  ownerId: string,                       // userId du créateur
  memberIds: string[],                   // pour les requêtes "mes cocons"
  invitations: {                         // map des invitations actives
    [token: string]: {
      email: string,
      invitedBy: string,
      invitedAt: Timestamp,
      expiresAt: Timestamp,
    }
  }
}
```

#### `households/{householdId}/members/{userId}`
Sous-collection pour la relation cocon ↔ membres. Doublon volontaire avec `memberIds[]` parent pour permettre les requêtes optimisées.

```typescript
{
  userId: string,
  role: 'owner' | 'member',
  joinedAt: Timestamp,
  displayNameInHousehold?: string,        // surnom optionnel dans ce cocon
}
```

#### `households/{householdId}/tasks/{taskId}`
```typescript
{
  id: string,
  title: string,
  description?: string,
  category?: string,                      // 'maison' | 'animaux' | 'voiture' | etc.
  assigneeId?: string,                    // userId ou null (non assignée)
  effort?: 'quick' | 'normal' | 'long',
  status: 'pending' | 'done' | 'cancelled',
  dueDate?: Timestamp,
  completedAt?: Timestamp,
  completedBy?: string,
  notes?: string,                          // notes contextuelles partagées
  attachmentIds?: string[],                // refs vers /attachments
  recurrenceRule?: string,                 // RRULE iCal (sprint 2)
  checklistRunId?: string,                 // FK vers checklist-runs (sprint 3)
  createdAt: Timestamp,
  createdBy: string,
  updatedAt: Timestamp,
}
```

#### `households/{householdId}/shopping-items/{itemId}`
```typescript
{
  id: string,
  name: string,
  emoji?: string,
  quantity: number,                        // 1 par défaut
  unit?: string,                           // 'pcs' | 'kg' | 'L' | etc.
  rayon: string,                           // 'frais' | 'epicerie' | 'hygiene' | etc.
  notes?: string,                          // « marque flacon vert »
  attachmentIds?: string[],
  status: 'pending' | 'bought',
  boughtAt?: Timestamp,
  boughtBy?: string,
  stockItemId?: string,                    // FK vers stocks (sprint 3)
  fromQuickAdd: boolean,                   // ★ marqueur grille
  addedAt: Timestamp,
  addedBy: string,
}
```

#### `households/{householdId}/quick-add-items/{itemId}`
La grille « Essentiels du cocon ».
```typescript
{
  id: string,
  name: string,
  emoji: string,
  defaultRayon: string,
  defaultUnit?: string,
  position: number,                        // ordre dans la grille
}
```

#### `households/{householdId}/calendar-events/{eventId}`
```typescript
{
  id: string,
  title: string,
  description?: string,
  location?: string,
  startTime: Timestamp,
  endTime?: Timestamp,
  allDay: boolean,
  assigneeIds?: string[],                  // event « Camille + Wesley »
  source: 'local' | 'google' | 'outlook',  // external sync sprint 2+
  externalEventId?: string,
  recurrenceRule?: string,                 // sprint 2
  createdAt: Timestamp,
  createdBy: string,
}
```

#### `households/{householdId}/memory-entries/{entryId}`
```typescript
{
  id: string,
  type: 'code' | 'object' | 'contact' | 'manual' | 'warranty' | 'note',
  title: string,
  emoji?: string,
  pinned: boolean,
  pinnedOrder?: number,
  structuredData: {
    // dépend du type, JSON libre
    // ex code : { value: '1492', location: 'portail entrée' }
    // ex contact : { name: 'Dr Lefèvre', phone: '01 23 45 67 89', specialty: 'vétérinaire' }
    // ex object : { location: 'secrétaire tiroir du haut' }
  },
  tags: string[],                          // pour recherche
  attachmentIds?: string[],
  isSensitive: boolean,                    // demande biométrie pour révéler
  lastViewedAt?: Timestamp,                // pour « récemment consultés »
  createdAt: Timestamp,
  createdBy: string,
  updatedAt: Timestamp,
}
```

#### `households/{householdId}/stocks/{stockId}` (sprint 3)
```typescript
{
  id: string,
  name: string,
  emoji?: string,
  level: 'full' | 'half' | 'low' | 'empty',
  lastRenewedAt: Timestamp,
  predictedNextRenewalAt?: Timestamp,
  linkedQuickAddItemId?: string,
  history: Array<{                         // capped à 10 dernières entries
    level: string,
    changedAt: Timestamp,
    changedBy: string,
  }>,
}
```

#### `households/{householdId}/checklist-templates/{templateId}` (sprint 3)
```typescript
{
  id: string,
  name: string,
  emoji: string,
  description?: string,
  isSeeded: boolean,                       // identifie les templates par défaut
  triggers?: Array<{                       // sprint 4
    keyword: string,
    daysBefore: number,
  }>,
  createdAt: Timestamp,
  updatedAt: Timestamp,
}
```

#### `households/{householdId}/checklist-templates/{templateId}/items/{itemId}` (sprint 3)
```typescript
{
  id: string,
  position: number,
  title: string,
  defaultAssigneeId?: string,
  estimatedMinutes?: number,
  notes?: string,
}
```

#### `households/{householdId}/checklist-runs/{runId}` (sprint 3)
```typescript
{
  id: string,
  templateId: string,
  templateName: string,                    // dénormalisé pour affichage rapide
  templateEmoji: string,
  startedAt: Timestamp,
  startedBy: string,
  completedAt?: Timestamp,
  totalTasks: number,
  completedTasks: number,                  // mis à jour via Cloud Function trigger
}
```

#### `households/{householdId}/attachments/{attachmentId}`
Table polymorphe.
```typescript
{
  id: string,
  itemType: 'task' | 'shopping-item' | 'memory-entry',
  itemId: string,
  kind: 'image' | 'url' | 'voice-note' | 'document',
  url: string,                             // Cloud Storage URL ou URL externe
  thumbnailUrl?: string,                   // pour images
  label?: string,                          // pour URL : titre
  mimeType?: string,
  sizeBytes?: number,
  createdAt: Timestamp,
  createdBy: string,
}
```

#### `households/{householdId}/journal-entries/{entryId}` (sprint 4)
Log automatique read-only.
```typescript
{
  id: string,
  type: 'task_completed' | 'preparation_launched' | 'member_joined' | etc.,
  actor: string,                           // userId
  payload: object,                         // contenu dépendant du type
  createdAt: Timestamp,
}
```

#### `households/{householdId}/ai-logs/{logId}` (sprint 4)
Pour debug et amélioration.
```typescript
{
  id: string,
  type: 'parse-task' | 'voice-parse' | 'suggestion',
  input: string,
  output: object,
  durationMs: number,
  cost: number,                            // estimation €
  createdAt: Timestamp,
  createdBy: string,
}
```

### 3.3 Règles de sécurité Firestore

Toutes les routes sont protégées : seuls les membres d'un cocon peuvent lire/écrire dans ses sous-collections.

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAuthenticated() {
      return request.auth != null;
    }

    function isMemberOf(householdId) {
      return isAuthenticated() &&
             request.auth.uid in get(/databases/$(database)/documents/households/$(householdId)).data.memberIds;
    }

    function isOwnerOf(householdId) {
      return isAuthenticated() &&
             request.auth.uid == get(/databases/$(database)/documents/households/$(householdId)).data.ownerId;
    }

    // Users : chacun voit/édite son propre profil
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow write: if request.auth.uid == userId;
    }

    // Households : lecture pour membres, création par tout authentifié, écriture par owner
    match /households/{householdId} {
      allow read: if isMemberOf(householdId);
      allow create: if isAuthenticated() && request.resource.data.ownerId == request.auth.uid;
      allow update, delete: if isOwnerOf(householdId);

      // Sous-collections : tous les membres peuvent lire/écrire
      match /{collection}/{document=**} {
        allow read, write: if isMemberOf(householdId);
      }
    }
  }
}
```

### 3.4 Index Firestore

À créer dans `firestore.indexes.json` :
- `tasks` composite : `householdId` ASC + `dueDate` ASC + `status` ASC
- `tasks` composite : `householdId` ASC + `assigneeId` ASC + `status` ASC
- `shopping-items` composite : `householdId` ASC + `status` ASC + `rayon` ASC
- `calendar-events` composite : `householdId` ASC + `startTime` ASC
- `memory-entries` composite : `householdId` ASC + `type` ASC + `updatedAt` DESC
- `memory-entries` composite : `householdId` ASC + `pinned` ASC + `pinnedOrder` ASC

Firestore te proposera les index manquants au runtime en mode dev avec un lien direct pour les créer — laisser émerger si possible.

---

## 4. Authentification

### 4.1 Firebase Authentication

**Méthodes activées** :
- **Email link (magic link)** : authentification sans mot de passe, lien par email avec expiration 15 min
- **Passkeys (WebAuthn)** : disponible dans Firebase Auth depuis 2024, à activer dans la console

### 4.2 Flow de connexion (Variant 2 — email-first)

```
1. User entre son email
2. POST /api/auth/lookup → vérifie Firestore /users
   - existant → on déclenche signInWithPasskey() OU signInWithEmailLink() fallback
   - nouveau → flow inscription (créer cocon ou rejoindre via token)
   - invité (token URL valide) → flow rejoindre cocon
3. Firebase Auth gère le reste
4. À la première connexion, créer le document /users/{uid}
```

### 4.3 Invitations

- Génération d'un token court (`nanoid(16)`) stocké dans `households/{id}/invitations`
- URL : `https://cocon.netlify.app/join/{token}?email=sam@exemple.fr`
- Le lien est **affiché directement dans l'UI** (avec bouton « Copier le lien ») — Wesley le partage par WhatsApp/iMessage à Camille
- Token expire à 7 jours
- À l'acceptation : ajout dans `members/` + push dans `memberIds[]`
- **Évolution future (sprint 2+)** : envoi automatique par email via Firebase Extension « Trigger Email » si pertinent à l'usage

---

## 5. Cloud Functions

### 5.1 Functions à implémenter au sprint 1

#### `parseTask` (HTTPS callable)
Reçoit `{ text: string }`, appelle Claude API avec un prompt structuré, retourne :
```typescript
{
  title: string,
  category?: string,
  assigneeHint?: 'me' | 'partner' | null,
  dueDateHint?: 'today' | 'tomorrow' | 'this-week' | string,
  effortHint?: 'quick' | 'normal' | 'long',
  confidence: number,  // 0-1
}
```

Coûts estimés Sonnet 4.6 : ~0.0003 € par appel. Budget 0.50 €/mois suffit pour le dev.

### 5.2 Functions à implémenter au sprint 4

#### `voiceParse` (HTTPS callable, audio blob)
1. Reçoit l'audio
2. Appelle Whisper API pour transcription
3. Appelle Claude pour parser multi-intentions
4. Retourne un tableau d'actions structurées

#### `suggestPreparation` (Cron via Pub/Sub, quotidien 7h)
1. Pour chaque cocon, lire les événements à 7 jours
2. Matcher avec les triggers des checklist-templates
3. Créer un document dans `suggestions/` du cocon si match

#### `aggregateJournal` (Firestore triggers sur multiples collections)
Quand une tâche passe à `done`, un membre rejoint, etc. → écrit dans `journal-entries`.

---

## 6. Déploiement

### 6.1 Netlify (frontend Next.js)

```toml
# netlify.toml
[build]
  command = "pnpm build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"

[build.environment]
  NEXT_PUBLIC_FIREBASE_API_KEY = "..."
  NEXT_PUBLIC_FIREBASE_PROJECT_ID = "..."
  # autres vars Firebase publiques
```

Connexion à GitHub → Netlify déploie automatiquement sur chaque push.

URL générée automatiquement : `cocon-wesley.netlify.app` ou similaire. Pas besoin de domaine perso pour démarrer.

### 6.2 Firebase (functions, rules, indexes)

```bash
# initialisation une fois
firebase init firestore functions storage hosting

# déploiement
firebase deploy --only firestore:rules,firestore:indexes
firebase deploy --only functions
```

### 6.3 Variables d'environnement

**Frontend (Netlify)** :
- `NEXT_PUBLIC_FIREBASE_*` : config Firebase publique
- `NEXT_PUBLIC_APP_URL` : URL Netlify

**Cloud Functions (Firebase secrets)** :
- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY` (Whisper, sprint 4 uniquement)

```bash
firebase functions:secrets:set ANTHROPIC_API_KEY
```

---

## 7. PWA & Offline

### 7.1 next-pwa

```js
// next.config.js
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  runtimeCaching: [...]
});
```

### 7.2 Stratégie offline

**Données critiques cachées en local** (Firestore offline natif) :
- Toutes les tâches du cocon (pour usage en magasin sans réseau)
- Toute la liste de courses (idem)
- Toutes les entrées mémoire (Wi-Fi, codes, etc.)

**Sync au retour en ligne** : automatique via Firestore SDK, last-write-wins en cas de conflit (suffisant pour 2 users).

**Manifest PWA** :
```json
{
  "name": "Cocon",
  "short_name": "Cocon",
  "theme_color": "#100604",
  "background_color": "#100604",
  "display": "standalone",
  "orientation": "portrait",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

---

## 8. Notifications push

### 8.1 Firebase Cloud Messaging (FCM)

À l'activation des notifications par un user :
1. Demander permission browser
2. Récupérer le `fcmToken` via SDK FCM
3. Stocker dans `users/{uid}/fcmTokens[]`

Pour envoyer une notif :
- Cloud Function déclenchée par un trigger (tâche assignée, rappel, etc.)
- Lit les tokens du destinataire, respecte les quiet hours
- Appelle `admin.messaging().send()`

### 8.2 Règles

- Maximum 3 notifications push regroupées par jour, sauf urgent
- Quiet hours par défaut 22h → 7h, configurable par utilisateur
- Pas de notification pour les actions de l'utilisateur lui-même
- Web Push fonctionne sur Chrome Android (installé en PWA), pas encore stable sur iOS PWA — fallback email

---

## 9. Roadmap des sprints

### Sprint 1 — Fondations (1 semaine)
- Setup Next.js + Firebase + Netlify
- Auth email-first + magic link Firebase Auth + passkeys
- Création de cocon + invitations par lien partagé manuellement (WhatsApp/iMessage)
- Module Tasks : CRUD basique + assignment + due date
- Dashboard minimal
- Cloud Function `parseTask`
- États vides + thème Brique Flamme
- Sous-pages settings : profil, cocon, apparence
- PWA basique (manifest + icônes)

### Sprint 2 — Profondeur tâches & temps (1 semaine)
- Récurrence des tâches (RRULE iCal)
- Calendrier complet (vue mois, jour, sync ICS Google Calendar via Firebase Extension)
- Notifications push FCM
- (Optionnel) Firebase Extension « Trigger Email » si l'envoi automatique des invitations devient utile
- Settings : notifications, calendriers externes

### Sprint 3 — Courses, stocks, mémoire (1-2 semaines)
- Module Courses complet (cards par rayon + grille essentiels)
- Mode supermarché (vue duale focus + minimap)
- Module Stocks + couplage automatique courses ↔ stocks
- Notes contextuelles partagées sur items + attachments (photo packaging, URL)
- Module Mémoire complet
- Module Préparations (bibliothèque + lancement manuel)
- Synchronisation temps réel (gratuit avec Firestore)
- Settings : connecteurs, données

### Sprint 4 — IA, voix, journal (1-2 semaines)
- Cloud Function `voiceParse` (Whisper + Claude)
- Bouton micro sur Tasks/Courses/Mémoire + FAB dashboard
- Suggestion intelligente de préparation sur dashboard
- Journal du cocon (read-only, auto-alimenté)
- Score d'équilibre (optionnel, à valider avec Camille d'abord)
- Settings : assistant IA

### Sprint 5+ — Affinages
- Intégration Home Assistant (webhooks via Cloud Functions)
- Export complet des données
- Mode invité / babysitter (lien temporaire)
- Whatever émergera de l'usage réel

---

## 10. Coûts estimés

### En usage 2 personnes, projection 1 an

| Service | Quota gratuit | Usage estimé Cocon | Coût |
|---|---|---|---|
| **Netlify** | 100 GB bandwidth/mois | ~1 GB/mois | 0 € |
| **Firebase Auth** | Illimité | 2 users | 0 € |
| **Firestore** | 50K reads + 20K writes/jour | ~5K reads + 1K writes/jour | 0 € |
| **Cloud Storage** | 5 GB stockage + 1 GB download/jour | ~100 MB total | 0 € |
| **Cloud Functions** | 2M invocations/mois | ~5K/mois | 0 € |
| **FCM** | Illimité | usage léger | 0 € |
| **Anthropic API** | Pay-per-use | ~500 parse-task/mois | ~0.20 € |
| **OpenAI Whisper** | Pay-per-use | ~50 voice-notes/mois | ~0.30 € |
| **TOTAL** | | | **~0.50 €/mois** |

Aucun risque de dépassement de quota gratuit pour cet usage. Les seuls coûts sont les APIs IA, et ils sont marginaux.

---

## 11. Migrations possibles plus tard

Si dans le futur tu veux **rapatrier les données chez toi** (souveraineté, intégration Home Assistant native, etc.) :

1. Export complet Firestore via `firebase firestore:export` (JSON)
2. Script de migration Firestore → Postgres (Drizzle schéma déjà en tête)
3. Réimplémentation backend en Next.js API routes ou Hono
4. Frontend Next.js reste 95% identique (juste swap des appels Firestore par appels API)

Le design des collections Firestore a été pensé pour rester proche d'un schéma SQL classique, ce qui rend la migration moins douloureuse si elle arrive.

---

## 12. Risques connus & mitigations

| Risque | Impact | Mitigation |
|---|---|---|
| Vendor lock-in Google | Moyen | Schéma documentaire proche d'un SQL, export disponible, code métier découplé via repository pattern |
| Coût Anthropic explose | Faible | Quota mensuel hardcoded dans la Cloud Function, fallback en mode dégradé |
| Quotas Firestore dépassés | Très faible | Monitoring console Firebase, optimisation requêtes |
| Camille n'adopte pas l'app | Élevé | Validation usage tôt, livraison sprint 1 rapide, feedback continu |
| Passkeys mal supportés sur certains navigateurs | Faible | Fallback magic link toujours disponible |
| Données sensibles dans Firestore (codes, mots de passe) | Moyen | Chiffrement client-side avant écriture pour les entrées `isSensitive: true`, clé dérivée du passkey utilisateur |

---

*Document figé en début de sprint 1. Évolutions à propager ici en premier, puis dans le code.*
