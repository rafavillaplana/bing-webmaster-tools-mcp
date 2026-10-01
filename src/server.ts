import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { BingApiError, BingWebmasterClient, toNetDate } from "./bing";
import { filterSeries, summarizeStats, type StatRow } from "./stats";

export const VERSION = "1.0.0";

export interface ServerOptions {
  /** Bing Webmaster Tools API key. If missing, every tool returns a setup error. */
  apiKey?: string;
  /** Overrides the API base URL (tests only). */
  baseUrl?: string;
}

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const siteUrl = z
  .string()
  .describe("Site URL exactly as verified in Bing Webmaster Tools (e.g. https://example.com/). Call list_sites if unsure.");
const startDate = isoDate.optional().describe("Start date, YYYY-MM-DD (optional)");
const endDate = isoDate.optional().describe("End date, YYYY-MM-DD (optional)");
const aggregate = z
  .boolean()
  .optional()
  .describe("true (default): one row per item summed over the period. false: one row per item per week");
const sortBy = z.enum(["clicks", "impressions", "ctr", "position"]).optional().describe("Sort order (default: clicks)");
const limit = z.number().int().min(1).max(200).optional().describe("Maximum rows to return (default 50, max 200). Prefer filters or aggregation over large limits");
const contains = z.string().optional().describe("Only rows whose query/URL contains this text (case-insensitive)");
const page = z.number().int().min(0).optional().describe("Result page, starting at 0");

const READ_ONLY = { readOnlyHint: true, destructiveHint: false, openWorldHint: true } as const;

function ok(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

function fail(err: unknown) {
  let msg = err instanceof Error ? err.message : String(err);
  if (err instanceof BingApiError && (err.status === 400 || err.status === 401) && /api ?key|unauthori/i.test(msg)) {
    msg += " — The Bing API key may be wrong or regenerated. Update it in the extension settings (Claude Desktop) or in BING_WEBMASTER_API_KEY.";
  }
  return { content: [{ type: "text" as const, text: msg }], isError: true };
}

export function createServer(opts: ServerOptions = {}): McpServer {
  const server = new McpServer({ name: "Bing Webmaster Tools", version: VERSION });

  const client = () => {
    if (!opts.apiKey) {
      throw new Error(
        "BING_WEBMASTER_API_KEY is not set. Add your Bing Webmaster Tools API key in the extension settings (Claude Desktop) or as an environment variable.",
      );
    }
    return new BingWebmasterClient(opts.apiKey, opts.baseUrl);
  };

  /** Registers a read-only tool whose errors come back as MCP tool errors. */
  const tool = <S extends z.ZodRawShape>(
    name: string,
    title: string,
    description: string,
    inputSchema: S,
    run: (args: z.infer<z.ZodObject<S>>, bing: BingWebmasterClient) => Promise<unknown>,
  ) => {
    server.registerTool(name, { title, description, inputSchema, annotations: { title, ...READ_ONLY } }, (async (args: any) => {
      try {
        return ok(await run(args, client()));
      } catch (e) {
        return fail(e);
      }
    }) as any);
  };
  tool(
    "list_sites",
    "List sites",
    "Lists the user's sites in Bing Webmaster Tools and whether each is verified. Call this first to get the exact siteUrl.",
    {},
    // Only what Claude needs: verification codes stay out of the conversation.
    async (_a, bing) =>
      ((await bing.get<{ Url?: string; IsVerified?: boolean }[]>("GetUserSites")) ?? []).map((s) => ({
        url: s.Url,
        verified: s.IsVerified,
      })),
  );

  tool(
    "get_query_stats",
    "Performance by query",
    "Clicks, impressions, CTR and average position per search query in Bing. Bing keeps weekly data for recent months; by default rows are summed per query over the period.",
    { siteUrl, startDate, endDate, aggregate, sortBy, limit, contains },
    async (a, bing) => summarizeStats(await bing.get<StatRow[]>("GetQueryStats", { siteUrl: a.siteUrl }), { keyField: "Query", ...a }),
  );

  tool(
    "get_page_stats",
    "Performance by page",
    "Clicks, impressions, CTR and average position per URL of the site in Bing (top pages). By default rows are summed per URL over the period.",
    { siteUrl, startDate, endDate, aggregate, sortBy, limit, contains },
    async (a, bing) => summarizeStats(await bing.get<StatRow[]>("GetPageStats", { siteUrl: a.siteUrl }), { keyField: "Query", ...a }),
  );

  tool(
    "get_pages_for_query",
    "Pages for a query",
    "Which URLs of the site show up in Bing for a given query, with their clicks and impressions.",
    { siteUrl, query: z.string().describe("Exact query"), startDate, endDate, aggregate, sortBy, limit },
    async (a, bing) => ({
      query: a.query,
      ...summarizeStats(await bing.get<StatRow[]>("GetQueryPageStats", { siteUrl: a.siteUrl, query: a.query }), {
        keyField: "Query",
        ...a,
      }),
    }),
  );

  tool(
    "get_queries_for_page",
    "Queries for a page",
    "Which queries bring Bing traffic to a given URL, with clicks, impressions, CTR and position.",
    { siteUrl, page: z.string().describe("Full page URL"), startDate, endDate, aggregate, sortBy, limit, contains },
    async (a, bing) => ({
      page: a.page,
      ...summarizeStats(await bing.get<StatRow[]>("GetPageQueryStats", { siteUrl: a.siteUrl, page: a.page }), {
        keyField: "Query",
        ...a,
      }),
    }),
  );

  tool(
    "get_traffic_trend",
    "Traffic trend",
    "Time series of clicks and impressions for the whole site in Bing.",
    { siteUrl, startDate, endDate },
    async (a, bing) => filterSeries(await bing.get<{ Date?: string }[]>("GetRankAndTrafficStats", { siteUrl: a.siteUrl }), a.startDate, a.endDate),
  );

  tool(
    "get_query_trend",
    "Query trend",
    "Time series of clicks and impressions for one query in Bing.",
    { siteUrl, query: z.string().describe("Exact query"), startDate, endDate },
    async (a, bing) =>
      filterSeries(await bing.get<{ Date?: string }[]>("GetQueryTrafficStats", { siteUrl: a.siteUrl, query: a.query }), a.startDate, a.endDate),
  );

  tool(
    "get_crawl_stats",
    "Crawl stats",
    "Daily crawl data: pages crawled, crawl errors, pages in index, blocked by robots.txt, etc.",
    { siteUrl, startDate, endDate },
    async (a, bing) => filterSeries(await bing.get<{ Date?: string }[]>("GetCrawlStats", { siteUrl: a.siteUrl }), a.startDate, a.endDate),
  );

  tool(
    "get_crawl_issues",
    "Crawl issues",
    "URLs with crawl issues detected by Bingbot (error codes, malware, etc.).",
    { siteUrl, limit },
    async (a, bing) => {
      const rows = (await bing.get<unknown[]>("GetCrawlIssues", { siteUrl: a.siteUrl })) ?? [];
      return { total: rows.length, rows: rows.slice(0, a.limit ?? 200) };
    },
  );

  tool(
    "get_url_info",
    "URL index status",
    "Index information for one URL: HTTP status, discovery and last crawl dates, size, document links…",
    { siteUrl, url: z.string().describe("Full URL") },
    (a, bing) => bing.get("GetUrlInfo", { siteUrl: a.siteUrl, url: a.url }),
  );

  tool(
    "get_url_traffic_info",
    "URL traffic",
    "Clicks and impressions for one URL according to Bing's index.",
    { siteUrl, url: z.string().describe("Full URL") },
    (a, bing) => bing.get("GetUrlTrafficInfo", { siteUrl: a.siteUrl, url: a.url }),
  );

  tool(
    "get_sitemaps",
    "Sitemaps",
    "Submitted sitemaps and feeds: status, URLs discovered, last crawl and errors.",
    { siteUrl },
    (a, bing) => bing.get("GetFeeds", { siteUrl: a.siteUrl }),
  );

  tool(
    "get_inbound_link_counts",
    "Pages with inbound links",
    "Site pages that receive external links and how many, according to Bing. Paginated.",
    { siteUrl, page },
    (a, bing) => bing.get("GetLinkCounts", { siteUrl: a.siteUrl, page: a.page ?? 0 }),
  );

  tool(
    "get_inbound_links",
    "Inbound links to a URL",
    "External links pointing to one URL of the site, with anchor text. Paginated.",
    { siteUrl, link: z.string().describe("URL on the site whose inbound links you want"), page },
    (a, bing) => bing.get("GetUrlLinks", { siteUrl: a.siteUrl, link: a.link, page: a.page ?? 0 }),
  );

  tool(
    "get_keyword_stats",
    "Keyword history",
    "Historical Bing impressions for a keyword (keyword research; not tied to your site).",
    {
      q: z.string().describe("Keyword"),
      country: z.string().optional().describe("Country code, e.g. us, es, mx (optional)"),
      language: z.string().optional().describe("Language, e.g. en-US, es-ES (optional)"),
    },
    (a, bing) => bing.get("GetKeywordStats", { q: a.q, country: a.country, language: a.language }),
  );

  tool(
    "get_related_keywords",
    "Related keywords",
    "Keywords related to a seed keyword and their Bing impressions in a period (keyword research; not tied to your site).",
    {
      q: z.string().describe("Seed keyword"),
      country: z.string().optional().describe("Country code, e.g. us, es, mx (optional)"),
      language: z.string().optional().describe("Language, e.g. en-US, es-ES (optional)"),
      startDate: isoDate.describe("Start date, YYYY-MM-DD"),
      endDate: isoDate.describe("End date, YYYY-MM-DD"),
      limit,
    },
    async (a, bing) => {
      const rows =
        (await bing.get<unknown[]>("GetRelatedKeywords", {
          q: a.q,
          country: a.country,
          language: a.language,
          startDate: toNetDate(a.startDate),
          endDate: toNetDate(a.endDate),
        })) ?? [];
      return { total: rows.length, rows: rows.slice(0, a.limit ?? 100) };
    },
  );

  tool(
    "get_url_submission_quota",
    "URL submission quota",
    "How many URLs the site can still submit to Bing today and this month.",
    { siteUrl },
    (a, bing) => bing.get("GetUrlSubmissionQuota", { siteUrl: a.siteUrl }),
  );

  return server;
}
