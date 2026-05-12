# Cocon · Pièges Firebase observés

> Apprentissages capturés au sprint 1 (2026-05-11/12). À relire au démarrage de chaque sprint pour ne pas retomber dedans.

## 1. Opera bloque Firebase Auth

Le navigateur **Opera** (Privacy Protection / Trackers Blocker actifs par défaut) intercepte les requêtes vers `identitytoolkit.googleapis.com` et renvoie `auth/network-request-failed` au moment du `signInWithEmailLink`. Le sign-in échoue côté UI mais le code est correct.

**Comment l'appliquer** : si quelqu'un signale `auth/network-request-failed`, demander d'abord quel navigateur. Si Opera ou Brave, suggérer Chrome/Edge ou désactiver les protections pour le domaine. Ne pas chercher de bug dans le code Cocon en premier.

## 2. Firestore + champs optionnels = `ignoreUndefinedProperties` obligatoire

Firestore Web SDK **refuse les valeurs `undefined`** dans `setDoc`/`updateDoc`. Quand on utilise des types TS avec `?:` (ex: `avatarUrl?: string`), passer la valeur `undefined` plante avec : *« Unsupported field value: undefined (found in field X) »*.

**Fix** : initialiser le SDK avec `initializeFirestore(app, { ignoreUndefinedProperties: true })` au lieu de `getFirestore(app)`. Le SDK ignore alors silencieusement les `undefined`.

**Déjà fait** dans `lib/firebase/client.ts`. À répliquer dans tout nouveau projet Firebase Web SDK. `initializeFirestore` ne peut être appelé qu'**une seule fois** par app — wrapper dans try/catch + fallback `getFirestore` pour gérer le HMR.

## 3. Magic link Firebase Auth — détails opérationnels

- **Le domaine du return URL doit être dans Authorized Domains** (Firebase Console → Authentication → Settings → Authorized domains). Inclure `localhost`, le domaine custom (`firebaseapp.com`), et le domaine Netlify.
- **Email link sign-in doit être activé** dans Sign-in method (en plus de Email/Password qui sert de prérequis).
- **Préférer `window.location.origin` à `process.env.NEXT_PUBLIC_APP_URL`** pour construire le return URL : ça suit automatiquement le domaine déployé (prod, preview branches, localhost) sans dépendre d'une env var qui peut être vide ou mal configurée. Note : `??` ne fallback que sur null/undefined, pas sur string vide — utiliser `||` ou `window.location.origin`.

## 4. Firestore Database doit être explicitement initialisée

Activer Firestore dans Firebase Console (« Create database ») est une **étape one-time obligatoire** souvent oubliée. Sans ça, le SDK retourne *« Failed to get document because the client is offline »* — message trompeur (le client n'est pas offline, l'API Firestore n'existe juste pas pour ce projet).

**Comment l'appliquer** : avant tout sign-in qui tente de lire/écrire dans Firestore, vérifier que la database existe (`firebase firestore:databases:list`). Si erreur 403 « Cloud Firestore API has not been used », activer en console avant de continuer.

## 5. Firebase Auth — quota magic link

Sur le plan **Spark (gratuit)**, le quota d'envois de magic link est **5 emails par projet par jour** (anti-abus, hardcodé Firebase, ne se débloque pas en passant Blaze). Reset à 24h du premier email.

**Comment l'appliquer** : si plusieurs essais ratés en debugging, ne pas générer 10 magic links — passer au plan B :
- **Firebase Emulators** en local (`firebase emulators:start` avec `NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true`) : magic link n'envoie pas vraiment d'email, le lien est exposé via l'API REST de l'emulator → zéro quota, dev rapide. Recommandé pour tout debug d'auth.
- Sinon, attendre 24h pour le reset.

Erreur côté UI : `auth/quota-exceeded` avec le message « Exceeded daily quota for email sign-in ».

## 6. Firestore rules — `get()` récursif casse les queries

Une rule `allow read: if request.auth.uid in get(/databases/.../{doc}).data.memberIds` fonctionne pour un **`getDoc`** simple mais **bloque silencieusement les `where(...)` queries** (le rule engine refuse les listes quand le rule contient un get() récursif sur le même doc). Symptôme : layout passe (get direct) mais le dashboard ne reçoit rien (query vide), aucune erreur dans la console — le rule engine retourne simplement zéro doc.

**Fix** : pour les rules `read` (qui couvrent get + list), utiliser `resource.data.<champ>` directement (le doc en cours d'évaluation est déjà en main). Pour les rules `update`/`delete` aussi : `resource.data.ownerId == request.auth.uid` au lieu de `isOwnerOf()`.

**Comment l'appliquer** : checker les rules Firestore au moment d'écrire une query `where(...)` ou de tester la lecture liste. Si la rule utilise `get()` récursif, refactor.

## 7. Firebase Web SDK + Next.js HMR + React Strict Mode = `app/app-deleted`

En dev avec Turbopack et React Strict Mode, le SDK Firebase peut afficher l'erreur `Firebase: Firebase App named '...' already deleted (app/app-deleted)` quand un composant utilise une query Firestore au moment d'un cycle mount/unmount/mount. La page reste bloquée sur l'état de loading sans erreur visible côté UI.

**Workaround immédiat** : hard reload (Ctrl+Shift+R) reset l'état du SDK.
**Workaround durable** : désactiver React Strict Mode dans `next.config.ts` (`reactStrictMode: false`) — perte de quelques warnings utiles en dev mais stabilité Firebase. À évaluer si le bug devient récurrent.

## 8. Netlify env vars — placeholders et erreurs de saisie

Les valeurs `NEXT_PUBLIC_FIREBASE_*` sont inlinées au build par Next.js. Conséquences :
- Coller le **texte placeholder** d'un guide (ex: « (depuis Firebase Console) ») au lieu de la vraie valeur passe le build silencieusement, mais Firebase râle au runtime avec `auth/api-key-not-valid`.
- Renommer une variable mal nommée dans Netlify **ne supprime pas l'ancienne**, il faut explicitement la delete.

**Comment l'appliquer** : après config Netlify, vérifier que les vraies valeurs sont inlinées en cherchant `AIzaSy` dans les chunks JS de production (`curl chunk.js | grep AIzaSy`). Si absent, la variable est vide ou mal nommée côté Netlify.

## 9. Cloud Functions deploy — pnpm vs npm

Firebase Cloud Build détecte le `pnpm-lock.yaml` dans `functions/` et exige `@google-cloud/functions-framework` comme dep explicite. Sur Windows, pnpm 11 a aussi un check des deps avant chaque `run` qui plante avec nos `allowBuilds`.

**Fix** : utiliser **npm** dans `functions/` (Cloud Build le supporte nativement). Garder pnpm pour le frontend racine — les deux écosystèmes sont indépendants.

Aussi : sur Windows, les `predeploy` hooks de `firebase.json` qui utilisent `$RESOURCE_DIR` plantent (le placeholder n'est pas interprété). Supprimer les hooks et builder manuellement (`npm run build` dans functions/) avant `firebase deploy`.

## 10. Blaze IAM — propagation initiale

Au tout premier déploiement Cloud Functions après activation de Blaze, certaines APIs Google (eventarc, run, secretmanager) ne sont pas encore activées. Le **premier `firebase deploy --only functions`** active ces APIs puis échoue avec une erreur de permission temporaire. **Retry après 30s** suffit (les IAM bindings se propagent).

Le `--force` est utile pour auto-set la cleanup policy artifacts (sinon les vieilles images Docker s'accumulent).

## 11. rrule + timezone (sprint 2)

La lib `rrule` interprète les `Date` JS sans dtstart comme **locale** par défaut, ce qui rend les tests dépendants du fuseau du runner. Pour des helpers déterministes :

1. Composer la string ICS complète avec un `DTSTART:YYYYMMDDTHHMMSSZ` explicite plutôt que de passer `dtstart` en option JS.
2. Dans les tests, utiliser `Date.UTC(...)` pour créer des dates en UTC et lire avec `getUTCDate()/getUTCMonth()`.

Bug observé : `getNextOccurrence("FREQ=WEEKLY;BYDAY=TU", monday, monday)` retournait le mercredi au lieu du mardi à cause d'un shift UTC+2 en local France.

## 12. Cloud Functions v2 — onSchedule + Firestore (sprint 2)

`onSchedule({ schedule: "every 60 minutes", timeZone: "Europe/Paris" })` fonctionne nativement en v2 — pas besoin de Pub/Sub explicite. Firebase déploie le scheduler dans App Engine automatiquement. Vérifier que **App Engine et Cloud Scheduler** sont activés au premier déploiement (firebase deploy le fait souvent automatiquement, mais peut nécessiter retry).

Pour scanner toutes les sous-collections "tasks" sans avoir à itérer les households, utiliser `db.collectionGroup("tasks").where(...)`. Firestore propose un index automatique sur les collection groups.

## 13. Service Worker FCM + Next.js (sprint 2)

Firebase Messaging exige un Service Worker à un path fixe (`/firebase-messaging-sw.js`). Avec Next.js App Router :

- **Pas** placer le fichier dans `public/` avec config hardcodée (sinon : drift dev/prod + secret de SW à maintenir).
- **Préférable** : route handler dynamique (`app/api/firebase-messaging-sw/route.ts`) qui injecte `process.env.NEXT_PUBLIC_FIREBASE_*` côté serveur, + rewrite dans `next.config.ts` :
  ```ts
  async rewrites() {
    return [{ source: "/firebase-messaging-sw.js", destination: "/api/firebase-messaging-sw" }];
  }
  ```

Ainsi le SW est généré à la build avec la bonne config et toujours synchro avec le client.

## 15. WebAuthn @simplewebauthn types côté Cloud Functions

Le tsconfig functions/ a `lib: ["es2022"]` sans DOM. Donc `AuthenticatorTransport` (DOM type) n'est pas dispo. Utiliser `AuthenticatorTransportFuture` exporté par `@simplewebauthn/server` à la place — c'est le superset officiel et il est forwarded au consommateur.

## 16. Recherche Firestore client-side via tokens

Pour la recherche full-text sur les MemoryEntry (sprint 3), on a opté pour :
1. Tokens calculés à l'écriture : `searchTokens: string[]` (NFD + lowercase + tokenize + dedup)
2. Match côté client : prefix match sur les tokens — AND sur tous les tokens de la query

Limites Firestore à connaître si on passe au matching côté serveur plus tard :
- `array-contains-any` est limité à **10 valeurs** dans la liste de match
- `array-contains` ne supporte qu'un seul `==` ou `array-contains` par query
- Une query qui combine plusieurs filtres sur le même array nécessite plusieurs round-trips

Pour 1000+ entries, switcher sur Algolia ou Typesense est plus efficient.

## 17. Cap d'un array dans un document Firestore

Firestore n'a pas de mécanisme natif pour capper un array. Pattern utilisé pour `stocks.history` (max 50 entries) : capping côté client via le helper pur `capHistory(arr, 50)` avant chaque write. Slice depuis le début (plus récent en premier) garde le bon ordre.

Alternative : sous-collection avec auto-purge via Cloud Function trigger sur create — overkill pour 50 entries.

## 14. Passkeys WebAuthn — réglé sprint 3

Intégration native passkeys avec Firebase Auth Web SDK (v10) nécessite côté serveur :
1. Cloud Function `generatePasskeyChallenge` pour register et login (challenge cryptographique)
2. Cloud Function `verifyPasskeyAssertion` pour valider l'authentification
3. Stockage du credential ID + publicKey dans Firestore
4. Firebase Auth Custom Token issuance après vérification

Couplage avec WebAuthn standard (`navigator.credentials.create()/.get()`) côté client.

C'est ~3-4h de code + crypto à valider. Reporté sprint 3 (priorité basse, magic link couvre 100% des besoins en attendant).

L'endpoint `/api/auth/lookup` prévu dans `architecture-cocon.md §4.2` reste aussi à faire — pour l'instant, le flow email-first signin sans lookup est anti-énumération par design (Firebase ne révèle pas si l'email existe), donc pas urgent.

## 18. Firestore Web SDK — `query()` n'accepte pas une liste de constraints typée union

Quand on construit une query dynamique avec un tableau de constraints (`[orderBy(...), where(...), limit(...)]`), TypeScript infère le type du tableau depuis son premier élément et plante les `push()` suivants avec « `QueryFieldFilterConstraint` not assignable to `QueryOrderByConstraint` ». Bug rencontré sur `listJournalEntries` en sprint 4.

**Fix** : chaîner les `query()` à la place — `query(base, where(...))` puis `query(constrained, limit(...))`. Chaque appel retourne un `Query<T>` typé qui accepte n'importe quelle contrainte.

```typescript
// ❌ Inféré comme QueryOrderByConstraint[]
const constraints = [orderBy("createdAt", "desc")];
if (before) constraints.push(where("createdAt", "<", before)); // erreur

// ✅
const base = query(coll, orderBy("createdAt", "desc"));
const filtered = before ? query(base, where("createdAt", "<", before)) : base;
const limited = query(filtered, limit(30));
```

## 19. Firestore triggers v2 — dédoublonnage à la main (sprint 4)

Cloud Functions v2 `onDocumentUpdated` se déclenche à **chaque** update, y compris une update qui ne change pas le champ qu'on regarde. Pour des journaux d'événements (sprint 4), il faut comparer `before.data()` vs `after.data()` et n'agir que sur la transition pertinente.

Patterns appliqués pour le journal du foyer :
- `task_completed` : `before.status !== "done" && after.status === "done"` (et `!after.checklistRunId` pour éviter doublon avec les events de préparation).
- `preparation_completed` : `!before.completedAt && after.completedAt` (transition vers complétion, pas update annexe).
- `stock_renewed` : `before.level !== "full" && after.level === "full"`.
- `member_joined` : skip l'owner créé dans les 5 premières minutes du household (= création du cocon, pas un "joined").

Sans ces gardes, un simple `updateDoc(ref, { updatedAt })` regénérerait toutes les entries déjà créées.

## 22. PowerShell `firebase functions:secrets:set` + paste = clé tronquée (sprint 4)

Coller une clé API longue (OpenAI `sk-proj-...` ~160 chars) au prompt interactif de `firebase functions:secrets:set` plante systématiquement sur Windows : PowerShell ne capture que les premiers caractères. Symptôme : la fonction reçoit une clé du genre `"vvp"`, et OpenAI répond `invalid_api_key` (status 401).

**Fix** : passer par un fichier temporaire et `--data-file` :

```powershell
notepad $env:TEMP\oai-key.txt
# Coller la clé sur UNE seule ligne, sans newline final. Save + close.

firebase functions:secrets:set OPENAI_API_KEY --data-file $env:TEMP\oai-key.txt
firebase deploy --only functions:voiceParse --force
Remove-Item $env:TEMP\oai-key.txt
```

Ou utiliser la web UI Secret Manager (`console.cloud.google.com/security/secret-manager`) qui n'a pas ce bug de paste.

**Comment l'appliquer** : pour TOUS les futurs secrets API (Stripe, Sendgrid, etc.), ne jamais coller directement dans le terminal. Utiliser `--data-file` ou l'UI cloud.

## 23. Wrapping Cloud Function stages dans try/catch (sprint 4)

Sans wrapper d'erreur, une Cloud Function callable qui throw renvoie `Internal Server Error` (500) au client, sans aucun contexte. Quasi-impossible à diagnostiquer sans avoir accès aux logs serveur.

**Pattern à appliquer dans toutes les Cloud Functions qui appellent des APIs externes** :

```typescript
function wrapError(stage: string, err: unknown): HttpsError {
  const message = err instanceof Error ? err.message : String(err);
  const status = (err as { status?: number }).status;
  const code = (err as { code?: string }).code;
  console.error(`[funcName] failed at stage=${stage}`, { message, code, status });
  // Map codes connus vers messages FR utilisables côté UI
  if (status === 401) return new HttpsError("failed-precondition", "Clé API invalide.");
  if (status === 429) return new HttpsError("resource-exhausted", "Quota épuisé.");
  return new HttpsError("internal", `Erreur ${stage}: ${message.slice(0, 200)}`);
}

try { /* whisper call */ } catch (err) { throw wrapError("whisper", err); }
try { /* claude call */ } catch (err) { throw wrapError("claude", err); }
```

Le client reçoit alors un message actionnable au lieu d'`Internal`, et les logs serveur ont le stage explicite même si le CLI `firebase functions:log` tronque.

**Comment l'appliquer** : à chaque nouvelle Cloud Function HTTPS qui touche une API externe, wrapper chaque appel dans son propre try/catch avec un `stage` nommé. Surface l'erreur typée au client. Évite 30 min de debugging à chaque incident.

## 21. Cloud Functions + collectionGroup queries = index composite obligatoire (sprint 4)

`voiceParse` faisait une query `collectionGroup("ai-logs").where("type", "==", "voice-parse").where("createdBy", "==", uid).where("createdAt", ">=", monthStart)` pour le quota mensuel. Au premier appel en prod : `Internal error` côté callable, et dans les logs Cloud Functions : `FAILED_PRECONDITION: The query requires an index`.

**Fix** : pré-déclarer l'index dans `firestore.indexes.json` avec `"queryScope": "COLLECTION_GROUP"` (et pas juste `"COLLECTION"`), puis `firebase deploy --only firestore:indexes`.

```json
{
  "collectionGroup": "ai-logs",
  "queryScope": "COLLECTION_GROUP",
  "fields": [
    { "fieldPath": "createdBy", "order": "ASCENDING" },
    { "fieldPath": "type", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "ASCENDING" }
  ]
}
```

**Comment l'appliquer** : pour toute nouvelle Cloud Function qui fait une query multi-`where()` (en particulier avec un range sur `createdAt`), ajouter l'index correspondant au moment où on écrit la function, pas après le deploy. Tester localement avec emulators ou faire **un appel E2E réel** avant de considérer le deploy comme "OK".

Sinon le message d'erreur Firebase est trompeur : le client voit `Internal` (générique), pas le vrai message `FAILED_PRECONDITION`. Il faut systématiquement `firebase functions:log --only nom-de-la-fonction` après le premier appel d'une nouvelle function.

## 20. JournalEnabled / BalanceEnabled — opt-in vs opt-out (sprint 4)

Le score d'équilibre est **off par défaut** (potentiellement culpabilisant si mal calibré). Le journal est **on par défaut** (faible risque, valeur immédiate).

Conséquences sur les checks côté client et Cloud Function :
- Score : `if (household.balanceEnabled === true)` — undefined / false / absent → off.
- Journal : `if (household.journalEnabled !== false)` — undefined / true / absent → on.

Sans cette distinction, on aurait soit du journal silencieux pour les anciens households (Cocon qui existaient avant sprint 4), soit du score affiché par défaut. Le `!== false` est la bonne forme pour les features on par défaut avec rétro-compatibilité.
