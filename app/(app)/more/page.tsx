import {
  BookOpen,
  Box,
  CheckSquare,
  NotebookPen,
  Settings,
} from "lucide-react";
import Link from "next/link";

interface Card {
  href: string;
  icon: typeof BookOpen;
  title: string;
  subtitle: string;
  available: boolean;
}

const CARDS: Card[] = [
  {
    href: "/memory",
    icon: BookOpen,
    title: "Mémoire",
    subtitle: "Codes, contacts, manuels",
    available: true,
  },
  {
    href: "/stocks",
    icon: Box,
    title: "Stocks",
    subtitle: "Réserves du foyer",
    available: true,
  },
  {
    href: "/preparations",
    icon: CheckSquare,
    title: "Préparations",
    subtitle: "Routines & checklists",
    available: true,
  },
  {
    href: "/journal",
    icon: NotebookPen,
    title: "Journal",
    subtitle: "L'histoire du cocon",
    available: true,
  },
  {
    href: "/settings",
    icon: Settings,
    title: "Paramètres",
    subtitle: "Profil, cocon, apparence",
    available: true,
  },
];

export default function MorePage() {
  return (
    <main className="flex flex-1 flex-col px-5 py-7">
      <div className="w-full max-w-md mx-auto flex flex-col gap-5">
        <header className="flex flex-col gap-1.5">
          <p className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
            Plus
          </p>
          <h1 className="font-display text-[28px] font-semibold leading-[1.05]">
            Plus de modules
          </h1>
        </header>

        <div className="grid grid-cols-2 gap-3">
          {CARDS.map((card) => {
            const Icon = card.icon;
            const content = (
              <article
                className={`rounded-[14px] border bg-surface px-4 py-5 flex flex-col gap-2 h-full transition-colors ${
                  card.available
                    ? "border-border hover:bg-surface-elevated"
                    : "border-border-subtle opacity-60"
                }`}
              >
                <Icon
                  size={22}
                  className={
                    card.available ? "text-primary" : "text-foreground-faint"
                  }
                />
                <p className="text-[14px] font-semibold leading-tight">
                  {card.title}
                </p>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  {card.subtitle}
                </p>
                {!card.available ? (
                  <span className="text-[10px] uppercase tracking-[0.1em] text-foreground-faint mt-auto">
                    Bientôt
                  </span>
                ) : null}
              </article>
            );
            return card.available ? (
              <Link key={card.title} href={card.href}>
                {content}
              </Link>
            ) : (
              <div key={card.title}>{content}</div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
