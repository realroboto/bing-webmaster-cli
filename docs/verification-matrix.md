# Live verification matrix

Live status of each API method on `https://ceciliobooks.com/` (verified site on the test account). Spec: #7.

## Method

- CLI: repo build (`node dist/cli.js`) from `51fc28c`.
- Key: from `BING_WEBMASTER_API_KEY` in env, never in argv. No key, verification code, or e-mail appears here.
- Site analytics stay out: params name their source, not the value.
- `<S>` = `https://ceciliobooks.com/`. `<query>` = top query from GetQueryStats. `<page>` = top page from GetPageStats.

## Status

| Status | Meaning |
|---|---|
| works | HTTP 200 with data |
| empty | HTTP 200, no data on this site (`[]`, `null`, or empty list field) |
| fault | non-200; note gives the cause |

## Get* methods (#13)

No mutating call. 20 works, 13 empty, 3 fault.

| Method | Status | Date | Note |
|---|---|---|---|
| GetUserSites | works | 2026-11-16 | Lists both verified sites. |
| GetSiteRoles | works | 2026-11-16 | `--includeAllSubdomains false`. |
| GetSiteMoves | fault | 2026-11-16 | 404, empty body, also with no params. Unknown method names answer the same 404. Reference shows `[WebGet]`, no `Obsolete`. Upstream: JSON endpoint does not serve it. |
| GetUrlSubmissionQuota | works | 2026-11-16 | |
| GetFetchedUrls | empty | 2026-11-16 | No FetchUrl on the site yet. |
| GetFetchedUrlDetails | empty | 2026-11-16 | `--url <S>` → `null` (not fetched). Re-check after FetchUrl (#14). |
| GetContentSubmissionQuota | works | 2026-11-16 | |
| GetCrawlStats | works | 2026-11-16 | |
| GetCrawlIssues | empty | 2026-11-16 | |
| GetCrawlSettings | works | 2026-11-16 | Output saved below for the #14 write-back. |
| GetQueryStats | works | 2026-11-16 | |
| GetQueryTrafficStats | works | 2026-11-16 | `--query <query>`. |
| GetQueryPageStats | works | 2026-11-16 | `--query <query>`. |
| GetQueryPageDetailStats | works | 2026-11-16 | `--query <query> --page <page>`. |
| GetPageStats | works | 2026-11-16 | |
| GetPageQueryStats | works | 2026-11-16 | `--page <page>`. |
| GetRankAndTrafficStats | works | 2026-11-16 | |
| GetKeyword | works | 2026-11-16 | `--q books --country us --language en-US --startDate 2026-10-01 --endDate 2026-10-31`. No `siteUrl`: runs on the account key. |
| GetKeywordStats | works | 2026-11-16 | `--q books --country us --language en-US`. |
| GetRelatedKeywords | works | 2026-11-16 | Same flags as GetKeyword. |
| GetLinkCounts | empty | 2026-11-16 | `--page 0` → `Links: []`, `TotalPages: 0`. |
| GetUrlLinks | empty | 2026-11-16 | `--link <S> --page 0` → `Details: []`. |
| GetConnectedPages | empty | 2026-11-16 | |
| GetBlockedUrls | empty | 2026-11-16 | |
| GetActivePagePreviewBlocks | empty | 2026-11-16 | |
| GetDeepLinkBlocks | empty | 2026-11-16 | |
| GetDeepLinkAlgoUrls | fault | 2026-11-16 | 404, empty body. Reference marks it `[Obsolete("no longer in use", true)]`. Upstream: retired. |
| GetDeepLink | fault | 2026-11-16 | `--url <S>` → 404, empty body. Obsolete, as GetDeepLinkAlgoUrls. Upstream: retired. |
| GetUrlInfo | works | 2026-11-16 | `--url <S>` and a guide page. `HttpStatus` reads 0 on crawled pages. Root `TotalChildUrlCount: 0`. |
| GetUrlTrafficInfo | works | 2026-11-16 | `--url <S>`. |
| GetChildrenUrlInfo | empty | 2026-11-16 | POST with FilterProperties body, `--page 0`. `[]` for `<S>`, `/pt/`, `/pt/guias/`, `/es/guias/`, and with `--HttpCodeFilters Code2xx`. Matches `TotalChildUrlCount: 0`. |
| GetChildrenUrlTrafficInfo | empty | 2026-11-16 | GET, `--page 0`, same URLs → `[]`. |
| GetFeeds | works | 2026-11-16 | Sitemap index plus one sitemap. |
| GetFeedDetails | works | 2026-11-16 | `--feedUrl https://ceciliobooks.com/sitemap-index.xml`. |
| GetQueryParameters | empty | 2026-11-16 | |
| GetCountryRegionSettings | empty | 2026-11-16 | |

### URL-index family against #3

#3 saw `400 UnknownError (ErrorCode 2)` on all four methods. On 2026-11-16 none of them faults:

- GetUrlInfo, GetUrlTrafficInfo: 200 with data.
- GetChildrenUrlInfo, GetChildrenUrlTrafficInfo: 200, empty. The site has no child URLs on record.
- The FilterProperties body from #2 now gets a 200 end to end.

### GetCrawlSettings on 2026-11-16

Input for the SaveCrawlSettings write-back (#14). It settles the CrawlSettings doc conflict: the live DataContract has the fields of the CrawlSettings page, not the example's `AjaxEnabled`. `CrawlRate` has 24 values, one per hour.

```json
{
  "__type": "CrawlSettings:#Microsoft.Bing.Webmaster.Api",
  "CrawlBoostAvailable": false,
  "CrawlBoostEnabled": false,
  "CrawlRate": [7, 9, 10, 10, 10, 10, 10, 10, 9, 7, 5, 3, 2, 1, 1, 1, 1, 1, 1, 1, 1, 2, 3, 5]
}
```
