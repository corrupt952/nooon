import { describe, expect, test } from "bun:test";
import { slimComment, slimComments } from "../../src/notion/comment";

function buildComment(overrides: Partial<any> = {}): any {
  return {
    object: "comment",
    id: "comment-1",
    parent: { type: "page_id", page_id: "page-1" },
    discussion_id: "discussion-1",
    created_time: "2026-01-01T00:00:00.000Z",
    last_edited_time: "2026-01-01T00:00:00.000Z",
    created_by: { object: "user", id: "user-1" },
    rich_text: [{ plain_text: "Hello" }],
    display_name: { type: "user", resolved_name: "Alice" },
    ...overrides,
  };
}

describe("slimComment", () => {
  test("extracts id, text, author, and created time", () => {
    expect(slimComment(buildComment())).toEqual({
      id: "comment-1",
      richText: [{ text: "Hello" }],
      author: "Alice",
      createdTime: "2026-01-01T00:00:00.000Z",
    });
  });

  test("falls back to Anonymous when resolved_name is null", () => {
    const comment = buildComment({
      display_name: { type: "integration", resolved_name: null },
    });
    expect(slimComment(comment).author).toBe("Anonymous");
  });
});

describe("slimComments", () => {
  test("slims results and preserves pagination info", () => {
    const response = {
      results: [buildComment()],
      has_more: true,
      next_cursor: "cursor-1",
    };
    expect(slimComments(response)).toEqual({
      results: [
        {
          id: "comment-1",
          richText: [{ text: "Hello" }],
          author: "Alice",
          createdTime: "2026-01-01T00:00:00.000Z",
        },
      ],
      has_more: true,
      next_cursor: "cursor-1",
    });
  });
});
