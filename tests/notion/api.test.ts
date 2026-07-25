import { beforeAll, describe, expect, mock, test } from "bun:test";

// Simulates the Notion API rejecting a block type it can't serve
// (e.g. ai_block: "Block type ai_block is not supported via the API for your bot type.")
mock.module("@notionhq/client", () => ({
  Client: class {
    blocks = {
      children: {
        list: async () => {
          throw new Error(
            "Block type ai_block is not supported via the API for your bot type.",
          );
        },
      },
      retrieve: async () => ({}),
    };
    pages = { retrieve: async () => ({}) };
  },
  APIErrorCode: {
    RateLimited: "rate_limited",
    ServiceUnavailable: "service_unavailable",
    InternalServerError: "internal_server_error",
    ConflictError: "conflict_error",
  },
  ClientErrorCode: { RequestTimeout: "notionhq_client_request_timeout" },
  isNotionClientError: () => false,
}));

let fetchBlocksRecursive: typeof import("../../src/notion/api").fetchBlocksRecursive;

beforeAll(async () => {
  process.env.NOTION_TOKEN = "test-token";
  ({ fetchBlocksRecursive } = await import("../../src/notion/api"));
});

describe("fetchBlocksRecursive (regression for #16)", () => {
  test("an unsupported block type surfaces as a fetch_error block instead of failing the page", async () => {
    // The Notion API rejects the whole children.list call for a page
    // containing a block it can't serve (e.g. ai_block). Rather than
    // propagating that failure and losing the whole page, it should be
    // surfaced as a single fallback block.
    const result = await fetchBlocksRecursive("page-id", (b) => ({
      type: b.type,
    }));

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("fetch_error");
    expect(result[0].rawJson).toContain("ai_block");
  });
});
