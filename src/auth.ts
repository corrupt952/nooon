import { loadConfig, saveConfig, saveToken, type TokenData } from "./config";

const NOTION_AUTH_URL = "https://api.notion.com/v1/oauth/authorize";
const NOTION_TOKEN_URL = "https://api.notion.com/v1/oauth/token";
const REDIRECT_PORT = 9876;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}/callback`;

// Build-time embedded credentials (injected via --define during compile)
// These are replaced with literal strings at build time, defaulting to empty
declare const __EMBEDDED_CLIENT_ID__: string | undefined;
declare const __EMBEDDED_CLIENT_SECRET__: string | undefined;
const EMBEDDED_CLIENT_ID =
  typeof __EMBEDDED_CLIENT_ID__ !== "undefined" ? __EMBEDDED_CLIENT_ID__ : "";
const EMBEDDED_CLIENT_SECRET =
  typeof __EMBEDDED_CLIENT_SECRET__ !== "undefined"
    ? __EMBEDDED_CLIENT_SECRET__
    : "";

// PKCE utilities
function generateRandomString(length: number): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => chars[byte % chars.length]).join("");
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export type CredentialsSource = "embedded" | "env" | "config" | null;

export function getCredentialsSource(): CredentialsSource {
  if (EMBEDDED_CLIENT_ID && EMBEDDED_CLIENT_SECRET) {
    return "embedded";
  }
  if (process.env.NOTION_CLIENT_ID && process.env.NOTION_CLIENT_SECRET) {
    return "env";
  }
  const config = loadConfig();
  if (config.client_id && config.client_secret) {
    return "config";
  }
  return null;
}

export function getClientCredentials(): {
  clientId: string;
  clientSecret: string;
} | null {
  // 1. Build-time embedded credentials (highest priority for distribution)
  if (EMBEDDED_CLIENT_ID && EMBEDDED_CLIENT_SECRET) {
    return {
      clientId: EMBEDDED_CLIENT_ID,
      clientSecret: EMBEDDED_CLIENT_SECRET,
    };
  }

  // 2. Runtime environment variables (for development/CI)
  const envClientId = process.env.NOTION_CLIENT_ID;
  const envClientSecret = process.env.NOTION_CLIENT_SECRET;
  if (envClientId && envClientSecret) {
    return { clientId: envClientId, clientSecret: envClientSecret };
  }

  // 3. Config file (for manual setup)
  const config = loadConfig();
  if (config.client_id && config.client_secret) {
    return { clientId: config.client_id, clientSecret: config.client_secret };
  }

  return null;
}

export async function setupClientCredentials(
  clientId: string,
  clientSecret: string,
): Promise<void> {
  const config = loadConfig();
  config.client_id = clientId;
  config.client_secret = clientSecret;
  saveConfig(config);
}

export async function startAuthFlow(): Promise<TokenData> {
  const credentials = getClientCredentials();
  if (!credentials) {
    throw new Error(
      "Client credentials not configured.\n" +
        "Run: notion-cli config --client-id <id> --client-secret <secret>",
    );
  }

  const { clientId, clientSecret } = credentials;
  const state = generateRandomString(32);
  const codeVerifier = generateRandomString(64);
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  const authUrl = new URL(NOTION_AUTH_URL);
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");
  authUrl.searchParams.set("owner", "user");

  console.log("\n🔐 Opening browser for Notion authorization...\n");
  console.log(`If browser doesn't open, visit:\n${authUrl.toString()}\n`);

  // Open browser
  const openCommand =
    process.platform === "darwin"
      ? "open"
      : process.platform === "win32"
        ? "start"
        : "xdg-open";
  Bun.spawn([openCommand, authUrl.toString()]);

  // Start local server to receive callback
  const code = await waitForCallback(state);

  // Exchange code for token
  return exchangeCodeForToken(code, codeVerifier, clientId, clientSecret);
}

async function waitForCallback(expectedState: string): Promise<string> {
  return new Promise((resolve, reject) => {
    let timeoutId: Timer;

    const cleanup = () => {
      clearTimeout(timeoutId);
      server.stop();
    };

    const server = Bun.serve({
      port: REDIRECT_PORT,
      async fetch(req) {
        const url = new URL(req.url);

        if (url.pathname !== "/callback") {
          return new Response("Not Found", { status: 404 });
        }

        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const error = url.searchParams.get("error");

        if (error) {
          cleanup();
          reject(new Error(`Authorization failed: ${error}`));
          return new Response(
            "<html><body><h1>Authorization Failed</h1><p>You can close this window.</p></body></html>",
            { headers: { "Content-Type": "text/html; charset=utf-8" } },
          );
        }

        if (state !== expectedState) {
          cleanup();
          reject(new Error("Invalid state parameter"));
          return new Response(
            "<html><body><h1>Error</h1><p>Invalid state. You can close this window.</p></body></html>",
            { headers: { "Content-Type": "text/html; charset=utf-8" } },
          );
        }

        if (!code) {
          cleanup();
          reject(new Error("No authorization code received"));
          return new Response(
            "<html><body><h1>Error</h1><p>No code received. You can close this window.</p></body></html>",
            { headers: { "Content-Type": "text/html; charset=utf-8" } },
          );
        }

        cleanup();
        resolve(code);
        return new Response(
          "<html><body><h1>✅ Authorization Successful!</h1><p>You can close this window and return to the terminal.</p></body></html>",
          { headers: { "Content-Type": "text/html; charset=utf-8" } },
        );
      },
    });

    console.log(
      `Waiting for authorization on http://localhost:${REDIRECT_PORT}...`,
    );

    // Timeout after 5 minutes
    timeoutId = setTimeout(
      () => {
        cleanup();
        reject(new Error("Authorization timeout"));
      },
      5 * 60 * 1000,
    );
  });
}

async function exchangeCodeForToken(
  code: string,
  codeVerifier: string,
  clientId: string,
  clientSecret: string,
): Promise<TokenData> {
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64",
  );

  const response = await fetch(NOTION_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${credentials}`,
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
      code_verifier: codeVerifier,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  const data = await response.json();

  const token: TokenData = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_in
      ? Date.now() + data.expires_in * 1000
      : undefined,
    workspace_id: data.workspace_id,
    workspace_name: data.workspace_name,
  };

  saveToken(token);
  console.log(
    `\n✅ Authenticated with workspace: ${token.workspace_name || token.workspace_id}`,
  );

  return token;
}

export async function refreshToken(
  refreshTokenValue: string,
): Promise<TokenData> {
  const credentials = getClientCredentials();
  if (!credentials) {
    throw new Error("Client credentials not configured");
  }

  const { clientId, clientSecret } = credentials;
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64",
  );

  const response = await fetch(NOTION_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${basicAuth}`,
    },
    body: JSON.stringify({
      grant_type: "refresh_token",
      refresh_token: refreshTokenValue,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token refresh failed: ${error}`);
  }

  const data = await response.json();

  const token: TokenData = {
    access_token: data.access_token,
    // Notion's refresh response documents refresh_token as nullable;
    // fall back to the current one so a null response doesn't strand us.
    refresh_token: data.refresh_token ?? refreshTokenValue,
    expires_at: data.expires_in
      ? Date.now() + data.expires_in * 1000
      : undefined,
    workspace_id: data.workspace_id,
    workspace_name: data.workspace_name,
  };

  saveToken(token);
  return token;
}
