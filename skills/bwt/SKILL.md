---
name: bwt
description: Bing Webmaster Tools API via the `bwt` CLI — call any of its 62 methods (URL/content indexing, sitemaps/feeds, crawl + query/traffic/keyword/link stats, site + role management, blocked-URL / query-param / country targeting). Read before running `bwt`.
---

# bwt — Bing Webmaster Tools API

Zero-dep CLI wrapping every Bing Webmaster JSON API method. One pattern covers all 62.

## Setup

`BING_WEBMASTER_API_KEY` must be in the env (Bing Webmaster Tools → Settings → API Access). Missing → exit 1 naming the var. Never pass the key as a flag.

## Call any method

```sh
bwt <Method> [--param value ...] [--raw]
```

- Method name is case-insensitive; canonical casing is sent.
- `Get*` → GET, everything else → POST. `apikey` always rides the query string. Verb is automatic — never specify it.
- Array params: repeat the flag (`--urlList a --urlList b`) or comma-join (`--urlList a,b`).
- Output is the unwrapped `.d` payload, ready to pipe into `jq`. `--raw` keeps the full `{"d":...}` envelope.

## Discover the surface

- `bwt schema` — JSON array of all 62 method names. The source of truth for what exists; grep it instead of guessing a name.
- `bwt --help` — usage + method list.

Per-method **parameters** are not cached here — signatures live in the [`IWebmasterApi` reference](https://learn.microsoft.com/en-us/dotnet/api/microsoft.bing.webmaster.api.interfaces.iwebmasterapi?view=bing-webmaster-dotnet). Most methods take `--siteUrl`; the ref names the rest. The API validates params and returns a fault, so try the call and read the error rather than pre-validating.

## Common calls

```sh
bwt GetUserSites                                              # list verified sites
bwt SubmitUrl --siteUrl https://x.com --url https://x.com/p  # index one URL
bwt SubmitUrlBatch --siteUrl https://x.com --urlList https://x.com/a,https://x.com/b
bwt GetUrlSubmissionQuota --siteUrl https://x.com
bwt GetRankAndTrafficStats --siteUrl https://x.com
bwt GetCrawlIssues --siteUrl https://x.com
```

## Errors

Non-200 → thrown as `Bing Webmaster API error <status>: <Message> (ErrorCode <n>)`, exit 1. The fault (e.g. `InvalidApiKey`, `ThrottleUser`) is top-level, not in the `.d` envelope.
