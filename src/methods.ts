// Bing Webmaster Tools JSON API method names, exact casing.
// Verb is inferred by the caller: names starting with "Get" are GET, everything else POST.
export const METHODS = [
  // Sites
  "GetUserSites",
  "AddSite",
  "VerifySite",
  "RemoveSite",
  "GetSiteRoles",
  "AddSiteRoles",
  "RemoveSiteRole",
  "GetSiteMoves",
  "SubmitSiteMove",
  // URL submission/crawl
  "SubmitUrl",
  "SubmitUrlBatch",
  "GetUrlSubmissionQuota",
  "FetchUrl",
  "GetFetchedUrls",
  "GetFetchedUrlDetails",
  "SubmitContent",
  "GetContentSubmissionQuota",
  // Crawl stats/settings
  "GetCrawlStats",
  "GetCrawlIssues",
  "GetCrawlSettings",
  "SaveCrawlSettings",
  // Query/traffic stats
  "GetQueryStats",
  "GetQueryTrafficStats",
  "GetQueryPageStats",
  "GetQueryPageDetailStats",
  "GetPageStats",
  "GetPageQueryStats",
  "GetRankAndTrafficStats",
  // Keywords
  "GetKeyword",
  "GetKeywordStats",
  "GetRelatedKeywords",
  // Link analysis
  "GetLinkCounts",
  "GetUrlLinks",
  "GetConnectedPages",
  "AddConnectedPage",
  // Blocked URLs
  "GetBlockedUrls",
  "AddBlockedUrl",
  "RemoveBlockedUrl",
  // Page preview blocks
  "GetActivePagePreviewBlocks",
  "AddPagePreviewBlock",
  "RemovePagePreviewBlock",
  // Deep link blocks
  "GetDeepLinkBlocks",
  "AddDeepLinkBlock",
  "RemoveDeepLinkBlock",
  // Deep link legacy (obsolete, kept for completeness)
  "GetDeepLinkAlgoUrls",
  "GetDeepLink",
  "UpdateDeepLink",
  // URL index info
  "GetUrlInfo",
  "GetUrlTrafficInfo",
  "GetChildrenUrlInfo",
  "GetChildrenUrlTrafficInfo",
  // Feeds/sitemaps
  "GetFeeds",
  "GetFeedDetails",
  "SubmitFeed",
  "RemoveFeed",
  // Query params normalization
  "GetQueryParameters",
  "AddQueryParameter",
  "EnableDisableQueryParameter",
  "RemoveQueryParameter",
  // Country/region
  "GetCountryRegionSettings",
  "AddCountryRegionSettings",
  "RemoveCountryRegionSettings",
] as const;

export type Method = (typeof METHODS)[number];

const LOOKUP = new Map(METHODS.map((m) => [m.toLowerCase(), m]));

/** Resolve a method name case-insensitively to its exact API casing. */
export function resolveMethod(name: string): Method | undefined {
  return LOOKUP.get(name.toLowerCase());
}
