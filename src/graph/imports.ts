import { readFileSync, readdirSync } from "node:fs";
import { join, relative, dirname, resolve, sep } from "node:path";
import type { DepGraph } from "../models.js";

const SOURCE_EXT = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];
const DEFAULT_IGNORE = ["node_modules", ".git", "dist", "coverage", "reports"];
const DEFAULT_TEST = /\.(test|spec)\.[cm]?[jt]sx?$/;

// import x from "s" | export ... from "s" | import("s") | require("s") | import "s"
const SPEC_RES: RegExp[] = [
  /\bimport\b[^'"]*?\bfrom\s*['"]([^'"]+)['"]/g,
  /\bexport\b[^'"]*?\bfrom\s*['"]([^'"]+)['"]/g,
  /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  /\bimport\s+['"]([^'"]+)['"]/g,
];

export interface GraphOptions {
  root: string;
  ignore?: string[];
  testPattern?: RegExp;
}

function walk(dir: string, ignore: string[], acc: string[]): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (ignore.includes(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, ignore, acc);
    else if (SOURCE_EXT.some((e) => entry.name.endsWith(e))) acc.push(full);
  }
}

/** Resolve a relative specifier to a known file. Bare specifiers return undefined. */
function resolveSpecifier(fromFile: string, spec: string, fileSet: Set<string>): string | undefined {
  if (!spec.startsWith(".")) return undefined;
  const base = resolve(dirname(fromFile), spec);
  const candidates: string[] = [base];
  for (const e of SOURCE_EXT) candidates.push(base + e);
  for (const e of SOURCE_EXT) candidates.push(join(base, "index" + e));
  const jsLike = base.match(/\.(js|jsx|mjs|cjs)$/);
  if (jsLike) {
    const stem = base.slice(0, -jsLike[0].length);
    candidates.push(stem + ".ts", stem + ".tsx");
  }
  for (const c of candidates) {
    if (fileSet.has(c)) return c;
  }
  return undefined;
}

function toRel(root: string, file: string): string {
  return relative(root, file).split(sep).join("/");
}

function extractSpecifiers(content: string): string[] {
  const out: string[] = [];
  for (const re of SPEC_RES) {
    re.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = re.exec(content)) !== null) {
      const spec = match[1];
      if (spec) out.push(spec);
    }
  }
  return out;
}

/** Build the repo-relative dependency graph for a project root. */
export function buildGraph(opts: GraphOptions): DepGraph {
  const root = resolve(opts.root);
  const ignore = opts.ignore ?? DEFAULT_IGNORE;
  const testPattern = opts.testPattern ?? DEFAULT_TEST;
  const files: string[] = [];
  walk(root, ignore, files);
  const fileSet = new Set(files);
  const imports = new Map<string, Set<string>>();
  const testFiles = new Set<string>();
  for (const file of files) {
    const rel = toRel(root, file);
    if (testPattern.test(rel)) testFiles.add(rel);
    const deps = new Set<string>();
    for (const spec of extractSpecifiers(readFileSync(file, "utf8"))) {
      const resolved = resolveSpecifier(file, spec, fileSet);
      if (resolved) deps.add(toRel(root, resolved));
    }
    imports.set(rel, deps);
  }
  return { imports, testFiles };
}

export { extractSpecifiers };
