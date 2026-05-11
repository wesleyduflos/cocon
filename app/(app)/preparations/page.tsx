"use client";

import { Plus } from "lucide-react";
import Link from "next/link";

import { useChecklistTemplates } from "@/hooks/use-checklists";
import { useCurrentHousehold } from "@/hooks/use-household";

export default function PreparationsPage() {
  const { household } = useCurrentHousehold();
  const { templates, loading } = useChecklistTemplates(household?.id);

  return (
    <main className="flex flex-1 flex-col px-5 py-6">
      <div className="w-full max-w-md mx-auto flex flex-col gap-5">
        <header className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <p className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
              Routines
            </p>
            <h1 className="font-display text-[28px] font-semibold leading-[1.05]">
              Préparations
            </h1>
          </div>
          <Link
            href="/tasks"
            aria-label="Voir les tâches"
            className="text-[12px] text-muted-foreground hover:text-foreground"
          >
            Mes tâches →
          </Link>
        </header>

        <p className="text-[14px] text-muted-foreground leading-[1.5]">
          Lance un modèle pour générer toutes ses tâches d&apos;un coup et ne
          rien oublier.
        </p>

        {loading ? (
          <p className="text-[13px] text-muted-foreground">Chargement…</p>
        ) : templates.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <div className="text-[40px]">🗂️</div>
            <p className="text-[14px] text-muted-foreground max-w-[280px]">
              Pas encore de modèle. Les 7 préparations par défaut auraient
              dû être seedées à la création du cocon — rends-toi dans
              Paramètres → Cocon pour les rétablir.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {templates.map((t) => (
              <Link
                key={t.id}
                href={`/preparations/${t.id}`}
                className="rounded-[14px] border border-border bg-surface px-4 py-4 flex flex-col gap-1.5 hover:bg-surface-elevated transition-colors"
              >
                <span className="text-[28px]">{t.emoji}</span>
                <span className="text-[14px] font-semibold leading-tight">
                  {t.name}
                </span>
                {t.description ? (
                  <span className="text-[11px] text-muted-foreground leading-snug line-clamp-2">
                    {t.description}
                  </span>
                ) : null}
              </Link>
            ))}
            <article className="rounded-[14px] border border-dashed border-border bg-transparent px-4 py-4 flex flex-col items-center justify-center gap-1 text-center opacity-60">
              <Plus size={22} className="text-foreground-faint" />
              <span className="text-[12px] text-foreground-faint">
                Créer un modèle — bientôt
              </span>
            </article>
          </div>
        )}
      </div>
    </main>
  );
}
