import { beforeEach, describe, expect, mock, test } from "bun:test";

const savedTokens: unknown[] = [];

mock.module("../src/config.ts", () => ({
  loadConfig: () => ({}),
  saveConfig: () => {},
  saveToken: (t: unknown) => savedTokens.push(t),
  getToken: () => undefined,
  clearToken: () => {},
  isTokenExpired: () => false,
}));

function mockTokenResponse(body: Record<string, unknown>) {
  // @ts-expect-error - test double for global fetch
  globalThis.fetch = async () =>
    new Response(JSON.stringify(body), { status: 200 });
}

const { refreshToken } = await import("../src/auth");

describe("refreshToken", () => {
  beforeEach(() => {
    savedTokens.length = 0;
    process.env.NOTION_CLIENT_ID = "cid";
    process.env.NOTION_CLIENT_SECRET = "csecret";
  });

  test("keeps the existing refresh token when Notion returns null", async () => {
    mockTokenResponse({
      access_token: "new-access-token",
      refresh_token: null,
      expires_in: 3600,
    });

    const result = await refreshToken("existing-refresh-token");

    expect(result.refresh_token).toBe("existing-refresh-token");
  });

  test("uses the new refresh token when Notion returns one", async () => {
    mockTokenResponse({
      access_token: "new-access-token",
      refresh_token: "rotated-refresh-token",
      expires_in: 3600,
    });

    const result = await refreshToken("existing-refresh-token");

    expect(result.refresh_token).toBe("rotated-refresh-token");
  });
});
