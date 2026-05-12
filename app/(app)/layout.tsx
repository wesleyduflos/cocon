"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { BottomNav } from "@/components/shared/bottom-nav";
import { ThemeApplier } from "@/components/shared/theme-applier";
import { ToastProvider } from "@/components/shared/toast-provider";
import { useAuth } from "@/hooks/use-auth";
import { HouseholdProvider, useCurrentHousehold } from "@/hooks/use-household";

// Sprint 5 polish : Wesley veut le footer TOUJOURS visible partout.
// Plus de FULLSCREEN_ROUTES — le BottomNav est rendu sur toutes les
// pages du groupe (app). Le mode supermarché ajuste son propre padding
// bottom pour que sa barre rayons ne chevauche pas le BottomNav.

function AppLayoutInner({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { household, loading: householdLoading } = useCurrentHousehold();
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!householdLoading && !household) {
      router.replace("/onboarding");
    }
  }, [user, authLoading, household, householdLoading, router]);

  if (authLoading || householdLoading) {
    return (
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <p className="text-[13px] text-muted-foreground">Chargement…</p>
      </main>
    );
  }

  if (!user || !household) return null;

  return (
    <>
      <ThemeApplier />
      <div className="flex flex-1 flex-col pb-24">{children}</div>
      <BottomNav />
    </>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <HouseholdProvider>
      <ToastProvider>
        <AppLayoutInner>{children}</AppLayoutInner>
      </ToastProvider>
    </HouseholdProvider>
  );
}
