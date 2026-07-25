import {
  APIErrorCode,
  type BlockObjectResponse,
  Client,
  ClientErrorCode,
  isNotionClientError,
  type PageObjectResponse,
  type QueryDataSourceParameters,
} from "@notionhq/client";
import pLimit from "p-limit";
import pRetry from "p-retry";
import { refreshToken, startAuthFlow } from "../auth";
import { getToken, isTokenExpired, type TokenData } from "../config";
import type { SlimBlock } from "./block";
import { type CachedPage, getCache, isCacheValid, saveCache } from "./cache";
import { extractProperties, type SlimPage } from "./page";

let notionClient: Client | null = null;

// Rate limit: 3 requests/sec for Notion API
const CONCURRENCY_LIMIT = 3;
const limit = pLimit(CONCURRENCY_LIMIT);

// Errors worth retrying: rate limiting, transient server issues, and timeouts
const RETRYABLE_API_CODES: string[] = [
  APIErrorCode.RateLimited,
  APIErrorCode.ServiceUnavailable,
  APIErrorCode.InternalServerError,
  APIErrorCode.ConflictError,
  ClientErrorCode.RequestTimeout,
];

// Wrap a Notion API call with exponential backoff retry for transient failures
function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  return pRetry(fn, {
    retries: 3,
    shouldRetry: ({ error }) =>
      isNotionClientError(error) && RETRYABLE_API_CODES.includes(error.code),
    onFailedAttempt: ({ error, attemptNumber, retriesLeft }) => {
      console.error(
        `Notion API request failed (attempt ${attemptNumber}, ${retriesLeft} retries left): ${error.message}`,
      );
    },
  });
}

async function ensureValidToken(): Promise<TokenData> {
  let token = getToken();

  if (!token) {
    token = await startAuthFlow();
  } else if (isTokenExpired(token) && token.refresh_token) {
    console.log("Token expired, refreshing...");
    token = await refreshToken(token.refresh_token);
  }

  return token;
}

export async function getClient(): Promise<Client> {
  if (notionClient) return notionClient;

  // 1. API token (env) - for CI/simple use
  const apiToken = process.env.NOTION_TOKEN;
  if (apiToken) {
    notionClient = new Client({ auth: apiToken });
    return notionClient;
  }

  // 2. OAuth access token
  const token = await ensureValidToken();
  notionClient = new Client({ auth: token.access_token });
  return notionClient;
}

// ============ Search ============

export async function search(
  query: string,
  filter?: "page" | "data_source",
  startCursor?: string,
) {
  const client = await getClient();
  const params: Parameters<typeof client.search>[0] = { query };

  if (filter) {
    params.filter = { property: "object", value: filter };
  }
  if (startCursor) {
    params.start_cursor = startCursor;
  }

  return withRetry(() => client.search(params));
}

// ============ Pages ============

export async function getPage(pageId: string) {
  const client = await getClient();
  return withRetry(() => client.pages.retrieve({ page_id: pageId }));
}

export async function getPageContent(pageId: string) {
  const client = await getClient();
  return withRetry(() => client.blocks.children.list({ block_id: pageId }));
}

// ============ Databases ============

export async function getDatabase(databaseId: string) {
  const client = await getClient();
  return withRetry(() =>
    client.databases.retrieve({ database_id: databaseId }),
  );
}

// ============ Data Sources ============

export async function getDataSource(dataSourceId: string) {
  const client = await getClient();
  return withRetry(() =>
    client.dataSources.retrieve({ data_source_id: dataSourceId }),
  );
}

export type QueryFilter = QueryDataSourceParameters["filter"];
export type QuerySorts = QueryDataSourceParameters["sorts"];

export async function queryDataSource(
  dataSourceId: string,
  filter?: QueryFilter,
  sorts?: QuerySorts,
  startCursor?: string,
) {
  const client = await getClient();
  return withRetry(() =>
    client.dataSources.query({
      data_source_id: dataSourceId,
      ...(filter && { filter }),
      ...(sorts && { sorts }),
      ...(startCursor && { start_cursor: startCursor }),
    }),
  );
}

// ============ Blocks ============

export async function getBlock(blockId: string) {
  const client = await getClient();
  return withRetry(() => client.blocks.retrieve({ block_id: blockId }));
}

export async function getBlockChildren(blockId: string) {
  const client = await getClient();
  return withRetry(() => client.blocks.children.list({ block_id: blockId }));
}

// Get all block children with pagination
export async function getAllBlockChildren(
  blockId: string,
): Promise<BlockObjectResponse[]> {
  const client = await getClient();
  const allBlocks: BlockObjectResponse[] = [];
  let cursor: string | undefined;

  do {
    const response = await withRetry(() =>
      client.blocks.children.list({
        block_id: blockId,
        start_cursor: cursor,
      }),
    );
    allBlocks.push(...(response.results as BlockObjectResponse[]));
    cursor = response.has_more
      ? (response.next_cursor ?? undefined)
      : undefined;
  } while (cursor);

  return allBlocks;
}

// ============ Comments ============

// List page-level comments. Notion's API only returns comments attached
// directly to blockId; comments on descendant blocks require querying each
// block separately, which nooon skips to keep API calls minimal.
export async function listComments(blockId: string, startCursor?: string) {
  const client = await getClient();
  return withRetry(() =>
    client.comments.list({
      block_id: blockId,
      ...(startCursor && { start_cursor: startCursor }),
    }),
  );
}

// Fetch blocks recursively with rate limiting (preserves order)
export async function fetchBlocksRecursive(
  blockId: string,
  slimBlockFn: (block: BlockObjectResponse) => SlimBlock,
): Promise<SlimBlock[]> {
  async function fetchChildren(parentId: string): Promise<SlimBlock[]> {
    let blocks: BlockObjectResponse[];
    try {
      blocks = await limit(() => getAllBlockChildren(parentId));
    } catch (error) {
      // The Notion API rejects the entire children.list call when a page
      // contains a block type it can't serve (e.g. ai_block). Surface the
      // error as a single block instead of failing the whole page fetch.
      return [
        {
          type: "fetch_error",
          rawJson: JSON.stringify({
            message: error instanceof Error ? error.message : String(error),
          }),
        },
      ];
    }

    // Process all blocks in parallel while preserving order
    const processedBlocks = await Promise.all(
      blocks.map(async (block) => {
        const slimBlock = slimBlockFn(block);

        if (
          block.has_children &&
          block.type !== "child_page" &&
          block.type !== "child_database"
        ) {
          slimBlock.children = await fetchChildren(block.id);
        }

        return slimBlock;
      }),
    );

    return processedBlocks;
  }

  return fetchChildren(blockId);
}

// Get page with caching support
export async function getPageWithCache(
  pageId: string,
  slimBlockFn: (block: BlockObjectResponse) => SlimBlock,
  extractTitleFn: (page: PageObjectResponse) => string,
): Promise<{ page: SlimPage; blocks: SlimBlock[]; fromCache: boolean }> {
  // Step 1: Get page metadata
  const page = (await getPage(pageId)) as PageObjectResponse;
  const lastEditedTime = page.last_edited_time;

  // Step 2: Check cache
  const cached = getCache(pageId);
  if (cached && isCacheValid(cached, lastEditedTime)) {
    return {
      page: cached.page,
      blocks: cached.blocks,
      fromCache: true,
    };
  }

  // Step 3: Fetch blocks recursively
  const blocks = await fetchBlocksRecursive(pageId, slimBlockFn);

  // Step 4: Build slim page data
  const slimPage: SlimPage = {
    id: page.id,
    title: extractTitleFn(page),
    url: page.url,
    properties: extractProperties(page.properties),
  };

  // Step 5: Save to cache
  const cacheData: CachedPage = {
    pageId,
    lastEditedTime,
    fetchedAt: Date.now(),
    page: slimPage,
    blocks,
  };
  saveCache(cacheData);

  return {
    page: slimPage,
    blocks,
    fromCache: false,
  };
}
