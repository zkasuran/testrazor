import { readFileSync, existsSync } from "node:fs";

export interface TestrazorConfig {
  /** JUnit XML result files, one per run. */
  reports: string[];
  /** project root for the import graph. */
  root: string;
  /** path to the committed quarantine file. */
  quarantine: string;
  /** default git base ref for impact diffs. */
  base: string;
  /** optional test-file matcher as a regex source string. */
  testPattern?: string;
}

export const DEFAULTS: TestrazorConfig = {
  reports: [],
  root: ".",
  quarantine: ".testrazor/quarantine.json",
  base: "origin/main",
};

/** Load testrazor.config.json if present. Missing file is not an error. */
export function loadConfig(path = "testrazor.config.json"): Partial<TestrazorConfig> {
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, "utf8")) as Partial<TestrazorConfig>;
  } catch (e) {
    throw new Error(`Could not parse ${path}: ${(e as Error).message}`);
  }
}

/** CLI flags win over the config file, which wins over defaults. */
export function mergeConfig(
  file: Partial<TestrazorConfig>,
  cli: Partial<TestrazorConfig>,
): TestrazorConfig {
  const merged: TestrazorConfig = {
    reports: cli.reports ?? file.reports ?? DEFAULTS.reports,
    root: cli.root ?? file.root ?? DEFAULTS.root,
    quarantine: cli.quarantine ?? file.quarantine ?? DEFAULTS.quarantine,
    base: cli.base ?? file.base ?? DEFAULTS.base,
  };
  const testPattern = cli.testPattern ?? file.testPattern;
  if (testPattern !== undefined) merged.testPattern = testPattern;
  return merged;
}
