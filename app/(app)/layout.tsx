"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { useAuth } from "@/hooks/use-auth";
import { getHouseholdsOfUser } from "@/lib/firebase/firestore";

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [checkingHousehold, setCheckingHousehold] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    let cancelled = false;
    getHouseholdsOfUser(user.uid)
      .then((households) => {
        if (cancelled) return;
        if (households.length === 0) {
          router.replace("/onboarding");
        } else {
          setCheckingHousehold(false);
        }
      })
      .catch(() => {
        if (cancelled) return;
        // En cas d'erreur de lecture, on laisse passer pour ne pas bloquer
        // l'utilisateur — l'écran consommateur affichera son propre message.
        setCheckingHousehold(false);
      });
    return () => {
      cancelled = true;
    };
    // Re-check à chaque changement de route (pour le cas où on vient de
    // créer/rejoindre un cocon depuis /onboarding ou /join).
  }, [user, loading, router, pathname]);

  if (loading || checkingHousehold) {
    return (
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <p className="text-[13px] text-muted-foreground">Chargement…</p>
      </main>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
