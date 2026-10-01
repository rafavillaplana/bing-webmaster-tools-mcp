// End-to-end test: launches the built server (dist/index.js) over stdio, exactly like
// Claude Desktop or Claude Code do, against a fake Bing Webmaster API.
// Run with: npm run test:e2e
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import assert from "node:assert/strict";
import fs from "node:fs";
import { startMockBing, TEST_KEY } from "./mock-bing.mjs";

const PORT = 8799;
const BASE = `http://127.0.0.1:${PORT}/webmaster/api.svc/json`;
const step = (msg) => console.log(`✔ ${msg}`);

async function connect(env) {
  const client = new Client({ name: "e2e", version: "1" });
  await client.connect(
    new StdioClientTransport({
      command: process.execPath,
      args: ["dist/index.js"],
      env: { PATH: process.env.PATH ?? "", BING_API_BASE: BASE, ...env },
      stderr: "ignore",
    }),
  );
  return client;
}

async function call(client, name, args = {}) {
  const r = await client.callTool({ name, arguments: args });
  const text = r.content[0].text;
  return { isError: !!r.isError, text, data: r.isError ? null : JSON.parse(text) };
}

const mock = await startMockBing(PORT);
let client;
try {
  client = await connect({ BING_WEBMASTER_API_KEY: TEST_KEY });
  const info = client.getServerVersion();
  assert.equal(info.name, "Bing Webmaster Tools");
  step("server starts over stdio");

  const { tools } = await client.listTools();
  assert.equal(tools.length, 17);
  assert.ok(tools.every((t) => t.annotations?.readOnlyHint === true));
  step(`${tools.length} read-only tools listed`);

  const manifest = JSON.parse(fs.readFileSync("manifest.json", "utf8"));
  assert.equal(manifest.user_config.api_key.sensitive, true);
  assert.equal(manifest.server.mcp_config.env.BING_WEBMASTER_API_KEY, "${user_config.api_key}");
  step("extension manifest passes the API key as a sensitive setting");

  const sites = await call(client, "list_sites");
  assert.deepEqual(sites.data, [{ url: "https://example.com/", verified: true }]);

  const qs = await call(client, "get_query_stats", { siteUrl: "https://example.com/" });
  assert.deepEqual(qs.data.totals, { clicks: 53, impressions: 950, ctr: 5.58 });
  assert.equal(qs.data.rows[0].position, 5.5);

  const weekly = await call(client, "get_query_stats", { siteUrl: "https://example.com/", aggregate: false, startDate: "2026-08-05", limit: 1 });
  assert.equal(weekly.data.returned, 1);
  assert.equal(weekly.data.rows[0].date, "2026-08-08");

  const trend = await call(client, "get_traffic_trend", { siteUrl: "https://example.com/", startDate: "2026-07-15" });
  assert.deepEqual(trend.data, [{ Date: "2026-08-01", Clicks: 20, Impressions: 700 }]);

  const links = await call(client, "get_inbound_links", { siteUrl: "https://example.com/", link: "https://example.com/a" });
  assert.equal(links.data.TotalPages, 3);
  step("tools return normalized, aggregated data");

  const apiErr = await call(client, "get_crawl_stats", { siteUrl: "https://example.com/" });
  assert.ok(apiErr.isError);
  step("API errors come back as tool errors");
  await client.close();

  client = await connect({ BING_WEBMASTER_API_KEY: "WRONGKEY00000000000000" });
  const wrong = await call(client, "list_sites");
  assert.ok(wrong.isError);
  assert.match(wrong.text, /API key/);
  await client.close();
  step("a wrong key gives a clear error");

  client = await connect({});
  assert.equal((await client.listTools()).tools.length, 17);
  const missing = await call(client, "list_sites");
  assert.ok(missing.isError);
  assert.match(missing.text, /BING_WEBMASTER_API_KEY is not set/);
  step("without a key the server still starts and explains how to set it");

  console.log("\nAll end-to-end checks passed.");
} catch (e) {
  console.error("\n✘ " + (e.stack ?? e));
  process.exitCode = 1;
} finally {
  await client?.close().catch(() => {});
  mock.close();
}
