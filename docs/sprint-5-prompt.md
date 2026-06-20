# Cocon · Prompt sprint 5

> Coller ceci en premier message à Claude Code (onglet Code de l'app desktop) une fois la session ouverte avec les documents de référence attachés.

---

Bonjour Claude. Les sprints 1 à 4 de **Cocon** sont livrés et déployés sur https://cocon-app.netlify.app. Le sprint 5 commence maintenant.

**C'est un sprint d'affinage, pas d'ambition.** Il est piloté par l'usage réel : Wesley a passé une journée à utiliser l'app et a remonté une liste précise de bugs, frictions et désirs. L'objectif est de **corriger ce qui irrite** et de **redesigner trois écrans clés** sur la base de variantes validées.

## Contexte récupéré

Tu peux trouver dans le projet :

- Le code existant (Next.js 16 + TypeScript strict + Tailwind v4 + Firebase) avec les 10+ modules livrés aux sprints précédents
- Les documents de référence dans `docs/` : `architecture-cocon.md`, `screens-spec.md`, `brique-flamme-tokens.md`, `feedback_firebase_gotchas.md` (~23 entries)
- Les prompts précédents `sprint-1-prompt.md` à `sprint-4-prompt.md`

**Lis ces documents en entier avant toute action.** Le sprint 5 ne réinvente rien : il corrige et affine ce qui existe.

---

## État livré aux sprints 1-4 (rappel)

Cocon est fonctionnellement complet selon la spec d'origine :
- Auth email-first via magic link + passkeys WebAuthn + email/password
- Modules : Tasks (+ récurrence), Courses + Mode supermarché, Stocks (couplage auto), Mémoire (+ biométrie), Préparations (7 templates), Calendar (+ sync Google), Journal du foyer, Score d'équilibre, Notes vocales (Whisper + Claude multi-intentions)
- Settings : 6+ sous-pages
- 171 tests Vitest, ~40 routes, 22 Cloud Functions, ~0,35 €/mois

---

## Objectifs du sprint 5

Sept blocs. Les blocs A et B sont des **corrections de bugs critiques** sans discussion. Les blocs C-E sont des **redesigns** d'écrans existants selon des variantes validées avec Wesley. Le bloc F ajoute des **fonctionnalités manquantes**. Le bloc G enrichit le dashboard avec de nouvelles infos utiles.

### Bloc A — Bugs critiques (à corriger en premier)

#### A.1 — Le nom utilisateur affiché sur le dashboard est incorrect

Le greeting affiche un nom qui ne correspond pas au `displayName` stocké dans `users/{uid}`. Probablement un fallback sur `email.split('@')[0]` ou similaire qui n'a pas été mis à jour quand l'utilisateur a modifié son `displayName` dans Settings/Profile.

**À investiguer et corriger** :
- Tracer la source du nom affiché dans le dashboard
- S'assurer que le composant utilise bien le `displayName` du document `users/{uid}` (et non pas l'email ou un cache stale)
- Vérifier que la mise à jour du `displayName` se propage immédiatement (via le AuthProvider ou un hook dédié)

#### A.2 — Menu Mémoire : les cards catégories ne sont pas cliquables

Sur `/memory`, taper sur une card catégorie (« Codes », « Objets », « Contacts », etc.) ne fait rien.

**À implémenter** :
- Création de routes `/memory/[type]` pour chaque type (code / object / contact / manual / warranty / note)
- Chaque route filtre les entries de la collection par leur champ `type`
- Réutilise les composants de liste existants
- Top bar avec bouton retour + nom de la catégorie + count + bouton search

#### A.3 — FAB micro nécessite 2 taps au lieu d'1

Actuellement le tap sur le FAB ouvre une modale et il faut un 2e tap pour démarrer l'enregistrement. Wesley veut **1 tap = enregistrement démarre directement**.

**À implémenter** :
- Au tap sur le FAB, déclencher immédiatement `navigator.mediaDevices.getUserMedia({ audio: true })` et démarrer `MediaRecorder`
- La modale s'affiche déjà en état « recording » avec la waveform animée et le bouton « Stop »
- Cas d'erreur (permission refusée, micro absent) : afficher l'erreur dans la modale + bouton « Réessayer »
- Première utilisation : si la permission n'a jamais été accordée, le navigateur demandera la permission (comportement standard) — pas de double prompt à gérer côté code

#### A.4 — Mode supermarché : impossible de décocher un article

Actuellement, un tap sur un article coché en mode supermarché ne le ramène pas à l'état pending.

**À implémenter** :
- Tap sur un article coché → toggle back à pending
- Animation de retour (réutiliser l'animation actuelle inversée)
- Sync immédiate avec Firestore
- Si l'article était lié à un stock qui avait été renouvelé suite au check, **ne pas annuler** le renouvellement du stock (le décocher est une correction d'erreur de saisie, pas un retour en arrière sur la consommation)

### Bloc B — Fonctionnalités manquantes critiques

#### B.1 — Édition de tâche

Créer la route `/tasks/[id]/edit` (Wesley a explicitement choisi cette approche).

- Plein écran sans bottom nav (pattern de `/tasks/new`)
- Top bar : close + « Modifier la tâche » + « Enregistrer »
- Pré-rempli avec les valeurs actuelles de la tâche
- Mêmes champs qu'à la création : titre, description, assignee, due date, category, effort, recurrence, priorité (cf B.4), notes
- Logique récurrence : pour une tâche récurrente, demander **« modifier cette occurrence » vs « modifier toutes les occurrences futures »** (déjà spec'é dans `sprint-2-prompt.md`)
- Bouton « Supprimer » discret en bas (avec confirmation)
- Bouton « Modifier » accessible depuis `/tasks/[id]` (page détail actuelle)

#### B.2 — Édition d'article de courses

Créer la route `/shopping/[itemId]/edit`.

- Plein écran sans bottom nav
- Champs : nom, emoji, quantity, unit, rayon, notes contextuelles, attachments
- Pré-rempli avec valeurs actuelles
- Bouton « Supprimer » discret
- Accessible depuis `/shopping/[itemId]` (page détail actuelle)

#### B.3 — Édition de stock

Créer la route `/stocks/[stockId]/edit`.

- Plein écran sans bottom nav
- Champs : nom, emoji, niveau (les 4 segments + visualisation tube — cf bloc D), `linkedQuickAddItemId` pour lier à un article de courses
- Pré-rempli avec valeurs actuelles
- Bouton « Supprimer » discret
- Accessible depuis la card stock sur `/stocks` (tap long ou bouton « ⋯ »)

#### B.4 — Priorité de tâche (flag binaire)

Wesley a choisi un simple flag binaire « prioritaire » (étoile / drapeau) qui remonte en haut de liste.

**Modèle** :
- Ajouter `priority: boolean` sur le type `Task` (default false)

**UI dans création / édition** :
- Toggle « Marquer comme prioritaire ⭐ » dans le formulaire `/tasks/new` et `/tasks/[id]/edit`

**Affichage** :
- Étoile ⭐ jaune safran à côté du titre dans la liste, le dashboard, la fiche détail
- Dans `/tasks` : les tâches prioritaires remontent en haut de chaque section temporelle (Aujourd'hui / Cette semaine / etc.)
- Dans le dashboard : section « Aujourd'hui » trie d'abord par priorité, puis par due date

**Action rapide** :
- Long-press sur une tâche dans la liste → menu avec « Marquer prioritaire » / « Retirer la priorité » (option « Modifier » aussi dans ce menu)

### Bloc C — Refonte Header + Logo + Wordmark (Variante 1A)

Spec choisie : **header horizontal compact, logo 44px + wordmark + nom du foyer**.

**Composant `<AppHeader>`** réutilisable :
- Hauteur : ~64px
- Layout horizontal : `[Logo 44px][Wordmark Cocon + nom foyer][Actions à droite]`
- Logo : carré 44px arrondi, fond gradient `rgba(255,107,36,0.20) → rgba(255,200,69,0.06)`, bordure `rgba(255,107,36,0.32)`, emoji 🔥 ou logo PNG si fourni, drop-shadow orange subtil
- Wordmark « Cocon » : Funnel Display 700, 24px, letter-spacing -0.025em, gradient `linear-gradient(90deg, #FF6B24, #FFC845)` avec `background-clip: text`
- Sous-titre : nom du foyer + count membres (« Cocon Magnolia · 2 membres »), Funnel Sans 500, 12px, color `--muted`
- Actions à droite : recherche + bouton + selon contexte

À appliquer sur le **dashboard** et **éventuellement en variant simplifié sur d'autres pages** (à toi de juger — sur les sous-pages, garder un top bar plus discret peut être pertinent).

### Bloc D — Refonte Stocks (Variante 3A)

Spec choisie : **tube de niveau vertical (métaphore bouteille)**.

**Composant `<StockLevelTube>`** réutilisable :
- Largeur 12px, hauteur 56px
- Fond `--surface-elev`, radius 8px
- Remplissage interne selon niveau :
  - **full** : 100% gradient `linear-gradient(180deg, #4CAF50, #2E7D32)`
  - **half** : 50% gradient `linear-gradient(180deg, #FFC845, #FF9800)`
  - **low** : 25% gradient `linear-gradient(180deg, #FF6B24, #E5374D)`
  - **empty** : 6% (juste un fond visible) couleur `#E5374D`
- Animation lors du changement de niveau (transition 300ms)

**Refonte `/stocks`** :
- Liste verticale de cards
- Chaque card : `[Tube vertical][Info]`
  - Info : emoji + nom + meta (« Renouvelé il y a Xj » ou « Prochain achat le Y ») + label niveau (« Plein » / « Entamé » / « Bas » / « Épuisé »)
- Label niveau coloré selon le niveau (vert / safran / orange / rouge)
- Tap sur card = page détail
- Long-press ou bouton « ⋯ » = menu actions (Modifier / Renouveler / Supprimer)

**Mode édition niveau rapide** : au tap sur le tube lui-même, picker visuel à 4 segments verticaux qui permet de choisir le niveau en un geste, sans aller en page édition.

### Bloc E — Refonte Paramètres (Variante 4C)

Spec choisie : **sections groupées avec labels**.

**Refonte `/settings`** :
- Top bar : utilise le nouveau `<AppHeader>` simplifié (« Cocon · Paramètres »)
- Hero profil : conservé tel quel s'il existe, sinon supprimé (la 4C n'en a pas besoin)
- Sections regroupées avec label UPPERCASE letter-spacing 0.12em color `--muted` :
  - **COMPTE**
    - Mon profil → `/settings/profile`
    - Mon cocon → `/settings/cocon`
  - **APP**
    - Apparence → `/settings/appearance`
    - Notifications → `/settings/notifications`
    - Connecteurs → `/settings/connectors`
  - **CONFIDENTIALITÉ** (si pertinent)
    - Score d'équilibre → `/settings/balance` (si pas déjà ailleurs)
    - Journal → `/settings/journal`
  - **DONNÉES**
    - Export → `/settings/export` (à créer en bloc F si pas existant)
  - **Bouton Déconnexion** en bas, plein largeur, style discret
- Chaque card row : padding 13px 16px, icône 30×30 dans cercle coloré, titre 14px + sous-titre 11px muted, chevron à droite
- Bordures internes entre rows d'un même groupe, jamais entre groupes
- Groupes en background `--surface` border `--border` radius 14px overflow hidden

### Bloc F — Refonte Dashboard (Variante 2A enrichie)

Spec choisie : **hiérarchie par sections fortes + accent vertical**, enrichie de nouvelles infos selon les réponses de Wesley.

**Structure verticale du dashboard** :

#### F.1 Header (bloc C, AppHeader)
Logo + Cocon + nom du foyer + bouton recherche

#### F.2 Greeting hero
- Date en `--secondary` (jaune safran) : « LUN · 12 MAI 2026 »
- Titre Display 28px gradient orange : « Bonjour, **Wesley** »
- Summary 13px color muted : « 3 tâches aujourd'hui, dont 1 en retard »
- Le nom utilisé = `displayName` du document `users/{uid}` (cf bloc A.1)

#### F.3 Suggestion IA
- Conservée telle quelle (du sprint 4, bloc C)
- N'apparaît que s'il y a une suggestion `pending`

#### F.4 Section « Aujourd'hui · Tâches »
- Titre Display 18px avec barre d'accent verticale gradient à gauche
- Compteur à droite (« 3 tâches »)
- Liste des tâches du jour, **triées par priorité d'abord puis par due date**
- Tâches en retard avec bordure gauche `--destructive` (3px)
- Étoile ⭐ à côté du titre pour les prioritaires (bloc B.4)

#### F.5 Section « Aujourd'hui · Calendrier »
- **Séparée des tâches** (Wesley a explicitement demandé ça)
- Titre Display 18px avec barre d'accent
- Compteur à droite (« 2 événements »)
- Liste des événements de la journée triés par heure
- Format : heure + titre + lieu (s'il existe)
- Si vide : état vide compact discret (« Aucun événement aujourd'hui »)

#### F.6 Section « Alertes du foyer »
- **NOUVELLE SECTION** (Wesley a confirmé)
- Titre Display 18px avec barre d'accent
- Liste de mini-cards d'alertes, chacune cliquable et menant à la ressource concernée :
  - **Stocks bas/épuisés** : « 🧼 Lessive linge épuisée », « ☕ Café bas » → tap = `/stocks`
  - **Préparations en cours** : « 🌴 Préparation Vacances : 12/14 tâches faites » → tap = `/tasks?run=xxx`
  - **Garanties expirant bientôt** (< 30 jours) : « 📜 Garantie frigo Samsung expire dans 12j » → tap = entry mémoire
  - **Tâches récurrentes du lendemain** (en avance, info utile) : « 🔁 Demain : poubelles jaunes, traitement Mochi »
- Si aucune alerte : section masquée entièrement (pas d'état vide visible)
- **Maximum 5 alertes affichées** ; au-delà, afficher un « + X autres » qui scroll vers une vue plus complète

#### F.7 Section « Activité récente »
- Conservée telle quelle (déjà existante)
- 5 dernières tâches complétées sur 7 jours

#### F.8 Section « Score d'équilibre »
- Conservée telle quelle (du sprint 4)
- N'apparaît que si activé en opt-in

#### F.9 Météo locale (NOUVEAU — Wesley a choisi B)
- **NOUVELLE INTÉGRATION**
- API externe : **Open-Meteo** (gratuit, sans clé API, https://open-meteo.com)
- Position : en haut du dashboard, intégrée discrètement au header ou juste sous le greeting
- Format minimaliste : icône météo + température actuelle + condition (« 18° · Nuageux »)
- Mise à jour 1× par heure max (cache localStorage avec timestamp)
- Position de l'utilisateur :
  - Demander la géolocalisation au premier usage (`navigator.geolocation.getCurrentPosition`)
  - Sauver lat/lng dans `users/{uid}/preferences.location` après accord
  - Si refusé : afficher une coche dans Settings → Apparence pour saisir manuellement une ville
  - Fallback : Paris par défaut si aucune info

**Composant `<WeatherWidget>`** :
- Tap sur le widget = expand vers une vue jour complet (matin / après-midi / soir)
- Données via Open-Meteo : température, condition, précipitations, vent
- Icônes condition : utiliser les emojis weather standard pour rester cohérent visuellement (☀️ ⛅ ☁️ 🌧️ ❄️ ⛈️)

### Bloc G — Détails transversaux & polish

#### G.1 Visibilité de l'app dans l'écran d'accueil
- Vérifier le manifest PWA : `name`, `short_name`, `theme_color`, `background_color`, icons maskables 192 et 512
- Si Wesley a noté que le logo/wordmark étaient trop petits dans l'app, vérifier aussi que l'icône PWA installée est bien rendue à toutes les tailles

#### G.2 Cohérence visuelle générale
- Vérifier que le nouveau `<AppHeader>` est appliqué partout où c'est pertinent
- Vérifier l'harmonie des espacements après les refontes (mises à jour des écrans associés)
- Mettre à jour les composants partagés si nécessaire pour qu'ils utilisent les nouveaux patterns

#### G.3 Page d'export des données (référencée dans bloc E)
- Si elle n'existe pas, la créer
- Route `/settings/export`
- Bouton « Télécharger toutes mes données » → génère un ZIP JSON via Cloud Function
- Une Cloud Function `exportHouseholdData` à créer si nécessaire
- Mention de la conformité RGPD (textuel uniquement, pas de procédure complexe)

---

## Hors scope sprint 5

- Assistant IA chat conversationnel → sprint dédié à planifier plus tard
- Intégration Home Assistant → sprint d'affinage future
- Mode invité / babysitter → sprint d'affinage future
- Photos avant/après pour tâches récurrentes → si demande émerge à l'usage
- Refonte de toutes les sous-pages de Settings (juste le hub principal en bloc E)
- Widget Android → sujet à part

---

## Méthode de travail attendue

1. **Lecture des docs en premier.** En particulier `feedback_firebase_gotchas.md`. Les corrections de bugs en bloc A doivent éviter de reprendre les pièges identifiés (notamment la cohérence des userData entre AuthProvider et Firestore).

2. **Découpe en sous-tâches** avec ton estimation. Le sprint 5 a beaucoup de surface mais peu de complexité technique. Découpage suggéré :
   - **Session 1** : Bloc A (bugs critiques) + Bloc B (édition + priorité)
   - **Session 2** : Bloc C (AppHeader) + Bloc D (Stocks redesign) + Bloc E (Settings redesign)
   - **Session 3** : Bloc F (Dashboard refonte + météo + alertes) + Bloc G (polish)

3. **Plan mode pour le Bloc F** avant de coder. Le dashboard a beaucoup de nouvelles sections qui interagissent (météo géoloc, alertes croisées entre modules). Mappe l'approche, je valide.

4. **TypeScript strict, pas de `any`** sauf justification.

5. **Tests Vitest sur les helpers purs** :
   - Tri des tâches par priorité puis due date
   - Génération des alertes du foyer (stocks bas, prépas en cours, garanties expirant, tâches récurrentes demain)
   - Cache météo + invalidation à 1h

6. **Commits atomiques** par bloc fonctionnel. Cible : ~15-20 commits.

7. **Maj du README** : nouveau composant AppHeader, nouvelles routes (`/tasks/[id]/edit`, `/shopping/[id]/edit`, `/stocks/[id]/edit`, `/memory/[type]`, `/settings/export`), nouvelle dépendance externe (Open-Meteo).

8. **Maj de `docs/feedback_firebase_gotchas.md`** systématiquement.

---

## Variables d'env / secrets à prévoir

**Aucun nouveau secret**. Open-Meteo ne demande pas de clé API.

À documenter dans le README : `NEXT_PUBLIC_DEFAULT_WEATHER_LOCATION` (optionnel, format `lat,lng`, défaut Paris).

---

## Estimation budgétaire

**Aucun nouveau coût.** Open-Meteo est gratuit et illimité pour usage personnel.
Coût Cocon inchangé : ~0,35 €/mois.

---

## Communication

- **Français** par défaut
- **Explique ton raisonnement avant la solution**
- **Si une meilleure approche existe que ce que j'ai prévu, dis-le** — notamment sur les alertes croisées du dashboard (la logique de génération peut être lourde si mal pensée)
- **Direct, efficient, pas d'excuses inutiles**
- **Adapte la longueur à la complexité**

---

## Prêt ?

Avant de démarrer, fais-moi :

1. **Récap de ta compréhension** des 7 blocs en 10-15 lignes
2. **Confirmation du découpage en sessions** ou alternative argumentée
3. **Tes questions de clarification** — notamment sur :
   - La logique de récupération du `displayName` (bloc A.1) — où est le bug actuel selon toi ?
   - Le pattern pour générer les alertes croisées du dashboard (bloc F.6) — cron Cloud Function vs calcul client-side à chaque load ?
   - La gestion de la permission géolocalisation (bloc F.9) — flow de fallback
4. **Les gotchas du sprint 1-4 que tu retiens comme critiques** pour le sprint 5 (notamment ceux liés au cache des données utilisateur et à la propagation des updates)
5. **Une remarque sur l'ordre d'attaque** : selon toi, peut-on commencer par le bloc C (AppHeader) avant le bloc A (bugs), pour que les fixes de bug bénéficient déjà du nouveau header ? Ou tu préfères suivre l'ordre proposé ?

Une fois validé, on attaque par le **Bloc A** : la correction du nom utilisateur dans le dashboard, qui est probablement la première chose que Wesley a remarquée chaque matin.
