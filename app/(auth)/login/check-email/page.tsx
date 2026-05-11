"use client";

import { useEffect, useState } from "react";

import { retrieveEmailForMagicLink } from "@/lib/auth/magic-link";

export default function CheckEmailPage() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    setEmail(retrieveEmailForMagicLink());
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <p className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
          On t&apos;envoie un lien
        </p>
        <h1 className="font-display text-[28px] font-semibold leading-[1.05]">
          Vérifie ta <span className="greeting-gradient">boîte mail</span>.
        </h1>
      </header>

      <p className="text-[15px] text-foreground leading-[1.5]">
        {email ? (
          <>
            Un lien de connexion a été envoyé à{" "}
            <span className="font-medium text-foreground">{email}</span>.
          </>
        ) : (
          <>Un lien de connexion vient d&apos;être envoyé.</>
        )}
      </p>

      <ul className="flex flex-col gap-3 text-[13px] text-muted-foreground leading-[1.5]">
        <li>
          1. Ouvre l&apos;email et clique sur le lien — il expire dans 15
          minutes.
        </li>
        <li>
          2. Reviens sur cette fenêtre pour finir la connexion automatiquement.
        </li>
        <li>3. Le lien ne marche qu&apos;une fois, sur n&apos;importe quel appareil.</li>
      </ul>

      <p className="text-[12px] text-foreground-faint leading-[1.5]">
        Rien dans la boîte ? Vérifie les indésirables ou réessaie depuis
        l&apos;écran précédent.
      </p>
    </div>
  );
}
