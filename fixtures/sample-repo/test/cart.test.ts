import { test, expect } from "vitest";
import { total } from "../src/cart.js";

test("sums a cart", () => {
  expect(total([{ cents: 100, pct: 0.1 }])).toBe(90);
});
