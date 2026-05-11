# Cocon · Spécification des écrans

> Source de vérité pour Claude Code, à attacher au sprint 1 aux côtés de `architecture-cocon.md`, `sprint-1-prompt.md` et `brique-flamme-tokens.md`. Ce document fige toutes les décisions visuelles et comportementales prises pendant la phase de design.

---

## 1. Vue d'ensemble

### 1.1 Identité de l'app
- **Nom** : Cocon
- **Tagline** : « L'organisation du cocon, à deux »
- **Thème visuel** : Brique Flamme (dark mode par défaut, light mode dispo)
- **Voix** : Chaleureux complice — tutoiement, légère personnalité, emojis dosés (1 max par état, jamais dans les titres)

### 1.2 Stack rappel
- Next.js 15 App Router + TypeScript + Tailwind + shadcn/ui
- Firebase Firestore (DB) + Firebase Auth (passkeys + magic links)
- Firebase Cloud Functions pour les endpoints serveur (Claude API, Resend)
- Netlify pour l'hébergement frontend
- Funnel Display + Funnel Sans (Google Fonts)
- Brique Flamme tokens dans `brique-flamme-tokens.md`

### 1.3 Plateforme
- PWA installable, web/mobile/desktop responsive
- Mobile-first (la cible primaire est le smartphone)
- Mockups conçus pour ~380px de largeur

---

## 2. Navigation

### 2.1 Pattern global (validé)
**Onglets classiques** : barre de navigation en bas, persistante sur toutes les pages principales.

5 onglets dans l'ordre :
1. **Accueil** — icône maison — dashboard
2. **Tâches** — icône liste avec checks
3. **Courses** — icône sac/caddie
4. **Agenda** — icône calendrier
5. **Plus** — icône trois points — ouvre un drawer

Le drawer "Plus" contient (grille 2×2) :
- **Mémoire** — icône livre ouvert
- **Journal** — icône carnet
- **Assistant** — icône sparkles ✨
- **Paramètres** — icône engrenage

### 2.2 Comportements
- Onglet actif : couleur `--primary`, glow drop-shadow
- Onglet inactif : couleur `--muted`
- Barre semi-transparente avec backdrop-blur 20px
- Padding-bottom 22px pour respecter la safe-area iOS
- Drawer "Plus" : bottom sheet, fond `--surface-elev`, handle de drag en haut

### 2.3 Exceptions
- **Mode supermarché** : nav masquée (mode focus plein écran)
- **Création de tâche** : nav masquée (modale plein écran)
- **Connexion/Inscription** : nav masquée

---

## 3. Écrans principaux

### 3.1 Dashboard (Accueil)
**Validé** : version originale du tout premier mock.

Cartes en grille responsive (1 col mobile, 2-3 col desktop) :
1. **Bonjour [prénom]** + date + résumé en 1 phrase
2. **Tâches du jour** — checkables en place
3. **Activité récente** — 5 dernières tâches complétées
4. **Membres du cocon** — avatars + statut présence

### 3.2 Liste de tâches
**Validé : Variante 1 — Groupé par échéance.**

Structure :
- Top bar : « Tâches · 12 » + recherche + bouton "+"
- Chips de filtre par assigné : Toutes / À moi / À Camille / Non assignées
- Sections temporelles : Aujourd'hui (avec sous-titre rouge si retard) / Cette semaine / Plus tard / Fait récemment
- Items : checkbox + titre + meta (catégorie, heure) + avatar assigné
- Item en retard : bordure gauche `--destructive`

Interactions :
- Tap checkbox = compléter (avec toast undo 5s)
- Tap ligne = ouvrir détail
- Swipe gauche→droite = compléter rapidement
- Swipe droite→gauche = options (assigner, reporter, supprimer)
- Pull-to-refresh standard
- Bouton "+" en haut à droite = créer une tâche

### 3.3 Création de tâche
**Validé : hybride V1 + V3 (formulaire détaillé + saisie naturelle optionnelle).**

#### Mode par défaut : Formulaire détaillé plein écran
Slides up depuis le bas, header sticky :
- Close (×) à gauche, "Nouvelle tâche" au centre, "Enregistrer" à droite (grisé tant que titre vide)
- Encart sparkle (✨) : « Décrire en une phrase » avec exemple
- Champs verticaux :
  - **Titre** (Display, large, required)
  - **Pour qui** (pills d'avatars Wesley / Camille / Non assignée)
  - **Quand** (pills Aujourd'hui / Demain / Cette semaine / Choisir)
  - **Catégorie** (pills custom : Maison / Animaux / Voiture / Cuisine / + Autre)
  - **Effort estimé** (pills Rapide / Normal / Long)
  - **Description** (textarea facultatif)
  - **Récurrence** (encart "Bientôt" en pointillé — désactivé en sprint 1, sera implémenté sprint 2)

#### Mode saisie naturelle (sur tap sparkle)
- L'encart sparkle devient zone de saisie multi-lignes avec focus auto
- Bouton « Analyser » bas droite + « Annuler » à côté
- Le formulaire en-dessous est grisé pendant la saisie
- À l'analyse : appel `POST /api/ai/parse-task` (Anthropic), latence ~500ms
- Champs pré-remplis avec variant "detected" (pill orange-jaune)
- Toast confirme « 4 champs détectés · ajustez avant d'enregistrer »
- Si l'utilisateur modifie un champ, la mise en évidence "detected" disparaît
- En cas d'échec API : bascule silencieuse vers formulaire vide avec texte en titre

### 3.4 Courses · vue planning
**Validé : Variante 1 (cards par rayon) + grille tap-pour-ajouter de Variante 3.**

Structure verticale :
- Top bar : « Courses · 11 » + recherche + bouton "+"
- **Section "Essentiels du cocon"** : grille 4×2 de tuiles (lait, pain, œufs, beurre, yaourt, fromage, pâtes, café)
  - Tap simple = +1 quantité (badge orange apparaît avec compteur)
  - Long-press = mini-éditeur (qty, note, autre rayon)
  - Lien "Modifier" pour personnaliser la grille
- **Bouton "Mode supermarché"** en grand : ouvre le mode dédié
- **Section "Par rayon"** : cards pliables par rayon (Frais, Épicerie, Hygiène, Boulangerie, Boissons)
  - Premières 2 cards dépliées par défaut, suivantes pliées
  - Items dans chaque card : checkbox + nom + qty + avatar + marqueur "★" si ajouté via grille

Données :
- Table `quick_add_items` par cocon, drag & drop pour réordonner
- Seed par défaut : les 8 tuiles montrées
- Mapping `default_rayon` par essentiel pour auto-rangement
- Pas de pagination de la grille — remplacer pour ajouter

#### Enrichissements item (sprint 3)
Sur chaque article de courses, possibilité d'ajouter :
- **Note contextuelle partagée** (text) : « prends la marque en flacon vert pas la blanche »
  - Visible par tous les membres du cocon
  - Apparaît en italique sous le nom de l'article en gris muted, troncage à 1 ligne avec « … » + tap pour voir tout
  - Indicateur 💬 sur l'article tant qu'une note non-vue par l'utilisateur courant existe (tracking `note_seen_by[]`)
  - En mode supermarché : la note est mise en évidence en plus grand quand on focus l'article
- **Pièce jointe** (kind: photo | url) :
  - Photo de packaging : pris à l'arraché en magasin pour ne plus se tromper la prochaine fois
  - Lien commercial : URL Amazon/Drive/marque pour retrouver le produit exact
  - Stockage : S3-compatible (MinIO en self-host)
  - Affichage : icône 📎 sur l'article, tap = ouvre la photo plein écran ou redirige vers l'URL

#### Couplage automatique courses ↔ stocks (sprint 3)
Quand un article est coché en mode supermarché :
- Si lié à un stock (`stock_item_id` non null) → le stock repasse à « plein » avec la date du jour
- Quand un stock est marqué « ouvert » ou « épuisé » via l'écran Stocks, l'article correspondant est automatiquement ajouté à la liste de courses (avec un badge « auto-ajouté » discret)
- Mapping article ↔ stock optionnel et configurable : pas tous les articles ont un stock associé (oignons à l'unité non, dentifrice oui)
- Algorithme de prédiction simple : « tu rachètes du dentifrice tous les ~45 jours, prochain à prévoir le 17 juin » — affiché en hint, jamais auto-créé

### 3.5 Mode supermarché
**Validé : Variante 3 — Vue duale (focus + minimap).**

Structure :
- **Pas de bottom navigation** (plein écran focus)
- Top bar : flèche retour + « Carrefour Express · 5/24 articles » + bouton "Terminer"
- **Carte progression** : « 5/24 » en énorme + barre de progression dégradée
- **Section "Rayon actuel"** : emoji + nom + items du rayon en cartes 64px de haut, tap = check immédiat avec haptic feedback
- **Bande horizontale des autres rayons** en bas : chaque rayon en mini-card avec emoji, nom, mini barre de progression
  - Active = bordure primary + glow
  - Complete = opacité 0.6
  - Tap = sauter à ce rayon

Comportements :
- Haptic feedback (vibration courte) à chaque check
- Animation de coche ~200ms
- « Terminer » demande confirmation seulement s'il reste des articles
- Écran de célébration discret à la fin : « Bien joué · 24 articles en 18 min »
- L'historique alimente l'IA pour optimiser l'ordre des rayons (sprint 4)

### 3.6 Agenda
**Validé : Variante 1 — Mini-mois + jour sélectionné.**

Structure :
- Top bar : « Mai 2026 ▾ » + recherche + bouton "+"
- **Mini-grille du mois** : 6 lignes × 7 cols, dots colorés sur les jours avec événements
  - Dot orange = événement cocon
  - Dot jaune = événement Camille
  - Dot highlight = all-day
  - Aujourd'hui : fond `rgba(255,107,36,0.12)`, chiffre orange
  - Jour sélectionné : fond primary, chiffre noir
- **Section "Aujourd'hui · 12 mai"** sous la grille
- Liste d'événements pour le jour sélectionné :
  - Tâches avec due_date : style "task" pointillé orange
  - Événements locaux : barre primary à gauche
  - Événements Camille : barre secondary (jaune)
  - Événements externes (Google, Outlook) : barre muted fine + badge source

Comportements :
- Tap « Mai 2026 ▾ » = sélecteur mois/année
- Tap sur événement = fiche détaillée
- Long-press sur un jour = créer un événement pré-rempli avec ce jour
- Événements externes en lecture seule (badge "Google" / "Outlook")
- Événements multi-jours = bande sur la durée

### 3.7 Mémoire du cocon
**Validé : Variante 1 — Bibliothèque organisée.**

Structure verticale :
- Top bar : « Mémoire » + bouton liste + bouton "+"
- Champ de recherche : « Rechercher dans le cocon… »
- **Section "Épinglés"** ❤️ : cartes horizontales scrollables (Wi-Fi, code portail, alarme masquée, passeports…)
- **Section "Catégories"** : grille 2×3 (Codes 8, Objets 23, Contacts 12, Manuels 7, Garanties 5, Notes 14)
- **Section "Récemment consultés"** : liste verticale des 5 dernières entrées vues

Comportements clés :
- Tap sur code masqué (alarme, coffre) = **biométrie Face ID / empreinte requise** avant révélation
- Tap long sur code = **copier dans presse-papiers** + toast « Copié »
- **Recherche full-text** : Firestore ne supporte pas le full-text natif. Approche : champ `searchTokens: string[]` calculé à l'écriture (lowercase, sans accents, tokenisé) + requête `array-contains-any` pour le matching. Pour de la recherche plus puissante en sprint 3+, intégrer **Algolia** (plan gratuit suffit) avec sync automatique via Cloud Function. Alternative low-cost : Typesense self-hosté.
- Champs structurés par type dans `structuredData` (objet JSON dans Firestore)
- Photos attachables sur n'importe quel type via `attachmentIds[]` qui pointe vers la collection `attachments`
- Versioning : Firestore n'a pas de versioning natif. Si besoin un jour, créer une sous-collection `revisions/` sur chaque entry. Pas en sprint 1.

### 3.8 Connexion / Inscription
**Validé : Variante 2 — Email-first avec routing intelligent.**

Structure (écran unique) :
- Wordmark « ● Cocon » en haut à gauche
- Greeting : « Bonjour ! Entre ton email pour commencer. On te guide ensuite. »
- Champ email en grand, bordure primary, ring rgba(255,107,36,0.16)
- Bouton « Continuer » avec flèche
- Hint : « Nouveau ou invité ? On reconnaît automatiquement. »

Routage backend :
- Endpoint `POST /api/auth/lookup` avec l'email
- Retourne `{ status: 'existing' | 'new' | 'invited', householdName?: string }`
- **Existing** → écran passkey (avec magic link fallback en lien discret)
- **New** sans token invitation → flow création (nom, passkey, créer cocon)
- **New avec token invitation** dans URL → flow rejoindre (nom, passkey, « Vous rejoignez le cocon X »)

Auth fondamentaux (rappel) :
- Primaire : passkey WebAuthn (Face ID / Touch ID / empreinte)
- Fallback : magic link via Resend, valable 15 min, usage unique
- Pas de « mot de passe oublié » — passkey + magic link suffisent
- Onboarding post-signup : (1) prénom, (2) créer cocon OU rejoindre, (3) inviter partenaire (facultatif)

### 3.9 Paramètres
**Validé : Variante 2 — Hub avec sous-pages.**

Structure du hub :
- Top bar : « Paramètres » + recherche
- **Hero profil** : card pleine largeur en gradient orange-jaune, avatar large, nom Display, meta « Membre du Cocon X · avec Camille »
- **Grille 2×N de cards** :
  - Mon cocon (icône maison) — gérer membres, inviter
  - Mon profil — nom, photo, email
  - Apparence — thème, taille du texte
  - Notifications — push, calme 22h-7h
  - Connecteurs — calendriers, badge "1" pour suggérer
  - Assistant IA — activé, 4 fonctions
  - Données — export, historique
  - **Compte** (variant warning, rouge) — déconnexion, suppression

Chaque card ouvre sa sous-page dédiée. Les sous-pages sont des formulaires standards (toggles, inputs, listes). Pas besoin de mocker chaque sous-page individuellement — le pattern est consistent.

### 3.10 Préparations (checklists)
**Validé : Variante 2 (onglet dans Tâches) en sprint 3, + Variante 3 (suggestion intelligente sur Dashboard) en sprint 4.**

Concept : modèles de tâches groupées qu'on peut lancer à la demande (avant les vacances, soirée à la maison, routine du soir, etc.). Quand on « lance » un modèle, ça génère X tâches normales taggées avec l'origine.

#### 3.10.1 Bibliothèque (sprint 3, dans Tâches)
Structure :
- Dans l'écran **Tâches**, deux onglets sticky en haut :
  - « Mes tâches » (12) — l'onglet par défaut, contenu actuel de l'écran tâches
  - « Préparations » (7) — nouvelle bibliothèque
- En grille 2×N de mini-cards, chaque card = un modèle :
  - Emoji prominent (🌴 vacances, 🥂 soirée, 🎒 week-end, 🌅 matin, 🌙 soir, 🏠 invités, ✈️ voyage)
  - Nom Display
  - « X tâches » en meta
  - Card en variant featured (gradient orange) pour les plus utilisées récemment
- Card finale en pointillé : « + Créer »

Tap sur une card = écran détail :
- Aperçu de tous les items du modèle (cochables pour personnaliser l'instance courante)
- Bouton « Lancer la préparation » en CTA primary
- Lien « Modifier le modèle » discret
- Une fois lancé : redirige vers « Mes tâches » avec une section dédiée en haut (« Préparation : Avant les vacances · 14 tâches »)

Comportements :
- Lancer un modèle crée un `checklist_run` et génère les tâches via `checklist_run_id`
- Les tâches générées peuvent être assignées, réassignées, supprimées individuellement comme des tâches normales
- Quand toutes les tâches d'un run sont complétées, le run est marqué fini et la section disparaît avec animation de célébration
- Plusieurs runs peuvent coexister (lancer « Soirée » alors qu'une « Vacances » est encore active)

#### 3.10.2 Suggestion intelligente (sprint 4, sur Dashboard)
Structure :
- Card distinctive en haut du dashboard quand pertinent :
  - Label « ✨ Suggestion · vacances 🌴 » en `--primary`
  - Titre Display : « Vos vacances en Bretagne arrivent dans 5 jours »
  - Sub : « Lance la préparation "Avant les vacances" (14 tâches) pour ne rien oublier ? »
  - Deux CTA : « Lancer » (primary) et « Plus tard » (secondary)

Logique de déclenchement :
- Cron quotidien analyse l'agenda à 7 jours
- Si événement détecté correspondant à un mot-clé d'un modèle (vacances, voyage, invités…), créer une suggestion
- Modèle ↔ mot-clés : table `checklist_template_triggers` (template_id, keyword, days_before)
- L'utilisateur peut dismiss : la suggestion ne réapparaîtra pas pour cet événement
- Si dismissée 2× pour le même type d'événement, désactiver les suggestions de ce template (avec option de réactiver dans paramètres)

#### 3.10.3 Modèles seedés par défaut (sprint 3)
Pour éviter l'expérience vide au lancement, seeder ces modèles à la création du cocon :

| Modèle | Emoji | Items typiques (à adapter dans le seed) |
|---|---|---|
| Avant les vacances | 🌴 | Arroser plantes, vider frigo, sortir poubelles, fermer volets, débrancher box, vérifier passeports, programmer thermostat, prévenir voisine |
| Soirée à la maison | 🥂 | Ranger salon, faire courses apéro, préparer playlist, sortir verres/vaisselle, vérifier toilettes, allumer bougies |
| Week-end | 🎒 | Préparer sac, vérifier essence/billets, programmer alarme, sortir poubelles |
| Routine du matin | 🌅 | Aérer la chambre, faire le lit, hydrater plantes |
| Routine du soir | 🌙 | Vaisselle, fermer maison, charger téléphones |
| Réception d'invités | 🏠 | Préparer chambre amis, draps propres, serviettes, papier toilettes, vider poubelles |
| Long voyage | ✈️ | + items de « Vacances » + visa/vaccins, devises, abonnements, copie passeport |

#### 3.10.4 Data model
Voir `architecture-cocon.md` section 2.2 pour le schéma Firestore complet. Les collections concernées :
- `households/{hid}/checklistTemplates/{templateId}` — modèles avec items en array (NoSQL, pas de table de jointure)
- `households/{hid}/checklistRuns/{runId}` — instances de lancement
- Champ `checklistRunId` (optionnel) sur les documents `tasks` pour rattacher les tâches générées

Les triggers (mots-clés et `daysBefore`) sont dans un array `triggers` au sein du document `checklistTemplates`.

### 3.11 Stocks (sprint 3)
Module distinct des courses, couplé à elles. L'écran Stocks est accessible depuis le drawer « Plus ».

Structure :
- Top bar : « Stocks · 18 » + recherche + bouton "+"
- Filtres : Tous / À renouveler bientôt / Épuisés
- Cards par stock :
  - Emoji du produit + nom (« Dentifrice Sensodyne »)
  - Barre de niveau (plein 🟢 / entamé 🟡 / bas 🟠 / épuisé 🔴)
  - Meta : « Renouvelé il y a 12 jours · prochain rachat estimé : 17 juin »
  - Action rapide : tap = changer le niveau, long-press = options (lier à un article de courses, supprimer)

Comportements :
- Quand un stock passe à « bas » ou « épuisé » : article correspondant auto-ajouté aux courses (avec badge « auto » discret)
- Quand l'article est coché en mode supermarché : stock auto-renouvelé à « plein » avec date d'aujourd'hui
- Algorithme de prédiction : moyenne des intervalles entre renouvellements (rolling 3 derniers)
- Prédiction affichée en hint sur la card stock, jamais utilisée pour auto-acheter

Data model :
Voir `architecture-cocon.md` section 2.2. Collection `households/{hid}/stockItems/{stockId}` avec champ `history` en array (NoSQL) plutôt qu'une collection séparée pour `stock_history`. Lien optionnel vers `quickAddItems` via le champ `linkedQuickAddItemId`.

### 3.12 Saisie vocale rapide (sprint 4)
Feature transversale d'entrée. Bouton micro disponible sur les écrans de capture :
- Création de tâche
- Ajout d'article aux courses
- Création d'entrée mémoire
- Bouton flottant accessible depuis le dashboard pour capture libre

Comportements :
- Tap sur le micro = recording avec waveform animée + bouton « Stop »
- Au stop : transcription via Whisper API (OpenAI) — alternative : utiliser une API de transcription self-hostable type whisper.cpp
- La transcription est passée au module IA existant (`/api/ai/parse-task` ou nouveau `/api/ai/parse-multi`) qui peut détecter plusieurs intentions dans une même phrase
- Exemple : « Faut acheter du dentifrice, prendre rdv chez le véto vendredi, et appeler ma mère »
  - → ajoute « Dentifrice » aux courses (rayon hygiène)
  - → crée une tâche « Prendre rdv chez le vétérinaire » avec due_date vendredi
  - → crée une tâche « Appeler ma mère »
- Affiche un récap des actions détectées avec confirmation avant validation
- L'utilisateur peut éditer chaque action avant de valider
- L'audio brut n'est pas conservé après transcription (privacy)

UI du récap (modale plein écran) :
- Titre : « 3 actions détectées »
- Liste verticale, chaque action en card avec :
  - Type (icône : ✅ tâche, 🛒 course, 📝 mémoire)
  - Contenu structuré
  - Bouton ✏️ pour éditer, ✗ pour ignorer
- CTA : « Tout valider » (primary) ou « Annuler »

Données :
- Pas de stockage audio
- Logging des transcriptions + actions générées dans `ai_action_logs` pour amélioration future et debug
- Compteur d'usage par utilisateur pour respecter les quotas API

---

## 4. États vides
**Validé : Variante 2 — Chaleureux complice (mais sans emojis dans les titres).**

Recette :
- Illustration centrale (un emoji ou une icône large)
- Titre Display 24px, accent sur 1-2 mots clés
- Sous-titre Sans 14px en `--muted`, max 260px de large
- CTA gradient primary→secondary avec glow

### 4.1 Copy validé

| Écran | Titre | Sous-titre |
|---|---|---|
| Tâches vide | Rien à faire **aujourd'hui** | Profite — c'est rare. On garde tout en mémoire pour demain. |
| Courses vide | Frigo plein, **placards remplis** | Tape sur un essentiel quand tu te souviens d'un truc. |
| Agenda vide | **Journée libre** comme l'air | Aucun rendez-vous, aucun rappel. |
| Mémoire vide | Ta mémoire du cocon **t'attend** | Code Wi-Fi, plombier, mot de passe Netflix… tout ici. |
| Journal vide | L'histoire de **ton cocon** démarre maintenant | — |

### 4.2 Règle
Un emoji **maximum** par état, et **dans l'illustration centrale**, pas dans le titre. Le ton est chaleureux mais pas démonstratif.

---

## 5. Composants transverses

### 5.1 Toast undo
Apparaît en bas après chaque action destructive ou irréversible (compléter, supprimer).
- Durée : 5 secondes
- Style : fond `--surface-elev`, bordure `--border`
- Texte + bouton « Annuler » en `--primary`
- Auto-dismiss après 5s
- Tap n'importe où sur le toast = annuler l'action

### 5.2 Avatar
- Wesley : fond `--primary`, initiale en `--bg`
- Camille : fond `--secondary`, initiale en `--bg`
- Non assigné : fond `--surface-elev`, bordure pointillée, point d'interrogation `--faint`
- Tailles standards : 18px (inline), 22px (chips), 32px (rows), 56px (profil hero)

### 5.3 Checkbox
- Inactif : bordure 1.5px `#5C3D2C`, fond transparent
- Coché : fond `--secondary`, check « ✓ » en `--bg`
- Animation au check : ~200ms
- Tailles : 18-20px (rows standards), 28-38px (mode supermarché)

### 5.4 Pills
- Inactif : fond `--surface`, bordure `--border`, texte `--muted`
- Actif : fond `--primary`, texte `--bg`, bordure transparente, glow box-shadow
- Detected (saisie naturelle) : gradient `rgba(255,107,36,0.18)→rgba(255,200,69,0.08)`, bordure rgba(255,107,36,0.40)

### 5.5 Top bar standard
- Padding 22px / 20px / 12px
- Titre Display 26-28px
- Actions à droite : icon-btn (38×38, radius 10px, fond `--surface`)
- Bouton "+" en variant primary (gradient + glow)

### 5.6 Bottom sheet / modal
- Border-radius 24px 24px 0 0
- Handle de drag (38×4, radius 2, fond `--border`) en haut centré, marge 12px
- Padding 20px
- Box-shadow `0 -12px 40px rgba(0,0,0,0.5)` au-dessus
- Scrim par-dessus le contenu : `rgba(16,6,4,0.5)` + backdrop-blur 4px

---

## 6. Détails comportementaux globaux

### 6.1 Notifications
- Push via **Firebase Cloud Messaging (FCM)** Web Push, gratuit
- Fallback email via Resend (Cloud Function) si pas lu après 1h
- **Quiet hours par défaut : 22h → 7h** (configurable)
- Maximum 3 notifications push regroupées par jour, sauf urgent
- Grouping automatique si plusieurs notifs prêtes simultanément

### 6.2 Synchronisation temps réel
- **Firestore listeners natifs** (`onSnapshot`) sur les collections du cocon courant
- Aucun WebSocket à coder, c'est intégré au SDK Firebase
- Tap sur tâche par Wesley → Camille voit la mise à jour en < 1 seconde sur son appareil
- Coût : ~1 read par changement par device connecté (largement dans les quotas gratuits)

### 6.3 Offline-first (PWA)
- Service Worker cache les données critiques :
  - Liste de courses (pour usage en magasin)
  - Codes mémoire (Wi-Fi, alarme, portail)
  - Tâches du jour
- Sync au retour en ligne, last-write-wins en cas de conflit

### 6.4 Animations
- Globalement subtiles, CSS transitions privilégiées
- Pas de Framer Motion sauf si vraiment nécessaire (économie de bundle)
- Durées standards : 150ms (micro), 200ms (state changes), 300ms (modales)
- Easing par défaut : `cubic-bezier(0.4, 0, 0.2, 1)`

---

## 7. Choix structurels rappel

### Stack
- **Architecture** : Next.js 15 + TypeScript + Tailwind + shadcn/ui
- **DB** : Firebase Firestore (NoSQL, temps réel natif)
- **Auth** : Firebase Authentication (Passkeys + Magic links)
- **Storage** : Firebase Cloud Storage (photos, manuels PDF)
- **Realtime** : Firestore `onSnapshot()` (natif, gratuit)
- **Backend** : Firebase Cloud Functions (gen 2)
- **Push** : Firebase Cloud Messaging
- **Email** : Firebase Auth (magic links) · invitations partagées manuellement au sprint 1
- **IA** : Anthropic Claude API (déjà dans sprint 1 pour parse-task)
- **Deploy** : Netlify (frontend) + Firebase (functions)

### Identité visuelle
- **Thème** : Brique Flamme (dark warm-toned par défaut)
- **Polices** : Funnel Display (display) + Funnel Sans (body)
- **Tokens** : voir `brique-flamme-tokens.md`

### UX
- **Navigation** : Pattern A (5 onglets bottom bar)
- **Création de tâche** : Hybride (formulaire détaillé + saisie naturelle optionnelle)
- **Ton** : Chaleureux complice (tutoiement, légère personnalité, emojis dosés)

---

## 8. Notes pour Claude Code

### 8.1 Ordre d'implémentation suggéré pour sprint 1

1. **Setup** (bootstrap projet Next.js, Firebase init, Netlify connect)
2. **Auth** module (Firebase Auth + magic link via Resend + Cloud Function `lookupUser`) + écran connexion V2
3. **Household** module + paramètres (au moins la sous-page Cocon, création/invitation)
4. **Tasks** module + écrans liste V1 + création V1 (sans saisie naturelle d'abord)
5. **Dashboard** minimal (greeting + tâches du jour + activité récente)
6. **AI Cloud Function** `parseTask` (Claude API), puis intégration saisie naturelle dans création
7. **États vides** sur tous les écrans déjà construits
8. **Settings** sous-pages complètes (8 cards = 8 pages)
9. **Polish** : toast undo, dark mode toggle, README

### 8.2 Hors scope du sprint 1 (rappel)
- Récurrence (sprint 2)
- Calendrier complet + sync ICS (sprint 2)
- Notifications push + emails (sprint 2)
- Courses + enrichissements (notes contextuelles, pièces jointes photo/url) — sprint 3
- Stocks + couplage automatique avec courses — sprint 3
- Mémoire complète (sprint 3)
- Mode supermarché (sprint 3)
- Sync temps réel (sprint 3)
- **Préparations / checklists** (bibliothèque + lancement manuel) — sprint 3
- IA suggestions + chat (sprint 4)
- **Suggestion intelligente de préparation** (sur dashboard, IA + agenda) — sprint 4
- **Saisie vocale rapide** (Whisper + parsing multi-intentions) — sprint 4
- Journal (sprint 4)
- Score d'équilibre (sprint 4)

⚠️ **Important pour le sprint 1 :** même si les modules suivants sont implémentés plus tard, prévoir dès le sprint 1 dans le schéma Firestore (cf. `architecture-cocon.md` section 2.2) :
- Champ `checklistRunId` (string nullable) sur les documents `tasks`
- Champ `notes` (string nullable) sur les documents `tasks` et `shoppingItems` (pour les notes contextuelles)
- Champ `attachmentIds` (string[] vide par défaut) sur les documents `tasks`, `shoppingItems` et `memoryEntries`
- Champ `stockItemId` (string nullable) sur les documents `shoppingItems`

Firestore étant schemaless, ces champs peuvent en théorie être ajoutés à tout moment. Mais les déclarer dans les types TypeScript et le code de création dès le sprint 1 évite des refactorings pénibles plus tard.

Les mockups validés couvrent les sprints 1 à 4. Conserver ce document tel quel pendant toute la durée du build — il fige la cible, pas l'état actuel.

### 8.3 Fichiers à attacher au prompt Claude Code

Pour le sprint 1, attacher **ensemble** :
1. `architecture-cocon.md` — décisions techniques fondamentales
2. `sprint-1-prompt.md` — prompt d'initialisation
3. `brique-flamme-tokens.md` — tokens visuels (variables CSS, Tailwind config)
4. `screens-spec.md` — ce document (cible UX par écran)

Les 7 fichiers HTML de mockups (dashboard, navigation, etc.) ne sont **pas** nécessaires en attachement — ce document a synthétisé les décisions visuelles. Ils restent disponibles si Claude Code demande à voir un détail précis.

---

*Document figé à l'issue de la phase de design. Toute évolution doit passer par une mise à jour ici en premier, puis être propagée au code.*
