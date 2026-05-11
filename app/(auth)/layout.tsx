import Image from "next/image";
import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex flex-1 flex-col px-6 py-12 sm:py-16">
      <div className="flex items-center gap-2.5 mb-12">
        <Image
          src="/icons/logo-mark.png"
          alt=""
          width={28}
          height={28}
          priority
          className="rounded-[8px] drop-shadow-[0_0_18px_rgba(255,107,36,0.55)]"
        />
        <span className="font-display text-[18px] font-semibold text-foreground">
          Cocon
        </span>
      </div>
      <div className="flex flex-1 items-center justify-center">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </main>
  );
}
