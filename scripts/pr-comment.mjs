#!/usr/bin/env node
// Upsert a single PR comment carrying the testrazor report. Keyed by a hidden
// marker so re-runs update the same comment instead of piling up. Uses the job
// token and the GitHub REST API. No third-party dependency.
import { readFileSync } from "node:fs";

const MARKER = "<!-- testrazor -->";
const token = process.env.GITHUB_TOKEN;
const repo = process.env.GITHUB_REPOSITORY;
const eventPath = process.env.GITHUB_EVENT_PATH;
const bodyFile = process.argv[2];

if (!token || !repo || !eventPath || !bodyFile) {
  console.log("pr-comment: missing GITHUB_TOKEN, GITHUB_REPOSITORY, event or body file; skipping");
  process.exit(0);
}

const event = JSON.parse(readFileSync(eventPath, "utf8"));
const pr = event.pull_request?.number ?? event.issue?.number;
if (!pr) {
  console.log("pr-comment: not a pull request, skipping");
  process.exit(0);
}

const body = readFileSync(bodyFile, "utf8");
const api = `https://api.github.com/repos/${repo}`;
const headers = {
  authorization: `Bearer ${token}`,
  accept: "application/vnd.github+json",
  "content-type": "application/json",
};

const list = await fetch(`${api}/issues/${pr}/comments?per_page=100`, { headers }).then((r) => r.json());
const existing = Array.isArray(list)
  ? list.find((c) => typeof c.body === "string" && c.body.includes(MARKER))
  : undefined;

const url = existing ? `${api}/issues/comments/${existing.id}` : `${api}/issues/${pr}/comments`;
const res = await fetch(url, { method: existing ? "PATCH" : "POST", headers, body: JSON.stringify({ body }) });
console.log(`pr-comment: ${existing ? "updated" : "created"} (${res.status})`);
