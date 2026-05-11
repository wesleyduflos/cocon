import Anthropic from "@anthropic-ai/sdk";
import { defineSecret } from "firebase-functions/params";
import { HttpsError, onCall } from "firebase-functions/v2/https";

const anthropicKey = defineSecret("ANTHROPIC_API_KEY");

/* =========================================================================
   Schémas de la sortie attendue
   ========================================================================= */

export type AssigneeHint = "me" | "partner" | "unassigned";
export type DueDateHint = "today" | "tomorrow" | "thisWeek" | "none";
export type EffortHint = "quick" | "normal" | "long";

export interface ParseTaskOutput {
  title: string;
  category?: string;
  assigneeHint?: AssigneeHint;
  dueDateHint?: DueDateHint;
  effortHint?: EffortHint;
  confidence: number;
}

/* =========================================================================
   System prompt — parse l'entrée libre en tâche structurée
   Statique (donc cachable côté Anthropic via cache_control: ephemeral)
   ========================================================================= */

const SYSTEM_PROMPT = `Tu transformes une phrase libre en français en tâche structurée pour Cocon, une app de gestion partagée du foyer pour Wesley et Camille.

Règles d'extraction :
- title : verbe d'action + objet, court ("Donner le traitement à Mochi", "Acheter du lait", "Prendre rendez-vous chez le vétérinaire"). Pas de "il faut", pas de "je dois".
- category : "Maison" (ménage, bricolage, plantes), "Animaux" (Mochi, vétérinaire, croquettes), "Voiture" (essence, entretien, contrôle technique), "Cuisine" (repas, vaisselle, courses du frigo). Omettre si non évident.
- assigneeHint :
  - "me" si "je", "moi", "mon", "ma" sont utilisés OU si tu écris à la première personne
  - "partner" si "Camille", "elle", "son" (à elle), "sa" (à elle) sont utilisés
  - "unassigned" sinon (ou si "on", "il faut", impersonnel)
- dueDateHint :
  - "today" : "aujourd'hui", "maintenant", "ce soir", "tout à l'heure"
  - "tomorrow" : "demain", "demain matin/soir"
  - "thisWeek" : "cette semaine", "lundi/mardi/.../dimanche" (jour précis dans les 7 jours)
  - "none" : pas d'indice temporel
- effortHint :
  - "quick" : action < 5 min ("passer un coup de fil", "vider la poubelle")
  - "normal" : 5-30 min (cuisine, ménage léger)
  - "long" : > 30 min (gros ménage, démarches administratives)
  - Omettre si non évident.
- confidence : 0.9+ si tous les indices sont explicites, 0.7-0.8 si tu as inféré raisonnablement, < 0.6 si la phrase est très ambiguë.

Utilise l'outil create_task pour répondre. Ne donne aucun texte en plus.`;

const CREATE_TASK_TOOL: Anthropic.Messages.Tool = {
  name: "create_task",
  description:
    "Crée une tâche structurée à partir d'une phrase libre en français.",
  input_schema: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "Verbe d'action + objet, court (3-8 mots).",
      },
      category: {
        type: "string",
        enum: ["Maison", "Animaux", "Voiture", "Cuisine"],
        description: "Catégorie si évidente, sinon omettre.",
      },
      assigneeHint: {
        type: "string",
        enum: ["me", "partner", "unassigned"],
        description: "Pour qui la tâche d'après les indices.",
      },
      dueDateHint: {
        type: "string",
        enum: ["today", "tomorrow", "thisWeek", "none"],
        description: "Échéance d'après les indices temporels.",
      },
      effortHint: {
        type: "string",
        enum: ["quick", "normal", "long"],
        description: "Effort estimé si évident.",
      },
      confidence: {
        type: "number",
        description: "Niveau de confiance global, 0 à 1.",
      },
    },
    required: ["title", "confidence"],
  },
};

/* =========================================================================
   Cloud Function HTTPS callable
   ========================================================================= */

export const parseTask = onCall(
  {
    secrets: [anthropicKey],
    region: "europe-west1",
    timeoutSeconds: 30,
    memory: "256MiB",
  },
  async (request): Promise<ParseTaskOutput> => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Tu dois être authentifié pour utiliser le parsing IA.",
      );
    }

    const raw = request.data as { text?: unknown } | undefined;
    const text = typeof raw?.text === "string" ? raw.text.trim() : "";

    if (text.length < 3) {
      throw new HttpsError(
        "invalid-argument",
        "Le texte est trop court pour être analysé.",
      );
    }
    if (text.length > 500) {
      throw new HttpsError(
        "invalid-argument",
        "Le texte dépasse 500 caractères.",
      );
    }

    const client = new Anthropic({ apiKey: anthropicKey.value() });

    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 512,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      tools: [CREATE_TASK_TOOL],
      tool_choice: { type: "tool", name: "create_task" },
      messages: [{ role: "user", content: text }],
    });

    const toolUse = response.content.find(
      (block): block is Anthropic.Messages.ToolUseBlock =>
        block.type === "tool_use" && block.name === "create_task",
    );

    if (!toolUse) {
      throw new HttpsError(
        "internal",
        "Réponse inattendue du modèle (pas de tool_use).",
      );
    }

    const parsed = toolUse.input as ParseTaskOutput;

    // Validation défensive : on garantit que `title` et `confidence` sont là.
    if (!parsed.title || typeof parsed.title !== "string") {
      throw new HttpsError(
        "internal",
        "Le modèle n'a pas renvoyé de titre valide.",
      );
    }
    if (typeof parsed.confidence !== "number") {
      parsed.confidence = 0.5;
    }

    return parsed;
  },
);
