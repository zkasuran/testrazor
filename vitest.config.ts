import { defineConfig } from "vitest/config";

// SpecGuard dogfoods itself: vitest emits JUnit XML that `specguard check`
// then reads to prove every acceptance criterion in .kiro/specs is covered.
export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    reporters: [
      "default",
      ["junit", { outputFile: "reports/junit.xml" }],
    ],
  },
});
