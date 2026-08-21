import { execFileSync } from "node:child_process";

/** Parse `git diff --name-only` output into repo-relative paths. Pure. */
export function parseDiffOutput(raw: string): string[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export interface DiffOptions {
  base: string;
  head?: string;
  cwd?: string;
}

/** Run git and return the changed files for a range. */
export function diffNames(opts: DiffOptions): string[] {
  const range = opts.head ? `${opts.base}..${opts.head}` : opts.base;
  const raw = execFileSync("git", ["diff", "--name-only", range], {
    cwd: opts.cwd ?? process.cwd(),
    encoding: "utf8",
  });
  return parseDiffOutput(raw);
}
