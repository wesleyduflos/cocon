interface QuantityPillProps {
  quantity: number;
  unit?: string;
}

/**
 * Pill quantité pour les items de courses — variante A.
 *
 * - Safran par défaut (`--secondary`)
 * - Orange si quantité ≥ 2 ou unité L / kg (signaux "gros volume")
 * - Format :
 *    - unit défini : "2L", "200g", "12"
 *    - unit absent ou pcs et quantity > 1 : "×4"
 *    - unit absent ou pcs et quantity = 1 : "1"
 */
export function formatQuantityLabel(quantity: number, unit?: string): string {
  if (unit && unit !== "pcs") {
    return `${quantity}${unit}`;
  }
  if (quantity > 1) return `×${quantity}`;
  return "1";
}

export function QuantityPill({ quantity, unit }: QuantityPillProps) {
  const label = formatQuantityLabel(quantity, unit);
  const isAccent =
    quantity >= 2 || unit === "L" || unit === "kg";

  if (isAccent) {
    return (
      <span className="font-display font-bold text-[16px] text-primary bg-[rgba(255,107,36,0.16)] rounded-[8px] px-2.5 py-0.5 shrink-0">
        {label}
      </span>
    );
  }
  return (
    <span className="font-display font-bold text-[15px] text-secondary bg-[rgba(255,200,69,0.12)] rounded-[8px] px-2.5 py-0.5 shrink-0">
      {label}
    </span>
  );
}
