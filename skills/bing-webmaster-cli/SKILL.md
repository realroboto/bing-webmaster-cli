---
name: bing-webmaster-cli
description: Bing Webmaster Tools API via the `bwt` CLI — submit and index URLs, push sitemaps and feeds, pull crawl, traffic, keyword, link stats, manage sites, roles, blocked URLs. Read before running `bwt`.
---

# bing-webmaster-cli (`bwt`)

Zero-dep CLI wrapping every Bing Webmaster JSON API method. One pattern covers all 62.

## Setup

Generate the key in [Bing Webmaster Tools](https://www.bing.com/webmasters): sign in, add and verify your site, then **Settings** (top right) → **API Access** → **Generate API Key**. One key per user; it covers all your verified sites.

Put it in the env — never pass it as a flag:

```sh
export BING_WEBMASTER_API_KEY=<your key>
```

Missing → exit 1 naming the var.

## Call any method

```sh
bwt <Method> [--param value ...] [--raw]
```

- Method name is case-insensitive; canonical casing is sent.
- `Get*` → GET, everything else → POST; a `Get*` with a DataContract param (`GetChildrenUrlInfo`) POSTs. `apikey` always rides the query string. Verb is automatic — never specify it.
- DataContract params (`blockedUrl`, `settings`, `siteRole`, `crawlSettings`, `filterProperties`): pass each field as a flat flag, folded into the nested object with `__type`. Omitted fields stay omitted; `FilterProperties` fields default to `0` (Any). `bwt schema` lists the fields.
- Enum flags take the member name (any case) or its number. `bwt schema` lists members. `[Flags]` enums (`HttpCodeFilters`, `DocFlagsFilters`) also take an OR of members as a number.
- Example: `bwt GetChildrenUrlInfo --siteUrl https://x.com --url https://x.com/blog --page 0 --httpCodeFilters Code4xx`.
  - `--httpCodeFilters`: Code2xx=1, Code3xx=2, Code301=4, Code302=8, Code4xx=16, Code5xx=32, AllOthers=64.
  - `--crawlDateFilter`: LastWeek=1, LastTwoWeeks=2, LastThreeWeeks=4.
  - `--discoveredDateFilter`: LastWeek=1, LastMonth=2.
  - `--docFlagsFilters`: IsBlockedByRobotsTxt=1, IsMalware=2.
- Flags: `--name value` or `--name=value`; a bare flag means `true`. Names are case-insensitive; API casing is sent.
- Values follow the param type from `bwt schema`: `bool` → `true`/`false`; `int`/`short`/`ushort` → integer; `string` keeps commas (`--q "a,b"` is one string).
- List params (`List<string>`, `byte[]`): repeat the flag (`--urlList a --urlList b`) or comma-join (`--urlList a,b`).
- Unknown flag, bad value, or repeated non-list flag → exit 1 before any request. The error names the flag and lists valid params.
- Output is the unwrapped `.d` payload, ready to pipe into `jq`. `--raw` keeps the full `{"d":...}` envelope.

## Common calls

```sh
bwt GetUserSites                                              # list verified sites
bwt SubmitUrl --siteUrl https://x.com --url https://x.com/p  # index one URL
bwt SubmitUrlBatch --siteUrl https://x.com --urlList https://x.com/a,https://x.com/b
bwt GetUrlSubmissionQuota --siteUrl https://x.com
bwt GetRankAndTrafficStats --siteUrl https://x.com
bwt GetCrawlIssues --siteUrl https://x.com
```

## All 62 methods

Most take `--siteUrl`. `bwt schema` prints every method with its verb, params, .NET types, enum members, and DataContract fields (source: the [`IWebmasterApi` reference](https://learn.microsoft.com/en-us/dotnet/api/microsoft.bing.webmaster.api.interfaces.iwebmasterapi?view=bing-webmaster-dotnet)); `bwt --help` adds usage. `bwt` checks flag names and types locally; the API validates the rest and returns a fault, so try the call and read the error.

- **Sites** — GetUserSites, AddSite, VerifySite, RemoveSite, GetSiteMoves, SubmitSiteMove
- **Roles** — GetSiteRoles, AddSiteRoles, RemoveSiteRole
- **URL & content submission** — SubmitUrl, SubmitUrlBatch, GetUrlSubmissionQuota, FetchUrl, GetFetchedUrls, GetFetchedUrlDetails, SubmitContent, GetContentSubmissionQuota
- **Crawl** — GetCrawlStats, GetCrawlIssues, GetCrawlSettings, SaveCrawlSettings
- **Traffic & query stats** — GetQueryStats, GetQueryTrafficStats, GetQueryPageStats, GetQueryPageDetailStats, GetPageStats, GetPageQueryStats, GetRankAndTrafficStats
- **Keywords** — GetKeyword, GetKeywordStats, GetRelatedKeywords
- **Links** — GetLinkCounts, GetUrlLinks, GetConnectedPages, AddConnectedPage
- **Blocks & deep links** — GetBlockedUrls, AddBlockedUrl, RemoveBlockedUrl, GetActivePagePreviewBlocks, AddPagePreviewBlock, RemovePagePreviewBlock, GetDeepLinkBlocks, AddDeepLinkBlock, RemoveDeepLinkBlock, GetDeepLinkAlgoUrls, GetDeepLink, UpdateDeepLink
- **URL info** — GetUrlInfo, GetUrlTrafficInfo, GetChildrenUrlInfo, GetChildrenUrlTrafficInfo
  All four answer 200 (checked 2026-11-08 on two sites; earlier `400 UnknownError` outage: issue #3). Year-1 dates (`/Date(-62135596800000)/`) = Bing has no crawl record. `HttpStatus` reads 0 even on crawled pages. `GetUrlTrafficInfo` gave 0 for a page with clicks; use `GetPageStats` for traffic.
- **Feeds & sitemaps** — GetFeeds, GetFeedDetails, SubmitFeed, RemoveFeed
- **Query parameters** — GetQueryParameters, AddQueryParameter, EnableDisableQueryParameter, RemoveQueryParameter
- **Country/region targeting** — GetCountryRegionSettings, AddCountryRegionSettings, RemoveCountryRegionSettings

## Not in the API

- **Site Scan** — Bing Webmaster UI only (Site Scan → Start new scan); no API method. "Crawl all subdomains" is off by default: a scan of `https://x.com/` skips `sub.x.com`. A scan can take up to 2 days.

## Errors

Non-200 → thrown as `Bing Webmaster API error <status>: <Message> (ErrorCode <n>)`, exit 1. The fault (e.g. `InvalidApiKey`, `ThrottleUser`) is top-level, not in the `.d` envelope.
