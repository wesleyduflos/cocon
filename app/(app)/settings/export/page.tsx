"use client";

import { getDoc, getDocs } from "firebase/firestore";
import {
  ArrowLeft,
  Download,
  FileWarning,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";

import { useToast } from "@/components/shared/toast-provider";
import { useAuth } from "@/hooks/use-auth";
import { useCurrentHousehold } from "@/hooks/use-household";
import {
  clearHouseholdData,
  importHouseholdData,
  type ImportReport,
} from "@/lib/data/import-data";
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

function serializeDoc(doc: {
  id: string;
  data: () => unknown;
}): Record<string, unknown> {
  const out: Record<string, unknown> = { id: doc.id };
  const data = doc.data();
  if (!data || typeof data !== "object") return out;
  for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
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

function formatReportLine(label: string, n: number): string | null {
  if (n === 0) return null;
  return `${n} ${label}${n > 1 ? "s" : ""}`;
}

function summarizeImport(r: ImportReport): string {
  const parts = [
    formatReportLine("tâche", r.tasks),
    formatReportLine("article", r.shoppingItems),
    formatReportLine("essentiel", r.quickAddItems),
    formatReportLine("stock", r.stocks),
    formatReportLine("entrée mémoire", r.memoryEntries),
    formatReportLine("préparation", r.checklistTemplates),
    formatReportLine("événement", r.calendarEvents),
  ].filter((s): s is string => Boolean(s));
  return parts.length === 0
    ? "rien à importer"
    : parts.join(", ");
}

export default function DataPage() {
  const { user } = useAuth();
  const { household } = useCurrentHousehold();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [clearing, setClearing] = useState(false);

  async function handleExport() {
    if (!user || !household) return;
    setExporting(true);
    try {
      const hid = household.id;
      const sections: Array<{
        label: string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        fetch: () => Promise<any[]>;
      }> = [
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
      showToast({ message: `${totalDocs} documents exportés` });
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

  async function handleImportFile(file: File) {
    if (!household) return;
    setImporting(true);
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      const report = await importHouseholdData(household.id, payload);
      showToast({ message: `Import terminé : ${summarizeImport(report)}` });
    } catch (err) {
      showToast({
        message:
          err instanceof Error
            ? `Import impossible : ${err.message}`
            : "Fichier invalide.",
      });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleLoadDemo() {
    if (!household) return;
    if (
      !window.confirm(
        "Charger le jeu de démo ? Tes données actuelles seront conservées, les éléments de démo s'ajoutent en plus.",
      )
    )
      return;
    setLoadingDemo(true);
    try {
      const resp = await fetch("/demo-data.json");
      if (!resp.ok) throw new Error("Démo introuvable");
      const payload = await resp.json();
      const report = await importHouseholdData(household.id, payload);
      showToast({ message: `Démo chargée : ${summarizeImport(report)}` });
    } catch (err) {
      showToast({
        message:
          err instanceof Error
            ? `Erreur démo : ${err.message}`
            : "Démo indisponible.",
      });
    } finally {
      setLoadingDemo(false);
    }
  }

  async function handleClear() {
    if (!household) return;
    if (
      !window.confirm(
        "⚠️ Effacer TOUTES les données du foyer (tâches, courses, stocks, mémoire, préparations, calendrier, journal, suggestions) ? Cette action est IRRÉVERSIBLE.",
      )
    )
      return;
    if (
      !window.confirm(
        "Vraiment vraiment ? Pense à exporter avant si tu veux garder une copie.",
      )
    )
      return;
    setClearing(true);
    try {
      const report = await clearHouseholdData(household.id);
      const total = Object.values(report).reduce<number>((a, b) => a + b, 0);
      showToast({ message: `${total} documents supprimés` });
    } catch (err) {
      showToast({
        message:
          err instanceof Error
            ? `Erreur : ${err.message}`
            : "Suppression impossible.",
      });
    } finally {
      setClearing(false);
    }
  }

  const busy = exporting || importing || loadingDemo || clearing;

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
              Mes données
            </h1>
          </div>
        </header>

        {/* Export */}
        <section className="rounded-[14px] border border-border bg-surface px-5 py-5 flex flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <Download size={16} className="text-primary" />
            <h2 className="font-display text-[16px] font-semibold">
              Exporter
            </h2>
          </div>
          <p className="text-[12px] text-muted-foreground leading-snug">
            Télécharge une copie complète des données du foyer (tâches,
            courses, stocks, mémoire, préparations, calendrier, journal,
            suggestions, profil) au format JSON. Conforme RGPD.
          </p>
          <button
            type="button"
            onClick={handleExport}
            disabled={busy || !household}
            className="rounded-[10px] bg-primary text-primary-foreground font-sans font-semibold text-[14px] px-4 py-2.5 shadow-[0_0_14px_rgba(255,107,36,0.35)] hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50 flex items-center justify-center gap-2 self-start"
          >
            <Download size={14} />
            {exporting ? "Préparation…" : "Télécharger le JSON"}
          </button>
        </section>

        {/* Démo */}
        <section className="rounded-[14px] border border-[rgba(255,107,36,0.32)] bg-gradient-to-br from-[rgba(255,107,36,0.12)] to-[rgba(255,200,69,0.04)] px-5 py-5 flex flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <Sparkles
              size={16}
              className="text-primary"
              strokeWidth={2.4}
            />
            <h2 className="font-display text-[16px] font-semibold">
              Charger un jeu de démo
            </h2>
          </div>
          <p className="text-[12px] text-muted-foreground leading-snug">
            Importe un dataset réaliste (6 tâches, 5 articles, 4 stocks, 5
            mémoires, 2 préparations, 4 événements) pour découvrir les
            capacités de l&apos;app. Tes données actuelles sont conservées.
          </p>
          <button
            type="button"
            onClick={handleLoadDemo}
            disabled={busy || !household}
            className="rounded-[10px] bg-primary text-primary-foreground font-sans font-semibold text-[14px] px-4 py-2.5 shadow-[0_0_14px_rgba(255,107,36,0.35)] hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50 flex items-center justify-center gap-2 self-start"
          >
            <Sparkles size={14} />
            {loadingDemo ? "Chargement…" : "Charger la démo"}
          </button>
        </section>

        {/* Import */}
        <section className="rounded-[14px] border border-border bg-surface px-5 py-5 flex flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <Upload size={16} className="text-[#64A0FF]" />
            <h2 className="font-display text-[16px] font-semibold">
              Importer un fichier
            </h2>
          </div>
          <p className="text-[12px] text-muted-foreground leading-snug">
            Charge un fichier JSON exporté depuis Cocon (export complet ou
            jeu de démo personnalisé). Les éléments importés s&apos;ajoutent
            sans écraser tes données existantes.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImportFile(file);
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy || !household}
            className="rounded-[10px] border border-[rgba(100,160,255,0.4)] bg-[rgba(100,160,255,0.08)] text-[#64A0FF] font-sans font-semibold text-[14px] px-4 py-2.5 hover:bg-[rgba(100,160,255,0.16)] transition-colors disabled:opacity-50 flex items-center justify-center gap-2 self-start"
          >
            <Upload size={14} />
            {importing ? "Import…" : "Choisir un fichier JSON"}
          </button>
        </section>

        {/* Effacer */}
        <section className="rounded-[14px] border border-destructive/40 bg-[rgba(229,55,77,0.04)] px-5 py-5 flex flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <FileWarning size={16} className="text-destructive" />
            <h2 className="font-display text-[16px] font-semibold text-destructive">
              Zone sensible — Effacer tout
            </h2>
          </div>
          <p className="text-[12px] text-muted-foreground leading-snug">
            Supprime <span className="font-semibold">définitivement</span> toutes
            les données du foyer (tâches, courses, stocks, mémoire,
            préparations, calendrier, journal, suggestions). Le foyer lui-même
            et les comptes utilisateur restent. Action irréversible — exporte
            avant si tu veux garder une copie.
          </p>
          <button
            type="button"
            onClick={handleClear}
            disabled={busy || !household}
            className="rounded-[10px] border border-destructive bg-transparent text-destructive font-sans font-semibold text-[14px] px-4 py-2.5 hover:bg-destructive/10 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 self-start"
          >
            <Trash2 size={14} />
            {clearing ? "Suppression…" : "Effacer toutes mes données"}
          </button>
        </section>
      </div>
    </main>
  );
}
