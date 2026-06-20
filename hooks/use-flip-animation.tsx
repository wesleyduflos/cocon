"use client";

import { useLayoutEffect, useRef, type RefObject } from "react";

/**
 * Hook FLIP (First-Last-Invert-Play) léger pour animer le réordre d'une
 * liste sans dépendance externe.
 *
 * Usage :
 * ```tsx
 * const { register } = useFlipAnimation(itemIds);
 * return items.map((item) => <li key={item.id} ref={register(item.id)} />);
 * ```
 *
 * À chaque re-render qui modifie l'ordre des `itemIds`, le hook :
 *  1. Mesure les positions actuelles (FIRST)
 *  2. Compare aux positions précédentes (LAST)
 *  3. Applique un translate inverse instantané (INVERT)
 *  4. Anime vers 0 via CSS transition (PLAY)
 *
 * Animation : 280ms ease-out, accélérée en mode prefers-reduced-motion (skip).
 */
export function useFlipAnimation<T extends string>(itemIds: T[]) {
  const refs = useRef<Map<T, HTMLElement>>(new Map());
  const positions = useRef<Map<T, number>>(new Map());

  useLayoutEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const newPositions = new Map<T, number>();
    refs.current.forEach((el, id) => {
      if (el?.isConnected) {
        newPositions.set(id, el.getBoundingClientRect().top);
      }
    });
    refs.current.forEach((el, id) => {
      if (!el?.isConnected) return;
      const prev = positions.current.get(id);
      const curr = newPositions.get(id);
      if (prev === undefined || curr === undefined) return;
      const delta = prev - curr;
      if (Math.abs(delta) < 1) return;
      el.style.transform = `translateY(${delta}px)`;
      el.style.transition = "none";
      // Force reflow puis lance la transition
      void el.offsetHeight;
      el.style.transform = "";
      el.style.transition = "transform 280ms cubic-bezier(0.2, 0.8, 0.2, 1)";
    });
    positions.current = newPositions;
    // itemIds est la dépendance qui re-déclenche le hook quand l'ordre change
  }, [itemIds]);

  function register(id: T): RefObject<HTMLLIElement | null> {
    const ref = (el: HTMLLIElement | null) => {
      if (el) refs.current.set(id, el);
      else refs.current.delete(id);
    };
    // Cast pour compat callback ref / RefObject (utilisation directe en ref={})
    return ref as unknown as RefObject<HTMLLIElement | null>;
  }

  return { register };
}
