import Anthropic from "@anthropic-ai/sdk";
import {
  FieldValue,
  Timestamp,
  getFirestore,
} from "firebase-admin/firestore";
import { defineSecret } from "firebase-functions/params";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import OpenAI from "openai";

const anthropicKey = defineSecret("ANTHROPIC_API_KEY");
const openaiKey = defineSecret("OPENAI_API_KEY");

/* =========================================================================
   Types de sortie
   ========================================================================= */

export type VoiceIntentType =
  | "task"
  | "shopping_item"
  | "memory_entry"
  | "unrecognized";

export interface VoiceIntent {
  type: VoiceIntentType;
  /** Champ libre dépendant du type. Le client mappe vers les champs concrets
   *  des entités Cocon (task, shopping-item, memory-entry). */
  data: Record<string, unknown>;
  confidence: number;
}

export interface VoiceParseOutput {
  transcription: string;
  intents: VoiceIntent[];
}

/* =========================================================================
   System prompt + tool
   ========================================================================= */

const SYSTEM_PROMPT = `Tu es l'assistant IA de Cocon, app de gestion partagée du foyer pour Wesley et Camille.

L'utilisateur vient de parler. Voici la transcription brute (en français). Tu dois :

1. Identifier toutes les intentions distinctes (un message = plusieurs actions possibles)
2. Pour chaque intention, déterminer son TYPE :
   - "task" : une tâche à faire ("acheter du lait" si c'est une course → shopping_item, mais "appeler le médecin" = task)
   - "shopping_item" : un article à mettre dans la liste de courses
   - "memory_entry" : une info à mémoriser (code, contact, mot de passe, emplacement d'objet)
   - "unrecognized" : si vraiment ambigu

3. Pour chaque intention, remplir les bons champs dans \`data\`:
   - task : { title, category?, assigneeHint? ("me"/"partner"/"unassigned"), dueDateHint? ("today"/"tomorrow"/"thisWeek"/"none"), effortHint? }
   - shopping_item : { name, quantity?, unit?, rayon? ("Frais","Épicerie","Hygiène","Boulangerie","Boissons","Animalerie","Maison","Autre"), emoji? }
   - memory_entry : { type (code/object/contact/manual/warranty/note), title, fields: { ... } }

Exemple :
Input : "Faut acheter du dentifrice, prendre rendez-vous chez le véto vendredi, et noter le code du portail c'est 1492"

Output (via tool extract_intents) :
[
  { type: "shopping_item", data: { name: "Dentifrice", rayon: "Hygiène", emoji: "🧴" }, confidence: 0.95 },
  { type: "task", data: { title: "Prendre rendez-vous chez le vétérinaire", category: "Animaux", dueDateHint: "thisWeek" }, confidence: 0.9 },
  { type: "memory_entry", data: { type: "code", title: "Code du portail", fields: { value: "1492", location: "portail" } }, confidence: 0.95 }
]

Utilise UNIQUEMENT l'outil extract_intents. Pas de texte additionnel.`;

const TOOL: Anthropic.Messages.Tool = {
  name: "extract_intents",
  description: "Extrait une liste d'intentions structurées d'une transcription.",
  input_schema: {
    type: "object",
    properties: {
      intents: {
        type: "array",
        items: {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: ["task", "shopping_item", "memory_entry", "unrecognized"],
            },
            data: {
              type: "object",
              description:
                "Champs dépendant du type — cf prompt. Schéma libre pour rester flexible.",
            },
            confidence: { type: "number" },
          },
          required: ["type", "data", "confidence"],
        },
      },
    },
    required: ["intents"],
  },
};

/* =========================================================================
   Quotas — 50 voice-notes / user / mois civil
   ========================================================================= */

const MONTHLY_QUOTA_PER_USER = 50;

async function checkMonthlyQuota(uid: string): Promise<{
  used: number;
  remaining: number;
}> {
  const db = getFirestore();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const snap = await db
    .collectionGroup("ai-logs")
    .where("type", "==", "voice-parse")
    .where("createdBy", "==", uid)
    .where("createdAt", ">=", Timestamp.fromDate(monthStart))
    .count()
    .get();

  const used = snap.data().count;
  return { used, remaining: Math.max(0, MONTHLY_QUOTA_PER_USER - used) };
}

/* =========================================================================
   Cloud Function
   ========================================================================= */

interface Input {
  /** Audio encodé en base64 (WebM/Opus ou MP4). Max ~1 MB. */
  audioBase64?: string;
  mimeType?: string;
  householdId?: string;
}

function wrapError(stage: string, err: unknown): HttpsError {
  const message = err instanceof Error ? err.message : String(err);
  const code =
    err && typeof err === "object" && "code" in err
      ? (err as { code: unknown }).code
      : undefined;
  const status =
    err && typeof err === "object" && "status" in err
      ? (err as { status: unknown }).status
      : undefined;
  console.error(`[voiceParse] failed at stage=${stage}`, {
    message,
    code,
    status,
  });
  // Map vers HttpsError pour que le client reçoive un message utile.
  if (status === 401 || code === "invalid_api_key") {
    return new HttpsError(
      "failed-precondition",
      "Clé OpenAI invalide côté serveur. Re-set le secret OPENAI_API_KEY.",
    );
  }
  if (status === 429 || code === "insufficient_quota") {
    return new HttpsError(
      "resource-exhausted",
      "Crédit OpenAI épuisé. Recharge le compte OpenAI.",
    );
  }
  if (code === 9 || message.includes("FAILED_PRECONDITION")) {
    return new HttpsError(
      "failed-precondition",
      "Index Firestore manquant ou en cours de construction. Réessaie dans 1 min.",
    );
  }
  return new HttpsError(
    "internal",
    `Erreur au stage ${stage}: ${message.slice(0, 200)}`,
  );
}

export const voiceParse = onCall(
  {
    secrets: [anthropicKey, openaiKey],
    region: "europe-west1",
    timeoutSeconds: 120,
    memory: "512MiB",
  },
  async (request): Promise<VoiceParseOutput> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentification requise.");
    }
    const { audioBase64, mimeType, householdId } = (request.data ??
      {}) as Input;
    if (!audioBase64 || !householdId) {
      throw new HttpsError(
        "invalid-argument",
        "audioBase64 + householdId requis.",
      );
    }

    const db = getFirestore();

    // Vérifier appartenance au cocon
    try {
      const householdSnap = await db.doc(`households/${householdId}`).get();
      const memberIds = householdSnap.get("memberIds") as string[] | undefined;
      if (!memberIds?.includes(request.auth.uid)) {
        throw new HttpsError(
          "permission-denied",
          "Tu n'es pas membre de ce cocon.",
        );
      }
    } catch (err) {
      if (err instanceof HttpsError) throw err;
      throw wrapError("household-check", err);
    }

    // Vérifier quota
    try {
      const quota = await checkMonthlyQuota(request.auth.uid);
      if (quota.remaining === 0) {
        throw new HttpsError(
          "resource-exhausted",
          `Quota mensuel atteint (${MONTHLY_QUOTA_PER_USER}/mois). Reset au 1er du mois.`,
        );
      }
    } catch (err) {
      if (err instanceof HttpsError) throw err;
      throw wrapError("quota-check", err);
    }

    const startMs = Date.now();

    // Décoder le base64
    const audioBuffer = Buffer.from(audioBase64, "base64");
    if (audioBuffer.length > 1_500_000) {
      throw new HttpsError(
        "invalid-argument",
        "Audio trop volumineux (> 1.5 MB). Limite la note à ~60 secondes.",
      );
    }
    const extension = mimeType?.includes("mp4") ? "m4a" : "webm";
    console.log(
      `[voiceParse] audio decoded: ${audioBuffer.length} bytes, mimeType=${mimeType}, ext=${extension}`,
    );

    // 1) Whisper transcription
    let transcription: string;
    try {
      const openai = new OpenAI({ apiKey: openaiKey.value() });
      const audioFile = new File(
        [new Uint8Array(audioBuffer)],
        `voice.${extension}`,
        { type: mimeType ?? "audio/webm" },
      );
      const transcriptionResp = await openai.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-1",
        language: "fr",
      });
      transcription = transcriptionResp.text.trim();
      console.log(
        `[voiceParse] whisper OK: ${transcription.length} chars transcribed`,
      );
    } catch (err) {
      throw wrapError("whisper", err);
    }

    if (transcription.length === 0) {
      // Audio inaudible / silence
      return { transcription: "", intents: [] };
    }

    // 2) Claude multi-intentions
    let intents: VoiceIntent[];
    try {
      const anthropic = new Anthropic({ apiKey: anthropicKey.value() });
      const claudeResp = await anthropic.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 1024,
        system: [
          {
            type: "text",
            text: SYSTEM_PROMPT,
            cache_control: { type: "ephemeral" },
          },
        ],
        tools: [TOOL],
        tool_choice: { type: "tool", name: "extract_intents" },
        messages: [{ role: "user", content: transcription }],
      });

      const toolUse = claudeResp.content.find(
        (b): b is Anthropic.Messages.ToolUseBlock =>
          b.type === "tool_use" && b.name === "extract_intents",
      );
      intents = toolUse
        ? ((toolUse.input as { intents: VoiceIntent[] }).intents ?? [])
        : [];
      console.log(`[voiceParse] claude OK: ${intents.length} intents detected`);
    } catch (err) {
      throw wrapError("claude", err);
    }

    const durationMs = Date.now() - startMs;

    // Log dans ai-logs — JAMAIS l'audio brut (privacy)
    try {
      await db.collection(`households/${householdId}/ai-logs`).add({
        type: "voice-parse",
        input: transcription, // text only
        output: { intents },
        durationMs,
        cost: 0, // approximation : ~0,008 €/note, on track plus précisément si besoin
        createdAt: FieldValue.serverTimestamp(),
        createdBy: request.auth.uid,
      });
    } catch (err) {
      // Log silencieux : on a déjà la réponse, ne pas faire échouer le call.
      console.error("[voiceParse] ai-logs write failed (non-fatal)", err);
    }

    return { transcription, intents };
  },
);
