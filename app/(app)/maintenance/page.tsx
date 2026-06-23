"use client";

import {
  ArrowLeft,
  Check,
  ExternalLink,
  Leaf,
  Plus,
  ShieldCheck,
  Sprout,
  Trash2,
  Utensils,
  Wind,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { useToast } from "@/components/shared/toast-provider";
import { useAuth } from "@/hooks/use-auth";
import { useCurrentHousehold } from "@/hooks/use-household";
import { useTasks } from "@/hooks/use-tasks";
import { activateMaintenancePreset } from "@/lib/maintenance/activate";
import {
  MAINTENANCE_CATEGORY_LABELS,
  MAINTENANCE_CATEGORY_ORDER,
  MAINTENANCE_PRESETS,
  type MaintenanceCategory,
  type MaintenancePreset,
} from "@/lib/maintenance/presets";

const CATEGORY_ICONS: Record<
  MaintenanceCategory,
  React.ComponentType<{ size?: number; className?: string }>
> = {
  trash: Trash2,
  appliance: Utensils,
  filter: Wind,
  seasonal: Leaf,
  safety: ShieldCheck,
  exterior: Sprout,
};

export default function MaintenancePage() {
  const { user } = useAuth();
  const { household } = useCurrentHousehold();
  const { tasks } = useTasks(household?.id);
  const { showToast } = useToast();
  const [activating, setActivating] = useState<string | null>(null);

  // Set des preset IDs déjà activés (= une tâche pending référence ce
  // preset). Si la tâche est done/cancelled on considère le preset
  // comme désactivable de nouveau.
  const activeIds = useMemo(() => {
    const set = new Set<string>();
    for (const t of tasks) {
      if (
        t.maintenancePresetId &&
        (t.status === "pending" || t.status === undefined)
      ) {
        set.add(t.maintenancePresetId);
      }
    }
    return set;
  }, [tasks]);

  const activeCount = activeIds.size;

  // Trouver la tâche associée à un preset pour le lien "Voir"
  const taskByPresetId = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of tasks) {
      if (t.maintenancePresetId && t.status === "pending") {
        map.set(t.maintenancePresetId, t.id);
      }
    }
    return map;
  }, [tasks]);

  async function handleActivate(preset: MaintenancePreset) {
    if (!household || !user || activating) return;
    if (activeIds.has(preset.id)) return;
    setActivating(preset.id);
    try {
      await activateMaintenancePreset(household.id, preset, user.uid);
      showToast({
        message: `${preset.emoji} ${preset.title} activé · ${preset.frequencyLabel.toLowerCase()}`,
      });
    } catch (err) {
      showToast({
        message:
          err instanceof Error
            ? err.message
            : "Impossible d'activer ce preset",
      });
    } finally {
      setActivating(null);
    }
  }

  return (
    <main className="flex flex-1 flex-col">
      <div
        className="sticky top-0 z-30 px-5 pt-6 pb-3 bg-background/85 backdrop-blur-xl"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 18px)" }}
      >
        <div className="w-full max-w-md mx-auto flex items-center gap-3">
          <Link
            href="/"
            aria-label="Retour"
            className="w-9 h-9 rounded-[10px] bg-surface flex items-center justify-center hover:bg-surface-elevated transition-colors"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="flex flex-col flex-1">
            <p className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
              Maison
            </p>
            <h1 className="font-display text-[22px] font-semibold leading-tight">
              Entretien{" "}
              <span className="text-muted-foreground font-normal text-[16px]">
                · {activeCount} actif{activeCount > 1 ? "s" : ""}
              </span>
            </h1>
          </div>
        </div>
      </div>

      <div className="w-full max-w-md mx-auto px-5 pt-3 pb-8 flex flex-col gap-4">
        <p className="text-[12px] text-muted-foreground leading-snug px-1">
          Active un preset pour créer une tâche récurrente avec catégorie
          Entretien. Tu peux ensuite la modifier comme n&apos;importe quelle
          tâche.
        </p>

        {MAINTENANCE_CATEGORY_ORDER.map((cat) => {
          const presets = MAINTENANCE_PRESETS.filter(
            (p) => p.category === cat,
          );
          if (presets.length === 0) return null;
          const Icon = CATEGORY_ICONS[cat];
          const { label } = MAINTENANCE_CATEGORY_LABELS[cat];
          return (
            <section key={cat} className="flex flex-col -mx-5">
              <div className="w-full flex items-center px-5 py-3 bg-[linear-gradient(90deg,rgba(255,107,36,0.16),rgba(255,200,69,0.04))] border-y border-y-[rgba(255,107,36,0.20)] border-t-[rgba(255,107,36,0.30)]">
                <span className="flex items-center gap-2.5 min-w-0">
                  <Icon size={15} className="text-primary shrink-0" />
                  <span className="font-display text-[13px] font-bold text-primary tracking-[0.12em] uppercase truncate">
                    {label}
                  </span>
                </span>
              </div>
              <ul className="flex flex-col px-4 bg-surface/30">
                {presets.map((preset) => {
                  const isActive = activeIds.has(preset.id);
                  const isBusy = activating === preset.id;
                  const taskId = taskByPresetId.get(preset.id);
                  return (
                    <li
                      key={preset.id}
                      className="flex items-center gap-2.5 py-3 border-b border-[rgba(67,42,31,0.4)] last:border-b-0"
                    >
                      <span className="text-[22px] shrink-0">
                        {preset.emoji}
                      </span>
                      <div className="flex-1 flex flex-col min-w-0">
                        <span className="font-sans text-[14px] font-medium truncate">
                          {preset.title}
                          {preset.priority ? (
                            <span
                              className="ml-1.5 text-secondary"
                              title="Prioritaire / obligatoire"
                            >
                              ★
                            </span>
                          ) : null}
                        </span>
                        <span className="text-[12px] text-muted-foreground truncate">
                          {preset.frequencyLabel}
                          {preset.hint ? ` · ${preset.hint}` : ""}
                        </span>
                      </div>
                      {isActive && taskId ? (
                        <>
                          <span className="flex items-center gap-1 text-[11px] font-semibold text-secondary bg-[rgba(255,200,69,0.14)] px-2 py-1 rounded-[8px] shrink-0">
                            <Check size={11} strokeWidth={2.6} />
                            Activé
                          </span>
                          <Link
                            href={`/tasks/${taskId}/edit`}
                            aria-label="Voir la tâche"
                            title="Voir la tâche"
                            className="w-7 h-7 rounded-[8px] flex items-center justify-center text-foreground-faint hover:bg-surface-elevated transition-colors shrink-0"
                          >
                            <ExternalLink size={13} />
                          </Link>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleActivate(preset)}
                          disabled={isBusy}
                          aria-label={`Activer ${preset.title}`}
                          className="flex items-center gap-1 px-2.5 h-7 rounded-[8px] bg-primary/10 text-primary text-[12px] font-semibold hover:bg-primary/20 transition-colors shrink-0 disabled:opacity-50"
                        >
                          <Plus size={13} strokeWidth={2.4} />
                          {isBusy ? "…" : "Activer"}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}

        <Link
          href="/tasks/new"
          className="flex items-center justify-center gap-1.5 mt-2 px-4 py-3 rounded-[12px] border border-dashed border-border text-[13px] font-medium text-primary hover:bg-surface transition-colors"
        >
          <Plus size={14} strokeWidth={2.4} />
          Créer un entretien personnalisé
        </Link>
      </div>
    </main>
  );
}
