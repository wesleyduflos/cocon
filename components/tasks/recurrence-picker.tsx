"use client";

import { useEffect, useState } from "react";

import {
  buildRRule,
  extractRRuleComponents,
  type RecurrencePreset,
  type RecurrenceWeekday,
  WEEKDAY_VALUES,
} from "@/lib/recurrence";

const WEEKDAY_LABELS: Record<RecurrenceWeekday, string> = {
  MO: "L",
  TU: "M",
  WE: "M",
  TH: "J",
  FR: "V",
  SA: "S",
  SU: "D",
};

const PRESETS: Array<{ value: RecurrencePreset; label: string }> = [
  { value: "daily", label: "Tous les jours" },
  { value: "weekly", label: "Toutes les semaines" },
  { value: "monthly", label: "Tous les mois" },
];

interface RecurrencePickerProps {
  value: string | null; // RRULE actuelle ou null
  onChange: (rule: string | null) => void;
  disabled?: boolean;
}

export function RecurrencePicker({
  value,
  onChange,
  disabled,
}: RecurrencePickerProps) {
  const [preset, setPreset] = useState<RecurrencePreset | "none">("none");
  const [byDay, setByDay] = useState<RecurrenceWeekday[]>([]);
  const [byMonthDay, setByMonthDay] = useState<number>(1);

  // Initialisation depuis la value reçue (pour le mode édition)
  useEffect(() => {
    if (!value) {
      setPreset("none");
      return;
    }
    const components = extractRRuleComponents(value);
    setPreset(components.preset);
    if (components.byDay) setByDay(components.byDay);
    if (components.byMonthDay) setByMonthDay(components.byMonthDay);
  }, [value]);

  function emit(
    nextPreset: RecurrencePreset | "none",
    nextByDay: RecurrenceWeekday[],
    nextByMonthDay: number,
  ) {
    if (nextPreset === "none") {
      onChange(null);
      return;
    }
    const rule = buildRRule({
      preset: nextPreset,
      byDay: nextByDay,
      byMonthDay: nextByMonthDay,
    });
    onChange(rule);
  }

  function handlePresetChange(next: RecurrencePreset | "none") {
    setPreset(next);
    // Defaults sensés pour weekly et monthly
    let nextByDay = byDay;
    let nextByMonthDay = byMonthDay;
    if (next === "weekly" && byDay.length === 0) {
      nextByDay = ["MO"];
      setByDay(nextByDay);
    }
    if (next === "monthly" && (!byMonthDay || byMonthDay < 1)) {
      nextByMonthDay = 1;
      setByMonthDay(nextByMonthDay);
    }
    emit(next, nextByDay, nextByMonthDay);
  }

  function toggleByDay(day: RecurrenceWeekday) {
    const next = byDay.includes(day)
      ? byDay.filter((d) => d !== day)
      : [...byDay, day];
    setByDay(next);
    emit(preset, next, byMonthDay);
  }

  function handleByMonthDay(value: number) {
    setByMonthDay(value);
    emit(preset, byDay, value);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Pill
          active={preset === "none"}
          onClick={() => handlePresetChange("none")}
          disabled={disabled}
        >
          Jamais
        </Pill>
        {PRESETS.map((p) => (
          <Pill
            key={p.value}
            active={preset === p.value}
            onClick={() => handlePresetChange(p.value)}
            disabled={disabled}
          >
            {p.label}
          </Pill>
        ))}
      </div>

      {preset === "weekly" ? (
        <div className="flex gap-1.5">
          {WEEKDAY_VALUES.map((day) => {
            const active = byDay.includes(day);
            return (
              <button
                key={day}
                type="button"
                onClick={() => toggleByDay(day)}
                disabled={disabled}
                aria-pressed={active}
                aria-label={day}
                className={`w-9 h-9 rounded-full text-[12px] font-semibold transition-all ${
                  active
                    ? "bg-primary text-primary-foreground shadow-[0_0_10px_rgba(255,107,36,0.4)]"
                    : "bg-surface border border-border text-muted-foreground hover:bg-surface-elevated"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {WEEKDAY_LABELS[day]}
              </button>
            );
          })}
        </div>
      ) : null}

      {preset === "monthly" ? (
        <div className="flex items-center gap-3">
          <label className="text-[13px] text-muted-foreground">
            Le jour
          </label>
          <input
            type="number"
            min={1}
            max={31}
            value={byMonthDay}
            onChange={(e) =>
              handleByMonthDay(Math.max(1, Math.min(31, Number(e.target.value))))
            }
            disabled={disabled}
            className="w-16 rounded-[10px] border border-border bg-surface px-2 py-1.5 text-[14px] text-center focus:outline-none focus:border-primary disabled:opacity-50"
          />
          <span className="text-[13px] text-muted-foreground">du mois</span>
        </div>
      ) : null}
    </div>
  );
}

function Pill({
  active,
  onClick,
  disabled,
  children,
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-all ${
        active
          ? "bg-primary text-primary-foreground shadow-[0_0_10px_rgba(255,107,36,0.4)]"
          : "bg-surface border border-border text-muted-foreground hover:bg-surface-elevated"
      } disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  );
}
