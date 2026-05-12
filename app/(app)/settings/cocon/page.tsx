"use client";

import { ArrowLeft, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

import { useToast } from "@/components/shared/toast-provider";
import { useAuth } from "@/hooks/use-auth";
import { useChecklistTemplates } from "@/hooks/use-checklists";
import { useCurrentHousehold } from "@/hooks/use-household";
import { useMembers } from "@/hooks/use-members";
import { useMemoryEntries } from "@/hooks/use-memory";
import {
  useQuickAddItems,
  useShoppingItems,
} from "@/hooks/use-shopping";
import { useStocks } from "@/hooks/use-stocks";
import { useTasks } from "@/hooks/use-tasks";
import {
  seedChecklistTemplates,
  seedQuickAddItems,
  updateHousehold,
} from "@/lib/firebase/firestore";

const EMOJI_CHOICES = ["🏠", "🪴", "🕯️", "🔥", "🦊", "🌿", "☕", "✨"];

export default function CoconSettingsPage() {
  const { user } = useAuth();
  const { household } = useCurrentHousehold();
  const { members } = useMembers(household?.memberIds);
  const { showToast } = useToast();

  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🏠");
  const [submitting, setSubmitting] = useState(false);
  const [reseedingQa, setReseedingQa] = useState(false);
  const [reseedingPrep, setReseedingPrep] = useState(false);
  const [togglingBalance, setTogglingBalance] = useState(false);

  // Compteurs des modules
  const { tasks } = useTasks(household?.id);
  const { items: shoppingItems } = useShoppingItems(household?.id);
  const { items: quickAdd } = useQuickAddItems(household?.id);
  const { stocks } = useStocks(household?.id);
  const { entries: memoryEntries } = useMemoryEntries(household?.id);
  const { templates } = useChecklistTemplates(household?.id);

  useEffect(() => {
    if (!household) return;
    setName(household.name);
    setEmoji(household.emoji ?? "🏠");
  }, [household]);

  const isOwner = household?.ownerId === user?.uid;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!household) return;
    setSubmitting(true);
    try {
      await updateHousehold(household.id, { name: name.trim(), emoji });
      showToast({ message: "Cocon mis à jour" });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReseedQuickAdd() {
    if (!household) return;
    if (
      !window.confirm(
        "Réinitialiser la grille des essentiels (efface les personnalisations) ?",
      )
    )
      return;
    setReseedingQa(true);
    try {
      const result = await seedQuickAddItems(household.id, { force: true });
      showToast({
        message: `${result.created} essentiels réinitialisés`,
      });
    } finally {
      setReseedingQa(false);
    }
  }

  async function handleToggleBalance() {
    if (!household) return;
    setTogglingBalance(true);
    try {
      const next = !household.balanceEnabled;
      await updateHousehold(household.id, { balanceEnabled: next });
      showToast({
        message: next
          ? "Score d'équilibre activé"
          : "Score d'équilibre désactivé",
      });
    } finally {
      setTogglingBalance(false);
    }
  }

  async function handleReseedTemplates() {
    if (!household) return;
    if (
      !window.confirm(
        "Réinitialiser les 7 préparations par défaut (efface les modifications) ?",
      )
    )
      return;
    setReseedingPrep(true);
    try {
      const result = await seedChecklistTemplates(household.id, {
        force: true,
      });
      showToast({
        message: `${result.created} préparations réinitialisées`,
      });
    } finally {
      setReseedingPrep(false);
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
              Mon cocon
            </h1>
          </div>
        </header>

        {/* Édition nom + emoji (owner only) */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="cocon-name"
              className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground"
            >
              Nom du cocon
            </label>
            <input
              id="cocon-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={48}
              required
              disabled={!isOwner || submitting}
              className="rounded-[12px] border border-border bg-surface px-4 py-3 text-[15px] focus:outline-none focus:border-primary focus:ring-2 focus:ring-[rgba(255,107,36,0.18)] disabled:opacity-50"
            />
            {!isOwner ? (
              <p className="text-[12px] text-foreground-faint">
                Seul·e l&apos;owner peut renommer le cocon.
              </p>
            ) : null}
          </div>
          <div className="flex flex-col gap-2.5">
            <span className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
              Emoji
            </span>
            <div className="flex flex-wrap gap-2">
              {EMOJI_CHOICES.map((choice) => (
                <button
                  key={choice}
                  type="button"
                  onClick={() => setEmoji(choice)}
                  disabled={!isOwner || submitting}
                  aria-pressed={emoji === choice}
                  className={`w-11 h-11 rounded-[10px] text-[20px] flex items-center justify-center transition-all ${
                    emoji === choice
                      ? "bg-primary text-primary-foreground shadow-[0_0_14px_rgba(255,107,36,0.45)]"
                      : "bg-surface border border-border hover:bg-surface-elevated"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {choice}
                </button>
              ))}
            </div>
          </div>
          {isOwner ? (
            <button
              type="submit"
              disabled={submitting || name.trim().length === 0}
              className="rounded-[12px] bg-primary text-primary-foreground font-sans font-semibold text-[15px] px-[18px] py-3 shadow-[0_0_20px_rgba(255,107,36,0.35)] hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed self-start"
            >
              {submitting ? "Enregistrement…" : "Enregistrer"}
            </button>
          ) : null}
        </form>

        {/* Membres */}
        <section className="flex flex-col gap-3">
          <h2 className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
            Membres ({members.length})
          </h2>
          <ul className="flex flex-col gap-2">
            {members.map((m) => {
              const isMe = m.uid === user?.uid;
              const isHouseholdOwner = m.uid === household?.ownerId;
              return (
                <li
                  key={m.uid}
                  className="rounded-[12px] border border-border bg-surface px-4 py-3 flex items-center gap-3"
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-display font-semibold text-[16px] ${
                      isMe
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {m.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 flex flex-col">
                    <span className="text-[14px] font-medium">
                      {isMe ? `${m.displayName} (toi)` : m.displayName}
                    </span>
                    <span className="text-[12px] text-muted-foreground">
                      {isHouseholdOwner ? "Owner" : "Membre"}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
          {members.length < 2 ? (
            <Link
              href="/invite"
              className="rounded-[12px] border border-dashed border-primary text-primary font-sans font-semibold text-[14px] px-[18px] py-3 text-center hover:bg-[rgba(255,107,36,0.08)] transition-colors"
            >
              + Inviter quelqu&apos;un
            </Link>
          ) : null}
        </section>

        {/* Compteurs */}
        <section className="flex flex-col gap-3">
          <h2 className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
            Contenu du cocon
          </h2>
          <div className="grid grid-cols-2 gap-2">
            <Counter label="Tâches" emoji="✓" value={tasks.length} />
            <Counter
              label="Articles courses"
              emoji="🛒"
              value={shoppingItems.length}
            />
            <Counter
              label="Stocks"
              emoji="📦"
              value={stocks.length}
            />
            <Counter
              label="Mémoire"
              emoji="📚"
              value={memoryEntries.length}
            />
            <Counter
              label="Essentiels"
              emoji="⭐"
              value={quickAdd.length}
            />
            <Counter
              label="Préparations"
              emoji="🗂️"
              value={templates.length}
            />
          </div>
        </section>

        {/* Score d'équilibre (opt-in, off par défaut) */}
        <section className="flex flex-col gap-3">
          <h2 className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
            Score d&apos;équilibre
          </h2>
          <article className="rounded-[12px] border border-border bg-surface px-4 py-3 flex items-start gap-3">
            <div className="flex-1 flex flex-col gap-1">
              <span className="text-[14px] font-medium">
                Afficher le score d&apos;équilibre
              </span>
              <span className="text-[12px] text-muted-foreground leading-snug">
                Calculé à partir des tâches complétées. Donne une vue
                partagée, pas une comparaison. Désactivable à tout moment.
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={household?.balanceEnabled === true}
              onClick={handleToggleBalance}
              disabled={togglingBalance || !household}
              className={`shrink-0 w-11 h-6 rounded-full relative transition-colors ${
                household?.balanceEnabled
                  ? "bg-primary"
                  : "bg-border"
              } disabled:opacity-50`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                  household?.balanceEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </article>
        </section>

        {/* Reseed (owner only) */}
        {isOwner ? (
          <section className="flex flex-col gap-3">
            <h2 className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
              Réinitialisations
            </h2>
            <p className="text-[12px] text-foreground-faint leading-snug">
              Restaure les jeux par défaut. Tes personnalisations sont
              écrasées.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleReseedQuickAdd}
                disabled={reseedingQa}
                className="rounded-[12px] border border-border bg-surface px-3 py-3 text-[13px] font-medium hover:bg-surface-elevated transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <RotateCcw size={14} />
                {reseedingQa ? "..." : "Essentiels"}
              </button>
              <button
                type="button"
                onClick={handleReseedTemplates}
                disabled={reseedingPrep}
                className="rounded-[12px] border border-border bg-surface px-3 py-3 text-[13px] font-medium hover:bg-surface-elevated transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <RotateCcw size={14} />
                {reseedingPrep ? "..." : "Préparations"}
              </button>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function Counter({
  label,
  emoji,
  value,
}: {
  label: string;
  emoji: string;
  value: number;
}) {
  return (
    <article className="rounded-[12px] border border-border bg-surface px-3 py-2.5 flex items-center gap-2.5">
      <span className="text-[18px]">{emoji}</span>
      <div className="flex-1 flex flex-col">
        <span className="font-display text-[18px] font-semibold leading-none">
          {value}
        </span>
        <span className="text-[10px] uppercase tracking-[0.1em] text-foreground-faint">
          {label}
        </span>
      </div>
    </article>
  );
}
