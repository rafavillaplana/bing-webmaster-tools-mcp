# Contributing

Thanks for helping! Issues and pull requests are welcome in English or Spanish.

## Setup

```bash
npm install          # also builds dist/index.js
npm run test:e2e     # exercises everything against a fake Bing API
```

To try your changes with the real API in Claude Desktop, point a manual config at your local build:

```json
"bing-webmaster-dev": {
  "command": "node",
  "args": ["/absolute/path/to/repo/dist/index.js"],
  "env": { "BING_WEBMASTER_API_KEY": "your-api-key" }
}
```

or build the extension with `npm run pack` and install the resulting `.mcpb`.

## Before opening a pull request

```bash
npm run typecheck
npm test
npm run test:e2e
```

CI runs the same checks on Linux, macOS and Windows.

## Guidelines

- **Read-only by default.** Tools that change anything in Bing (submit URLs, sitemaps, settings) must be clearly separated, annotated with `readOnlyHint: false` / `destructiveHint`, and discussed in an issue first.
- **Keep responses small.** Tools return data to a language model; aggregate, filter and cap rows instead of dumping raw API output.
- **Never log or return the API key.** Not in errors, not in tool output. Write diagnostics to stderr only: stdout is the MCP channel.
- **Tool descriptions in English.**
- Add a unit test for any new data transformation and extend `test/e2e/` for new tools.

## Publishing a release (maintainers)

1. Bump `version` in `package.json` (e.g. `npm version patch --no-git-tag-version`) and commit.
2. Tag and push: `git tag v1.0.1 && git push origin main --tags`.
3. The *Release* workflow tests everything, attaches `bing-webmaster-tools-mcp-1.0.1.mcpb` to a GitHub Release and, if the `NPM_TOKEN` repository secret is set, publishes to npm.
