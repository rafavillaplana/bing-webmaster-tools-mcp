# Security policy

This server handles people's Bing Webmaster Tools API keys, so security reports are taken seriously.

## Reporting a vulnerability

Please **do not open a public issue**. Use GitHub's private reporting instead: *Security → Report a vulnerability* on this repository.

Include what you found, how to reproduce it and its impact. You'll get an acknowledgement within a few days.

## Scope

In scope: the code in this repository and the released `.mcpb` / npm package — how the key is read and used, the MCP tools, the build and release pipeline.

Out of scope: vulnerabilities in Bing Webmaster Tools, Claude, or modified copies of this code.

## Design notes

- The API key is read from the `BING_WEBMASTER_API_KEY` environment variable, which Claude Desktop fills from a `sensitive` extension setting. It is only ever sent to `ssl.bing.com`.
- `BING_API_BASE` exists only for the test suite. Never set it in a real configuration: it would send your key to another host.
- The released bundle is built by GitHub Actions from the tagged commit; the npm package is published with provenance.
