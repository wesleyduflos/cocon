"use client";

import { onSnapshot } from "firebase/firestore";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useToast } from "@/components/shared/toast-provider";
import { useCurrentHousehold } from "@/hooks/use-household";
import {
  deleteShoppingItem,
  shoppingItemDoc,
  updateShoppingItemNotes,
} from "@/lib/firebase/firestore";
import type { ShoppingItem, WithId } from "@/types/cocon";

export default function ShoppingItemDetailPage() {
  const router = useRouter();
  const params = useParams<{ itemId: string }>();
  const itemId = params.itemId;
  const { household } = useCurrentHousehold();
  const { showToast } = useToast();

  const [item, setItem] = useState<WithId<ShoppingItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [notes, setNotes] = useState("");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!household?.id || !itemId) return;
    const unsubscribe = onSnapshot(
      shoppingItemDoc(household.id, itemId),
      (snap) => {
        if (!snap.exists()) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        const data = { ...snap.data(), id: snap.id };
        setItem(data);
        setNotes(data.notes ?? "");
        setLoading(false);
      },
      () => {
        setNotFound(true);
        setLoading(false);
      },
    );
    return unsubscribe;
  }, [household?.id, itemId]);

  async function handleDelete() {
    if (!household || !item) return;
    if (!window.confirm("Supprimer cet article ?")) return;
    setBusy(true);
    try {
      await deleteShoppingItem(household.id, item.id);
      router.replace("/shopping");
    } catch {
      setBusy(false);
    }
  }

  async function handleSaveNotes() {
    if (!household || !item) return;
    setBusy(true);
    try {
      await updateShoppingItemNotes(household.id, item.id, notes);
      showToast({ message: "Note mise à jour" });
      setEditing(false);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <p className="text-[13px] text-muted-foreground">Chargement…</p>
      </main>
    );
  }

  if (notFound || !item) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-12 gap-4">
        <p className="text-[14px] text-muted-foreground">
          Article introuvable.
        </p>
        <button
          type="button"
          onClick={() => router.replace("/shopping")}
          className="rounded-[12px] border border-border bg-transparent text-foreground font-sans font-semibold text-[14px] px-[16px] py-2 hover:bg-surface-elevated"
        >
          Retour aux courses
        </button>
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
          className="w-9 h-9 rounded-[10px] bg-surface flex items-center justify-center hover:bg-surface-elevated transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-2">
          <Link
            href={`/shopping/${item.id}/edit`}
            aria-label="Modifier"
            className="w-9 h-9 rounded-[10px] bg-surface flex items-center justify-center hover:bg-surface-elevated transition-colors"
          >
            <Pencil size={16} />
          </Link>
          <button
            type="button"
            onClick={handleDelete}
            disabled={busy}
            aria-label="Supprimer"
            className="w-9 h-9 rounded-[10px] bg-surface flex items-center justify-center hover:bg-destructive/20 hover:text-destructive transition-colors disabled:opacity-50"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </header>

      <div className="w-full max-w-md mx-auto flex flex-col gap-6">
        <section className="flex flex-col gap-2">
          <p className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
            {item.rayon}
          </p>
          <h1 className="font-display text-[28px] font-semibold leading-[1.1] flex items-center gap-2">
            {item.emoji ? (
              <span className="text-[28px]">{item.emoji}</span>
            ) : null}
            {item.name}
          </h1>
          <p className="text-[14px] text-muted-foreground">
            ×{item.quantity}
            {item.unit ? ` ${item.unit}` : ""}
            {item.status === "bought" ? " · acheté" : null}
            {item.fromStockAuto ? " · auto-ajouté (stock bas)" : null}
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
              Note contextuelle
            </h2>
            {!editing ? (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="text-[12px] text-primary hover:text-[var(--primary-hover)]"
              >
                Modifier
              </button>
            ) : null}
          </div>
          {editing ? (
            <div className="flex flex-col gap-2">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="ex. Marque flacon vert, pas la blanche"
                rows={3}
                disabled={busy}
                className="rounded-[12px] border border-border bg-surface px-4 py-3 text-[14px] focus:outline-none focus:border-primary resize-none"
              />
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setNotes(item.notes ?? "");
                    setEditing(false);
                  }}
                  disabled={busy}
                  className="text-[13px] text-muted-foreground hover:text-foreground px-3 py-1.5"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleSaveNotes}
                  disabled={busy}
                  className="rounded-[10px] bg-primary text-primary-foreground text-[13px] font-semibold px-3 py-1.5 disabled:opacity-50"
                >
                  Enregistrer
                </button>
              </div>
            </div>
          ) : item.notes ? (
            <p className="rounded-[12px] border border-border bg-surface px-4 py-3 text-[14px] leading-[1.5] whitespace-pre-wrap">
              {item.notes}
            </p>
          ) : (
            <p className="rounded-[12px] border border-border-subtle bg-transparent px-4 py-3 text-[13px] text-foreground-faint">
              Pas de note pour l&apos;instant.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
