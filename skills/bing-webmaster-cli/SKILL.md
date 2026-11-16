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

Missing → exit 1 naming the var. `--apikey` → exit 1, rejected before any request.

## Call any method

```sh
bwt <Method> [--param value ...] [--raw]
```

- Method name is case-insensitive; canonical casing is sent.
- `Get*` → GET, everything else → POST; a `Get*` with a DataContract param (`GetChildrenUrlInfo`) POSTs. `apikey` always rides the query string. Verb is automatic — never specify it.
- DataContract params (`blockedUrl`, `settings`, `siteRole`, `crawlSettings`, `filterProperties`): pass each field as a flat flag, folded into the nested object with `__type`. The param itself (`--blockedUrl`) is not a flag. Omitted fields stay omitted; `FilterProperties` fields default to `0` (Any). `bwt schema` lists the fields.
- Enum flags take the member name (any case) or its number. `bwt schema` lists members. `[Flags]` enums (`HttpCodeFilters`, `DocFlagsFilters`) also take an OR of members as a number.
- Example: `bwt GetChildrenUrlInfo --siteUrl https://x.com --url https://x.com/blog --page 0 --httpCodeFilters Code4xx`.
  - `--httpCodeFilters`: Code2xx=1, Code3xx=2, Code301=4, Code302=8, Code4xx=16, Code5xx=32, AllOthers=64.
  - `--crawlDateFilter`: LastWeek=1, LastTwoWeeks=2, LastThreeWeeks=4.
  - `--discoveredDateFilter`: LastWeek=1, LastMonth=2.
  - `--docFlagsFilters`: IsBlockedByRobotsTxt=1, IsMalware=2.
- Flags: `--name value` or `--name=value`; a bare flag means `true`. Names are case-insensitive; API casing is sent.
- Values follow the param type from `bwt schema`: `bool` → `true`/`false`; `int`/`short`/`ushort` → integer; `string` keeps commas (`--q "a,b"` is one string).
- `DateTime` flags (`--startDate`, `--endDate`, DataContract `--Date`): ISO 8601 (`2026-01-31`, `2026-01-31T12:00:00Z`). Date-only = UTC midnight; a time needs `Z` or an offset. bwt sends `/Date(ms)/` in a JSON body, UTC ISO 8601 in a GET query.
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
  VerifySite re-checks the ownership proof: `BingSiteAuth.xml`, `msvalidate.01` meta tag, or DNS CNAME. No proof on the site (a site verified by import) → `false`, and Bing clears the verified state; site methods then fail `400 NotAuthorized` (checked 2026-11-16). Run it only when the proof is live.
- **Roles** — GetSiteRoles, AddSiteRoles, RemoveSiteRole
  AddSiteRoles: `--authenticationCode` = site `AuthenticationCode` from GetUserSites. `--userEmail` needs a Bing Webmaster account, else `400 UserNotFound` (checked 2026-11-16).
- **URL & content submission** — SubmitUrl, SubmitUrlBatch, GetUrlSubmissionQuota, FetchUrl, GetFetchedUrls, GetFetchedUrlDetails, SubmitContent, GetContentSubmissionQuota
- **Crawl** — GetCrawlStats, GetCrawlIssues, GetCrawlSettings, SaveCrawlSettings
- **Traffic & query stats** — GetQueryStats, GetQueryTrafficStats, GetQueryPageStats, GetQueryPageDetailStats, GetPageStats, GetPageQueryStats, GetRankAndTrafficStats
- **Keywords** — GetKeyword, GetKeywordStats, GetRelatedKeywords
- **Links** — GetLinkCounts, GetUrlLinks, GetConnectedPages, AddConnectedPage
- **Blocks & deep links** — GetBlockedUrls, AddBlockedUrl, RemoveBlockedUrl, GetActivePagePreviewBlocks, AddPagePreviewBlock, RemovePagePreviewBlock, GetDeepLinkBlocks, AddDeepLinkBlock, RemoveDeepLinkBlock, GetDeepLinkAlgoUrls, GetDeepLink, UpdateDeepLink
  AddDeepLinkBlock: `--market` is case-sensitive lowercase (`en-us`); `en-US` → `400 InvalidParameter` (checked 2026-11-16). RemoveDeepLinkBlock takes the values as added.
- **URL info** — GetUrlInfo, GetUrlTrafficInfo, GetChildrenUrlInfo, GetChildrenUrlTrafficInfo
  All four answer 200 (checked 2026-11-16 on two sites; earlier `400 UnknownError` outage: issue #3). Year-1 dates (`/Date(-62135596800000)/`) = Bing has no crawl record. `HttpStatus` reads 0 even on crawled pages. `GetUrlTrafficInfo` gave 0 for a page with clicks; use `GetPageStats` for traffic.
- **Feeds & sitemaps** — GetFeeds, GetFeedDetails, SubmitFeed, RemoveFeed
- **Query parameters** — GetQueryParameters, AddQueryParameter, EnableDisableQueryParameter, RemoveQueryParameter
- **Country/region targeting** — GetCountryRegionSettings, AddCountryRegionSettings, RemoveCountryRegionSettings

## Not in the API

- **Site Scan** — Bing Webmaster UI only (Site Scan → Start new scan); no API method. "Crawl all subdomains" is off by default: a scan of `https://x.com/` skips `sub.x.com`. A scan can take up to 2 days.

## Errors

Non-200 → thrown as `Bing Webmaster API error <status>: <Message> (ErrorCode <n>)`, exit 1. The fault (e.g. `InvalidApiKey`, `ThrottleUser`) is top-level, not in the `.d` envelope. A fault without `ErrorCode` prints the message only.

No full answer in 60 s → `<Method> timed out after 60 s.`, exit 1.

GetSiteMoves and the obsolete GetDeepLinkAlgoUrls and GetDeepLink answer 404 with an empty body, as an unknown method name does (checked 2026-11-16). Live status per method: `docs/verification-matrix.md` in the repo.
