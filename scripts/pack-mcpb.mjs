// Builds the Claude Desktop extension: bing-webmaster-tools-mcp-<version>.mcpb
// Version and tool list are taken from package.json and from the built server itself,
// so the manifest never drifts from the code.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const manifest = JSON.parse(fs.readFileSync("manifest.json", "utf8"));

const client = new Client({ name: "pack", version: "1" });
await client.connect(new StdioClientTransport({ command: process.execPath, args: ["dist/index.js"], stderr: "ignore" }));
const { tools } = await client.listTools();
await client.close();

manifest.version = pkg.version;
manifest.tools = tools.map((t) => ({ name: t.name, description: t.description }));

const stage = path.join("build", "mcpb");
fs.rmSync(stage, { recursive: true, force: true });
fs.mkdirSync(path.join(stage, "dist"), { recursive: true });
fs.copyFileSync("dist/index.js", path.join(stage, "dist", "index.js"));
for (const f of ["icon.png", "LICENSE", "README.md"]) fs.copyFileSync(f, path.join(stage, f));
fs.writeFileSync(path.join(stage, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");

const out = `bing-webmaster-tools-mcp-${pkg.version}.mcpb`;
// Run the mcpb CLI with Node directly: on Windows, spawning the .cmd shim without a shell fails.
const mcpb = path.join("node_modules", "@anthropic-ai", "mcpb", "dist", "cli", "cli.js");
execFileSync(process.execPath, [mcpb, "validate", path.join(stage, "manifest.json")], { stdio: "inherit" });
execFileSync(process.execPath, [mcpb, "pack", stage, out], { stdio: "inherit" });
console.log(`\n✔ ${out} (${tools.length} tools)`);
