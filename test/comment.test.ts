import { describe, it, expect } from "vitest";
import { selectCommentTarget } from "../src/comment.js";

const MARKER = "<!-- testrazor -->";

describe("pr comment upsert", () => {
  it("@covers 5.4 creates a new comment when none carries the marker", () => {
    expect(selectCommentTarget([{ id: 1, body: "unrelated" }], MARKER)).toEqual({ method: "POST" });
  });

  it("@covers 5.4 updates the single comment that carries the marker", () => {
    const comments = [{ id: 1, body: "x" }, { id: 2, body: `report ${MARKER} here` }];
    expect(selectCommentTarget(comments, MARKER)).toEqual({ method: "PATCH", id: 2 });
  });
});
