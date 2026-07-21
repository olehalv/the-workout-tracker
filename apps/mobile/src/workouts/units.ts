/** Weight unit preference. Weights are always stored canonically in kg. */
export type WeightUnit = "kg" | "lbs";

const LB_PER_KG = 2.2046226218;

/** Convert a stored kg weight to the display unit (rounded to 1 decimal). */
export function toDisplayWeight(kg: number, unit: WeightUnit): number {
  const v = unit === "kg" ? kg : kg * LB_PER_KG;
  return Math.round(v * 10) / 10;
}

/** Convert a value entered in the display unit back to canonical kg. */
export function fromDisplayWeight(value: number, unit: WeightUnit): number {
  return unit === "kg" ? value : value / LB_PER_KG;
}

/** "100 kg" / "220.5 lbs" from a stored kg weight. */
export function fmtWeight(kg: number, unit: WeightUnit): string {
  return `${toDisplayWeight(kg, unit)} ${unit}`;
}
