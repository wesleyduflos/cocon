import { httpsCallable } from "firebase/functions";

import { functions } from "@/lib/firebase/client";

export type VoiceIntentType =
  | "task"
  | "shopping_item"
  | "memory_entry"
  | "unrecognized";

export interface VoiceIntent {
  type: VoiceIntentType;
  data: Record<string, unknown>;
  confidence: number;
}

export interface VoiceParseOutput {
  transcription: string;
  intents: VoiceIntent[];
}

const callable = httpsCallable<
  { audioBase64: string; mimeType: string; householdId: string },
  VoiceParseOutput
>(functions, "voiceParse");

export async function parseVoiceNote(
  blob: Blob,
  householdId: string,
): Promise<VoiceParseOutput> {
  const buffer = await blob.arrayBuffer();
  // Convert ArrayBuffer to base64 (chunked pour éviter le stack overflow)
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  const audioBase64 = btoa(binary);

  const result = await callable({
    audioBase64,
    mimeType: blob.type || "audio/webm",
    householdId,
  });
  return result.data;
}

/* =========================================================================
   MediaRecorder helpers
   ========================================================================= */

export function pickSupportedMimeType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c)) return c;
  }
  return null;
}

export function isVoiceCaptureSupported(): boolean {
  if (typeof window === "undefined") return false;
  return (
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    pickSupportedMimeType() !== null
  );
}

/**
 * Démarre une capture micro et retourne :
 * - une promise qui résout avec le blob une fois `stop()` appelé
 * - une fonction stop pour arrêter la capture
 */
export async function startRecording(): Promise<{
  stop: () => Promise<Blob>;
  stream: MediaStream;
  mimeType: string;
}> {
  const mimeType = pickSupportedMimeType();
  if (!mimeType) {
    throw new Error("Ce navigateur ne supporte pas l'enregistrement audio.");
  }
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { noiseSuppression: true, echoCancellation: true },
  });
  const recorder = new MediaRecorder(stream, { mimeType });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  recorder.start();

  const stop = () =>
    new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        resolve(new Blob(chunks, { type: mimeType }));
      };
      recorder.stop();
    });

  return { stop, stream, mimeType };
}

/* =========================================================================
   Helpers de groupage par type (purs, testables)
   ========================================================================= */

export function groupIntentsByType(
  intents: VoiceIntent[],
): Record<VoiceIntentType, VoiceIntent[]> {
  const groups: Record<VoiceIntentType, VoiceIntent[]> = {
    task: [],
    shopping_item: [],
    memory_entry: [],
    unrecognized: [],
  };
  for (const i of intents) groups[i.type].push(i);
  return groups;
}

export function intentLabel(intent: VoiceIntent): string {
  if (intent.type === "task")
    return (intent.data.title as string) ?? "(tâche sans titre)";
  if (intent.type === "shopping_item")
    return (intent.data.name as string) ?? "(article sans nom)";
  if (intent.type === "memory_entry")
    return (intent.data.title as string) ?? "(entrée mémoire)";
  return "Non reconnu";
}
