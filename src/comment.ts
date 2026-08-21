export interface ExistingComment {
  id: number;
  body?: string;
}

export interface CommentTarget {
  method: "POST" | "PATCH";
  id?: number;
}

/** Decide whether to create a new PR comment or update the existing testrazor
 * one, matched by the hidden marker, so re-runs update in place. Pure. */
export function selectCommentTarget(comments: ExistingComment[], marker: string): CommentTarget {
  const existing = comments.find((c) => typeof c.body === "string" && c.body.includes(marker));
  return existing ? { method: "PATCH", id: existing.id } : { method: "POST" };
}
