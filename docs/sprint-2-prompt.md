# Cocon · Prompt sprint 2

> Coller ceci en premier message à Claude Code (onglet Code de l'app desktop) une fois la session ouverte avec les documents de référence attachés.

---

Bonjour Claude. Le sprint 1 de **Cocon** est livré et déployé en production sur https://cocon-app.netlify.app. Le sprint 2 commence maintenant.

## Contexte récupéré du sprint 1

Tu peux trouver dans le projet :

- Le code existant (Next.js 16 + TypeScript strict + Tailwind v4 + Firebase) dans `/`
- Les documents de référence dans `docs/` : `architecture-cocon.md`, `screens-spec.md`, `brique-flamme-tokens.md`
- Le fichier `docs/feedback_firebase_gotchas.md` qui contient les apprentissages capturés au sprint 1 (lis-le, c'est important pour éviter de reprendre les mêmes pièges)
- Le README à jour avec les commandes dev/deploy

**Lis ces documents en entier avant toute action.** Le sprint 2 doit s'inscrire dans la continuité de ce qui existe, pas le réinventer.

---

## État livré au sprint 1 (rappel)

- Auth email-first via magic link Firebase Auth (passkeys reportées au sprint 2)
- Création / rejoindre cocon avec invitations top-level + UUIDv4
- Module Tasks complet : CRUD, assignment, due date, filter chips, sync temps réel via `onSnapshot`, toast undo 5s
- Dashboard avec greeting personnalisé, tâches du jour, activité récente, avatars membres
- Saisie naturelle IA : Cloud Function `parseTask` (Haiku 4.5 + tool use), wrapper frontend, encart sparkle dans `/tasks/new`
- Settings hub + 4 sous-pages (profil, cocon, apparence, compte) avec toggle thème sombre/clair persisté
- États vides Brique Flamme + écran `ComingSoon` réutilisable
- PWA installable, 50 tests Vitest, 17 routes, 26 commits

---

## Objectifs du sprint 2

### 1. Récurrence des tâches (priorité forte)

C'est probablement la feature la plus attendue à l'usage quotidien d'un foyer (sortir poubelles, traitements animaux, ménage hebdo, etc.).

- Ajouter le champ `recurrenceRule` sur les tasks (déjà prévu en sprint 1, à activer maintenant)
- Format : règle iCal RRULE standard (`FREQ=WEEKLY;BYDAY=TU` etc.)
- UI dans `/tasks/new` et `/tasks/[id]` : presets simples (Tous les jours / Toutes les semaines / Tous les mois / Personnalisé) + jour-de-semaine si hebdo
- Logique de génération : quand une tâche récurrente est complétée, créer automatiquement la prochaine occurrence avec la `dueDate` calculée
- Affichage dans la liste : icône 🔁 discrète à côté du titre
- Édition : « modifier cette occurrence » vs « modifier toutes les occurrences futures »
- Bibliothèque suggérée : `rrule` (npm) — bien maintenue, gère les iCal RRULE correctement
- Tests Vitest sur les helpers de calcul de prochaine occurrence

### 2. Module Calendrier (priorité forte)

L'onglet Agenda du bottom nav est actuellement un `ComingSoon`. Il devient pleinement fonctionnel.

- Structure validée dans `screens-spec.md` section 3.6 : **Variante 1 — Mini-mois + jour sélectionné**
- Page `/calendar` avec : mini-grille du mois + dots colorés + section jour sélectionné
- Code couleur des dots : orange = événement cocon (Wesley), jaune = Camille, highlight = all-day, muted = externe
- Création d'événement : long-press sur un jour ouvre le formulaire pré-rempli, ou bouton "+" en top bar
- Modèle de données : collection `calendar-events` sous-collection du cocon, comme prévu dans `architecture-cocon.md`
- Les tâches avec `dueDate` apparaissent aussi dans l'agenda avec style « task » pointillé orange (lecture seule depuis l'agenda — on ouvre la tâche pour éditer)
- Vue jour-par-jour scrollable verticalement quand la liste est longue

### 3. Sync calendriers externes (Google Calendar en priorité)

- Lecture seule pour le sprint 2 (l'écriture vers Google viendra plus tard si besoin)
- Approche recommandée : utiliser le SDK Google Calendar côté Cloud Functions, avec OAuth2 consenti par l'utilisateur
- Stockage du refresh token chiffré dans Firestore (`users/{uid}/integrations/google`)
- Cron quotidien (Cloud Scheduler + Pub/Sub) qui resync les événements des 60 prochains jours
- Marqueur visuel pour les événements externes (badge source "Google" + barre muted fine)
- UI dans `/settings/connectors` (nouvelle sous-page, actuellement « Bientôt ») pour connecter / déconnecter

### 4. Notifications push (priorité moyenne)

- Firebase Cloud Messaging (FCM) Web Push
- Demande de permission depuis `/settings/notifications` (nouvelle sous-page)
- Stockage du `fcmToken` dans `users/{uid}/fcmTokens[]`
- Cloud Function `sendTaskReminder` déclenchée par un cron (chaque heure) : lit les tâches dues dans les 2h et envoie une notif si pas encore notifiée
- Respect des quiet hours configurées par l'utilisateur (22h → 7h par défaut, configurable)
- Maximum 3 notifications push regroupées par jour par utilisateur, sauf urgent
- Pas de notif pour ses propres actions
- Fallback email **reporté au sprint 3** (pas de Resend pour l'instant, c'était dans nos décisions)

### 5. Passkeys WebAuthn (priorité basse mais à faire)

Reportée du sprint 1, à faire ici car la base auth est bien posée.

- Activer les passkeys dans Firebase Auth Console
- Ajouter le flow : après connexion via magic link, proposer d'enregistrer une passkey pour les prochaines connexions
- UI dans `/login` : si l'email saisi correspond à un user existant **et** que le device courant supporte WebAuthn **et** qu'une passkey est enregistrée → proposer la connexion par passkey en priorité
- Magic link reste le fallback universel
- Endpoint `/api/auth/lookup` à créer (déjà spec'é dans `architecture-cocon.md` section 4.2)

### 6. Sous-page settings « Notifications »

Nouvelle sous-page à créer :
- Toggle global notifications on/off
- Quiet hours start/end (sliders ou time pickers, 22h-7h par défaut)
- Détail par type (rappels de tâches, mises à jour du cocon, suggestions IA — préparation pour sprint 4)
- Test : bouton « Envoyer une notif test » qui ping FCM

### 7. Sous-page settings « Connecteurs »

Nouvelle sous-page à créer :
- État actuel des intégrations connectées
- Bouton « Connecter Google Calendar » → flow OAuth2
- Bouton « Déconnecter » pour révoquer
- Affichage du compte connecté (email Google)
- Préparation visuelle pour : Outlook (« Bientôt »), Apple Calendar via ICS (« Bientôt »)

---

## Hors scope sprint 2

- Module Courses → sprint 3
- Module Mémoire complet → sprint 3
- Mode supermarché → sprint 3
- Stocks → sprint 3
- Préparations → sprint 3
- Voice capture → sprint 4
- Journal du foyer → sprint 4
- Suggestion IA proactive → sprint 4

---

## Méthode de travail attendue

1. **Lecture des docs en premier.** Lis `docs/architecture-cocon.md`, `docs/screens-spec.md`, `docs/brique-flamme-tokens.md`, `docs/feedback_firebase_gotchas.md`, et le code existant. Pose-moi les questions de clarification.

2. **Découpe le sprint en sous-tâches** avec ton estimation d'ordre. Je valide.

3. **Plan mode d'abord pour les gros sujets** (récurrence, calendrier, OAuth Google). Tu mappes l'approche avant de coder.

4. **TypeScript strict, pas de `any`** sauf justification.

5. **Tests Vitest sur les helpers purs** (calcul de prochaine occurrence RRULE, sélection des événements à notifier en respectant les quiet hours, parsing iCal). Pas de tests E2E à ce stade.

6. **Commits atomiques** avec messages conventionnels (`feat:`, `fix:`, `chore:`, `refactor:`).

7. **Mise à jour du README** au fil de l'eau (nouvelles commandes, nouvelles variables d'env, nouveaux secrets).

8. **Mise à jour de `docs/feedback_firebase_gotchas.md`** avec les nouveaux apprentissages du sprint 2.

---

## Variables d'env / secrets à prévoir

Nouveaux secrets Firebase pour les Cloud Functions :
- `GOOGLE_CLIENT_ID` (OAuth2 calendrier)
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- `FCM_VAPID_KEY` (Web Push)

Variables Netlify (publiques) :
- `NEXT_PUBLIC_FCM_VAPID_PUBLIC_KEY`

Je te fournirai les valeurs au moment opportun. Pour Google OAuth, il faudra créer un projet OAuth dans Google Cloud Console (ou réutiliser celui de Firebase) et générer les credentials.

---

## Communication

- **Français** par défaut (commits, README peuvent rester en anglais si plus naturel)
- **Explique ton raisonnement avant la solution**
- **Si une meilleure approche existe que ce que j'ai prévu, dis-le**
- **Ton direct et efficient, pas d'excuses inutiles**
- **Adapte la longueur des réponses à la complexité du sujet**

---

## Prêt ?

Avant de démarrer, fais-moi :

1. **Un récap de ta compréhension** des 7 objectifs en 5-10 lignes
2. **L'ordre dans lequel tu proposes d'attaquer**, avec justification (mon intuition : passkeys en dernier, récurrence en premier parce qu'elle débloque l'usage quotidien, calendrier ensuite parce qu'il a beaucoup de surface UI, OAuth Google après le calendrier vu qu'il s'y branche, notifications à la fin parce qu'elles dépendent du reste)
3. **Tes questions de clarification** sur les points flous
4. **Une remarque sur les gotchas du sprint 1** que tu retiens comme particulièrement importants pour le sprint 2

Une fois validé, on démarre.
