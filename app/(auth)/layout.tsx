import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex flex-1 flex-col px-6 py-12 sm:py-16">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground-muted mb-12">
        <span className="w-2.5 h-2.5 rounded-full glow-dot" />
        <span className="font-display text-foreground">Cocon</span>
      </div>
      <div className="flex flex-1 items-center justify-center">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </main>
  );
}
