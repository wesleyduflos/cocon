"use client";

import { useCallback, useEffect, useState } from "react";

import { listJournalEntries } from "@/lib/firebase/firestore";
import type { JournalEntry, WithId } from "@/types/cocon";

const PAGE_SIZE = 30;

interface JournalState {
  entries: WithId<JournalEntry>[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
}

export function useJournalEntries(householdId: string | undefined) {
  const [state, setState] = useState<JournalState>({
    entries: [],
    loading: true,
    loadingMore: false,
    hasMore: true,
  });

  // Charge la première page à chaque changement de cocon
  useEffect(() => {
    let cancelled = false;
    if (!householdId) {
      setState({
        entries: [],
        loading: false,
        loadingMore: false,
        hasMore: false,
      });
      return;
    }
    setState((s) => ({ ...s, loading: true }));
    listJournalEntries(householdId, { limit: PAGE_SIZE })
      .then((entries) => {
        if (cancelled) return;
        setState({
          entries,
          loading: false,
          loadingMore: false,
          hasMore: entries.length === PAGE_SIZE,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setState({
          entries: [],
          loading: false,
          loadingMore: false,
          hasMore: false,
        });
      });
    return () => {
      cancelled = true;
    };
  }, [householdId]);

  const loadMore = useCallback(async () => {
    if (!householdId) return;
    setState((s) => {
      if (s.loadingMore || !s.hasMore) return s;
      return { ...s, loadingMore: true };
    });
    const last = state.entries[state.entries.length - 1];
    if (!last) {
      setState((s) => ({ ...s, loadingMore: false }));
      return;
    }
    try {
      const next = await listJournalEntries(householdId, {
        limit: PAGE_SIZE,
        before: last.createdAt,
      });
      setState((s) => ({
        entries: [...s.entries, ...next],
        loading: false,
        loadingMore: false,
        hasMore: next.length === PAGE_SIZE,
      }));
    } catch {
      setState((s) => ({ ...s, loadingMore: false }));
    }
  }, [householdId, state.entries]);

  const refresh = useCallback(async () => {
    if (!householdId) return;
    setState((s) => ({ ...s, loading: true }));
    try {
      const entries = await listJournalEntries(householdId, {
        limit: PAGE_SIZE,
      });
      setState({
        entries,
        loading: false,
        loadingMore: false,
        hasMore: entries.length === PAGE_SIZE,
      });
    } catch {
      setState((s) => ({ ...s, loading: false }));
    }
  }, [householdId]);

  return {
    entries: state.entries,
    loading: state.loading,
    loadingMore: state.loadingMore,
    hasMore: state.hasMore,
    loadMore,
    refresh,
  };
}
