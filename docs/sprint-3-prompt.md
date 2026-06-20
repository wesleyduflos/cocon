# Cocon · Prompt sprint 3

> Coller ceci en premier message à Claude Code (onglet Code de l'app desktop) une fois la session ouverte avec les documents de référence attachés.

---

Bonjour Claude. Le sprint 2 de **Cocon** est livré. Le sprint 3 commence maintenant — c'est le **plus gros sprint** du projet en termes de surface produit, mais l'infrastructure est solide après les sprints 1 et 2.

## Contexte récupéré

Tu peux trouver dans le projet :

- Le code existant (Next.js 16 + TypeScript strict + Tailwind v4 + Firebase) avec auth, cocon, tasks, recurrence, calendar, OAuth Google, FCM, settings hub
- Les documents de référence dans `docs/` : `architecture-cocon.md`, `screens-spec.md`, `brique-flamme-tokens.md`, `feedback_firebase_gotchas.md`
- Les prompts précédents `sprint-1-prompt.md` et `sprint-2-prompt.md` pour mémoire

**Lis ces documents en entier avant toute action**, en particulier `feedback_firebase_gotchas.md` qui contient 14 apprentissages capturés. Le sprint 3 doit s'inscrire dans la continuité — pas réinventer ce qui existe.

---

## État livré aux sprints 1 et 2 (rappel court)

- Auth email-first via magic link (passkeys reportées au sprint 3, plan dans gotcha #14)
- Cocon + invitations top-level UUIDv4
- Tasks : CRUD, assignment, due date, filter chips, sync temps réel, toast undo, **récurrence** (clone+advance pattern)
- Saisie naturelle IA (Haiku 4.5 + tool use)
- Calendar : vue mini-mois + jour sélectionné (Variante 1)
- OAuth Google Calendar (read-only, sync 60j, code prêt côté code attend credentials)
- FCM push notifications (cron horaire, quiet hours, code prêt attend VAPID key)
- Settings hub : 6 sous-pages actives (profil, cocon, apparence, compte, connecteurs, notifications)
- 86 tests Vitest, 23 routes, ~0,15 €/mois

---

## Objectifs du sprint 3

Sept blocs, à attaquer dans l'ordre suggéré ci-dessous. Le bloc A (passkeys) est court et délimité, c'est le bon échauffement. Les blocs B-D forment l'**écosystème Courses**, qui doit être cohérent. Les blocs E-F sont indépendants et peuvent venir après. Bloc G est transversal.

### Bloc A — Passkeys WebAuthn (~3-4h)

Implémenter selon le plan d'attaque du gotcha #14 :

1. Cloud Functions :
   - `generatePasskeyChallenge` (register + login) avec stockage temporaire du challenge
   - `verifyPasskeyAssertion` avec validation cryptographique et Firebase Auth Custom Token issuance
2. Modèle de données :
   - Collection `users/{uid}/passkeys/{credentialId}` avec `publicKey`, `counter`, `transports[]`, `createdAt`, `lastUsedAt`, `deviceName` (extrait depuis le user-agent)
3. UI côté login :
   - Endpoint `/api/auth/lookup` qui prend un email et retourne `{ status: 'existing' | 'new', hasPasskey: boolean }`
   - Si user existant + passkey présente + WebAuthn supporté → proposer passkey en priorité avec « Utiliser un autre moyen » en fallback
   - Sinon → magic link comme avant
4. UI dans `/settings/profile` :
   - Section « Passkeys » listant les passkeys enregistrées (nom du device + date)
   - Bouton « Enregistrer une passkey sur ce device » qui déclenche le flow register
   - Possibilité de supprimer une passkey individuellement
5. Après première connexion magic link : suggestion gentille (pas intrusive) « Enregistrer une passkey pour les prochaines connexions ? »

Bibliothèque recommandée : `@simplewebauthn/server` côté Functions + `@simplewebauthn/browser` côté client. Bien maintenues, gèrent les détails cryptographiques proprement.

Retirer le placeholder « bientôt sprint 3 » de la page `/login`.

### Bloc B — Module Courses (vue planning)

Spec dans `screens-spec.md` section 3.4 : **Variante 1 cards par rayon + grille tap-pour-ajouter de Variante 3**.

1. Modèle de données (Firestore) :
   - `households/{id}/shopping-items/{itemId}` : nom, emoji, quantity, unit, rayon, notes, status pending/bought, fromQuickAdd, stockItemId (préparé), addedAt/By
   - `households/{id}/quick-add-items/{itemId}` : la grille des essentiels (8 par défaut au seed)
   - `households/{id}/attachments/{id}` : table polymorphe pour photos/URLs (préparée pour les notes contextuelles + manuels mémoire)

2. Page `/shopping` :
   - Top bar : « Courses · N » + recherche + bouton +
   - Section « Essentiels du foyer » : grille 4×2 de tuiles tappables, +1 quantité au tap, badge orange si déjà dans liste
   - Mode édition de la grille (long-press ou bouton « Modifier »)
   - Bouton « Mode supermarché » en grand (gradient orange-jaune)
   - Section « Par rayon » : cards pliables, items checkable, marqueur ★ si ajouté via grille
   - Premières 2 cards dépliées par défaut, suivantes pliées

3. Page `/shopping/new` (ou modale plein écran) :
   - Champ nom, emoji facultatif, quantity/unit, rayon (pills), notes contextuelles, attachments
   - Hybride formulaire + saisie naturelle (réutilise le pattern de `/tasks/new`)
   - Cloud Function `parseShoppingItem` à créer (similaire à `parseTask` mais pour items de courses, output structuré différent)

4. Notes contextuelles partagées :
   - Champ `notes` sur chaque shopping-item
   - Indicateur 💬 sur l'article tant que la note n'a pas été vue par l'utilisateur courant (tracking `noteSeen[]` avec uid)
   - En mode supermarché, la note est affichée en plus grand au focus

5. Attachments :
   - Photos packaging via Firebase Cloud Storage (composer un uploader réutilisable)
   - URL externe (lien produit) avec preview minimal
   - Icône 📎 sur l'article, tap = ouvre la photo plein écran ou redirige vers l'URL

6. Sync temps réel via `onSnapshot`, toast undo 5s sur le check.

7. Seed par défaut à la création du cocon : 8 essentiels (lait, pain, œufs, beurre, yaourt, fromage, pâtes, café) avec leur `defaultRayon`. Adapter avec Wesley si liste préférée différente — possible d'éditer plus tard.

### Bloc C — Mode supermarché

Spec dans `screens-spec.md` section 3.5 : **Variante 3 vue duale (focus + minimap)**.

1. Route `/shopping/market` (ou modale plein écran, à toi de juger) :
   - **Pas de bottom navigation** (focus mode)
   - Top bar : flèche retour + nom optionnel du magasin + bouton « Terminer »
   - Card progression : « X/Y » en énorme + barre dégradée
   - Section « Rayon actuel » : emoji + nom + items du rayon en cards larges (64-72px de haut), tap = check immédiat
   - **Bande horizontale des autres rayons** en bas : mini-cards 86px avec emoji, nom, progress bar. Tap = sauter à ce rayon.
   - Active rayon : bordure primary + glow
   - Complete rayon : opacité 0.6

2. Comportements :
   - Haptic feedback (`navigator.vibrate(50)` sur Android) à chaque check
   - Animation de coche ~200ms
   - Notes contextuelles affichées en plus grand quand l'item est focus
   - « Terminer » demande confirmation si articles non cochés
   - Écran de célébration discret à la fin : « Bien joué · N articles en M min »
   - L'historique (rayon, ordre, durée) est loggé dans `shopping-sessions` pour usage futur IA (sprint 4)

3. Quand un article est coché en mode supermarché :
   - Status → bought, boughtAt/By posés
   - Si `stockItemId` est lié → le stock repasse à `full` avec date du jour (couplage automatique cf bloc D)

### Bloc D — Module Stocks

Spec dans `screens-spec.md` section 3.11.

1. Modèle de données :
   - `households/{id}/stocks/{stockId}` : name, emoji, level enum (full/half/low/empty), lastRenewedAt, predictedNextRenewalAt nullable, linkedQuickAddItemId nullable
   - Sous-collection `stocks/{id}/history/{entryId}` : level, changedAt, changedBy (capped à 50 dernières entries, ou stocké en array `history[]` capped si plus simple — à toi de juger selon les coûts Firestore)

2. Page `/stocks` accessible depuis drawer « Plus » du bottom nav :
   - Top bar : « Stocks · N » + recherche + bouton +
   - Filtres : Tous / À renouveler bientôt / Épuisés
   - Cards par stock avec emoji, nom, barre de niveau, meta « renouvelé il y a Xj · prochain prévu le Y »
   - Tap = changer niveau, long-press = options

3. Couplage automatique courses ↔ stocks :
   - Quand un stock passe à `low` ou `empty` → article correspondant auto-ajouté à la liste de courses avec badge « auto » discret
   - Quand l'article lié est coché en mode supermarché → stock auto-renouvelé à `full` avec date du jour
   - Mapping article ↔ stock optionnel et configurable (tous les articles n'ont pas un stock associé)

4. Prédiction simple :
   - Algorithme : moyenne des intervalles entre renouvellements (rolling 3 derniers)
   - Affichée en hint sur la card, jamais utilisée pour auto-acheter
   - Si moins de 2 renouvellements historiques, pas de prédiction

5. Tests Vitest sur le helper de prédiction.

### Bloc E — Module Mémoire

Spec dans `screens-spec.md` section 3.7 : **Variante 1 bibliothèque organisée**.

1. Modèle de données :
   - `households/{id}/memory-entries/{entryId}` : type (code/object/contact/manual/warranty/note), title, emoji, pinned, pinnedOrder, structuredData (JSON libre selon type), tags[], searchTokens[] (calculés à l'écriture), attachmentIds[], isSensitive, lastViewedAt, createdAt/By
   - Sous-collection optionnelle `memory-entries/{id}/revisions/{revId}` pour le versioning (préparée, pas implémentée maintenant)

2. Page `/memory` accessible depuis drawer « Plus » :
   - Top bar : « Mémoire » + bouton liste + bouton +
   - Champ de recherche
   - Section « Épinglés » : cartes horizontales scrollables (max ~6 visibles, swipe pour voir plus)
   - Section « Catégories » : grille 2×3 (Codes, Objets, Contacts, Manuels, Garanties, Notes) avec count par catégorie
   - Section « Récemment consultés » : 5 dernières entrées vues

3. Création / édition `/memory/new` et `/memory/[id]/edit` :
   - Sélection du type en premier (pills : code / objet / contact / manuel / garantie / note)
   - Formulaire adapté au type :
     - Code : value, emplacement physique, isSensitive (toggle)
     - Object : location (text), photo via attachment
     - Contact : name, phone, email, specialty/role
     - Manual : brand, model, dateOfPurchase, attachment PDF
     - Warranty : product, expiryDate, attachment scan
     - Note : free text long
   - Common : title, emoji, pinned toggle, tags, attachments libres

4. Détail `/memory/[id]` :
   - Affichage selon type
   - Pour code `isSensitive: true` : valeur masquée par défaut, biométrie WebAuthn pour révéler
     - Utilise `navigator.credentials.get()` avec userVerification: 'required'
     - Côté backend : valider via Cloud Function `revealSensitiveValue` qui logge l'accès
   - Tap long sur valeur = copier presse-papiers + toast « Copié »
   - Bouton modifier / supprimer
   - Met à jour `lastViewedAt` au load

5. Recherche client-side :
   - À l'écriture d'une entry : calculer `searchTokens[]` = title + tags + valeurs textuelles, normalisé (lowercase, sans accents, tokenisé par espace)
   - À la recherche : query Firestore `array-contains-any` sur les 1-2 premiers tokens du query, puis filtre client-side pour le reste
   - Alternative future : Algolia si la collection grossit (>1000 entries) — pas pour le sprint 3

6. Tests Vitest sur le helper de tokenisation + dénormalisation.

### Bloc F — Module Préparations (Checklists)

Spec dans `screens-spec.md` section 3.10 (V2 onglet dans Tâches).

1. Modèle de données :
   - `households/{id}/checklist-templates/{id}` : name, emoji, description, isSeeded, triggers[] (pour sprint 4, prévu mais pas utilisé), createdAt/updatedAt
   - `templates/{id}/items/{itemId}` : position, title, defaultAssigneeId, estimatedMinutes, notes
   - `households/{id}/checklist-runs/{runId}` : templateId, templateName/Emoji (dénormalisé), startedAt, startedBy, completedAt nullable, totalTasks, completedTasks

2. Intégration dans `/tasks` :
   - Deux onglets sticky en haut : « Mes tâches » (12) | « Préparations » (7)
   - Bascule client-side, garder en URL state (`?tab=prep`)

3. Onglet Préparations :
   - Grille 2×N de mini-cards (emoji, name, X tâches)
   - Featured variant (gradient) pour les modèles utilisés récemment
   - Card finale en pointillé : « + Créer »

4. Détail d'un modèle `/preparations/[id]` :
   - Liste des items du template (cochables pour personnaliser l'instance courante)
   - Bouton « Lancer la préparation » en CTA primary
   - Lien discret « Modifier le modèle »

5. Lancement :
   - Crée un `checklist_run` + génère N tasks avec `checklistRunId` posé
   - Redirige vers `/tasks` onglet « Mes tâches » avec section dédiée en haut « Préparation : X · N tâches »
   - Quand toutes les tâches du run sont done, le run est marqué completed et la section disparaît avec animation de célébration discrète

6. Trigger Cloud Function `updateChecklistRunProgress` :
   - Déclenchée sur tasks updates
   - Si `checklistRunId` set, recalcule `completedTasks` du run et pose `completedAt` si tout est fait

7. Seed par défaut à la création du cocon : 7 templates avec items (cf section 3.10.3 de `screens-spec.md`) :
   - 🌴 Avant les vacances
   - 🥂 Soirée à la maison
   - 🎒 Week-end
   - 🌅 Routine du matin
   - 🌙 Routine du soir
   - 🏠 Réception d'invités
   - ✈️ Long voyage

   Ces templates restent éditables après le seed.

### Bloc G — Détails transversaux

À traiter en fin de sprint, après que les modules principaux soient en place :

1. **Drawer « Plus »** du bottom nav :
   - Remplacer le `ComingSoon` actuel par une bottom sheet
   - Grille 2×N avec : Mémoire (icône livre), Stocks (icône boîte), Journal (« Bientôt », sprint 4), Assistant IA (« Bientôt », sprint 4)
   - Style cohérent avec le hub settings

2. **Onglet Courses du bottom nav** : remplacer le `ComingSoon` par `/shopping`

3. **États vides** pour tous les nouveaux écrans, en respectant le ton chaleureux complice établi (cf `screens-spec.md` section 4) :
   - Liste courses : « Frigo plein, **placards remplis** — tape sur un essentiel quand tu te souviens d'un truc »
   - Mémoire : « Ta mémoire du cocon **t'attend** — code Wi-Fi, plombier, mot de passe Netflix… tout ici »
   - Stocks : à inventer dans le même ton (suggestion : « Tout est plein pour l'instant — note ce que tu rachètes régulièrement »)
   - Préparations (onglet vide) : ne devrait pas exister car 7 templates seedés, mais prévoir le cas

4. **Settings : nouvelle sous-page « Cocon » étendue** :
   - Listing complet : nombre d'entrées dans chaque module
   - Bouton « Réinitialiser les essentiels » pour reseed les 8 quick-add items
   - Bouton « Réinitialiser les préparations » pour reseed les 7 templates

---

## Hors scope sprint 3

- Notes vocales / voice capture → sprint 4
- Journal du foyer (log read-only) → sprint 4
- Suggestion IA proactive de préparation → sprint 4
- Assistant IA chat → sprint 4
- Score d'équilibre → sprint 4

---

## Méthode de travail attendue

1. **Lecture des docs en premier.** En particulier `feedback_firebase_gotchas.md` (14 entries). Le bloc A doit suivre le plan détaillé du gotcha #14.

2. **Découpe en sous-tâches** avec ton estimation. Le sprint 3 est gros, on va probablement le faire en plusieurs sessions. Je valide la séquence avant qu'on attaque.

3. **Plan mode pour chaque bloc** avant de coder. Tu mappes le data model + les composants + les fonctions Cloud + les tests, je valide.

4. **TypeScript strict, pas de `any`** sauf justification.

5. **Tests Vitest sur les helpers purs** (au minimum) :
   - Tokenisation de recherche mémoire
   - Prédiction de stock
   - Calcul de progression de checklist run
   - Helpers d'attachments si non triviaux

6. **Commits atomiques** par bloc fonctionnel (`feat:`, `fix:`, `chore:`, `refactor:`). À la fin du sprint 3, on devrait avoir ~15-20 commits.

7. **Maj du README** au fil de l'eau : nouvelles routes, nouvelles env vars (notamment passkeys), nouveaux secrets Firebase.

8. **Maj de `docs/feedback_firebase_gotchas.md`** systématiquement avec les nouveaux apprentissages. Le sprint 3 va générer des découvertes sur : Cloud Storage (upload, règles), WebAuthn cryptographie, `array-contains-any` limites, batch writes Firestore.

---

## Variables d'env / secrets à prévoir

Pas de nouvelles APIs externes payantes. Tout passe par Firebase + Anthropic (déjà configuré).

À vérifier :
- `parseShoppingItem` consomme Haiku 4.5 comme `parseTask` (~0,0003 €/appel)
- Cloud Storage est dans le free tier Spark (5 GB stockage + 1 GB download/jour)

---

## Estimation du sprint

Sur la base des sprints précédents (8-26 commits par sprint), le sprint 3 sera **~25-35 commits**, étalés probablement sur **plusieurs sessions de 2-4h chacune**. Pas raisonnable de viser un one-shot. Découpage suggéré :

- **Session 1** : Bloc A (passkeys) + Bloc B partiel (data model courses + page principale)
- **Session 2** : Fin du Bloc B + Bloc C (mode supermarché)
- **Session 3** : Bloc D (stocks) + Bloc E partiel (mémoire data model + page principale)
- **Session 4** : Fin du Bloc E (création/édition/biométrie) + Bloc F (préparations)
- **Session 5** : Bloc G (transversaux) + finitions + tests

Mais tu peux proposer un découpage différent si tu vois mieux.

---

## Communication

- **Français** par défaut
- **Explique ton raisonnement avant la solution**
- **Si une meilleure approche existe que ce que j'ai prévu, dis-le** — en particulier sur les modèles de données qui vont devoir tenir longtemps
- **Direct, efficient, pas d'excuses inutiles**
- **Adapte la longueur à la complexité**

---

## Prêt ?

Avant de démarrer, fais-moi :

1. **Récap de ta compréhension** des 7 blocs en 8-12 lignes
2. **Ton découpage proposé en sessions** (avec justification si tu diffères du mien)
3. **Tes questions de clarification** — il y en aura forcément, le sprint 3 a beaucoup de surface
4. **Les gotchas du sprint 1-2 que tu retiens comme critiques** pour le sprint 3 (notamment Cloud Storage, biométrie, search Firestore)
5. **Une remarque sur la dépendance entre blocs** : selon toi, peut-on paralléliser certains blocs ou faut-il les séquencer ?

Une fois validé, on attaque par le Bloc A (passkeys) qui sert d'échauffement et ferme une dette du sprint 2.
