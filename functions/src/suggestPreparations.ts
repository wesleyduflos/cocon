import {
  FieldValue,
  Timestamp,
  getFirestore,
} from "firebase-admin/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";

/* =========================================================================
   suggestPreparations — cron quotidien 7h Europe/Paris.

   Pour chaque cocon : scan les calendar-events des 14 prochains jours
   et match contre les triggers des checklist-templates. Si match dans
   la fenêtre `daysBefore` et pas de suggestion pending identique, crée
   une suggestion dans households/{id}/suggestions.

   Helper de matching ré-implémenté localement (pas d'import inter-package
   pour garder la Cloud Function autonome).
   ========================================================================= */

function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

interface TriggerLite {
  keyword: string;
  daysBefore: number;
}

function eventMatches(
  title: string,
  description: string | undefined,
  trigger: TriggerLite,
  startTime: Date,
  now: Date,
): boolean {
  const haystack = normalizeForMatch(`${title} ${description ?? ""}`);
  const needle = normalizeForMatch(trigger.keyword);
  if (!haystack.includes(needle)) return false;
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const daysUntil = Math.floor(
    (startTime.getTime() - startOfToday.getTime()) / (24 * 60 * 60 * 1000),
  );
  return daysUntil >= 0 && daysUntil <= trigger.daysBefore;
}

export const suggestPreparations = onSchedule(
  {
    schedule: "0 7 * * *",
    timeZone: "Europe/Paris",
    region: "europe-west1",
    timeoutSeconds: 540,
    memory: "256MiB",
  },
  async () => {
    const db = getFirestore();
    const now = new Date();
    const in14days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    const households = await db.collection("households").get();
    let createdTotal = 0;

    for (const h of households.docs) {
      const householdId = h.id;

      // Charger les templates avec triggers
      const tplSnap = await db
        .collection(`households/${householdId}/checklist-templates`)
        .get();
      const templatesWithTriggers = tplSnap.docs
        .map((d) => ({
          id: d.id,
          name: d.get("name") as string,
          emoji: d.get("emoji") as string,
          triggers: ((d.get("triggers") as TriggerLite[] | undefined) ?? []),
        }))
        .filter((t) => t.triggers.length > 0);

      if (templatesWithTriggers.length === 0) continue;

      // Charger les events à venir (14j)
      const evSnap = await db
        .collection(`households/${householdId}/calendar-events`)
        .where("startTime", ">=", Timestamp.fromDate(now))
        .where("startTime", "<=", Timestamp.fromDate(in14days))
        .get();

      if (evSnap.empty) continue;

      // Charger les suggestions pending existantes pour dédupliquer
      const pendingSnap = await db
        .collection(`households/${householdId}/suggestions`)
        .where("status", "==", "pending")
        .get();
      const existingKeys = new Set<string>(
        pendingSnap.docs.map(
          (d) =>
            `${d.get("triggerEventId")}::${d.get("templateId")}`,
        ),
      );

      for (const evDoc of evSnap.docs) {
        const evTitle = (evDoc.get("title") as string) ?? "";
        const evDesc = evDoc.get("description") as string | undefined;
        const evStart = (evDoc.get("startTime") as Timestamp).toDate();

        for (const tpl of templatesWithTriggers) {
          const dedupKey = `${evDoc.id}::${tpl.id}`;
          if (existingKeys.has(dedupKey)) continue;

          const match = tpl.triggers.find((t) =>
            eventMatches(evTitle, evDesc, t, evStart, now),
          );
          if (!match) continue;

          await db
            .collection(`households/${householdId}/suggestions`)
            .add({
              type: "preparation",
              templateId: tpl.id,
              templateName: tpl.name,
              templateEmoji: tpl.emoji,
              triggerEventId: evDoc.id,
              triggerEventTitle: evTitle,
              triggerEventDate: Timestamp.fromDate(evStart),
              matchedKeyword: match.keyword,
              status: "pending",
              createdAt: FieldValue.serverTimestamp(),
            });

          // Log dans ai-logs
          await db
            .collection(`households/${householdId}/ai-logs`)
            .add({
              type: "suggestion",
              input: `event:${evDoc.id} template:${tpl.id} keyword:${match.keyword}`,
              output: { matched: true },
              durationMs: 0,
              cost: 0,
              createdAt: FieldValue.serverTimestamp(),
            });

          existingKeys.add(dedupKey);
          createdTotal++;
        }
      }
    }

    console.log(
      `[suggestPreparations] created ${createdTotal} new suggestions across ${households.size} households`,
    );
  },
);
