# Live verification matrix

Live status of each API method on `https://ceciliobooks.com/` (verified site on the test account). Spec: #7.

## Method

- CLI: repo build (`node dist/cli.js`) from `51fc28c` (#13) and `4d3ff50` (#14). The BlockReason check after the contract fix runs the #14 branch build.
- Key: from `BING_WEBMASTER_API_KEY` in env, never in argv. No key, verification code, or e-mail appears here.
- Site analytics stay out: params name their source, not the value.
- `<S>` = `https://ceciliobooks.com/`. `<query>` = top query from GetQueryStats. `<page>` = top page from GetPageStats.

## Status

| Status  | Meaning                                                                               |
| ------- | ------------------------------------------------------------------------------------- |
| works   | HTTP 200 with data; mutating method: HTTP 200 and its Get* read-back shows the effect |
| empty   | HTTP 200, no data on this site (`[]`, `null`, or empty list field)                    |
| fault   | non-200; note gives the cause                                                         |
| not run | not called; note gives the reason                                                     |

## Get* methods (#13)

No mutating call. 22 works, 11 empty, 3 fault. GetFetchedUrls and GetFetchedUrlDetails re-checked after the #14 FetchUrl.

| Method                     | Status | Date       | Note                                                                                                                                                                                 |
| -------------------------- | ------ | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| GetUserSites               | works  | 2026-11-16 | Lists both verified sites.                                                                                                                                                           |
| GetSiteRoles               | works  | 2026-11-16 | `--includeAllSubdomains false`.                                                                                                                                                      |
| GetSiteMoves               | fault  | 2026-11-16 | 404, empty body, also with no params. A made-up name (`GetNoSuchMethod`) answers the same 404. Reference shows `[WebGet]`, no `Obsolete`. Upstream: JSON endpoint does not serve it. |
| GetUrlSubmissionQuota      | works  | 2026-11-16 |                                                                                                                                                                                      |
| GetFetchedUrls             | works  | 2026-11-16 | `[]` before any FetchUrl. Lists `<S>` (`Fetched: true`) after the #14 FetchUrl.                                                                                                      |
| GetFetchedUrlDetails       | works  | 2026-11-16 | `--url <S>` → `null` before any FetchUrl. Fetch record and document after the #14 FetchUrl.                                                                                          |
| GetContentSubmissionQuota  | works  | 2026-11-16 |                                                                                                                                                                                      |
| GetCrawlStats              | works  | 2026-11-16 |                                                                                                                                                                                      |
| GetCrawlIssues             | empty  | 2026-11-16 |                                                                                                                                                                                      |
| GetCrawlSettings           | works  | 2026-11-16 | Output saved below for the #14 write-back.                                                                                                                                           |
| GetQueryStats              | works  | 2026-11-16 |                                                                                                                                                                                      |
| GetQueryTrafficStats       | works  | 2026-11-16 | `--query <query>`.                                                                                                                                                                   |
| GetQueryPageStats          | works  | 2026-11-16 | `--query <query>`.                                                                                                                                                                   |
| GetQueryPageDetailStats    | works  | 2026-11-16 | `--query <query> --page <page>`.                                                                                                                                                     |
| GetPageStats               | works  | 2026-11-16 |                                                                                                                                                                                      |
| GetPageQueryStats          | works  | 2026-11-16 | `--page <page>`.                                                                                                                                                                     |
| GetRankAndTrafficStats     | works  | 2026-11-16 |                                                                                                                                                                                      |
| GetKeyword                 | works  | 2026-11-16 | `--q books --country us --language en-US --startDate 2026-10-01 --endDate 2026-10-31`. No `siteUrl`: runs on the account key.                                                        |
| GetKeywordStats            | works  | 2026-11-16 | `--q books --country us --language en-US`.                                                                                                                                           |
| GetRelatedKeywords         | works  | 2026-11-16 | Same flags as GetKeyword.                                                                                                                                                            |
| GetLinkCounts              | empty  | 2026-11-16 | `--page 0` → `Links: []`, `TotalPages: 0`.                                                                                                                                           |
| GetUrlLinks                | empty  | 2026-11-16 | `--link <S> --page 0` → `Details: []`. The `400 InvalidUrl (ErrorCode 7)` of #3 does not occur.                                                                                      |
| GetConnectedPages          | empty  | 2026-11-16 |                                                                                                                                                                                      |
| GetBlockedUrls             | empty  | 2026-11-16 |                                                                                                                                                                                      |
| GetActivePagePreviewBlocks | empty  | 2026-11-16 |                                                                                                                                                                                      |
| GetDeepLinkBlocks          | empty  | 2026-11-16 |                                                                                                                                                                                      |
| GetDeepLinkAlgoUrls        | fault  | 2026-11-16 | 404, empty body. Reference marks it `[Obsolete("no longer in use", true)]`. Upstream: retired.                                                                                       |
| GetDeepLink                | fault  | 2026-11-16 | `--url <S>` → 404, empty body. Reference marks it `[Obsolete("use GetDeepLinkBlocks", true)]`. Upstream: retired.                                                                    |
| GetUrlInfo                 | works  | 2026-11-16 | `--url <S>` and a guide page. `HttpStatus` reads 0 on crawled pages. Root `TotalChildUrlCount: 0`.                                                                                   |
| GetUrlTrafficInfo          | works  | 2026-11-16 | `--url <S>`.                                                                                                                                                                         |
| GetChildrenUrlInfo         | empty  | 2026-11-16 | POST with FilterProperties body, `--page 0`. `[]` for `<S>`, `/pt/`, `/pt/guias/`, `/es/guias/`, and with `--HttpCodeFilters Code2xx`. Matches `TotalChildUrlCount: 0`.              |
| GetChildrenUrlTrafficInfo  | empty  | 2026-11-16 | GET, `--page 0`, same URLs → `[]`.                                                                                                                                                   |
| GetFeeds                   | works  | 2026-11-16 | Sitemap index plus one sitemap.                                                                                                                                                      |
| GetFeedDetails             | works  | 2026-11-16 | `--feedUrl https://ceciliobooks.com/sitemap-index.xml`.                                                                                                                              |
| GetQueryParameters         | empty  | 2026-11-16 |                                                                                                                                                                                      |
| GetCountryRegionSettings   | empty  | 2026-11-16 |                                                                                                                                                                                      |

### URL-index family against #3

#3 saw `400 UnknownError (ErrorCode 2)` on all four methods. On 2026-11-16 none of them faults:

- GetUrlInfo, GetUrlTrafficInfo: 200 with data.
- GetChildrenUrlInfo, GetChildrenUrlTrafficInfo: 200, empty. The site has no child URLs on record.
- The second verified site on the account gives the same result: root `TotalChildUrlCount: 0`, children `[]`.
- The FilterProperties body from #2 now gets a 200 end to end.
- Limit: no children response with rows was seen. The request format is proven, the row format is not.

### GetCrawlSettings on 2026-11-16

Input for the SaveCrawlSettings write-back (#14). The live DataContract has the fields of the CrawlSettings page. It has no `AjaxEnabled`, the field of the SaveCrawlSettings example. The contract module keeps the page fields. SaveCrawlSettings accepted them in the #14 write-back. `CrawlRate` has 24 values.

```json
{
	"__type": "CrawlSettings:#Microsoft.Bing.Webmaster.Api",
	"CrawlBoostAvailable": false,
	"CrawlBoostEnabled": false,
	"CrawlRate": [
		7, 9, 10, 10, 10, 10, 10, 10, 9, 7, 5, 3, 2, 1, 1, 1, 1, 1, 1, 1, 1, 2, 3, 5
	]
}
```

## Mutating and quota methods (#14)

19 works, 1 empty, 1 fault, 5 not run. Dummy targets live under `<S>bwt-verify-14/` (no such page on the site). Each Add is followed by its Get* read-back, the Remove, and a second read-back. `<p>` = `<S>bwt-verify-14/page`.

| Method                      | Status  | Date       | Note                                                                                                                                                                                                                                      |
| --------------------------- | ------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AddBlockedUrl               | works   | 2026-11-16 | `--Url <p> --EntityType Page --RequestType CacheOnly --Date 2026-11-16`. GetBlockedUrls shows the entry with `DaysToExpire: 90`.                                                                                                          |
| RemoveBlockedUrl            | works   | 2026-11-16 | Same flags as AddBlockedUrl. GetBlockedUrls → `[]`.                                                                                                                                                                                       |
| AddQueryParameter           | works   | 2026-11-16 | `--queryParameter bwtverify14`. GetQueryParameters shows it, `IsEnabled: true`.                                                                                                                                                           |
| EnableDisableQueryParameter | works   | 2026-11-16 | `--isEnabled false` → `IsEnabled: false`; bare `--isEnabled` → `true`.                                                                                                                                                                    |
| RemoveQueryParameter        | works   | 2026-11-16 | GetQueryParameters → `[]`.                                                                                                                                                                                                                |
| AddPagePreviewBlock         | works   | 2026-11-16 | `--url <p>`. Build `4d3ff50`: `--reason Other` (4), then `--reason` 1, 2, 3; 0 and 5 by raw POST. Branch build: `--reason ContentNeedsToBeRemoved` → `Reason: ContentNeedsToBeRemoved`. See BlockReason below.                            |
| RemovePagePreviewBlock      | works   | 2026-11-16 | `--url <p>` after each add. GetActivePagePreviewBlocks → `[]`.                                                                                                                                                                            |
| AddCountryRegionSettings    | works   | 2026-11-16 | `--Url <S>bwt-verify-14/ --Type Directory --TwoLetterIsoCountryCode pt --Date 2026-11-16`.                                                                                                                                                |
| RemoveCountryRegionSettings | works   | 2026-11-16 | Same flags. GetCountryRegionSettings → `[]`.                                                                                                                                                                                              |
| AddDeepLinkBlock            | works   | 2026-11-16 | `--market en-us --searchUrl <S> --deepLinkUrl <p>`. `ExpiryDate` = submit + 90 days. Upstream limit: `--market` is case-sensitive. `en-US` and `pt-BR` → `400 InvalidParameter (ErrorCode 8)`.                                            |
| RemoveDeepLinkBlock         | works   | 2026-11-16 | Same flags (`en-us`). GetDeepLinkBlocks → `[]`.                                                                                                                                                                                           |
| SubmitFeed                  | works   | 2026-11-16 | `--feedUrl <S>bwt-verify-14/feed.xml` (dummy, never a real sitemap). GetFeeds lists it, `Status: Pending`.                                                                                                                                |
| RemoveFeed                  | works   | 2026-11-16 | Same dummy URL. GetFeeds equals the start state.                                                                                                                                                                                          |
| SaveCrawlSettings           | works   | 2026-11-16 | Write-back of the GetCrawlSettings snapshot above: both bools and all 24 `CrawlRate` bytes. GetCrawlSettings after = before.                                                                                                              |
| SubmitUrl                   | works   | 2026-11-16 | `--url <S>`.                                                                                                                                                                                                                              |
| SubmitUrlBatch              | works   | 2026-11-16 | `--urlList <S>pt/,<S>es/guias/`. After SubmitUrl and SubmitUrlBatch, URL quota Daily 100 → 97, Monthly 1500 → 1497.                                                                                                                       |
| FetchUrl                    | works   | 2026-11-16 | `--url <S>`. GetFetchedUrls and GetFetchedUrlDetails show the fetch at once.                                                                                                                                                              |
| SubmitContent               | works   | 2026-11-16 | `--url <S>pt/guias/ --structuredData= --dynamicServing 0`. `--httpMessage` = base64 of the live page response (status line, headers, CRLF, body). Content quota Daily 100 → 98 (two calls, see Doc conflicts settled).                    |
| AddConnectedPage            | empty   | 2026-11-16 | `--masterUrl` = the LinkedIn company page (links to <S>). 200 `null`. GetConnectedPages right after → `[]`; Bing may list it only after a check of the page.                                                                              |
| AddSiteRoles                | fault   | 2026-11-16 | `--delegatedUrl <S> --isAdministrator false --isReadOnly true`, `--authenticationCode` = site AuthenticationCode (GetUserSites; equals DelegatedCode of current roles). 400 UserNotFound (10): test e-mail has no Bing Webmaster account. |
| RemoveSiteRole              | not run | 2026-11-16 | Needs the role from AddSiteRoles. Removing a real user role is out.                                                                                                                                                                       |
| AddSite                     | not run | 2026-11-16 | Never live (#7).                                                                                                                                                                                                                          |
| RemoveSite                  | not run | 2026-11-16 | Never live (#7).                                                                                                                                                                                                                          |
| SubmitSiteMove              | not run | 2026-11-16 | Never live (#7).                                                                                                                                                                                                                          |
| UpdateDeepLink              | not run | 2026-11-16 | Never live (#7): obsolete.                                                                                                                                                                                                                |
| VerifySite                  | works   | 2026-11-16 | 200 `false` while <S> held no Bing proof: Bing cleared IsVerified (GetUserSites), site methods → 400 NotAuthorized (14). After DNS CNAME and `BingSiteAuth.xml` (cbooks #1602): 200 `true`, IsVerified true.                              |

### Start state restored

Each Get* below ran before the first and after the last call. Output is byte-identical.

- GetBlockedUrls, GetQueryParameters, GetActivePagePreviewBlocks
- GetCountryRegionSettings, GetDeepLinkBlocks, GetFeeds
- GetCrawlSettings, GetConnectedPages, GetSiteRoles

Changed by design (quota calls, no setting): GetUrlSubmissionQuota, GetContentSubmissionQuota, GetFetchedUrls, GetFetchedUrlDetails.

### BlockReason on the wire

Microsoft documents no BlockReason page. GetActivePagePreviewBlocks echoes `BlockReason` as sent and adds the server string `Reason`:

| Sent | `Reason`                  |
| ---- | ------------------------- |
| 0    | `Unknown`                 |
| 1    | `ContentNeedsToBeRemoved` |
| 2    | `PoorQualityAndIncorrect` |
| 3    | `3`                       |
| 4    | `4`                       |
| 5    | `5`                       |

The server stores any number and names only 0-2. `src/contract.ts` takes these names. The third-party names (`AdultContent`, `Copyright`, `IllegalContent`, `Other`) are gone. The CLI now rejects 3 and up before any request: the server has no name for them.

### Doc conflicts settled

- CrawlSettings: SaveCrawlSettings accepts the CrawlSettings page fields. GetCrawlSettings returns no `AjaxEnabled` (#13). `AjaxEnabled` was not sent.
- SubmitContent `dynamicServing`: the JSON number `0` (CLI) and the string `"0"` (example, raw POST) both get 200. Same URL and page for both calls. The contract keeps `int`; the CLI sends a number.
- Body dates: `--Date 2026-11-16` sends `"Date":"/Date(1794787200000)/"` with no offset. AddBlockedUrl and AddCountryRegionSettings accept it. The read-back `Date` is the submit time, not the sent date.
