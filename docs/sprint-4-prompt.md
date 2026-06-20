# Cocon · Prompt sprint 4

> Coller ceci en premier message à Claude Code (onglet Code de l'app desktop) une fois la session ouverte avec les documents de référence attachés.

---

Bonjour Claude. Le sprint 3 de **Cocon** est livré — 11 commits, 118 tests, 14 Cloud Functions, 10 modules. Le sprint 4 commence maintenant.

C'est le **dernier sprint d'ambition** du projet. Après lui, on entre en mode affinage à partir de l'usage réel. À retenir : il faut bien le calibrer, ne pas l'expédier.

## Contexte récupéré

Tu peux trouver dans le projet :

- Le code existant (Next.js 16 + TypeScript strict + Tailwind v4 + Firebase) avec auth + passkeys, cocon, tasks + récurrence, courses + supermarché, stocks, mémoire + biométrie, préparations, calendrier + sync Google, settings hub complet
- Les documents de référence dans `docs/` : `architecture-cocon.md`, `screens-spec.md`, `brique-flamme-tokens.md`, `feedback_firebase_gotchas.md` (17 entries après le sprint 3)
- Les prompts précédents `sprint-1-prompt.md`, `sprint-2-prompt.md`, `sprint-3-prompt.md` pour mémoire

**Lis ces documents en entier avant toute action**, en particulier `feedback_firebase_gotchas.md`. Le sprint 4 doit s'inscrire dans la continuité — pas réinventer.

---

## État livré aux sprints 1-3 (rappel court)

- Auth email-first via magic link + **passkeys WebAuthn**
- Cocon + invitations UUIDv4
- Tasks : CRUD, assignment, récurrence (clone+advance pattern)
- **Saisie naturelle IA** Haiku 4.5 (tool use) sur tasks ET shopping-items
- Calendar : Variante 1 + sync Google read-only
- **FCM push** : code prêt, attend juste la VAPID key en env Netlify
- Courses : vue planning + mode supermarché vue duale + 8 essentiels seedés
- **Stocks + couplage bi-directionnel** courses ↔ stocks
- Mémoire : 6 types + biométrie WebAuthn pour révéler les codes sensibles + recherche tokenisée
- Préparations : 7 templates seedés + lancement → tasks
- Settings : 6 sous-pages actives + reseed des 8 essentiels et 7 templates
- 118 tests Vitest, ~36 routes, 14 Cloud Functions, ~0,15 €/mois

---

## Objectifs du sprint 4

Cinq blocs, à attaquer dans l'ordre suggéré. Le sprint 4 est plus **vertical IA** que les précédents et touche moins de modules : on **enrichit** ce qui existe plutôt que d'en créer.

### Bloc A — Activation push notifications + finitions (rapide, ~1h)

Pré-requis pour les blocs suivants (notamment B et C qui notifient).

1. **Action humaine côté Wesley** (à faire avant ou en parallèle de la session) :
   - Firebase Console → Cloud Messaging → générer une Web Push VAPID key
   - Ajouter `NEXT_PUBLIC_FCM_VAPID_PUBLIC_KEY` dans Netlify env vars
   - Rebuild Netlify

2. Côté code, vérifier que tout est branché :
   - Tester `enableNotifications` depuis `/settings/notifications` sur Chrome desktop + Android
   - Tester `sendNotificationTest` callable
   - Vérifier que `sendTaskReminder` (cron horaire du sprint 2) tourne et respecte les quiet hours
   - Si bug remonte de l'usage réel sprint 1-3 sur les notifs, le corriger ici

3. **Refonte de l'écran d'accueil** (`/dashboard`) pour préparer les blocs suivants :
   - Espace en haut pour la **card suggestion IA** (bloc C)
   - Espace pour le **score d'équilibre** (bloc D), conditionnel à un toggle
   - Réorganiser proprement greeting + tâches du jour + activité récente + membres

### Bloc B — Notes vocales rapides (~6-8h)

C'est la feature la plus utile au quotidien : capture rapide d'intentions multiples en parlant.

#### B.1 Cloud Function `voiceParse`

- HTTPS callable, accepte un audio blob (WebM/Opus, format standard MediaRecorder)
- Étape 1 : transcription via **OpenAI Whisper API** (modèle `whisper-1`, langue auto-détectée mais hint `fr` par défaut)
- Étape 2 : parsing multi-intentions via Claude Haiku 4.5 + tool use
  - Tool `extract_intents` qui retourne un tableau d'actions structurées
  - Types d'actions : `task`, `shopping_item`, `memory_entry`, `unrecognized`
  - Chaque action contient les champs typés selon son type (réutiliser les schémas existants `parseTask` et `parseShoppingItem`, ajouter `parseMemoryEntry`)
  - Prompt caching activé (`cache_control: ephemeral`) pour réduire le coût répété
- Logger dans `households/{id}/ai-logs/{logId}` : type=`voice-parse`, input (transcription text only, **pas l'audio**), output, durationMs, cost
- Quotas : limite de 50 voice notes / utilisateur / mois (configurable, hardcodé pour démarrer) avec retour `429` propre si dépassé

**Nouveau secret Firebase nécessaire** : `OPENAI_API_KEY`. Wesley devra créer un compte OpenAI, charger ~5 € de crédit, générer une clé. Coût Whisper : ~0,006 €/minute audio → 30s de note = 0,003 €.

#### B.2 Wrapper client `lib/ai/voice-parse.ts`

- `recordVoiceNote()` : utilise `MediaRecorder` API, retourne un Blob
- `parseVoiceNote(blob)` : appelle la Cloud Function
- Gestion d'erreurs : pas de micro, refusé, hors quota, parsing échoué (avec fallback : retourner la transcription brute en tant que tâche simple)

#### B.3 UI bouton micro

À ajouter à plusieurs endroits :

- **Bouton FAB sur le dashboard** : icône micro, position bottom-right au-dessus du bottom nav, gradient orange→safran, glow primary
- **Bouton inline dans `/tasks/new`** : à côté de l'encart sparkle (alternative au texte)
- **Bouton inline dans `/shopping/new`** : idem
- **Bouton inline dans `/memory/new`** : idem (post-sélection du type)

#### B.4 UX de capture

Modale plein écran qui apparaît au tap micro :

1. **État ready** : grand bouton micro central, hint « Appuie pour parler »
2. **État recording** : waveform animée (visualisation amplitude micro temps réel), timer mm:ss, bouton « Stop » centré
3. **État processing** : skeleton + texte « Transcription… » puis « Analyse… »
4. **État résultat** : récap des actions détectées sous forme de cards éditables

Désigner avec soin l'état 4 :
- Titre « N actions détectées »
- Pour chaque action : card avec type (icône : ✅ tâche / 🛒 courses / 📝 mémoire / ❓ non reconnu), contenu structuré pré-rempli avec mise en évidence « detected »
- Boutons par card : ✏️ éditer en ligne, ✗ supprimer cette action
- CTA bas : « Tout valider » (primary) ou « Annuler »
- Le bouton « Tout valider » crée les entités correspondantes (tasks, shopping-items, memory-entries) en parallèle puis redirige vers le dashboard avec un toast récap

**Privacy** : l'audio brut n'est jamais stocké côté serveur. Il est upload directement à Whisper puis détruit. Mention claire dans `/settings/notifications` (ou nouvelle sous-page `Confidentialité` si pertinent).

#### B.5 Tests Vitest

- Helpers purs : extraction des intents par type, gestion du quota mensuel, calcul du coût estimé
- Pas de tests E2E sur le micro (trop fragile)

### Bloc C — Suggestion intelligente de préparation (~3-4h)

L'IA détecte un événement à venir dans l'agenda et propose proactivement la préparation correspondante.

#### C.1 Triggers sur les templates

- Étendre le type `ChecklistTemplate` avec `triggers[]` (déjà prévu dans le schéma au sprint 3) :
  ```typescript
  triggers: Array<{ keyword: string; daysBefore: number }>
  ```
- Seeder les triggers sur les 7 templates par défaut :
  - 🌴 Vacances → keywords `["vacances", "voyage", "départ"]`, daysBefore: 5
  - 🥂 Soirée → keywords `["soirée", "apéro", "dîner"]`, daysBefore: 1
  - 🎒 Week-end → keywords `["week-end", "weekend"]`, daysBefore: 1
  - 🏠 Réception → keywords `["invités", "famille", "amis"]`, daysBefore: 2
  - ✈️ Long voyage → keywords `["voyage", "vol", "avion", "train"]`, daysBefore: 7
- Routines matin/soir : pas de trigger calendrier (déclenchement quotidien manuel)

- UI dans `/preparations/[id]/edit` : section « Déclenchement automatique » avec liste éditable des keywords + slider daysBefore

#### C.2 Cloud Function `suggestPreparations`

- **Scheduled** (`onSchedule every 24 hours` à 7h Europe/Paris)
- Pour chaque cocon actif :
  1. Lire les calendar-events des 14 prochains jours
  2. Pour chaque template avec triggers, matcher keywords vs titre+description des events (case-insensitive, sans accents)
  3. Si match + event dans la fenêtre `daysBefore` : créer une suggestion
- Modèle de données :
  ```typescript
  households/{id}/suggestions/{suggestionId} {
    type: 'preparation',
    templateId, templateName, templateEmoji,
    triggerEventId, triggerEventTitle, triggerEventDate,
    matchedKeyword,
    createdAt,
    status: 'pending' | 'accepted' | 'dismissed',
    dismissedBy?: uid,
    actedBy?: uid,
    actedAt?: timestamp,
  }
  ```
- Si une suggestion identique (même triggerEventId + templateId) existe déjà en pending, ne pas en créer une nouvelle
- Logger dans `ai-logs` avec type=`suggestion`

#### C.3 UI sur le dashboard

- Card distinctive en haut du dashboard quand au moins 1 suggestion pending existe :
  - Label « ✨ Suggestion · vacances 🌴 » en `--primary`
  - Titre Display : « Vos vacances en Bretagne arrivent dans 5 jours »
  - Sub : « Lance la préparation "Avant les vacances" (14 tâches) pour ne rien oublier ? »
  - CTA « Lancer » (primary, gradient) : lance le run + marque suggestion `accepted`
  - CTA « Plus tard » : marque suggestion `dismissed`
- Tracking : si la même suggestion type est dismissed 2× pour le même template → désactiver les suggestions de ce template avec option de réactiver dans Settings/Notifications

#### C.4 Notification push (optionnel mais sympa)

Quand une suggestion est créée, envoyer une push à l'utilisateur primary :
- Titre : « Préparation suggérée 🌴 »
- Corps : « Vos vacances arrivent dans 5 jours — lance la préparation ? »
- Tap = ouvre le dashboard

Respecter les quiet hours et la dédup quotidienne établies au sprint 2.

#### C.5 Tests Vitest

- Helper pur de matching keyword → event (normalisation, plusieurs keywords, fenêtre temporelle)
- Helper pur de filtrage suggestions dédupliquées

### Bloc D — Score d'équilibre du foyer (~4-5h)

Feature potentiellement sensible (cf gardes-fous dans la spec d'origine). À implémenter **off par défaut**, opt-in dans les paramètres.

#### D.1 Modèle

- Pas de stockage dédié : calcul à la volée depuis les tasks existantes
- Métriques considérées :
  - Nombre de tâches complétées par membre sur 7j / 30j glissants
  - Nombre de tâches par effort estimé (quick × 1, normal × 2, long × 4) → pondération
  - Catégories couvertes par membre (diversité)

#### D.2 Calcul

Helper pur `lib/balance/score.ts` :
```typescript
calculateBalance(tasks: Task[], memberIds: string[], window: '7d' | '30d'): {
  perMember: Record<uid, { count, weight, categories: string[] }>,
  balanceRatio: number,  // 0 = parfaitement équilibré, 1 = totalement déséquilibré
  message: string,        // texte chaleureux selon le ratio
}
```

Messages calibrés **bienveillants**, pas culpabilisants :
- Très équilibré (< 0.15) : « Vous formez une équipe au top ! »
- Équilibré (0.15-0.30) : « Bon équilibre cette semaine »
- Légèrement déséquilibré (0.30-0.50) : « Wesley a fait un peu plus cette semaine »
- Très déséquilibré (> 0.50) : « Wesley a porté la maison cette semaine » (jamais « Camille n'a rien fait »)

#### D.3 UI

- **Card sur le dashboard** (sous suggestion IA si présente, sinon en seconde position) :
  - Avatar des membres avec taille proportionnelle au weight
  - Mini-message (1 ligne)
  - Indicateur de ratio (jauge subtile, gradient secondary→muted)
  - Tap = vue détaillée
- **Vue détaillée `/balance`** :
  - Score par membre, par catégorie
  - Switch 7j / 30j
  - Graph simple (barres horizontales par membre)
  - Bouton « Désactiver le score » discret

#### D.4 Activation

- Toggle dans `/settings/cocon` : « Afficher le score d'équilibre »
- **Off par défaut**
- Mention dans le settings : « Le score est calculé à partir des tâches complétées. Il vise à donner une vue partagée, pas à comparer. Vous pouvez le désactiver à tout moment. »
- Si activé par un membre, visible par tous les membres du cocon

#### D.5 Tests Vitest

- Helper pur `calculateBalance` avec cas variés (foyer équilibré, déséquilibré, un seul membre actif, weights variables)
- Génération du message selon ratio

### Bloc E — Journal du foyer (~3-4h)

Log automatique read-only des événements significatifs du cocon. Pas d'action depuis le journal, juste de la consultation.

#### E.1 Modèle

```typescript
households/{id}/journal-entries/{entryId} {
  type: 'task_completed' | 'preparation_launched' | 'preparation_completed' | 'member_joined' | 'stock_renewed' | 'memory_entry_added' | 'shopping_session',
  actor: uid,
  actorName: string,        // dénormalisé pour affichage rapide
  payload: object,           // contenu dépendant du type
  createdAt: Timestamp,
}
```

#### E.2 Cloud Function triggers

Un trigger Firestore par type d'événement, qui crée la journal-entry correspondante :

- `onUpdate tasks` : si transition `pending → done` et pas une tâche d'un préparation run (sinon doublon)
- `onCreate checklist-runs` : `preparation_launched`
- `onUpdate checklist-runs` : si `completedAt` posé pour la première fois → `preparation_completed`
- `onCreate households/members` : `member_joined`
- `onUpdate stocks` : si transition vers `full` → `stock_renewed`
- `onCreate memory-entries` : `memory_entry_added`
- `onCreate shopping-sessions` (créé en fin de mode supermarché) : `shopping_session`

**Attention** : ne pas créer de doublons. Ex : compléter une tâche issue d'une préparation ne doit générer qu'**une** entry `task_completed`, pas `task_completed` + `preparation_completed` (sauf si c'est la dernière tâche du run).

#### E.3 UI `/journal`

- Accessible depuis le drawer « Plus » (remplacer le ComingSoon)
- Feed vertical chronologique inversé (plus récent en haut)
- Sticky headers par jour (« Aujourd'hui », « Hier », « Mardi 23 mai », etc.)
- Chaque entry : icône type + texte généré + métadonnées (qui, quand)
- Pull-to-refresh
- Pagination : 30 entries au chargement initial, charger plus au scroll bas

Textes générés (français, chaleureux) selon le type, exemples :
- task_completed : « Wesley a terminé ‟Sortir les poubelles" »
- preparation_launched : « Camille a lancé la préparation 🌴 Avant les vacances (8 tâches) »
- preparation_completed : « Préparation 🌴 Avant les vacances terminée en 2 jours »
- member_joined : « Camille a rejoint le cocon »
- stock_renewed : « Wesley a renouvelé le stock de dentifrice »
- memory_entry_added : « Camille a ajouté le contact ‟Plombier" »
- shopping_session : « Camille a fait les courses : 12 articles en 18 min »

#### E.4 Settings

- Sous-page `/settings/journal` (ou intégré à `/settings/cocon`) :
  - Toggle on/off des journaux (off = pas de nouvelles entries créées, mais les anciennes restent)
  - Bouton « Exporter le journal » → JSON download
  - Bouton « Effacer le journal » (avec confirmation forte, double opt-in)
  - On par défaut, mais désactivable

#### E.5 Tests Vitest

- Helper pur de génération du texte de chaque type d'entry
- Helper pur de groupage par jour pour les sticky headers

---

## Hors scope sprint 4

- **Assistant IA chat conversationnel** : reporté à un sprint dédié. C'est un sujet trop gros pour le caser ici, et il mérite un mini-cycle de design (UX du chat, tools accessibles, gestion du contexte, coûts). On le fera en sprint 5 ou en sprint dédié si tu veux.
- Mode invité / babysitter (lien temporaire) → sprint d'affinage
- Intégration Home Assistant → sprint d'affinage
- Export complet des données → sprint d'affinage
- Sync calendrier Outlook, Apple Calendar → si demande émerge à l'usage

---

## Méthode de travail attendue

1. **Lecture des docs en premier.** En particulier `feedback_firebase_gotchas.md` (17 entries). Le bloc B utilise Whisper API (nouveau secret), prends note des patterns d'appel external API établis dans le projet.

2. **Découpe en sous-tâches** avec ton estimation. Le sprint 4 est moins large que le 3 mais plus vertical. Probable découpage en sessions :
   - **Session 1** : Bloc A (push activation + refonte dashboard) + Bloc C (suggestion préparation)
   - **Session 2** : Bloc B (notes vocales) — c'est le plus gros, mérite une session dédiée
   - **Session 3** : Bloc D (score équilibre) + Bloc E (journal)

3. **Plan mode pour le Bloc B** avant de coder. C'est le plus complexe : UX micro + Whisper + parsing multi-intentions + UI résultat. Mappe l'approche complète, je valide.

4. **TypeScript strict, pas de `any`** sauf justification.

5. **Tests Vitest sur les helpers purs** (au minimum) :
   - Bloc B : extraction d'intents par type, gestion quota
   - Bloc C : matching keyword → event, dédup suggestions
   - Bloc D : calculateBalance avec cas variés, génération message
   - Bloc E : génération texte par type, groupage par jour

6. **Commits atomiques** par bloc fonctionnel. Cible : ~15-20 commits pour le sprint 4.

7. **Maj du README** : nouvelles env vars (`OPENAI_API_KEY`, `NEXT_PUBLIC_FCM_VAPID_PUBLIC_KEY` si pas déjà documenté), nouvelles routes (`/balance`, `/journal`).

8. **Maj de `docs/feedback_firebase_gotchas.md`** systématiquement. Le sprint 4 va générer des découvertes sur : MediaRecorder API en PWA, upload binaire vers Cloud Functions, Whisper API edge cases (silence, multi-langue, audio trop long), triggers Firestore en cascade et risques de boucles.

---

## Variables d'env / secrets à prévoir

Nouveaux secrets Firebase pour Cloud Functions :
- `OPENAI_API_KEY` (Whisper)

Variables Netlify (publiques) :
- `NEXT_PUBLIC_FCM_VAPID_PUBLIC_KEY` (dette du sprint 2-3 à activer en bloc A)

---

## Estimation budgétaire

Le sprint 4 introduit OpenAI Whisper API. Coût estimé :
- 50 voice-notes/mois × 30s × 0,006 €/min = **~0,15 € / mois**
- Anthropic Haiku (parse multi-intentions) : ~0,001 €/voice-note × 50 = **~0,05 € / mois**
- Total ajouté : **~0,20 € / mois** au coût existant de 0,15 €
- Coût total Cocon après sprint 4 : **~0,35 € / mois**

Toujours sous le seuil de quota gratuit Firebase pour tout le reste.

---

## Communication

- **Français** par défaut
- **Explique ton raisonnement avant la solution**
- **Si une meilleure approche existe que ce que j'ai prévu, dis-le** — en particulier sur le bloc B (UX micro est délicate)
- **Direct, efficient, pas d'excuses inutiles**
- **Adapte la longueur à la complexité**

---

## Prêt ?

Avant de démarrer, fais-moi :

1. **Récap de ta compréhension** des 5 blocs en 8-12 lignes
2. **Confirmation du découpage en sessions** ou alternative argumentée
3. **Tes questions de clarification** — il y en aura, en particulier sur le bloc B (formats audio, gestion permissions, fallback iOS Safari)
4. **Les gotchas du sprint 1-3 que tu retiens comme critiques** pour le sprint 4 (notamment sur les triggers Firestore en cascade pour le journal, les coûts IA, MediaRecorder en PWA)
5. **Une remarque sur le score d'équilibre** : tu as une intuition sur le calibrage du `balanceRatio` ou tu veux que je propose des seuils empiriques au moment de l'implémenter ?

Une fois validé, on attaque par le **Bloc A** qui est court et débloque les notifs en prod, puis le **Bloc C** qui est concret et le plus visible (la suggestion sur le dashboard est ce que Camille verra le plus).
