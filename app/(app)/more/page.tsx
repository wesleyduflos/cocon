import { BookOpen, NotebookPen, Settings, Sparkles } from "lucide-react";
import Link from "next/link";

interface Card {
  href: string;
  emoji: string;
  icon: typeof BookOpen;
  title: string;
  subtitle: string;
  available: boolean;
}

const CARDS: Card[] = [
  {
    href: "/more",
    icon: BookOpen,
    emoji: "📚",
    title: "Mémoire",
    subtitle: "Codes, contacts, manuels",
    available: false,
  },
  {
    href: "/more",
    icon: NotebookPen,
    emoji: "📓",
    title: "Journal",
    subtitle: "L'histoire du cocon",
    available: false,
  },
  {
    href: "/more",
    icon: Sparkles,
    emoji: "✨",
    title: "Assistant",
    subtitle: "IA · suggestions",
    available: false,
  },
  {
    href: "/settings",
    icon: Settings,
    emoji: "⚙️",
    title: "Paramètres",
    subtitle: "Profil, cocon, apparence",
    available: true,
  },
];

export default function MorePage() {
  return (
    <main className="flex flex-1 flex-col px-5 py-7">
      <div className="w-full max-w-md mx-auto flex flex-col gap-6">
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
            const content = (
              <article
                className={`rounded-[14px] border bg-surface px-4 py-5 flex flex-col gap-2 h-full transition-colors ${
                  card.available
                    ? "border-border hover:bg-surface-elevated"
                    : "border-border-subtle opacity-70"
                }`}
              >
                <div className="text-[28px]">{card.emoji}</div>
                <p className="text-[15px] font-semibold leading-tight">
                  {card.title}
                </p>
                <p className="text-[12px] text-muted-foreground leading-snug">
                  {card.subtitle}
                </p>
                {!card.available ? (
                  <span className="text-[10px] uppercase tracking-[0.1em] text-foreground-faint mt-1">
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
