import Anthropic from "@anthropic-ai/sdk";
import { defineSecret } from "firebase-functions/params";
import { HttpsError, onCall } from "firebase-functions/v2/https";

const anthropicKey = defineSecret("ANTHROPIC_API_KEY");

export interface ParseShoppingOutput {
  name: string;
  emoji?: string;
  quantity?: number;
  unit?: string;
  rayon?:
    | "Frais"
    | "Épicerie"
    | "Hygiène"
    | "Boulangerie"
    | "Boissons"
    | "Animalerie"
    | "Maison"
    | "Autre";
  confidence: number;
}

const SYSTEM_PROMPT = `Tu transformes une phrase libre en français en article de courses pour Cocon, app de gestion partagée du foyer.

Règles :
- name : nom court de l'article (ex: "Lait demi-écrémé", "Croquettes pour chat", "Pâtes Barilla"). Pas de quantité ni d'unité dans le nom.
- emoji : un emoji approprié si évident (🥛 lait, 🥖 pain, 🥚 œufs, 🥩 viande, 🐟 poisson, 🍎 fruit, 🥗 légume, 🧀 fromage, 🍿 snack, 🍷 boisson, 🧴 cosmétique, 🐾 animaux). Omettre si pas évident.
- quantity : nombre détecté ("2 litres" → 2). Défaut 1.
- unit : "L", "kg", "g", "pcs", "pack". Omettre si pas explicite.
- rayon :
  - "Frais" : produits laitiers, viande, poisson, fromage, charcuterie
  - "Épicerie" : pâtes, riz, conserves, sauces, snacks secs, café, thé
  - "Hygiène" : dentifrice, shampoing, savon, papier toilette
  - "Boulangerie" : pain, viennoiseries
  - "Boissons" : eau, sodas, jus, alcool
  - "Animalerie" : croquettes, litière, jouets animaux
  - "Maison" : produits ménagers, ampoules, piles
  - "Autre" : si pas évident
- confidence : 0.9+ si tout est explicite, < 0.6 si très ambigu

Utilise l'outil create_shopping_item pour répondre. Pas de texte additionnel.`;

const TOOL: Anthropic.Messages.Tool = {
  name: "create_shopping_item",
  description: "Crée un article de courses structuré.",
  input_schema: {
    type: "object",
    properties: {
      name: { type: "string", description: "Nom court de l'article." },
      emoji: { type: "string", description: "Emoji approprié, optionnel." },
      quantity: { type: "number", description: "Quantité, défaut 1." },
      unit: { type: "string", enum: ["L", "kg", "g", "pcs", "pack"] },
      rayon: {
        type: "string",
        enum: [
          "Frais",
          "Épicerie",
          "Hygiène",
          "Boulangerie",
          "Boissons",
          "Animalerie",
          "Maison",
          "Autre",
        ],
      },
      confidence: { type: "number" },
    },
    required: ["name", "confidence"],
  },
};

export const parseShoppingItem = onCall(
  {
    secrets: [anthropicKey],
    region: "europe-west1",
    timeoutSeconds: 30,
    memory: "256MiB",
  },
  async (request): Promise<ParseShoppingOutput> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentification requise.");
    }
    const text = String(
      (request.data as { text?: unknown })?.text ?? "",
    ).trim();
    if (text.length < 2) {
      throw new HttpsError("invalid-argument", "Texte trop court.");
    }
    if (text.length > 200) {
      throw new HttpsError("invalid-argument", "Texte trop long (>200 car).");
    }

    const client = new Anthropic({ apiKey: anthropicKey.value() });
    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 256,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      tools: [TOOL],
      tool_choice: { type: "tool", name: "create_shopping_item" },
      messages: [{ role: "user", content: text }],
    });

    const toolUse = response.content.find(
      (b): b is Anthropic.Messages.ToolUseBlock =>
        b.type === "tool_use" && b.name === "create_shopping_item",
    );
    if (!toolUse) {
      throw new HttpsError("internal", "Format de réponse inattendu.");
    }
    const parsed = toolUse.input as ParseShoppingOutput;
    if (!parsed.name) {
      throw new HttpsError("internal", "Le modèle n'a pas renvoyé de nom.");
    }
    if (typeof parsed.confidence !== "number") parsed.confidence = 0.5;
    return parsed;
  },
);
