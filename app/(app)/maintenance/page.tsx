"use client";

import {
  ArrowLeft,
  Check,
  ExternalLink,
  Leaf,
  Pencil,
  Plus,
  ShieldCheck,
  Sprout,
  Trash2,
  Utensils,
  Wind,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useToast } from "@/components/shared/toast-provider";
import { useAuth } from "@/hooks/use-auth";
import { useCurrentHousehold } from "@/hooks/use-household";
import { useMaintenancePresets } from "@/hooks/use-maintenance-presets";
import { useTasks } from "@/hooks/use-tasks";
import { deleteMaintenancePreset } from "@/lib/firebase/firestore";
import {
  activateMaintenancePreset,
  deactivateMaintenancePreset,
} from "@/lib/maintenance/activate";
import {
  MAINTENANCE_CATEGORY_LABELS,
  MAINTENANCE_CATEGORY_ORDER,
} from "@/lib/maintenance/presets";
import {
  forceResyncDefaultPresets,
  seedDefaultPresetsIfEmpty,
} from "@/lib/maintenance/seed";
import type {
  MaintenanceCategory,
  MaintenancePreset,
  WithId,
} from "@/types/cocon";

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
  const { presets, loading } = useMaintenancePresets(household?.id);
  const { tasks } = useTasks(household?.id);
  const { showToast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [resyncing, setResyncing] = useState(false);

  // Seed lazy au premier accès si la collection est vide.
  useEffect(() => {
    if (!household?.id || !user?.uid || loading || seeding) return;
    if (presets.length > 0) return;
    setSeeding(true);
    seedDefaultPresetsIfEmpty(household.id, user.uid)
      .catch(() => {
        // silencieux — retry au prochain mount
      })
      .finally(() => setSeeding(false));
  }, [household?.id, user?.uid, presets.length, loading, seeding]);

  // Map presetId → taskId actif (1 tâche pending référencée)
  const activeTaskByPresetId = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of tasks) {
      if (t.maintenancePresetId && t.status === "pending") {
        map.set(t.maintenancePresetId, t.id);
      }
    }
    return map;
  }, [tasks]);

  const activeCount = activeTaskByPresetId.size;

  const presetsByCategory = useMemo(() => {
    const map = new Map<MaintenanceCategory, WithId<MaintenancePreset>[]>();
    for (const p of presets) {
      const list = map.get(p.category) ?? [];
      list.push(p);
      map.set(p.category, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => (a.position ?? 99) - (b.position ?? 99));
    }
    return map;
  }, [presets]);

  async function handleActivate(preset: WithId<MaintenancePreset>) {
    if (!household || !user || busy) return;
    if (activeTaskByPresetId.has(preset.id)) return;
    setBusy(preset.id);
    try {
      await activateMaintenancePreset(household.id, preset, user.uid);
      showToast({
        message: `${preset.emoji} ${preset.title} activé · ${preset.frequencyLabel.toLowerCase()}`,
      });
    } catch (err) {
      showToast({
        message:
          err instanceof Error ? err.message : "Activation impossible",
      });
    } finally {
      setBusy(null);
    }
  }

  async function handleDeactivate(preset: WithId<MaintenancePreset>) {
    if (!household || busy) return;
    if (!activeTaskByPresetId.has(preset.id)) return;
    setBusy(preset.id);
    try {
      const n = await deactivateMaintenancePreset(household.id, preset.id);
      showToast({
        message:
          n > 0
            ? `${preset.emoji} ${preset.title} désactivé`
            : "Aucune tâche à supprimer",
      });
    } catch (err) {
      showToast({
        message:
          err instanceof Error ? err.message : "Désactivation impossible",
      });
    } finally {
      setBusy(null);
    }
  }

  async function handleResync() {
    if (!household || !user || resyncing) return;
    if (
      !window.confirm(
        "Synchroniser depuis les défauts ? Cela écrasera les presets standards (titre, emoji, fréquence, hint). Les presets personnalisés ne sont pas touchés.",
      )
    )
      return;
    setResyncing(true);
    try {
      const n = await forceResyncDefaultPresets(household.id, user.uid);
      showToast({
        message: `${n} presets synchronisés depuis les défauts`,
      });
    } catch (err) {
      showToast({
        message:
          err instanceof Error ? err.message : "Synchronisation impossible",
      });
    } finally {
      setResyncing(false);
    }
  }

  async function handleDelete(preset: WithId<MaintenancePreset>) {
    if (!household || busy) return;
    const isActive = activeTaskByPresetId.has(preset.id);
    const message = isActive
      ? `Supprimer le preset « ${preset.title} » ET sa tâche active ?`
      : `Supprimer le preset « ${preset.title} » ?`;
    if (!window.confirm(message)) return;
    setBusy(preset.id);
    try {
      if (isActive) {
        await deactivateMaintenancePreset(household.id, preset.id);
      }
      await deleteMaintenancePreset(household.id, preset.id);
      showToast({ message: "Preset supprimé" });
    } catch (err) {
      showToast({
        message: err instanceof Error ? err.message : "Suppression impossible",
      });
    } finally {
      setBusy(null);
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
            href="/more"
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
          <Link
            href="/maintenance/new"
            aria-label="Créer un preset"
            title="Créer un preset"
            className="w-9 h-9 rounded-[10px] bg-primary text-primary-foreground flex items-center justify-center shadow-[0_0_10px_rgba(255,107,36,0.4)] hover:bg-[var(--primary-hover)] transition-colors"
          >
            <Plus size={16} strokeWidth={2.4} />
          </Link>
        </div>
      </div>

      <div className="w-full max-w-md mx-auto px-5 pt-3 pb-8 flex flex-col gap-4">
        <p className="text-[12px] text-muted-foreground leading-snug px-1">
          Active un preset pour créer une tâche récurrente. Crayon =
          modifier, poubelle = supprimer le preset.
        </p>

        {loading ? (
          <p className="text-[13px] text-muted-foreground">Chargement…</p>
        ) : null}

        {MAINTENANCE_CATEGORY_ORDER.map((cat) => {
          const list = presetsByCategory.get(cat) ?? [];
          if (list.length === 0) return null;
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
                {list.map((preset) => {
                  const taskId = activeTaskByPresetId.get(preset.id);
                  const isActive = Boolean(taskId);
                  const isBusy = busy === preset.id;
                  return (
                    <PresetRow
                      key={preset.id}
                      preset={preset}
                      isActive={isActive}
                      isBusy={isBusy}
                      taskId={taskId}
                      onActivate={() => handleActivate(preset)}
                      onDeactivate={() => handleDeactivate(preset)}
                      onDelete={() => handleDelete(preset)}
                    />
                  );
                })}
              </ul>
            </section>
          );
        })}

        <Link
          href="/maintenance/new"
          className="flex items-center justify-center gap-1.5 mt-2 px-4 py-3 rounded-[12px] border border-dashed border-border text-[13px] font-medium text-primary hover:bg-surface transition-colors"
        >
          <Plus size={14} strokeWidth={2.4} />
          Créer un preset personnalisé
        </Link>

        <button
          type="button"
          onClick={handleResync}
          disabled={resyncing}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          {resyncing
            ? "Synchronisation…"
            : "Synchroniser depuis les défauts"}
        </button>
      </div>
    </main>
  );
}

interface PresetRowProps {
  preset: WithId<MaintenancePreset>;
  isActive: boolean;
  isBusy: boolean;
  taskId?: string;
  onActivate: () => void;
  onDeactivate: () => void;
  onDelete: () => void;
}

function PresetRow({
  preset,
  isActive,
  isBusy,
  taskId,
  onActivate,
  onDeactivate,
  onDelete,
}: PresetRowProps) {
  return (
    <li className="flex items-start gap-2.5 py-3 border-b border-[rgba(67,42,31,0.4)] last:border-b-0">
      <span className="text-[22px] shrink-0 mt-0.5">{preset.emoji}</span>
      <div className="flex-1 flex flex-col min-w-0 gap-1.5">
        <div className="flex flex-col min-w-0">
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
            {preset.custom ? (
              <span
                className="ml-1.5 text-[10px] uppercase tracking-[0.1em] text-foreground-faint align-middle"
                title="Preset personnalisé"
              >
                custom
              </span>
            ) : null}
          </span>
          <span className="text-[12px] text-muted-foreground truncate">
            {preset.frequencyLabel}
            {preset.hint ? ` · ${preset.hint}` : ""}
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {isActive ? (
            <button
              type="button"
              onClick={onDeactivate}
              disabled={isBusy}
              className="flex items-center gap-1 px-2.5 h-7 rounded-[8px] bg-[rgba(255,200,69,0.14)] text-secondary text-[12px] font-semibold hover:bg-[rgba(255,200,69,0.22)] transition-colors disabled:opacity-50"
              aria-label="Désactiver"
              title="Désactiver et supprimer la tâche"
            >
              <Check size={11} strokeWidth={2.6} />
              {isBusy ? "…" : "Activé"}
            </button>
          ) : (
            <button
              type="button"
              onClick={onActivate}
              disabled={isBusy}
              className="flex items-center gap-1 px-2.5 h-7 rounded-[8px] bg-primary/10 text-primary text-[12px] font-semibold hover:bg-primary/20 transition-colors disabled:opacity-50"
              aria-label="Activer"
            >
              <Plus size={11} strokeWidth={2.6} />
              {isBusy ? "…" : "Activer"}
            </button>
          )}
          {isActive && taskId ? (
            <Link
              href={`/tasks/${taskId}/edit`}
              aria-label="Voir la tâche"
              title="Voir la tâche associée"
              className="w-7 h-7 rounded-[8px] flex items-center justify-center text-foreground-faint hover:bg-surface-elevated transition-colors"
            >
              <ExternalLink size={13} />
            </Link>
          ) : null}
          <Link
            href={`/maintenance/${preset.id}/edit`}
            aria-label="Modifier le preset"
            title="Modifier"
            className="w-7 h-7 rounded-[8px] flex items-center justify-center text-foreground-faint hover:bg-surface-elevated transition-colors"
          >
            <Pencil size={13} />
          </Link>
          <button
            type="button"
            onClick={onDelete}
            disabled={isBusy}
            aria-label="Supprimer le preset"
            title="Supprimer le preset"
            className="w-7 h-7 rounded-[8px] flex items-center justify-center text-foreground-faint hover:bg-destructive/20 hover:text-destructive transition-colors disabled:opacity-50"
          >
            <X size={13} />
          </button>
        </div>
      </div>
    </li>
  );
}
