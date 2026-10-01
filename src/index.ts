#!/usr/bin/env node
/**
 * Bing Webmaster Tools MCP server (stdio).
 * Runs locally inside Claude Desktop, Claude Code or any MCP client that launches local servers.
 *
 *   BING_WEBMASTER_API_KEY=xxxx npx -y bing-webmaster-tools-mcp
 */
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer, VERSION } from "./server";

function readApiKey(): string | undefined {
  const raw = (process.env.BING_WEBMASTER_API_KEY ?? process.env.BING_API_KEY ?? "").trim();
  // An unfilled placeholder from a client config is the same as no key.
  if (!raw || raw.startsWith("${")) return undefined;
  return raw;
}

async function main() {
  if (process.argv.includes("--version")) {
    console.log(VERSION);
    return;
  }

  const apiKey = readApiKey();
  if (!apiKey) {
    // stdout is reserved for the MCP protocol: diagnostics go to stderr.
    console.error("[bing-webmaster] BING_WEBMASTER_API_KEY is not set; tools will return a setup error until it is.");
  }

  const server = createServer({ apiKey, baseUrl: process.env.BING_API_BASE || undefined });
  await server.connect(new StdioServerTransport());
  console.error(`[bing-webmaster] v${VERSION} ready`);
}

main().catch((err) => {
  console.error("[bing-webmaster] fatal:", err);
  process.exit(1);
});
