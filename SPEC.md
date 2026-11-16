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
9. As an agent, I want `bwt schema` to dump every method with its verb, params, and types as JSON, so that I can discover capabilities programmatically (self-describing).
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
21. As an agent, I want the 3 obsolete legacy deep-link methods still callable, so that the CLI exceeds the MCP's coverage and supports legacy flows. _(Amended in 0.2.0: the server answers 404 to two of them. See Amendments.)_
22. As an operator, I want the CLI published unscoped to npm as `bing-webmaster-cli`, so that it installs the same way as `ctx7` / `firecrawl-cli`.
23. As an operator, I want the container's MCP catalog to drop the `bing-webmaster` record after the CLI ships, so that the fragile MCP no longer registers.
24. As an operator, I want the existing `bing-webmaster-api-key` secret to keep flowing to the shell env unchanged, so that the swap needs no key re-provisioning.
25. As a reader, I want a README disclaiming any Microsoft affiliation on line one, so that the trademark-nominative use is unambiguous.

## Implementation Decisions

- **Two repos.** New standalone repo `bing-webmaster-cli` (primary deliverable). Separate follow-up swap in the container-build repo (`vmCODE`), gated on the npm publish.
- **Stack.** Node ≥ 26, TypeScript 7 (strict), ESM, pnpm 12, Biome check (format, lint, import order). Zero runtime dependencies: built-in `fetch` for HTTP, hand-rolled flag parser (method params are dynamic; `parseArgs` cannot type them).
- **Data-driven, not per-method handlers.** The contract module `src/contract.ts` (`API`) lists all 62 methods verbatim (API casing) with their params and .NET types. One generic dispatcher builds and issues the request. No hand-written handler per method.
- **The seam — `buildRequest(method, params, apiKey)`** (pure). Given a method name, parsed flags, and API key, returns `{ method, request: { url, init } }`: canonical method name plus `fetch` arguments (`init.method` `GET`|`POST`, `init.body` only on POST). This is the single, highest test seam. `fetch` and output-printing sit above it.
- **Transport (verified):**
  - Base: `https://ssl.bing.com/webmaster/api.svc/json/<Method>`.
  - Auth: `apikey` query-string param on every request, including POST.
  - Format: JSON via the `/json/` path segment — there is no `format=json` query param.
  - Verb: method name prefix `Get` → GET (params in query string); otherwise → POST (params in JSON body, `apikey` still in the query string). A `Get*` with a DataContract param is POST: WCF reads only scalars from a query string. Today only `GetChildrenUrlInfo` (`FilterProperties`; GET answers 405, #2). Its sibling `GetChildrenUrlTrafficInfo` has no DataContract and stays GET.
  - Response envelope: `{"d": <payload>}`; unwrap `.d` before printing unless `--raw`.
  - Timeout: 60 s per request, headers and body (`AbortSignal.timeout`; undici default is 300 s each). The error names the method.
  - Faults: top-level `{ErrorCode, Message}` → `Message (ErrorCode N)`; without `ErrorCode`, `Message` only. Exit via `process.exitCode = 1`, so piped stderr is never cut.
- **Method casing.** Accept the method argument case-insensitively; call the API with the exact table casing.
- **Flags.** The CLI parser only collects: `--k v` / `--k=v` → string, repeated flag → array, bare flag → `true`. `buildRequest` matches flags case-insensitively, sends API casing, and coerces by declared type: `bool` and integers → JSON literals, `string` keeps commas, list params split on commas (repeated flags or `--urlList a,b`), enums take member name or number and send the number. DataContract fields are flat flags, folded into one nested object per param, `__type` first; omitted fields stay omitted; `FilterProperties` defaults to `0`. Unknown flag, bad value, or repeated scalar → throw before network, naming the flag and listing valid params.
- **Dates.** `DateTime` flags take ISO 8601: date-only (UTC midnight), or date-time with `Z` or an offset. JSON body: `/Date(<ms>)/`, as the official examples show. GET query: UTC ISO 8601. Live check (#12): GetKeyword and GetRelatedKeywords accept it. `/Date(ms)/` in a query answers 400 InvalidParameter.
- **Key handling.** Read `BING_WEBMASTER_API_KEY` from env. Missing → exit non-zero with a message naming the variable. Never accept the key as a flag: `--apikey` fails before any request, naming the variable. Read the key once per call.
- **Commands.** `bwt <Method> [--flags]`; `bwt schema` (JSON: method → verb, params, types, enum members, DataContract fields); `bwt` / `--help` (usage + method list); global `--raw`.
- **Coverage.** All 62 methods (59 active + 3 obsolete legacy deep-link: `GetDeepLinkAlgoUrls`, `GetDeepLink`, `UpdateDeepLink`), exceeding the MCP's 59-active baseline. _(Amended in 0.2.0: live status per method in `docs/verification-matrix.md`. See Amendments.)_
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
  4. Typed flags: string keeps commas, list splits; boolean and integer become JSON literals; enum name becomes its number; DataContract flat flags nest with `__type` first, date field → `/Date(ms)/`; GET date → UTC ISO 8601; unknown flag and bad value throw.
  5. Missing `BING_WEBMASTER_API_KEY` → non-zero exit / thrown error naming the variable.
- **No network.** Mock/stub `fetch`; the seam is pure so most cases need no stub at all.

## Out of Scope

- OAuth 2.0 auth — apikey only (what every reference client uses). Add when a site requires it.
- Table / CSV / YAML output formats — JSON only. Add on demand.
- Disk response cache, retries, rate-limit backoff.
- Per-command help text and required-param enforcement (the API validates and returns faults).
- POX/XML and SOAP transports (retiring 2026-08-31; JSON-only).
- Creating the GitHub remote — left to the operator. (npm: published as `bing-webmaster-cli`. Releases: `CHANGELOG.md`.)

## Further Notes

- Reference full-coverage prior art: `KLIXPERT-io/bing-cli` (Go, exposes every `IWebmasterApi` op, has a `schema` dump). `NmadeleiDev/bing_webmaster_cli` is thin (~7 commands) — not a coverage model.
- Method inventory sourced from the `IWebmasterApi` .NET interface reference (the canonical exhaustive list) cross-checked against the isiahw1 MCP's call sites.
- `bwt` bin name is free on PATH; an unrelated `bwt` npm package exists but is not installed here.
- Trademark: nominative use, disclaimer on README line one, no logo. isiahw1 published a same-domain package without issue.

## Amendments

Later decisions amend the text above; they do not replace it.

### 0.2.0 — API audit (#7, 2026-11-16)

Spec: #7. Release note: `CHANGELOG.md`.

- **Contract source.** `src/contract.ts` comes by hand from the .NET `IWebmasterApi` reference: signatures, JSON examples, DataContract and enum pages. Its header records source URL and date. No extraction script, no snapshot, no contract test: one copy cannot drift from itself. A re-audit repeats the extraction.
- **Doc conflicts.** Live calls settle them, and the matrix records them. CrawlSettings follows its DataContract page (no `AjaxEnabled`). SubmitContent `dynamicServing` goes as a number; the server also takes the string. Body dates without an offset work. BlockReason names (0-2) come from the live server; Microsoft documents no BlockReason page.
- **Live verification.** `docs/verification-matrix.md` holds one row per method on `https://ceciliobooks.com/`: method, status, date, note. 2026-11-16: 40 works, 11 empty, 3 fault, 8 not run. Never live: AddSite, RemoveSite, SubmitSiteMove, UpdateDeepLink. Owner approval required: AddConnectedPage, AddSiteRoles, RemoveSiteRole. VerifySite: not run (in no live list). Mutating calls use reversible pairs or write-back of the same value. Quota calls use 1-2 URLs. Live verification is manual evidence, not part of `pnpm test`.
- **Obsolete deep-link methods (Story 21, Coverage).** The CLI still sends all 3. GetDeepLinkAlgoUrls and GetDeepLink answer 404 with an empty body, as an unknown method name does. GetSiteMoves (not obsolete) answers the same 404. UpdateDeepLink: not run.
- **Versioning.** `bwt schema` changed from a name array to the contract (Story 9). It shipped as minor 0.2.0: under SemVer, a minor version before 1.0 may break.
- **Testing.** The `METHODS` length case is gone: counting the contract tests nothing.
- **Out of scope (added).** OAuth 2.0 (owner decision pending; facts in #7). IndexNow. Client-side read-only guard. Special handling of non-JSON 2xx bodies. Retries and backoff stay out.
