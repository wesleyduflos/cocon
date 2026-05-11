# Brique Flamme — Design tokens

> Document à joindre à Claude Code aux côtés de `architecture-cocon.md` et `sprint-1-prompt.md`. Ces tokens sont la source de vérité visuelle de l'application. Aucune valeur ne doit être inventée par le code : tout doit provenir de ce fichier.

---

## 1. Identité

**Brique Flamme** est le thème par défaut de l'application. Mode sombre nativement, chaleureux et énergique : fond brun-noir profond, accents feu (orange vif + safran), grain léger pour la matière. Évite à tout prix l'esthétique « sombre froide » à la Slack/Discord — la base doit toujours tirer vers le brun, jamais vers le bleu.

Le mode clair est une déclinaison cohérente sur fond crème, avec les mêmes accents légèrement désaturés pour rester lisibles.

---

## 2. Couleurs — Mode sombre (par défaut)

### Surfaces

| Token | Valeur | Usage |
|---|---|---|
| `--background` | `#100604` | Fond global de l'app |
| `--surface` | `#2D1813` | Cartes, tâches, items de liste |
| `--surface-elevated` | `#3A2018` | Popovers, dropdowns, modales |
| `--border` | `#432A1F` | Bordures des surfaces |
| `--border-subtle` | `#2D1813` | Séparateurs internes |

### Texte

| Token | Valeur | Usage |
|---|---|---|
| `--foreground` | `#FFF4DC` | Texte principal |
| `--foreground-muted` | `#B08866` | Texte secondaire, méta, dates |
| `--foreground-faint` | `#7A5D45` | Placeholders, désactivé |

### Accents

| Token | Valeur | Usage |
|---|---|---|
| `--primary` | `#FF6B24` | Action principale, focus, points d'attention |
| `--primary-hover` | `#FF7C3D` | Hover de `--primary` |
| `--primary-foreground` | `#100604` | Texte sur fond `--primary` |
| `--secondary` | `#FFC845` | Validations, tâches terminées, succès |
| `--secondary-foreground` | `#100604` | Texte sur fond `--secondary` |
| `--highlight` | `#FFE066` | Éclats, glows, accents lumineux |
| `--destructive` | `#E5374D` | Suppression, alertes urgentes |
| `--destructive-foreground` | `#FFF4DC` | Texte sur fond `--destructive` |

### États

| Token | Valeur | Usage |
|---|---|---|
| `--ring` | `#FF6B24` | Outline de focus clavier |
| `--ring-offset` | `#100604` | Offset du ring (= background) |

### Gradients & atmosphère

Composants visuels distinctifs à reproduire fidèlement :

**Radial background gradient** (à appliquer sur le `<body>` ou le main container en mode sombre)
```css
background-image:
  radial-gradient(ellipse 700px 380px at 10% 0%, rgba(255,107,36,0.28) 0, transparent 55%),
  radial-gradient(ellipse 550px 300px at 100% 100%, rgba(255,200,69,0.18) 0, transparent 55%);
```

**Grain texture** (overlay à superposer sur les surfaces, opacité très basse)
```css
background-image: radial-gradient(circle at 1px 1px, rgba(255,232,200,0.05) 1px, transparent 0);
background-size: 3px 3px;
```

**Greeting gradient** (sur le nom de l'utilisateur dans le greeting)
```css
background: linear-gradient(90deg, #FF6B24 0%, #FFC845 60%, #FFE066 100%);
-webkit-background-clip: text;
background-clip: text;
color: transparent;
filter: drop-shadow(0 0 16px rgba(255,107,36,0.35));
```

**Glow dot** (point lumineux pour les indicateurs)
```css
background: #FF6B24;
box-shadow: 0 0 16px rgba(255,107,36,0.85);
```

**Event card gradient** (carte événement avec halo lumineux)
```css
background: linear-gradient(135deg, rgba(255,107,36,0.36) 0%, rgba(255,200,69,0.18) 100%);
border: 1px solid rgba(255,107,36,0.48);
/* Plus halo radial dans le coin haut-droit via ::before */
```

---

## 3. Couleurs — Mode clair (déclinaison)

### Surfaces

| Token | Valeur | Usage |
|---|---|---|
| `--background` | `#FBF4E5` | Fond global crème chaud |
| `--surface` | `#FFFFFF` | Cartes, tâches |
| `--surface-elevated` | `#FFFFFF` | Popovers, dropdowns |
| `--border` | `#E8D7B8` | Bordures principales |
| `--border-subtle` | `#F2E8D2` | Séparateurs internes |

### Texte

| Token | Valeur | Usage |
|---|---|---|
| `--foreground` | `#1A0D04` | Texte principal |
| `--foreground-muted` | `#8A6A4E` | Texte secondaire |
| `--foreground-faint` | `#B89880` | Placeholders, désactivé |

### Accents (légèrement désaturés pour rester lisibles sur fond clair)

| Token | Valeur | Usage |
|---|---|---|
| `--primary` | `#E5520F` | Action principale |
| `--primary-hover` | `#FF6B24` | Hover |
| `--primary-foreground` | `#FFF4DC` | Texte sur fond `--primary` |
| `--secondary` | `#DB9512` | Validations, succès |
| `--secondary-foreground` | `#1A0D04` | Texte sur fond `--secondary` |
| `--highlight` | `#F5B829` | Éclats |
| `--destructive` | `#C8243E` | Suppression, alertes |
| `--destructive-foreground` | `#FFFFFF` | Texte sur fond `--destructive` |

### Atmosphère mode clair

Le mode clair n'utilise **pas** de radial gradients de fond ni de grain (sinon le résultat devient lourd). En contrepartie, garder les glows sur les boutons primaires et le gradient de greeting.

---

## 4. Typographie

### Polices (Google Fonts)

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Funnel+Display:wght@500;600;700&family=Funnel+Sans:wght@400;500;600&display=swap" rel="stylesheet">
```

| Famille | Usage |
|---|---|
| **Funnel Display** | Greeting, titres de cartes, stat numbers, event titles, headings principaux |
| **Funnel Sans** | Body, task titles, labels, méta, inputs, boutons |

### Échelle typographique

| Token | Taille | Line-height | Usage |
|---|---|---|---|
| `text-eyebrow` | 11px / 0.6875rem | 1.4 | Eyebrows (`SECTION TITLE`), kicker labels |
| `text-meta` | 12px / 0.75rem | 1.4 | Dates, méta info, pills |
| `text-body` | 15px / 0.9375rem | 1.5 | Texte courant, task titles |
| `text-md` | 17px / 1.0625rem | 1.3 | Event titles, sous-titres |
| `text-lg` | 22px / 1.375rem | 1.1 | Stat numbers, titres de section |
| `text-xl` | 28px / 1.75rem | 1.05 | Greeting, page headings |
| `text-2xl` | 40px / 2.5rem | 1.0 | Display large (réservé) |

### Conventions

- Display : `font-weight: 600` par défaut, `700` pour stat numbers
- Sans : `font-weight: 500` pour task titles, `400` pour body, `600` pour labels/pills
- Letter-spacing : `-0.025em` sur display sizes ≥ 22px, `+0.08em` à `+0.14em` sur eyebrows en uppercase

---

## 5. Espacement, radius, élévation

### Radius

| Token | Valeur | Usage |
|---|---|---|
| `radius-sm` | 6px | Checks, petits pills |
| `radius-md` | 12px | Tasks, list items |
| `radius-lg` | 14px | Cards, event cards, stat chips |
| `radius-xl` | 20px | Containers principaux, modales |
| `radius-full` | 9999px | Dots, badges circulaires, avatars |

### Spacing scale (Tailwind par défaut, à respecter)

Padding intérieur des cards : `padding: 14px 16px` (tasks) ou `padding: 18px 20px` (events).
Gap entre éléments de liste : `8px`.
Gap entre sections : `20-22px`.

### Élévation

En mode sombre, **préférer la bordure à l'ombre** (les ombres ne se voient pas sur fond noir). En mode clair, ombres autorisées :

```css
/* Card subtle (clair uniquement) */
box-shadow: 0 4px 24px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04);

/* Card elevated (popover) */
box-shadow: 0 12px 40px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06);
```

---

## 6. Composants — spécifications visuelles

### Greeting block
- Display, 28px, font-weight 600
- Prénom de l'utilisateur entouré d'un `<span class="accent">` avec gradient + drop-shadow
- Date en-dessous, eyebrow style (uppercase, 12px, letter-spacing 0.08em, `--foreground-muted`)

### Stat chips (dashboard)
- Background `--surface`, border `--border`
- Padding 12px 14px
- Stat number en Display 22px / 700
- Label en text-eyebrow uppercase, `--foreground-muted`
- Variant `highlight` : background en gradient `--primary`/26% → `--primary`/7%, border `--primary`/48%, stat number coloré en `#FF7C3D` (mode sombre) ou `--primary` (mode clair)

### Task item
- Background `--surface`, border `--border`, radius `radius-md`
- Padding 14px 16px
- Gap interne 14px
- Check à gauche (20×20, radius `radius-sm`, border 1.5px `#5C3D2C` en sombre / `--border` en clair)
- Body central : title 15px / 500 + meta 12px / muted
- Dot facultatif à droite (7px, `--primary` avec glow box-shadow)
- État `done` : check rempli `--secondary`, title `line-through` + `--foreground-muted`

### Event card
- Gradient distinct (cf. §2)
- Padding 18px 20px
- Halo radial dans le coin haut-droit via `::before` (200×200, radial-gradient yellow soft 32% → transparent 70%)
- Label uppercase eyebrow en `--secondary`
- Title en Display 17px / 600
- Meta en flex space-between (lieu / heure)

### Buttons
- **Primary** : background `--primary`, text `--primary-foreground`, font-weight 600, radius `radius-md`, hover `--primary-hover`, padding 10px 18px, focus ring 2px `--ring` offset 2px
- **Secondary** : background `transparent`, border 1px `--border`, text `--foreground`, hover background `--surface-elevated`
- **Ghost** : background `transparent`, text `--foreground-muted`, hover background `--surface`
- **Destructive** : background `--destructive`, text `--destructive-foreground`

### Inputs
- Background `--surface` (sombre) ou `--background` (clair)
- Border `--border`, radius `radius-md`, padding 10px 14px
- Focus : border `--primary`, ring 2px `--primary`/24%
- Placeholder `--foreground-faint`

---

## 7. Mapping shadcn/ui — variables CSS

À coller dans `src/app/globals.css`. Utilise la convention shadcn classique mais avec les couleurs de Brique Flamme.

```css
@layer base {
  :root {
    /* Mode clair par défaut */
    --background: 39 67% 94%;            /* #FBF4E5 */
    --foreground: 24 78% 6%;             /* #1A0D04 */

    --card: 0 0% 100%;                   /* #FFFFFF */
    --card-foreground: 24 78% 6%;

    --popover: 0 0% 100%;
    --popover-foreground: 24 78% 6%;

    --primary: 19 88% 48%;               /* #E5520F */
    --primary-foreground: 42 100% 93%;   /* #FFF4DC */

    --secondary: 39 84% 47%;             /* #DB9512 */
    --secondary-foreground: 24 78% 6%;

    --muted: 39 56% 89%;                 /* #F2E8D2 */
    --muted-foreground: 30 30% 42%;      /* #8A6A4E */

    --accent: 39 56% 89%;
    --accent-foreground: 24 78% 6%;

    --destructive: 350 70% 46%;          /* #C8243E */
    --destructive-foreground: 0 0% 100%;

    --border: 37 49% 81%;                /* #E8D7B8 */
    --input: 39 56% 89%;
    --ring: 19 88% 48%;

    --radius: 0.75rem;
  }

  .dark {
    /* Mode sombre — Brique Flamme par défaut */
    --background: 13 60% 4%;             /* #100604 */
    --foreground: 39 100% 93%;           /* #FFF4DC */

    --card: 17 38% 13%;                  /* #2D1813 */
    --card-foreground: 39 100% 93%;

    --popover: 18 42% 8%;                /* #1F0E08 */
    --popover-foreground: 39 100% 93%;

    --primary: 19 100% 57%;              /* #FF6B24 */
    --primary-foreground: 13 60% 4%;

    --secondary: 45 100% 64%;            /* #FFC845 */
    --secondary-foreground: 13 60% 4%;

    --muted: 17 38% 13%;
    --muted-foreground: 31 32% 55%;      /* #B08866 */

    --accent: 22 36% 19%;                /* #432A1F */
    --accent-foreground: 39 100% 93%;

    --destructive: 351 75% 56%;          /* #E5374D */
    --destructive-foreground: 39 100% 93%;

    --border: 22 36% 19%;                /* #432A1F */
    --input: 17 38% 13%;
    --ring: 19 100% 57%;
  }
}

@layer base {
  * { @apply border-border; }
  body {
    @apply bg-background text-foreground antialiased;
    font-family: "Funnel Sans", system-ui, sans-serif;
  }
  body.dark {
    background-image:
      radial-gradient(ellipse 700px 380px at 10% 0%, rgba(255,107,36,0.18) 0, transparent 55%),
      radial-gradient(ellipse 550px 300px at 100% 100%, rgba(255,200,69,0.12) 0, transparent 55%);
    background-attachment: fixed;
  }
  body.dark::after {
    content: "";
    position: fixed;
    inset: 0;
    background-image: radial-gradient(circle at 1px 1px, rgba(255,232,200,0.04) 1px, transparent 0);
    background-size: 3px 3px;
    pointer-events: none;
    z-index: 0;
  }
  h1, h2, h3, .font-display {
    font-family: "Funnel Display", system-ui, sans-serif;
    letter-spacing: -0.025em;
  }
}
```

---

## 8. Tailwind config — extensions

Dans `tailwind.config.ts`, étendre le thème comme suit :

```typescript
export default {
  darkMode: ["class"],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Funnel Display"', "system-ui", "sans-serif"],
        sans: ['"Funnel Sans"', "system-ui", "sans-serif"],
      },
      colors: {
        // mapping shadcn standard (border, background, etc.)
        // + ajouts spécifiques à Brique Flamme :
        highlight: {
          DEFAULT: "hsl(var(--highlight, 50 100% 70%))",
        },
      },
      fontSize: {
        eyebrow: ["0.6875rem", { lineHeight: "1.4", letterSpacing: "0.12em" }],
        meta: ["0.75rem", { lineHeight: "1.4" }],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        "glow-primary": "0 0 16px rgba(255,107,36,0.85)",
        "glow-secondary": "0 0 14px rgba(255,200,69,0.65)",
        "card-light": "0 4px 24px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)",
      },
      backgroundImage: {
        "greeting-gradient":
          "linear-gradient(90deg, #FF6B24 0%, #FFC845 60%, #FFE066 100%)",
        "event-gradient":
          "linear-gradient(135deg, rgba(255,107,36,0.36) 0%, rgba(255,200,69,0.18) 100%)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
```

---

## 9. Règles d'usage pour les composants

1. **Toujours utiliser les tokens, jamais les hex en dur** dans le code des composants. Si une couleur manque, l'ajouter au fichier de tokens en premier.
2. **Le mode sombre est le défaut** : si le navigateur préfère le sombre OU si l'utilisateur n'a pas choisi, afficher Brique Flamme sombre. Le toggle dans les paramètres bascule entre `dark` (par défaut) et `light` (alternative).
3. **Le grain et le radial gradient sont des marqueurs identitaires** : ils doivent toujours être présents en mode sombre. Si une page les masque (ex. impression), l'identité disparaît.
4. **Les glows et drop-shadows colorés** sont réservés aux 3 éléments suivants : prénom dans le greeting, dot indicateur des tâches actives, halo coin haut-droit des cartes événement. Ne pas les multiplier ailleurs sous peine de surcharge.
5. **Le secondary (jaune safran)** sert principalement aux états positifs (tâche faite, validation). Ne pas l'utiliser pour des actions destructives ou neutres.
6. **Aucun bleu**, aucun violet, aucun vert vif dans la palette de l'app. Seules les couleurs de ce document sont autorisées. Si un cas d'usage l'exige (ex. une intégration tierce), le justifier et l'ajouter ici.

---

## 10. Checklist d'implémentation Sprint 1

- [ ] Fonts Funnel Display + Funnel Sans chargées via Google Fonts dans `<head>` du root layout
- [ ] `globals.css` avec les variables CSS HSL des deux modes (cf. §7)
- [ ] `tailwind.config.ts` étendu (cf. §8)
- [ ] Mode sombre par défaut, toggle dans les paramètres
- [ ] Radial gradient + grain appliqués sur `body.dark`
- [ ] Composants shadcn installés utilisant les tokens (Button, Card, Input, Checkbox, etc.)
- [ ] Greeting du dashboard utilise `bg-greeting-gradient` + `bg-clip-text` sur le prénom
- [ ] Event card utilise `bg-event-gradient` + halo `::before`
- [ ] Dots actifs utilisent `shadow-glow-primary`

---

*Source de vérité — toute évolution visuelle doit passer par une mise à jour de ce document.*
