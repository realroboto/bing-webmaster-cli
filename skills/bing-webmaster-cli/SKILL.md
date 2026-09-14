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
- `Get*` → GET, everything else → POST. `apikey` always rides the query string. Verb is automatic — never specify it.
- `GetChildrenUrlInfo` is the one POST-ing `Get*`. Filters are flat integer flags (`--httpCodeFilters`, `--crawlDateFilter`, `--discoveredDateFilter`, `--docFlagsFilters`), folded into its `filterProperties` body. One integer each, no comma-join; `0` = any.
  - `--httpCodeFilters`: 1=2xx, 2=3xx, 4=301, 8=302, 16=4xx, 32=5xx, 64=other.
  - `--crawlDateFilter`: 1=last week, 2=last 2 weeks, 4=last 3 weeks.
  - `--discoveredDateFilter`: 1=last week, 2=last month.
  - `--docFlagsFilters`: 1=blocked by robots.txt, 2=malware.
- Array params: repeat the flag (`--urlList a --urlList b`) or comma-join (`--urlList a,b`).
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

Most take `--siteUrl`. Per-method params live in the [`IWebmasterApi` reference](https://learn.microsoft.com/en-us/dotnet/api/microsoft.bing.webmaster.api.interfaces.iwebmasterapi?view=bing-webmaster-dotnet); the API validates and returns a fault, so try the call and read the error rather than pre-validating. `bwt schema` prints this list as JSON; `bwt --help` adds usage.

- **Sites** — GetUserSites, AddSite, VerifySite, RemoveSite, GetSiteMoves, SubmitSiteMove
- **Roles** — GetSiteRoles, AddSiteRoles, RemoveSiteRole
- **URL & content submission** — SubmitUrl, SubmitUrlBatch, GetUrlSubmissionQuota, FetchUrl, GetFetchedUrls, GetFetchedUrlDetails, SubmitContent, GetContentSubmissionQuota
- **Crawl** — GetCrawlStats, GetCrawlIssues, GetCrawlSettings, SaveCrawlSettings
- **Traffic & query stats** — GetQueryStats, GetQueryTrafficStats, GetQueryPageStats, GetQueryPageDetailStats, GetPageStats, GetPageQueryStats, GetRankAndTrafficStats
- **Keywords** — GetKeyword, GetKeywordStats, GetRelatedKeywords
- **Links** — GetLinkCounts, GetUrlLinks, GetConnectedPages, AddConnectedPage
- **Blocks & deep links** — GetBlockedUrls, AddBlockedUrl, RemoveBlockedUrl, GetActivePagePreviewBlocks, AddPagePreviewBlock, RemovePagePreviewBlock, GetDeepLinkBlocks, AddDeepLinkBlock, RemoveDeepLinkBlock, GetDeepLinkAlgoUrls, GetDeepLink, UpdateDeepLink
- **URL info** — GetUrlInfo, GetUrlTrafficInfo, GetChildrenUrlInfo, GetChildrenUrlTrafficInfo
  All four answer `400 UnknownError` server-side, on every account tested. Don't reach for them; use Site Explorer in the web UI. See issue #3.
- **Feeds & sitemaps** — GetFeeds, GetFeedDetails, SubmitFeed, RemoveFeed
- **Query parameters** — GetQueryParameters, AddQueryParameter, EnableDisableQueryParameter, RemoveQueryParameter
- **Country/region targeting** — GetCountryRegionSettings, AddCountryRegionSettings, RemoveCountryRegionSettings

## Errors

Non-200 → thrown as `Bing Webmaster API error <status>: <Message> (ErrorCode <n>)`, exit 1. The fault (e.g. `InvalidApiKey`, `ThrottleUser`) is top-level, not in the `.d` envelope.
