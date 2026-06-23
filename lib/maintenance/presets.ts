/**
 * Sprint 7 — Bibliothèque d'entretien maison.
 *
 * Chaque preset décrit un entretien récurrent typique (sortir poubelles,
 * nettoyer filtre lave-vaisselle, ramonage...). Au tap « Activer », le
 * preset est instancié en `Task` avec catégorie « Entretien » + sa
 * `recurrenceRule` + l'emoji.
 *
 * Les presets sont hardcodés (pas en Firestore) — c'est une bibliothèque
 * partagée par tous les cocons. L'utilisateur peut customiser ensuite
 * la tâche créée comme n'importe quelle autre tâche.
 */

export type MaintenanceCategory =
  | "trash"
  | "appliance"
  | "filter"
  | "seasonal"
  | "safety"
  | "exterior";

export interface MaintenancePreset {
  /** Identifiant stable utilisé pour lier une Task au preset. */
  id: string;
  category: MaintenanceCategory;
  title: string;
  emoji: string;
  /** Phrase d'aide affichée sous le titre. */
  hint: string;
  /** RRULE iCal — voir lib/recurrence.ts pour les exemples valides. */
  recurrenceRule: string;
  /** Étiquette humaine de la fréquence (« Tous les mardis », « 1x / mois »). */
  frequencyLabel: string;
  /** Si true, la tâche créée est marquée prioritaire (sécurité, légal). */
  priority?: boolean;
}

export const MAINTENANCE_CATEGORY_LABELS: Record<
  MaintenanceCategory,
  { label: string; icon: string }
> = {
  trash: { label: "Poubelles & tri", icon: "trash" },
  appliance: { label: "Électroménager", icon: "tools-kitchen-2" },
  filter: { label: "Filtration & air", icon: "wind" },
  seasonal: { label: "Saisonnier", icon: "leaf" },
  safety: { label: "Sécurité & légal", icon: "shield-check" },
  exterior: { label: "Extérieur & jardin", icon: "plant" },
};

export const MAINTENANCE_CATEGORY_ORDER: MaintenanceCategory[] = [
  "trash",
  "appliance",
  "filter",
  "safety",
  "seasonal",
  "exterior",
];

export const MAINTENANCE_PRESETS: MaintenancePreset[] = [
  // ---------- Poubelles & tri ----------
  {
    id: "trash-grey",
    category: "trash",
    title: "Sortir poubelle grise",
    emoji: "🗑️",
    hint: "Ordures ménagères",
    recurrenceRule: "FREQ=WEEKLY;BYDAY=TU",
    frequencyLabel: "Tous les mardis",
  },
  {
    id: "trash-yellow",
    category: "trash",
    title: "Sortir poubelle jaune",
    emoji: "♻️",
    hint: "Emballages, papier, carton",
    recurrenceRule: "FREQ=WEEKLY;INTERVAL=2;BYDAY=MO",
    frequencyLabel: "Lundi · 1 sem / 2",
  },
  {
    id: "trash-glass",
    category: "trash",
    title: "Sortir verre",
    emoji: "🍾",
    hint: "Bouteilles et bocaux",
    recurrenceRule: "FREQ=MONTHLY",
    frequencyLabel: "Une fois par mois",
  },
  {
    id: "trash-bulky",
    category: "trash",
    title: "Encombrants",
    emoji: "📦",
    hint: "Meubles, gros électroménager",
    recurrenceRule: "FREQ=MONTHLY;BYDAY=2SA",
    frequencyLabel: "2ᵉ samedi du mois",
  },
  {
    id: "trash-compost",
    category: "trash",
    title: "Vider composteur",
    emoji: "🌱",
    hint: "Brassage et collecte",
    recurrenceRule: "FREQ=WEEKLY;BYDAY=SA",
    frequencyLabel: "Tous les samedis",
  },

  // ---------- Électroménager ----------
  {
    id: "dishwasher-filter",
    category: "appliance",
    title: "Nettoyer filtre lave-vaisselle",
    emoji: "🍽️",
    hint: "Filtre du fond + bras d'aspersion",
    recurrenceRule: "FREQ=MONTHLY",
    frequencyLabel: "Tous les mois",
  },
  {
    id: "dishwasher-deep-clean",
    category: "appliance",
    title: "Cycle vide lave-vaisselle (vinaigre)",
    emoji: "🧪",
    hint: "Détartrage et désodorisation",
    recurrenceRule: "FREQ=MONTHLY;INTERVAL=3",
    frequencyLabel: "Tous les 3 mois",
  },
  {
    id: "coffee-descale",
    category: "appliance",
    title: "Détartrer cafetière / machine à café",
    emoji: "☕",
    hint: "Cycle détartrant complet",
    recurrenceRule: "FREQ=MONTHLY;INTERVAL=2",
    frequencyLabel: "Tous les 2 mois",
  },
  {
    id: "kettle-descale",
    category: "appliance",
    title: "Détartrer bouilloire",
    emoji: "🫖",
    hint: "Vinaigre blanc + rinçage",
    recurrenceRule: "FREQ=MONTHLY",
    frequencyLabel: "Tous les mois",
  },
  {
    id: "fridge-clean",
    category: "appliance",
    title: "Nettoyer le frigo",
    emoji: "🧊",
    hint: "Joints, étagères, bac à légumes",
    recurrenceRule: "FREQ=MONTHLY",
    frequencyLabel: "Tous les mois",
  },
  {
    id: "freezer-defrost",
    category: "appliance",
    title: "Dégivrer congélateur",
    emoji: "❄️",
    hint: "Si pas de no-frost",
    recurrenceRule: "FREQ=YEARLY;INTERVAL=1;BYMONTH=9",
    frequencyLabel: "1 fois / an (septembre)",
  },
  {
    id: "oven-clean",
    category: "appliance",
    title: "Nettoyer le four",
    emoji: "🔥",
    hint: "Auto-nettoyage ou bicarbonate",
    recurrenceRule: "FREQ=MONTHLY;INTERVAL=2",
    frequencyLabel: "Tous les 2 mois",
  },
  {
    id: "washing-machine-clean",
    category: "appliance",
    title: "Nettoyer machine à laver",
    emoji: "🧺",
    hint: "Joint hublot + cycle vide chaud",
    recurrenceRule: "FREQ=MONTHLY",
    frequencyLabel: "Tous les mois",
  },
  {
    id: "dryer-filter",
    category: "appliance",
    title: "Vider filtre sèche-linge",
    emoji: "🌀",
    hint: "Filtre à peluches",
    recurrenceRule: "FREQ=WEEKLY",
    frequencyLabel: "Toutes les semaines",
  },

  // ---------- Filtration & air ----------
  {
    id: "hood-filter",
    category: "filter",
    title: "Nettoyer filtre hotte",
    emoji: "🌬️",
    hint: "Dégraissage filtre métallique",
    recurrenceRule: "FREQ=MONTHLY;INTERVAL=2",
    frequencyLabel: "Tous les 2 mois",
  },
  {
    id: "vmc-clean",
    category: "filter",
    title: "Nettoyer bouches VMC",
    emoji: "🌪️",
    hint: "Salle de bain + cuisine + WC",
    recurrenceRule: "FREQ=MONTHLY;INTERVAL=3",
    frequencyLabel: "Tous les 3 mois",
  },
  {
    id: "air-purifier-filter",
    category: "filter",
    title: "Changer filtre purificateur d'air",
    emoji: "🍃",
    hint: "Filtre HEPA",
    recurrenceRule: "FREQ=MONTHLY;INTERVAL=6",
    frequencyLabel: "Tous les 6 mois",
  },

  // ---------- Sécurité & légal ----------
  {
    id: "smoke-detector-test",
    category: "safety",
    title: "Tester détecteur de fumée",
    emoji: "🚨",
    hint: "Bouton test mensuel",
    recurrenceRule: "FREQ=MONTHLY",
    frequencyLabel: "Tous les mois",
    priority: true,
  },
  {
    id: "smoke-detector-batteries",
    category: "safety",
    title: "Remplacer piles détecteur de fumée",
    emoji: "🔋",
    hint: "Selon modèle, 1 à 10 ans",
    recurrenceRule: "FREQ=YEARLY",
    frequencyLabel: "1 fois / an",
    priority: true,
  },
  {
    id: "chimney-sweep",
    category: "safety",
    title: "Ramonage cheminée",
    emoji: "🔥",
    hint: "Obligatoire si combustion",
    recurrenceRule: "FREQ=YEARLY;BYMONTH=10",
    frequencyLabel: "1 fois / an (oct.)",
    priority: true,
  },
  {
    id: "boiler-maintenance",
    category: "safety",
    title: "Entretien chaudière",
    emoji: "🛠️",
    hint: "Obligatoire si gaz/fioul",
    recurrenceRule: "FREQ=YEARLY",
    frequencyLabel: "1 fois / an",
    priority: true,
  },
  {
    id: "co-detector",
    category: "safety",
    title: "Tester détecteur monoxyde",
    emoji: "⚠️",
    hint: "Test mensuel obligatoire",
    recurrenceRule: "FREQ=MONTHLY",
    frequencyLabel: "Tous les mois",
    priority: true,
  },

  // ---------- Saisonnier ----------
  {
    id: "gutters-autumn",
    category: "seasonal",
    title: "Vidanger gouttières",
    emoji: "🍂",
    hint: "Évite débordements hivers",
    recurrenceRule: "FREQ=YEARLY;BYMONTH=11",
    frequencyLabel: "1 fois / an (novembre)",
  },
  {
    id: "antifreeze-car",
    category: "seasonal",
    title: "Vérifier antigel voiture",
    emoji: "🚗",
    hint: "Lave-glace + liquide refroidissement",
    recurrenceRule: "FREQ=YEARLY;BYMONTH=11",
    frequencyLabel: "1 fois / an (novembre)",
  },
  {
    id: "windows-bi-annual",
    category: "seasonal",
    title: "Grand nettoyage vitres",
    emoji: "🪟",
    hint: "Intérieur + extérieur",
    recurrenceRule: "FREQ=MONTHLY;INTERVAL=6;BYMONTH=4,10",
    frequencyLabel: "Avril et octobre",
  },
  {
    id: "mattress-flip",
    category: "seasonal",
    title: "Retourner matelas",
    emoji: "🛏️",
    hint: "Évite l'affaissement",
    recurrenceRule: "FREQ=MONTHLY;INTERVAL=6",
    frequencyLabel: "Tous les 6 mois",
  },
  {
    id: "wardrobe-rotation",
    category: "seasonal",
    title: "Rotation garde-robe saisons",
    emoji: "🧣",
    hint: "Été ↔ hiver",
    recurrenceRule: "FREQ=MONTHLY;INTERVAL=6;BYMONTH=5,10",
    frequencyLabel: "Mai et octobre",
  },

  // ---------- Extérieur & jardin ----------
  {
    id: "lawn-mow",
    category: "exterior",
    title: "Tondre la pelouse",
    emoji: "🌾",
    hint: "Période avril → octobre",
    recurrenceRule: "FREQ=WEEKLY",
    frequencyLabel: "Une fois par semaine",
  },
  {
    id: "hedge-trim",
    category: "exterior",
    title: "Tailler la haie",
    emoji: "🌳",
    hint: "Hors période nidification",
    recurrenceRule: "FREQ=MONTHLY;INTERVAL=4",
    frequencyLabel: "Tous les 4 mois",
  },
  {
    id: "plants-water",
    category: "exterior",
    title: "Arroser plantes d'intérieur",
    emoji: "🪴",
    hint: "À adapter par saison",
    recurrenceRule: "FREQ=WEEKLY;BYDAY=SU",
    frequencyLabel: "Tous les dimanches",
  },
  {
    id: "facade-check",
    category: "exterior",
    title: "Inspection façade et toiture",
    emoji: "🏠",
    hint: "Tuiles, joints, fissures",
    recurrenceRule: "FREQ=YEARLY",
    frequencyLabel: "1 fois / an",
  },
];

/**
 * Retrouve un preset par son id, ou null si introuvable (preset
 * supprimé d'une ancienne version par exemple).
 */
export function findPresetById(
  id: string | undefined,
): MaintenancePreset | null {
  if (!id) return null;
  return MAINTENANCE_PRESETS.find((p) => p.id === id) ?? null;
}

export function presetsByCategory(
  cat: MaintenanceCategory,
): MaintenancePreset[] {
  return MAINTENANCE_PRESETS.filter((p) => p.category === cat);
}
