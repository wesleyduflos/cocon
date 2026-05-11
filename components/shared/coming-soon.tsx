interface ComingSoonProps {
  emoji: string;
  title: string;
  sprintHint: string;
}

export function ComingSoon({ emoji, title, sprintHint }: ComingSoonProps) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm flex flex-col gap-5 items-center text-center">
        <div className="text-[56px] leading-none">{emoji}</div>
        <h1 className="font-display text-[24px] font-semibold leading-[1.1]">
          {title}
        </h1>
        <p className="text-[14px] text-muted-foreground leading-[1.5]">
          {sprintHint}
        </p>
        <p className="text-[12px] text-foreground-faint leading-[1.5]">
          Disponible dans une prochaine version.
        </p>
      </div>
    </main>
  );
}
