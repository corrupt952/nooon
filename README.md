# nooon

[![SafeSkill 85/100](https://img.shields.io/badge/SafeSkill-85%2F100_Passes%20with%20Notes-yellow)](https://safeskill.dev/scan/corrupt952-nooon)
Lightweight, read-only Notion MCP Server optimized for token efficiency.

## Features

- Simple auth with `NOTION_TOKEN` or OAuth 2.0 + PKCE
- Minimal output using [TOON format](https://github.com/toon-format/toon)
- Smart caching based on `last_edited_time`
- Recursive block fetching in a single call

## Installation

```bash
bunx nooon
```

<details>
<summary>Manual Install (Pre-built binaries)</summary>

Download from [Releases](https://github.com/corrupt952/nooon/releases):

```bash
# macOS (Apple Silicon)
curl -L https://github.com/corrupt952/nooon/releases/latest/download/nooon-darwin-arm64 -o nooon && chmod +x nooon

# macOS (Intel)
curl -L https://github.com/corrupt952/nooon/releases/latest/download/nooon-darwin-x64 -o nooon && chmod +x nooon

# Linux (x64)
curl -L https://github.com/corrupt952/nooon/releases/latest/download/nooon-linux-x64 -o nooon && chmod +x nooon

# Linux (arm64)
curl -L https://github.com/corrupt952/nooon/releases/latest/download/nooon-linux-arm64 -o nooon && chmod +x nooon
```

</details>

## Authentication

Choose one of the following methods:

**API Token (Simple)**

```bash
export NOTION_TOKEN=ntn_xxx
```

**OAuth (Interactive)**

```bash
bunx nooon config --client-id <id> --client-secret <secret>
bunx nooon auth
```

Get credentials from [Notion Integrations](https://www.notion.so/my-integrations).

## Usage

Register with Claude Code:

```bash
eval $(bunx nooon mcp install)
```

Check status:

```bash
bunx nooon status
```

## MCP Tools

| Tool | Description |
|------|-------------|
| `nooon_search` | Search pages and databases by keyword |
| `nooon_page` | Get page content with nested blocks (cached) |
| `nooon_database` | Get database schema and available views |
| `nooon_data_source` | Get data source schema (property definitions) |
| `nooon_query` | Query database with filter/sort |
| `nooon_clear_cache` | Clear cached pages |

## CLI Reference

```
bunx nooon auth              Start OAuth flow
bunx nooon logout            Clear credentials
bunx nooon status            Show auth status
bunx nooon config            Configure OAuth credentials
bunx nooon cache clear       Clear page cache
bunx nooon mcp               Start MCP server
bunx nooon mcp install       Output claude mcp add command
bunx nooon mcp config        Output mcpServers JSON
```

## Building from Source

```bash
bun install
bun run compile
```

For team distribution (users only need to run `bunx nooon auth`, no integration setup required):

```bash
NOTION_CLIENT_ID=xxx NOTION_CLIENT_SECRET=xxx bun run compile
```

## License

MIT
