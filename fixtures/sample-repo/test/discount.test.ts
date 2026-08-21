import { test, expect } from "vitest";
import { discounted } from "../src/discount.js";

test("applies a percentage", () => {
  expect(discounted(100, 0.1)).toBe(90);
});
