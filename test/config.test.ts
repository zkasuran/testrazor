import { describe, it, expect } from "vitest";
import { mergeConfig, DEFAULTS } from "../src/config.js";

describe("config", () => {
  it("@covers 6.3 CLI overrides the file which overrides defaults", () => {
    const merged = mergeConfig({ base: "main", root: "lib" }, { base: "develop" });
    expect(merged.base).toBe("develop");
    expect(merged.root).toBe("lib");
    expect(merged.quarantine).toBe(DEFAULTS.quarantine);
  });

  it("@covers 6.2 loads values from the file when no CLI flag is set", () => {
    expect(mergeConfig({ reports: ["a.xml"] }, {}).reports).toEqual(["a.xml"]);
  });
});
