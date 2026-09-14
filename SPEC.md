# Spec: `bing-webmaster-cli` (`bwt`) — own CLI to replace the Bing Webmaster MCP

> Unofficial. Not affiliated with or endorsed by Microsoft.
> Label when publishing to tracker: `ready-for-agent`.

## Problem Statement

We consume the Bing Webmaster Tools API through the `@isiahw1/mcp-server-bing-webmaster` MCP. It is Python-backed (`mcp_server_bwt`) and needs a hand-built `.venv` in the container image or it crashes on import (`-32000`). This is fragile to maintain and out of our control. We already migrated context7 and firecrawl off MCPs to self-maintained CLIs invoked via Bash (#240); Bing is the last fragile MCP that fits the same pattern.

## Solution

A self-maintained, zero-dependency Node CLI — package `bing-webmaster-cli`, bin `bwt` — that wraps every Bing Webmaster Tools JSON API method. Installed as an npm global alongside `ctx7` / `firecrawl`, it reads the API key from the shell environment and is invoked via Bash. Once published, the Bing MCP is removed from the container's MCP catalog. No Python, no venv.

## User Stories

1. As an operator, I want the Bing integration to stop depending on a Python venv, so that the image build and MCP startup stop being fragile.
2. As an agent, I want to call any Bing Webmaster API method from one CLI, so that I don't need an MCP server running.
3. As an agent, I want `bwt <Method> --param value` to work for all 62 API methods, so that no capability is lost versus the MCP.
4. As an agent, I want read-only methods (`Get*`) issued as GET and mutating methods issued as POST automatically, so that I don't specify the verb.
5. As an agent, I want the API key read from `BING_WEBMASTER_API_KEY` in the environment, so that no key is passed on the command line or stored in a config file.
6. As an agent, I want a clear, non-zero-exit error naming `BING_WEBMASTER_API_KEY` when the key is missing, so that I can fix the cause immediately.
7. As an agent, I want responses returned as unwrapped JSON (the `.d` payload), so that I can pipe straight into `jq` without unwrapping the WCF envelope.
8. As a power user, I want a `--raw` flag that prints the full `{"d": ...}` envelope, so that I can inspect the untouched response when debugging.
9. As an agent, I want `bwt schema` to dump the full method list as JSON, so that I can discover capabilities programmatically (self-describing).
10. As a user, I want `bwt` / `bwt --help` to print usage and list the methods, so that I can learn the surface without docs.
11. As an agent, I want to submit a single URL (`SubmitUrl`), so that I can request indexing of one page.
12. As an agent, I want to submit many URLs at once (`SubmitUrlBatch`) via repeated `--urlList a --urlList b` or `--urlList a,b`, so that batch submission is ergonomic.
13. As an agent, I want to check remaining URL and content submission quotas, so that I don't exceed limits.
14. As an agent, I want site management (list, add, verify, remove, roles, moves), so that I can administer sites end to end.
15. As an agent, I want crawl stats, issues, and settings (read + save), so that I can monitor and tune crawl behavior.
16. As an agent, I want query/traffic/page/keyword/link stats, so that I can pull SEO analytics.
17. As an agent, I want blocked-URL, page-preview-block, and deep-link-block management, so that I can control what Bing shows.
18. As an agent, I want URL index info methods (single + children, with/without traffic), so that I can inspect index coverage.
19. As an agent, I want feed/sitemap management (list, details, submit, remove), so that I can manage sitemaps.
20. As an agent, I want URL-normalization parameter and country/region targeting methods, so that I have full parity with the API.
21. As an agent, I want the 3 obsolete legacy deep-link methods still callable, so that the CLI exceeds the MCP's coverage and supports legacy flows.
22. As an operator, I want the CLI published unscoped to npm as `bing-webmaster-cli`, so that it installs the same way as `ctx7` / `firecrawl-cli`.
23. As an operator, I want the container's MCP catalog to drop the `bing-webmaster` record after the CLI ships, so that the fragile MCP no longer registers.
24. As an operator, I want the existing `bing-webmaster-api-key` secret to keep flowing to the shell env unchanged, so that the swap needs no key re-provisioning.
25. As a reader, I want a README disclaiming any Microsoft affiliation on line one, so that the trademark-nominative use is unambiguous.

## Implementation Decisions

- **Two repos.** New standalone repo `bing-webmaster-cli` (primary deliverable). Separate follow-up swap in the container-build repo (`vmCODE`), gated on the npm publish.
- **Stack.** Node ≥ 20, TypeScript, ESM. Zero runtime dependencies: built-in `fetch` for HTTP, `node:util` `parseArgs` for flags.
- **Data-driven, not per-method handlers.** A single `METHODS` table lists all 62 method names verbatim (API casing). One generic dispatcher builds and issues the request. No hand-written handler per method.
- **The seam — `buildRequest(method, params)`** (pure). Given a method name and parsed flags, returns the request descriptor: `{ url, method: "GET"|"POST", body? }`. This is the single, highest test seam. `fetch` and output-printing sit above it.
- **Transport (verified):**
  - Base: `https://ssl.bing.com/webmaster/api.svc/json/<Method>`.
  - Auth: `apikey` query-string param on every request, including POST.
  - Format: JSON via the `/json/` path segment — there is no `format=json` query param.
  - Verb: method name prefix `Get` → GET (params in query string); otherwise → POST (params in JSON body, `apikey` still in the query string). **One exception:** `GetChildrenUrlInfo` takes a complex `FilterProperties` DataContract and answers 405 to GET — it is POSTed with `filterProperties` nested in the body. Its sibling `GetChildrenUrlTrafficInfo` has no such argument and stays GET.
  - Response envelope: `{"d": <payload>}`; unwrap `.d` before printing unless `--raw`.
- **Method casing.** Accept the method argument case-insensitively; call the API with the exact table casing.
- **Array params.** Accept repeated flags (`--urlList a --urlList b`) or comma-joined (`--urlList a,b`).
- **Key handling.** Read `BING_WEBMASTER_API_KEY` from env. Missing → exit non-zero with a message naming the variable. Never accept the key as a flag.
- **Commands.** `bwt <Method> [--flags]`; `bwt schema` (JSON method list); `bwt` / `--help` (usage + method list); global `--raw`.
- **Coverage.** All 62 methods (59 active + 3 obsolete legacy deep-link: `GetDeepLinkAlgoUrls`, `GetDeepLink`, `UpdateDeepLink`), exceeding the MCP's 59-active baseline.
- **Packaging.** Unscoped `bing-webmaster-cli`, bin `{ "bwt": ... }`, MIT license, README with Microsoft-disclaimer first line and no Bing logo.

### Container swap (follow-up, after publish)

- Replace the `bing-webmaster-mcp` npm entry with a `bing-webmaster-cli` npm-global entry in the version manifest.
- Delete the Bing `.venv` build block from the image definition; install the CLI as a plain npm global (no Python).
- Remove the `bing-webmaster` record and its supporting resolver/gate/validator/skip-message from the MCP-catalog seed, mirroring how context7/firecrawl left the catalog in #240.
- Keep the `BING_WEBMASTER_API_KEY` export in the shell-env setup; reword its comment from "feeds the MCP" to "feeds the `bwt` CLI".
- Update the seed roster tests to drop `bing-webmaster` from the MCP set (the secret-catalog key rows stay — the key still exists).
- Update docs referencing the Bing MCP to reference the `bwt` CLI.

## Testing Decisions

- **Test external behavior only** — the descriptor `buildRequest` returns and the printed output. Never assert on internal helpers.
- **Module under test:** `buildRequest` (the seam). One `test/smoke.mjs`, assert-based, no framework (matches the zero-dep, lightweight ethos; prior art is the ctx7/firecrawl CLI style of shell-invokable checks).
- **Cases:**
  1. `GetUserSites` → GET, `apikey` present in query, no body.
  2. `SubmitUrl` → POST, params in JSON body, `apikey` still in query.
  3. Envelope `{"d":{"x":1}}` unwraps to `{"x":1}`; `--raw` keeps the envelope (mock `fetch` for this one only).
  4. `METHODS` length === 62.
  5. Missing `BING_WEBMASTER_API_KEY` → non-zero exit / thrown error naming the variable.
- **No network.** Mock/stub `fetch`; the seam is pure so most cases need no stub at all.

## Out of Scope

- OAuth 2.0 auth — apikey only (what every reference client uses). Add when a site requires it.
- Table / CSV / YAML output formats — JSON only. Add on demand.
- Disk response cache, retries, rate-limit backoff.
- Per-command help text and per-method parameter validation (the API validates and returns faults).
- POX/XML and SOAP transports (retiring 2026-08-31; JSON-only).
- Creating the GitHub remote — left to the operator. (npm: published, latest `0.1.1`.)

## Further Notes

- Reference full-coverage prior art: `KLIXPERT-io/bing-cli` (Go, exposes every `IWebmasterApi` op, has a `schema` dump). `NmadeleiDev/bing_webmaster_cli` is thin (~7 commands) — not a coverage model.
- Method inventory sourced from the `IWebmasterApi` .NET interface reference (the canonical exhaustive list) cross-checked against the isiahw1 MCP's call sites.
- `bwt` bin name is free on PATH; an unrelated `bwt` npm package exists but is not installed here.
- Trademark: nominative use, disclaimer on README line one, no logo. isiahw1 published a same-domain package without issue.
