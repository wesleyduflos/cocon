"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { BottomNav } from "@/components/shared/bottom-nav";
import { ThemeApplier } from "@/components/shared/theme-applier";
import { ToastProvider } from "@/components/shared/toast-provider";
import { useAuth } from "@/hooks/use-auth";
import { HouseholdProvider, useCurrentHousehold } from "@/hooks/use-household";

// Routes qui s'affichent en plein écran (sans la bottom nav).
// Cf. screens-spec.md §2.3 : création de tâche, mode supermarché, login.
const FULLSCREEN_ROUTES = ["/tasks/new", "/calendar/new", "/invite"];

function isFullscreen(pathname: string): boolean {
  return FULLSCREEN_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

function AppLayoutInner({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { household, loading: householdLoading } = useCurrentHousehold();
  const router = useRouter();
  const pathname = usePathname();

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

  const fullscreen = isFullscreen(pathname);

  return (
    <>
      <ThemeApplier />
      <div className={`flex flex-1 flex-col ${fullscreen ? "" : "pb-24"}`}>
        {children}
      </div>
      {!fullscreen ? <BottomNav /> : null}
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
