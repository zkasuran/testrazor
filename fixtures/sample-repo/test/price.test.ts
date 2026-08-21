import { test, expect } from "vitest";
import { price } from "../src/price.js";

test("clamps to zero", () => {
  expect(price(-5)).toBe(0);
});
