export type TestStatus = "pass" | "fail" | "skip";
export type TestId = string;

export interface TestOutcome {
  id: TestId;
  status: TestStatus;
  file?: string;
  time?: number;
}

export interface RunResults {
  runId: string;
  outcomes: TestOutcome[];
}

/** Repo-relative dependency graph for JavaScript and TypeScript sources. */
export interface DepGraph {
  /** file -> files it imports directly (repo-relative paths). */
  imports: Map<string, Set<string>>;
  /** files matching the test glob (repo-relative paths). */
  testFiles: Set<string>;
}

export interface FlakeVerdict {
  id: TestId;
  passes: number;
  fails: number;
  runs: number;
  /** 0 (stable) to 1 (maximally flaky). */
  score: number;
  flaky: boolean;
  consistentFailure: boolean;
}

export interface QuarantineEntry {
  id: TestId;
  score: number;
  seenRuns: string[];
  addedAt: string; // ISO date
}

export interface ImpactResult {
  total: number;
  selected: string[];
  /** true when a non-source change forced selecting every test. */
  selectedAll: boolean;
  /** changed paths that are not resolvable source files. */
  unmappedFiles: string[];
  /** changed source files that no test imports. */
  uncoveredChanges: string[];
}

export interface GateResult {
  passed: boolean;
  failing: TestId[];
  ignoredFlaky: TestId[];
}
