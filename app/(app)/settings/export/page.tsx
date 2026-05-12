"use client";

import { getDoc, getDocs } from "firebase/firestore";
import { ArrowLeft, Download } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { useToast } from "@/components/shared/toast-provider";
import { useAuth } from "@/hooks/use-auth";
import { useCurrentHousehold } from "@/hooks/use-household";
import {
  checklistRunsCollection,
  checklistTemplatesCollection,
  householdCalendarEventsCollection,
  householdTasksCollection,
  journalEntriesCollection,
  memoryEntriesCollection,
  quickAddItemsCollection,
  shoppingItemsCollection,
  stocksCollection,
  suggestionsCollection,
  userDoc,
} from "@/lib/firebase/firestore";

/* =========================================================================
   /settings/export — sprint 5 bloc G.3

   Export RGPD client-side de toutes les donnees du cocon.

   Approche : on parcourt toutes les sous-collections du household + le
   doc users/{uid} de l'utilisateur courant, on serialise en JSON et on
   declenche un download local. Pas de Cloud Function necessaire pour
   un cocon perso (2 users, <1000 docs au total).
   ========================================================================= */

interface ExportSection {
  label: string;
  /** Function async qui retourne un tableau de docs serialisables. */
  fetch: () => Promise<unknown[]>;
}

function serializeDoc(doc: {
  id: string;
  data: () => unknown;
}): Record<string, unknown> {
  const out: Record<string, unknown> = { id: doc.id };
  const data = doc.data();
  if (!data || typeof data !== "object") return out;
  for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
    // Timestamps Firestore : on les serialise en ISO
    if (
      v &&
      typeof v === "object" &&
      "toDate" in v &&
      typeof (v as { toDate: unknown }).toDate === "function"
    ) {
      out[k] = (v as { toDate: () => Date }).toDate().toISOString();
    } else {
      out[k] = v;
    }
  }
  return out;
}

export default function ExportPage() {
  const { user } = useAuth();
  const { household } = useCurrentHousehold();
  const { showToast } = useToast();
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    if (!user || !household) return;
    setExporting(true);
    try {
      const hid = household.id;

      const sections: ExportSection[] = [
        {
          label: "tasks",
          fetch: async () => {
            const snap = await getDocs(householdTasksCollection(hid));
            return snap.docs.map((d) => serializeDoc(d));
          },
        },
        {
          label: "shoppingItems",
          fetch: async () => {
            const snap = await getDocs(shoppingItemsCollection(hid));
            return snap.docs.map((d) => serializeDoc(d));
          },
        },
        {
          label: "quickAddItems",
          fetch: async () => {
            const snap = await getDocs(quickAddItemsCollection(hid));
            return snap.docs.map((d) => serializeDoc(d));
          },
        },
        {
          label: "stocks",
          fetch: async () => {
            const snap = await getDocs(stocksCollection(hid));
            return snap.docs.map((d) => serializeDoc(d));
          },
        },
        {
          label: "memoryEntries",
          fetch: async () => {
            const snap = await getDocs(memoryEntriesCollection(hid));
            return snap.docs.map((d) => serializeDoc(d));
          },
        },
        {
          label: "checklistTemplates",
          fetch: async () => {
            const snap = await getDocs(checklistTemplatesCollection(hid));
            return snap.docs.map((d) => serializeDoc(d));
          },
        },
        {
          label: "checklistRuns",
          fetch: async () => {
            const snap = await getDocs(checklistRunsCollection(hid));
            return snap.docs.map((d) => serializeDoc(d));
          },
        },
        {
          label: "calendarEvents",
          fetch: async () => {
            const snap = await getDocs(householdCalendarEventsCollection(hid));
            return snap.docs.map((d) => serializeDoc(d));
          },
        },
        {
          label: "suggestions",
          fetch: async () => {
            const snap = await getDocs(suggestionsCollection(hid));
            return snap.docs.map((d) => serializeDoc(d));
          },
        },
        {
          label: "journalEntries",
          fetch: async () => {
            const snap = await getDocs(journalEntriesCollection(hid));
            return snap.docs.map((d) => serializeDoc(d));
          },
        },
      ];

      const results: Record<string, unknown> = {};
      for (const s of sections) {
        try {
          results[s.label] = await s.fetch();
        } catch {
          results[s.label] = [];
        }
      }

      // Profil utilisateur
      const userSnap = await getDoc(userDoc(user.uid));
      const userProfile = userSnap.exists()
        ? serializeDoc({ id: user.uid, data: () => userSnap.data() })
        : null;

      const payload = {
        exportedAt: new Date().toISOString(),
        exportedBy: user.uid,
        household: {
          id: household.id,
          name: household.name,
          emoji: household.emoji,
          memberIds: household.memberIds,
        },
        userProfile,
        ...results,
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cocon-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);

      const totalDocs = Object.values(results).reduce<number>(
        (acc, arr) => acc + (Array.isArray(arr) ? arr.length : 0),
        0,
      );
      showToast({
        message: `${totalDocs} documents exportés`,
      });
    } catch (err) {
      showToast({
        message:
          err instanceof Error
            ? `Erreur : ${err.message}`
            : "Export impossible.",
      });
    } finally {
      setExporting(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col px-5 py-7">
      <div className="w-full max-w-md mx-auto flex flex-col gap-6">
        <header className="flex items-center gap-3">
          <Link
            href="/settings"
            aria-label="Retour"
            className="w-9 h-9 rounded-[10px] bg-surface flex items-center justify-center hover:bg-surface-elevated transition-colors"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="flex flex-col">
            <p className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
              Paramètres
            </p>
            <h1 className="font-display text-[22px] font-semibold leading-tight">
              Exporter mes données
            </h1>
          </div>
        </header>

        <section className="rounded-[14px] border border-border bg-surface px-5 py-5 flex flex-col gap-3">
          <h2 className="font-display text-[18px] font-semibold">
            Tout le contenu du cocon, en un fichier
          </h2>
          <p className="text-[13px] text-muted-foreground leading-[1.5]">
            Conformément au RGPD, tu peux télécharger une copie complète des
            données stockées par Cocon pour ton compte et ton foyer :
          </p>
          <ul className="text-[13px] text-foreground leading-[1.5] list-disc pl-5">
            <li>Profil utilisateur et préférences</li>
            <li>Tâches, courses, stocks, mémoire</li>
            <li>Préparations (templates et exécutions)</li>
            <li>Événements calendrier, suggestions IA</li>
            <li>Journal du foyer</li>
          </ul>
          <p className="text-[12px] text-foreground-faint leading-snug mt-2">
            Format JSON, conservé en local sur ton appareil après le download.
            Cocon n&apos;envoie le fichier nulle part.
          </p>
        </section>

        <button
          type="button"
          onClick={handleExport}
          disabled={exporting || !user || !household}
          className="rounded-[12px] bg-primary text-primary-foreground font-sans font-semibold text-[15px] px-[18px] py-3 shadow-[0_0_20px_rgba(255,107,36,0.35)] hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Download size={16} />
          {exporting ? "Préparation…" : "Télécharger toutes mes données"}
        </button>

        <p className="text-[11px] text-foreground-faint leading-snug">
          Pour supprimer ton compte et toutes les données associées, va dans
          Paramètres → Compte.
        </p>
      </div>
    </main>
  );
}
