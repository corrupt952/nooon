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
  test("a single unsupported block type fails the entire page fetch", async () => {
    // This documents the current (buggy) behavior: the Notion API rejects
    // the whole children.list call for a block it can't serve (e.g.
    // ai_block), and fetchBlocksRecursive propagates that failure instead
    // of skipping the offending block and returning the rest of the page.
    await expect(
      fetchBlocksRecursive("page-id", (b) => ({ type: b.type })),
    ).rejects.toThrow(/ai_block/);
  });
});
