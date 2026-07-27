export type WeightUnit = "kg" | "lbs";

const LB_PER_KG = 2.2046226218;

export function toDisplayWeight(kg: number, unit: WeightUnit): number {
  const v = unit === "kg" ? kg : kg * LB_PER_KG;
  return Math.round(v * 10) / 10;
}

export function fromDisplayWeight(value: number, unit: WeightUnit): number {
  return unit === "kg" ? value : value / LB_PER_KG;
}

export function fmtWeight(kg: number, unit: WeightUnit): string {
  return `${toDisplayWeight(kg, unit)} ${unit}`;
}
