import { price } from "./price.js";

export function discounted(cents: number, pct: number): number {
  const base = price(cents);
  return base - Math.round(base * pct);
}
