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

## 14. Passkeys WebAuthn — report sprint 3

Intégration native passkeys avec Firebase Auth Web SDK (v10) nécessite côté serveur :
1. Cloud Function `generatePasskeyChallenge` pour register et login (challenge cryptographique)
2. Cloud Function `verifyPasskeyAssertion` pour valider l'authentification
3. Stockage du credential ID + publicKey dans Firestore
4. Firebase Auth Custom Token issuance après vérification

Couplage avec WebAuthn standard (`navigator.credentials.create()/.get()`) côté client.

C'est ~3-4h de code + crypto à valider. Reporté sprint 3 (priorité basse, magic link couvre 100% des besoins en attendant).

L'endpoint `/api/auth/lookup` prévu dans `architecture-cocon.md §4.2` reste aussi à faire — pour l'instant, le flow email-first signin sans lookup est anti-énumération par design (Firebase ne révèle pas si l'email existe), donc pas urgent.
