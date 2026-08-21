import { discounted } from "./discount.js";

export function total(items: Array<{ cents: number; pct: number }>): number {
  return items.reduce((sum, item) => sum + discounted(item.cents, item.pct), 0);
}
