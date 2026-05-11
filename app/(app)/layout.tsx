"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useAuth } from "@/hooks/use-auth";

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  if (loading) {
    return (
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <p className="text-[13px] text-muted-foreground">Chargement…</p>
      </main>
    );
  }

  // Pendant le tick de redirection, on évite tout flash de contenu protégé.
  if (!user) return null;

  return <>{children}</>;
}
