# Bing Webmaster Tools MCP

[![CI](https://github.com/rafavillaplana/bing-webmaster-tools-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/rafavillaplana/bing-webmaster-tools-mcp/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/bing-webmaster-tools-mcp.svg)](https://www.npmjs.com/package/bing-webmaster-tools-mcp)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**English** · [Español](README.es.md)

A local [MCP](https://modelcontextprotocol.io) server that lets Claude query your **Bing Webmaster Tools** data in plain language:

> *"Which queries brought me the most Bing clicks last month?"*
> *"Which pages have crawl errors?"*
> *"Who links to this URL, and with what anchor text?"*

- **Runs on your computer.** Claude starts it locally and it talks straight to the official Bing Webmaster API. No servers, no accounts, nothing in between.
- **Your own API key.** It stays on your machine (stored by Claude Desktop as a sensitive setting, or in your own config).
- **Read-only.** It never submits URLs, edits sitemaps or changes settings.
- **No dependencies.** A single bundled file; Claude Desktop needs nothing else installed.

## 1. Get your Bing Webmaster Tools API key

[Bing Webmaster Tools](https://www.bing.com/webmasters) → *Settings* (gear icon) → *API access* → *API Key* → *Generate*, and copy it.
One key covers every verified site on that account. If you regenerate it, update it in Claude too.

## 2. Install

### Claude Desktop — one click (recommended)

1. Download the latest **`bing-webmaster-tools-mcp-x.y.z.mcpb`** from [Releases](https://github.com/rafavillaplana/bing-webmaster-tools-mcp/releases/latest).
2. Double-click it (or drag it onto Claude Desktop, or use *Settings → Extensions → Install extension…*).
3. Paste your API key when asked, and enable the extension.

Claude Desktop runs the extension with its own built-in Node.js, so you don't have to install anything.

### Claude Desktop — manual config

The same way you'd add any other local MCP server. Requires [Node.js](https://nodejs.org) 20 or newer.
Open *Settings → Developer → Edit Config* and add this inside `"mcpServers"`:

```json
{
  "mcpServers": {
    "bing-webmaster": {
      "command": "npx",
      "args": ["-y", "bing-webmaster-tools-mcp"],
      "env": { "BING_WEBMASTER_API_KEY": "your-api-key" }
    }
  }
}
```

Save and restart Claude Desktop.

### Claude Code

```bash
claude mcp add bing-webmaster -e BING_WEBMASTER_API_KEY=your-api-key -- npx -y bing-webmaster-tools-mcp
```

Add `--scope user` to make it available in every project.

### Other MCP clients (Cursor, VS Code, Windsurf…)

Use the same `command`, `args` and `env` as in the manual config above, in that client's MCP settings.

## 3. Use it

Start a new chat and ask. Good first prompts:

- *List my Bing Webmaster sites.*
- *Top 20 queries by clicks on https://example.com/ in the last 3 months, with CTR and position.*
- *Which queries have many impressions but CTR under 1%?*
- *Compare Bing clicks for /blog/ pages in August vs September.*
- *Show crawl issues and sitemap errors for my site.*

## Tools

| Tool | Returns | Bing API method |
|---|---|---|
| `list_sites` | Sites on the account and whether they are verified | GetUserSites |
| `get_query_stats` | Clicks, impressions, CTR and position per query | GetQueryStats |
| `get_page_stats` | Same, per URL | GetPageStats |
| `get_pages_for_query` | URLs that rank for a query | GetQueryPageStats |
| `get_queries_for_page` | Queries that lead to a URL | GetPageQueryStats |
| `get_traffic_trend` | Site-wide clicks and impressions over time | GetRankAndTrafficStats |
| `get_query_trend` | One query over time | GetQueryTrafficStats |
| `get_crawl_stats` | Daily crawl data: crawled, errors, indexed, blocked… | GetCrawlStats |
| `get_crawl_issues` | URLs with crawl issues | GetCrawlIssues |
| `get_url_info` | Index status of a URL | GetUrlInfo |
| `get_url_traffic_info` | Traffic for a URL | GetUrlTrafficInfo |
| `get_sitemaps` | Submitted sitemaps and their status | GetFeeds |
| `get_inbound_link_counts` | Pages with inbound links | GetLinkCounts |
| `get_inbound_links` | Links and anchors pointing to a URL | GetUrlLinks |
| `get_keyword_stats` | Historical Bing impressions for a keyword | GetKeywordStats |
| `get_related_keywords` | Related keywords | GetRelatedKeywords |
| `get_url_submission_quota` | Remaining URL submission quota | GetUrlSubmissionQuota |

Performance tools accept `startDate`, `endDate`, `aggregate`, `sortBy`, `limit` and `contains`. By default they sum every week in the period into one row per query or page (CTR included, position weighted by impressions) and return the top 50 by clicks, so a conversation isn't flooded with raw rows.

## Where it works

It's a **local** connector: it runs on the computer where Claude Desktop or Claude Code is installed. On its own it isn't available on claude.ai in the browser or in the mobile apps, which can only reach connectors hosted on the internet.

## Keeping your API key safe

The connector is read-only, but **the Bing API key itself is not**: the same key can submit URLs, remove sites from your account or grant other people access. Treat it like a password.

**Where the key ends up, from safest to least safe:**

| Method | Where the key is stored | Recommendation |
|---|---|---|
| `.mcpb` extension (Claude Desktop) | In Claude Desktop's settings, as a field marked *sensitive*; never in a file you edit | ✅ **Recommended** |
| Claude Code (`claude mcp add -e …`, user or local scope) | Plain text in your personal Claude Code config | OK on a computer only you use |
| Manual `claude_desktop_config.json` | Plain text in that file | Works, but anyone with the file sees the key |
| Claude Code with `--scope project` | Plain text in `.mcp.json` **inside the project** | ⚠️ Avoid: easy to commit to Git by mistake |

If you need a project-level config, reference an environment variable instead of the key itself; Claude Code expands it at runtime:

```json
"env": { "BING_WEBMASTER_API_KEY": "${BING_WEBMASTER_API_KEY}" }
```

**Good habits:**

- Never paste the key into a chat with Claude or any other AI. Put it only in the settings field or config.
- Install the `.mcpb` only from this repository's [Releases](https://github.com/rafavillaplana/bing-webmaster-tools-mcp/releases) page, where GitHub builds it from the published code.
- If you think the key leaked, regenerate it in Bing Webmaster Tools: the old one stops working immediately. Bing allows one key per user, so update it everywhere you use it.

**What this server does with it:** the key is only sent to `ssl.bing.com` over HTTPS, as the official API requires. It's never logged or included in tool output. Report vulnerabilities privately: see [SECURITY.md](SECURITY.md).

## Troubleshooting

| Symptom | Fix |
|---|---|
| *"BING_WEBMASTER_API_KEY is not set"* | Add the key in the extension settings, or in `env` in your config. |
| *"InvalidApiKey"* / key rejected | Copy the key again from Bing, or generate a new one and update it. |
| Errors for one specific site | Use the exact URL from `list_sites`, including `https://` and the trailing `/`. |
| Tools don't appear (manual config) | Check `node --version` is 20+, then restart Claude Desktop. Logs: *Settings → Developer*. |

## Known limitations

- Bing's **AI Performance** report (Copilot citations) has no public API, so it isn't available here.
- Bing reports performance data **per week**, not per day, and keeps less history than Google Search Console.
- Bing currently doesn't report the average **click** position (the API returns `-1`), so only the average impression position is shown.
- Responses are capped at 200 rows; ask Claude to filter (`contains`, dates) or aggregate instead of pulling everything.

## Development

```bash
npm install
npm run build        # dist/index.js
npm run typecheck
npm test             # unit tests
npm run test:e2e     # runs the built server over stdio against a fake Bing API
npm run pack         # builds the Claude Desktop extension (.mcpb)
```

```
src/index.ts      Entry point (stdio)
src/server.ts     MCP server and its 17 tools
src/bing.ts       Bing Webmaster JSON API client
src/stats.ts      Aggregation, filtering and sorting of performance rows
manifest.json     Claude Desktop extension manifest
scripts/          Build and .mcpb packaging
test/             Unit and end-to-end tests
```

Contributions are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE) © Rafa Villaplana. Not affiliated with Microsoft or Anthropic. Bing is a trademark of Microsoft; Claude is a trademark of Anthropic.
