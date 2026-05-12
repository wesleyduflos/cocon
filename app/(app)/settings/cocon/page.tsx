"use client";

import {
  ArrowLeft,
  Copy,
  KeyRound,
  LogOut,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { MemberAvatar } from "@/components/shared/member-avatar";
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
  clearJournalEntries,
  joinHouseholdByCode,
  leaveHousehold,
  listJournalEntries,
  seedChecklistTemplates,
  seedQuickAddItems,
  setHouseholdInviteCode,
  updateHousehold,
} from "@/lib/firebase/firestore";

export default function CoconSettingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { household } = useCurrentHousehold();
  const { members } = useMembers(household?.memberIds);
  const { showToast } = useToast();

  const [reseedingQa, setReseedingQa] = useState(false);
  const [reseedingPrep, setReseedingPrep] = useState(false);
  const [togglingBalance, setTogglingBalance] = useState(false);
  const [togglingJournal, setTogglingJournal] = useState(false);
  const [exportingJournal, setExportingJournal] = useState(false);
  const [clearingJournal, setClearingJournal] = useState(false);
  const [regeneratingCode, setRegeneratingCode] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [switching, setSwitching] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);

  // Compteurs des modules
  const { tasks } = useTasks(household?.id);
  const { items: shoppingItems } = useShoppingItems(household?.id);
  const { items: quickAdd } = useQuickAddItems(household?.id);
  const { stocks } = useStocks(household?.id);
  const { entries: memoryEntries } = useMemoryEntries(household?.id);
  const { templates } = useChecklistTemplates(household?.id);

  const isOwner = household?.ownerId === user?.uid;

  async function handleRegenerateCode() {
    if (!household || !user) return;
    if (
      household.inviteCode &&
      !window.confirm(
        "Générer un nouveau code ? L'ancien sera désactivé immédiatement.",
      )
    )
      return;
    setRegeneratingCode(true);
    try {
      const code = await setHouseholdInviteCode(
        household.id,
        household.name,
        user.uid,
      );
      showToast({ message: `Nouveau code : ${code}` });
    } catch (err) {
      showToast({
        message:
          err instanceof Error
            ? `Erreur : ${err.message}`
            : "Génération impossible.",
      });
    } finally {
      setRegeneratingCode(false);
    }
  }

  async function handleCopyCode() {
    if (!household?.inviteCode) return;
    try {
      await navigator.clipboard.writeText(household.inviteCode);
      showToast({ message: "Code copié" });
    } catch {
      showToast({ message: "Impossible de copier — recopie à la main." });
    }
  }

  async function handleSwitchHousehold(event: FormEvent) {
    event.preventDefault();
    if (!user || !household) return;
    if (isOwner) {
      setSwitchError(
        "Tu es l'owner de ce cocon — tu ne peux pas le quitter (transfert d'ownership non disponible pour le moment).",
      );
      return;
    }
    const normalized = joinCode.trim().toUpperCase();
    if (normalized.length < 6) {
      setSwitchError("Code à 6 caractères attendu.");
      return;
    }
    if (
      !window.confirm(
        `Quitter le cocon actuel et rejoindre celui du code ${normalized} ? Tu perdras l'accès aux données du cocon actuel.`,
      )
    )
      return;
    setSwitchError(null);
    setSwitching(true);
    try {
      // Quitter d'abord, sinon Firestore rejette le join (déjà dans 1 cocon).
      await leaveHousehold(household.id, user.uid);
      await joinHouseholdByCode(normalized, user.uid);
      showToast({ message: "Bienvenue dans ton nouveau cocon" });
      router.replace("/");
    } catch (err) {
      setSwitchError(
        err instanceof Error
          ? err.message
          : "Impossible de rejoindre. Vérifie le code.",
      );
      setSwitching(false);
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

  async function handleToggleJournal() {
    if (!household) return;
    setTogglingJournal(true);
    try {
      // journalEnabled est on par défaut → considère undefined comme true
      const current = household.journalEnabled !== false;
      const next = !current;
      await updateHousehold(household.id, { journalEnabled: next });
      showToast({
        message: next ? "Journal activé" : "Journal désactivé",
      });
    } finally {
      setTogglingJournal(false);
    }
  }

  async function handleExportJournal() {
    if (!household) return;
    setExportingJournal(true);
    try {
      // On charge une grosse page (limite 1000 entries — au-delà, l'utilisateur
      // a probablement besoin d'un export plus avancé).
      const entries = await listJournalEntries(household.id, { limit: 1000 });
      const payload = {
        householdId: household.id,
        householdName: household.name,
        exportedAt: new Date().toISOString(),
        entries: entries.map((e) => ({
          ...e,
          createdAt: e.createdAt.toDate().toISOString(),
        })),
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `journal-cocon-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast({ message: `${entries.length} entrées exportées` });
    } finally {
      setExportingJournal(false);
    }
  }

  async function handleClearJournal() {
    if (!household) return;
    if (
      !window.confirm(
        "Effacer définitivement toutes les entrées du journal ? Cette action est irréversible.",
      )
    )
      return;
    if (
      !window.confirm(
        "Confirme une dernière fois : effacer le journal du foyer ?",
      )
    )
      return;
    setClearingJournal(true);
    try {
      const deleted = await clearJournalEntries(household.id);
      showToast({ message: `${deleted} entrées effacées` });
    } finally {
      setClearingJournal(false);
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

        {/* Code d'invitation : partage le code court avec quelqu'un pour
            qu'il rejoigne le cocon en le tapant dans /onboarding. */}
        <section className="flex flex-col gap-3">
          <h2 className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground flex items-center gap-1.5">
            <KeyRound size={11} />
            Code d&apos;invitation
          </h2>
          {household?.inviteCode ? (
            <article className="rounded-[14px] border border-[rgba(255,107,36,0.32)] bg-gradient-to-br from-[rgba(255,107,36,0.10)] to-[rgba(255,200,69,0.04)] px-5 py-4 flex flex-col gap-3">
              <button
                type="button"
                onClick={handleCopyCode}
                aria-label="Copier le code"
                className="font-display font-bold text-[36px] tracking-[0.2em] text-center text-foreground hover:text-primary transition-colors py-3 cursor-pointer select-all"
              >
                {household.inviteCode}
              </button>
              <p className="text-[12px] text-muted-foreground text-center leading-snug">
                Partage ce code avec quelqu&apos;un pour qu&apos;il rejoigne ton
                cocon. Il l&apos;entre dans l&apos;écran d&apos;accueil après
                avoir créé son compte.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="flex-1 rounded-[10px] border border-border bg-transparent text-foreground font-sans font-medium text-[13px] px-3 py-2 hover:bg-surface-elevated transition-colors flex items-center justify-center gap-2"
                >
                  <Copy size={14} />
                  Copier
                </button>
                <button
                  type="button"
                  onClick={handleRegenerateCode}
                  disabled={regeneratingCode || !isOwner}
                  className="flex-1 rounded-[10px] border border-border bg-transparent text-foreground font-sans font-medium text-[13px] px-3 py-2 hover:bg-surface-elevated transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <RefreshCw size={14} />
                  {regeneratingCode ? "..." : "Régénérer"}
                </button>
              </div>
              {!isOwner ? (
                <p className="text-[11px] text-foreground-faint text-center">
                  Seul·e l&apos;owner peut régénérer le code.
                </p>
              ) : null}
            </article>
          ) : (
            <article className="rounded-[14px] border border-border bg-surface px-5 py-4 flex flex-col gap-3 items-start">
              <p className="text-[13px] text-muted-foreground leading-snug">
                Pas encore de code d&apos;invitation pour ce cocon. Génère-en
                un pour permettre à quelqu&apos;un de rejoindre.
              </p>
              <button
                type="button"
                onClick={handleRegenerateCode}
                disabled={regeneratingCode || !isOwner}
                className="rounded-[10px] bg-primary text-primary-foreground font-sans font-semibold text-[14px] px-4 py-2 shadow-[0_0_14px_rgba(255,107,36,0.35)] hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <KeyRound size={14} />
                {regeneratingCode ? "Génération…" : "Générer un code"}
              </button>
              {!isOwner ? (
                <p className="text-[11px] text-foreground-faint">
                  Seul·e l&apos;owner peut générer un code.
                </p>
              ) : null}
            </article>
          )}
        </section>

        {/* Rejoindre un autre cocon (basculement via code) */}
        <section className="flex flex-col gap-3">
          <h2 className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground flex items-center gap-1.5">
            <LogOut size={11} />
            Rejoindre un autre cocon
          </h2>
          <form
            onSubmit={handleSwitchHousehold}
            className="rounded-[14px] border border-border bg-surface px-5 py-4 flex flex-col gap-3"
          >
            <p className="text-[12px] text-muted-foreground leading-snug">
              Tape le code d&apos;un autre cocon pour le rejoindre. Tu
              quitteras automatiquement le cocon actuel — un seul cocon
              actif à la fois.
            </p>
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="ABCD12"
              maxLength={6}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              disabled={switching || isOwner}
              className="rounded-[10px] border border-border bg-background px-4 py-3 text-[18px] font-display font-bold tracking-[0.2em] text-center uppercase focus:outline-none focus:border-primary focus:ring-2 focus:ring-[rgba(255,107,36,0.18)] disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={switching || isOwner || joinCode.trim().length < 6}
              className="rounded-[10px] bg-primary text-primary-foreground font-sans font-semibold text-[14px] px-4 py-2.5 shadow-[0_0_14px_rgba(255,107,36,0.35)] hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <LogOut size={14} />
              {switching ? "Bascule…" : "Quitter et rejoindre"}
            </button>
            {isOwner ? (
              <p className="text-[11px] text-foreground-faint leading-snug">
                Tu es owner du cocon actuel. Tu ne peux pas le quitter
                tant que le transfert d&apos;ownership n&apos;est pas
                disponible.
              </p>
            ) : null}
            {switchError ? (
              <p role="alert" className="text-[12px] text-destructive">
                {switchError}
              </p>
            ) : null}
          </form>
        </section>

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
                  <MemberAvatar
                    member={m}
                    size={40}
                    variant={isMe ? "primary" : "secondary"}
                  />
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

        {/* Journal (on par défaut) */}
        <section className="flex flex-col gap-3">
          <h2 className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
            Journal du foyer
          </h2>
          <article className="rounded-[12px] border border-border bg-surface px-4 py-3 flex items-start gap-3">
            <div className="flex-1 flex flex-col gap-1">
              <span className="text-[14px] font-medium">
                Activer le journal
              </span>
              <span className="text-[12px] text-muted-foreground leading-snug">
                Garde une trace chaleureuse des moments du foyer (tâches
                terminées, préparations, stocks renouvelés…). Désactivable
                à tout moment.
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={household?.journalEnabled !== false}
              onClick={handleToggleJournal}
              disabled={togglingJournal || !household}
              className={`shrink-0 w-11 h-6 rounded-full relative transition-colors ${
                household?.journalEnabled !== false
                  ? "bg-primary"
                  : "bg-border"
              } disabled:opacity-50`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                  household?.journalEnabled !== false
                    ? "translate-x-5"
                    : "translate-x-0"
                }`}
              />
            </button>
          </article>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleExportJournal}
              disabled={exportingJournal || !household}
              className="rounded-[12px] border border-border bg-surface px-3 py-3 text-[13px] font-medium hover:bg-surface-elevated transition-colors disabled:opacity-50"
            >
              {exportingJournal ? "..." : "Exporter (JSON)"}
            </button>
            <button
              type="button"
              onClick={handleClearJournal}
              disabled={clearingJournal || !household}
              className="rounded-[12px] border border-destructive/40 bg-surface px-3 py-3 text-[13px] font-medium text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
            >
              {clearingJournal ? "..." : "Effacer le journal"}
            </button>
          </div>
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
