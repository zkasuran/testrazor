import type { FlakeVerdict, GateResult, ImpactResult, QuarantineEntry, TestId } from "../models.js";

export const MARKER = "<!-- testrazor -->";

export interface Report {
  kind: "flake" | "impact" | "gate";
  flakes?: FlakeVerdict[];
  quarantine?: QuarantineEntry[];
  releases?: TestId[];
  impact?: ImpactResult;
  gate?: GateResult;
}

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

export function renderJson(report: Report): string {
  return JSON.stringify(report, null, 2);
}

export function renderTable(report: Report): string {
  const lines: string[] = [];
  const i = report.impact;
  if (i) {
    lines.push("testrazor impact");
    if (i.selectedAll) {
      lines.push(`  fail-safe: a non-source change forced running all ${i.total} tests`);
      lines.push(`  unmapped: ${i.unmappedFiles.join(", ")}`);
    } else {
      const skipped = i.total - i.selected.length;
      const ratio = i.total > 0 ? skipped / i.total : 0;
      lines.push(`  selected ${i.selected.length} of ${i.total} test files, ${skipped} skipped (${pct(ratio)})`);
      for (const t of i.selected) lines.push(`    run  ${t}`);
      if (i.uncoveredChanges.length > 0) {
        lines.push("  uncovered changes (no test imports these):");
        for (const f of i.uncoveredChanges) lines.push(`    warn ${f}`);
      }
    }
  }
  const flakes = report.flakes;
  if (flakes) {
    const flaky = flakes.filter((f) => f.flaky);
    lines.push("testrazor flake");
    lines.push(`  ${flaky.length} flaky of ${flakes.length} tests over ${flakes[0]?.runs ?? 0} runs`);
    for (const f of flaky) {
      lines.push(`    flaky  ${f.id}  score ${f.score.toFixed(2)} (${f.passes} pass / ${f.fails} fail)`);
    }
    for (const f of flakes.filter((v) => v.consistentFailure)) {
      lines.push(`    fail   ${f.id}  (consistent failure, not flaky)`);
    }
  }
  if (report.releases && report.releases.length > 0) {
    lines.push("  release candidates (quarantined but now passing):");
    for (const id of report.releases) lines.push(`    release ${id}`);
  }
  const g = report.gate;
  if (g) {
    lines.push("testrazor gate");
    lines.push(`  result: ${g.passed ? "PASS" : "FAIL"}`);
    if (g.failing.length > 0) {
      lines.push("  failing (real):");
      for (const id of g.failing) lines.push(`    fail ${id}`);
    }
    if (g.ignoredFlaky.length > 0) lines.push(`  ignored (quarantined flaky): ${g.ignoredFlaky.length}`);
  }
  return lines.join("\n");
}

export function renderMarkdown(report: Report): string {
  const out: string[] = [MARKER, "## testrazor"];
  const i = report.impact;
  if (i) {
    if (i.selectedAll) {
      out.push(`**Impact:** fail-safe, ran all ${i.total} tests (non-source change: ${i.unmappedFiles.join(", ")}).`);
    } else {
      const skipped = i.total - i.selected.length;
      out.push(`**Impact:** ${i.selected.length} of ${i.total} test files selected, ${skipped} skipped (${pct(i.total > 0 ? skipped / i.total : 0)}).`);
      if (i.uncoveredChanges.length > 0) out.push(`> Uncovered changes: ${i.uncoveredChanges.join(", ")}`);
    }
  }
  const flakes = report.flakes;
  if (flakes) {
    const flaky = flakes.filter((f) => f.flaky);
    out.push(`**Flake:** ${flaky.length} flaky test(s) over ${flakes[0]?.runs ?? 0} runs.`);
    if (flaky.length > 0) {
      out.push("", "| test | score | pass | fail |", "| --- | --- | --- | --- |");
      for (const f of flaky) out.push(`| \`${f.id}\` | ${f.score.toFixed(2)} | ${f.passes} | ${f.fails} |`);
    }
  }
  const g = report.gate;
  if (g) {
    out.push(`**Gate:** ${g.passed ? "pass" : "fail"}${g.ignoredFlaky.length ? ` (ignored ${g.ignoredFlaky.length} quarantined flaky)` : ""}`);
    if (g.failing.length > 0) {
      out.push("", "Real failures:");
      for (const id of g.failing) out.push(`- \`${id}\``);
    }
  }
  return out.join("\n");
}
