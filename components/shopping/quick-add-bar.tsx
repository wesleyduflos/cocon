"use client";

import { Plus, Sparkles } from "lucide-react";
import {
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";

import { useToast } from "@/components/shared/toast-provider";
import { parseShoppingItemNatural } from "@/lib/ai/parse-shopping";
import { createShoppingItem } from "@/lib/firebase/firestore";
import type { ShoppingRayon } from "@/types/cocon";

interface QuickAddBarProps {
  householdId: string;
  userId: string;
  onAdded?: (name: string) => void;
}

/**
 * Champ d'ajout rapide sticky en haut de /shopping (sprint 6 — bloc A).
 *
 * Tape juste le nom (« lait », « comté »), IA parseShoppingItem infère
 * rayon + emoji + casse corrigée. Fallback rayon « Autre » sans emoji
 * si l'IA timeout / erreur.
 */
export function ShoppingQuickAddBar({
  householdId,
  userId,
  onAdded,
}: QuickAddBarProps) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const { showToast } = useToast();

  async function submit() {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      let name = trimmed;
      let emoji: string | undefined;
      let rayon: ShoppingRayon = "Autre";
      let unit: string | undefined;
      let quantity = 1;
      try {
        const ai = await parseShoppingItemNatural(trimmed);
        name = ai.name || trimmed;
        emoji = ai.emoji;
        rayon = ai.rayon ?? "Autre";
        unit = ai.unit;
        quantity = ai.quantity && ai.quantity > 0 ? ai.quantity : 1;
      } catch {
        showToast({
          message: `« ${trimmed} » ajouté sans catégorie — modifier ?`,
        });
      }
      await createShoppingItem(householdId, {
        name,
        emoji,
        quantity,
        unit,
        rayon,
        addedBy: userId,
      });
      setText("");
      onAdded?.(name);
    } finally {
      setBusy(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void submit();
  }

  function handleKey(e: ReactKeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      void submit();
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2.5 px-3.5 py-3 rounded-[14px] bg-surface border border-border-subtle shadow-[0_2px_8px_rgba(0,0,0,0.18)]"
    >
      <Sparkles
        size={18}
        className="text-secondary shrink-0"
        aria-label="Ajout intelligent"
      />
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKey}
        placeholder="Ajouter un article…"
        disabled={busy}
        className="flex-1 bg-transparent outline-none text-[15px] placeholder:text-foreground-faint disabled:opacity-60"
      />
      <button
        type="submit"
        disabled={!text.trim() || busy}
        aria-label="Ajouter"
        className="w-[30px] h-[30px] rounded-full bg-[linear-gradient(135deg,var(--primary),var(--secondary))] text-primary-foreground flex items-center justify-center shadow-[0_0_10px_rgba(255,107,36,0.45)] disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
      >
        <Plus size={16} strokeWidth={2.6} />
      </button>
    </form>
  );
}
