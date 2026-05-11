# Cocon · Prompt sprint 1

> Coller ceci en premier message à Claude Code une fois la session ouverte avec les 4 fichiers attachés.

---

Bonjour Claude. Je démarre un nouveau projet personnel appelé **Cocon**, une PWA de gestion partagée du cocon pour moi (Wesley) et ma compagne (Camille). Le sprint 1 commence maintenant.

Tu as à ta disposition 4 documents de référence en pièces jointes :

1. **`architecture-cocon.md`** — décisions techniques (stack Firebase + Netlify + Next.js, modèle de données Firestore, règles de sécurité, déploiement)
2. **`screens-spec.md`** — spécifications fonctionnelles et UX de chaque écran (validées par mockups)
3. **`brique-flamme-tokens.md`** — identité visuelle (variables CSS, config Tailwind, règles d'usage)
4. **`sprint-1-prompt.md`** — ce document

**Important : lis ces 4 documents en entier avant toute action.** Ils contiennent toutes les décisions déjà prises et le contexte du projet. Ne pas redécider ce qui a déjà été tranché.

---

## Objectif du sprint 1

Avoir une app **déployée sur Netlify**, accessible publiquement avec une URL HTTPS, qui permet :

1. À un utilisateur de **s'inscrire** via email-first (magic link Firebase Auth)
2. De **créer son cocon** (nom, emoji)
3. D'**inviter** un second membre par email
4. Pour le second membre, de **rejoindre** le cocon via le lien d'invitation
5. De **créer, assigner, compléter des tâches** dans le cocon
6. De voir un **dashboard** minimal avec greeting + tâches du jour + activité récente
7. D'utiliser la **saisie naturelle** (« Donner le traitement à Mochi demain matin » → tâche structurée) via Cloud Function appelant Claude API
8. De voir les bons **états vides** sur tous les écrans
9. De naviguer entre Accueil, Tâches, et Paramètres via la bottom nav

**Hors scope sprint 1** (ne pas implémenter, mais préparer le schéma) :
- Module Courses, Mode supermarché → sprint 3
- Module Mémoire → sprint 3
- Module Stocks, Préparations → sprint 3
- Module Agenda complet → sprint 2
- Récurrence des tâches → sprint 2
- Notifications push → sprint 2
- Voice capture → sprint 4

**Tip :** la barre de navigation peut afficher les 5 onglets dès le sprint 1, mais ceux non implémentés (Courses, Agenda, Plus) renvoient sur un écran « Disponible dans une prochaine version » avec le bon état vide.

---

## Méthode de travail attendue

1. **Commence par valider que tu as bien lu et compris les 4 documents.** Pose-moi les questions de clarification éventuelles avant d'écrire la moindre ligne de code.

2. **Découpe le sprint en sous-tâches** dans l'ordre :
   - Setup du projet (Next.js + Firebase + Netlify + GitHub)
   - Setup Firestore (rules, indexes, emulator)
   - Authentification email-first
   - Création/rejoindre cocon
   - Module Tasks
   - Dashboard
   - Cloud Function `parseTask`
   - Settings (sous-pages profil, cocon, apparence)
   - États vides
   - Polish & déploiement

3. **À chaque sous-tâche, propose ton plan d'implémentation** avant de coder. Je valide ou j'ajuste.

4. **Code TypeScript strict, pas de `any`** sauf justification.

5. **Tests minimalistes** : tests unitaires uniquement sur les helpers `lib/firebase/firestore.ts` et `lib/ai/parse-task.ts`. Pas de tests E2E à ce stade.

6. **Commits atomiques** avec messages conventionnels (`feat:`, `fix:`, `chore:`).

7. **Documentation au fil de l'eau** : un `README.md` à jour avec les commandes pour démarrer en local et déployer.

---

## Mon contexte technique

- Je développe sur **Windows + WSL2 + Docker Desktop**
- **Node 22 LTS** installé
- **VS Code** comme éditeur
- J'ai déjà fait du Firebase + Netlify (TRAINOX) donc je connais l'écosystème, pas besoin de tout expliquer
- Je suis **moins à l'aise** avec : Next.js App Router (server components), Drizzle, Firebase Cloud Functions gen 2, passkeys WebAuthn → développe ces sujets quand pertinent

---

## Préparatifs déjà effectués (à confirmer en début de session)

- [ ] Compte GitHub avec repo privé `cocon` créé
- [ ] Compte Firebase avec projet `cocon-app` créé
- [ ] Compte Netlify connecté à GitHub
- [ ] Compte Anthropic Console avec clé API générée
- [ ] Node 22 + Firebase CLI installés en local

Si quelque chose manque, signale-le moi en début de session avant qu'on commence.

---

## Communication

- **Français** par défaut (commits, comments, README peuvent rester en anglais si c'est plus naturel pour le code)
- **Explique ton raisonnement et l'approche avant la solution**
- **Si une meilleure approche existe que ce que j'ai prévu, dis-le**
- **Calibre le nombre d'alternatives à la situation** (pas systématiquement 3, mais 2-3 quand pertinent)
- **Ton direct et efficient, pas d'excuses inutiles**
- **Adapte la longueur de tes réponses à la complexité du sujet**

---

## Prêt ?

Avant de commencer, fais-moi un récap en 5-10 lignes de :
1. Ta compréhension de l'objectif du sprint 1
2. L'ordre dans lequel tu proposes d'attaquer les sous-tâches
3. Les questions éventuelles de clarification

Une fois validé, on démarre par le setup du projet.
