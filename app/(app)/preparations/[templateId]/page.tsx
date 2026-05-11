"use client";

import { onSnapshot } from "firebase/firestore";
import { ArrowLeft, Play } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useToast } from "@/components/shared/toast-provider";
import { useAuth } from "@/hooks/use-auth";
import { useTemplateItems } from "@/hooks/use-checklists";
import { useCurrentHousehold } from "@/hooks/use-household";
import {
  checklistTemplateDoc,
  launchChecklistRun,
} from "@/lib/firebase/firestore";
import type { ChecklistTemplate, WithId } from "@/types/cocon";

export default function TemplateDetailPage() {
  const router = useRouter();
  const params = useParams<{ templateId: string }>();
  const templateId = params.templateId;
  const { user } = useAuth();
  const { household } = useCurrentHousehold();
  const { items } = useTemplateItems(household?.id, templateId);
  const { showToast } = useToast();

  const [template, setTemplate] = useState<WithId<ChecklistTemplate> | null>(
    null,
  );
  const [includedItemIds, setIncludedItemIds] = useState<Set<string>>(new Set());
  const [launching, setLaunching] = useState(false);

  useEffect(() => {
    if (!household?.id || !templateId) return;
    const unsubscribe = onSnapshot(
      checklistTemplateDoc(household.id, templateId),
      (snap) => {
        if (snap.exists()) {
          setTemplate({ ...snap.data(), id: snap.id });
        }
      },
      () => {},
    );
    return unsubscribe;
  }, [household?.id, templateId]);

  // Inclure tous les items par défaut
  useEffect(() => {
    if (items.length === 0) return;
    setIncludedItemIds((prev) => {
      if (prev.size > 0) return prev; // Garde la sélection user si déjà set
      return new Set(items.map((i) => i.id));
    });
  }, [items]);

  function toggleItem(id: string) {
    setIncludedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleLaunch() {
    if (!household || !user || !template) return;
    setLaunching(true);
    try {
      await launchChecklistRun(household.id, template.id, user.uid);
      showToast({
        message: `${template.emoji} ${template.name} lancée`,
      });
      router.replace("/tasks");
    } catch (err) {
      showToast({
        message:
          err instanceof Error ? err.message : "Lancement impossible.",
      });
      setLaunching(false);
    }
  }

  if (!template) {
    return (
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <p className="text-[13px] text-muted-foreground">Chargement…</p>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col px-5 py-4">
      <header className="flex items-center justify-between mb-6">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Retour"
          className="w-9 h-9 rounded-[10px] bg-surface flex items-center justify-center"
        >
          <ArrowLeft size={18} />
        </button>
      </header>

      <div className="max-w-md w-full mx-auto flex flex-col gap-5">
        <section className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <span className="text-[44px]">{template.emoji}</span>
            <h1 className="font-display text-[26px] font-semibold leading-[1.1]">
              {template.name}
            </h1>
          </div>
          {template.description ? (
            <p className="text-[14px] text-muted-foreground leading-[1.5]">
              {template.description}
            </p>
          ) : null}
        </section>

        <section className="flex flex-col gap-2.5">
          <h2 className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
            Items du modèle ({includedItemIds.size}/{items.length})
          </h2>
          <ul className="flex flex-col gap-1.5">
            {items.map((item) => {
              const checked = includedItemIds.has(item.id);
              return (
                <li key={item.id}>
                  <label className="flex items-center gap-3 rounded-[12px] border border-border bg-surface px-4 py-2.5 cursor-pointer hover:bg-surface-elevated">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleItem(item.id)}
                      className="w-4 h-4 accent-primary"
                    />
                    <span
                      className={`text-[14px] flex-1 ${
                        checked ? "text-foreground" : "text-foreground-faint line-through"
                      }`}
                    >
                      {item.title}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
          <p className="text-[11px] text-foreground-faint mt-1">
            Sprint 3 : tous les items sont lancés. La désélection sera prise
            en compte dans une prochaine version.
          </p>
        </section>

        <button
          type="button"
          onClick={handleLaunch}
          disabled={launching}
          className="rounded-[12px] bg-primary text-primary-foreground font-sans font-semibold text-[15px] px-[18px] py-3 shadow-[0_0_20px_rgba(255,107,36,0.35)] hover:bg-[var(--primary-hover)] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Play size={16} />
          {launching ? "Lancement…" : "Lancer la préparation"}
        </button>
      </div>
    </main>
  );
}
