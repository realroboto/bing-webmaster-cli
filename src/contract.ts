// Official Bing Webmaster API contract: methods, DataContracts, enums.
// Source: .NET reference for Microsoft.Bing.Webmaster.Api.Interfaces.IWebmasterApi
//   https://learn.microsoft.com/en-us/dotnet/api/microsoft.bing.webmaster.api.interfaces.iwebmasterapi?view=bing-webmaster-dotnet
//   plus each method page (C#/VB signature, JSON example) and each DataContract, property and enum page linked from it.
// Extracted by hand 2026-11-15. Names and types are verbatim C# from those pages, except BlockReason (live server, see below).
// Re-audit repeats the extraction.
// Doc conflicts and gaps: see issue #8.
// Live status per method: docs/verification-matrix.md.

/** Built-in C#/BCL types used by method params and DataContract fields. */
export type BuiltinType =
	| "string"
	| "bool"
	| "short"
	| "ushort"
	| "int"
	| "byte[]"
	| "DateTime"
	| "List<string>";

/** Enums by .NET name (nested types keep their `Outer.Inner` name). Member name -> value. */
export const ENUMS = {
	// Not on the .NET reference (Microsoft.Bing.Webmaster.Shared.DataContracts.BlockReason answers 404).
	// Names = the server's own: GetActivePagePreviewBlocks renders Reason 0-2 as these, 3+ as bare digits (#14).
	// shortcut: inferred from live output, not a documented enum (the server stores any number). Replace when Microsoft documents BlockReason.
	BlockReason: {
		Unknown: 0,
		ContentNeedsToBeRemoved: 1,
		PoorQualityAndIncorrect: 2,
	},
	"BlockedUrl.BlockedUrlEntityType": { Page: 0, Directory: 1 },
	"BlockedUrl.BlockedUrlRequestType": { CacheOnly: 0, FullRemoval: 1 },
	"CountryRegionSettings.CountryRegionSettingsType": {
		Page: 0,
		Directory: 1,
		Domain: 2,
		Subdomain: 3,
	},
	CrawlDateFilter: { Any: 0, LastWeek: 1, LastTwoWeeks: 2, LastThreeWeeks: 4 },
	"DeepLink.DeepLinkWeight": { Disabled: 0, Low: 1, Normal: 2, High: 3 },
	DiscoveredDateFilter: { Any: 0, LastWeek: 1, LastMonth: 2 },
	DocFlagsFilters: { Any: 0, IsBlockedByRobotsTxt: 1, IsMalware: 2 },
	HttpCodeFilters: {
		Any: 0,
		Code2xx: 1,
		Code3xx: 2,
		Code301: 4,
		Code302: 8,
		Code4xx: 16,
		Code5xx: 32,
		AllOthers: 64,
	},
	"SiteMoveSettings.Scope": { Domain: 0, Host: 1, Directory: 2 },
	"SiteMoveSettings.Type": { Local: 0, Global: 1 },
	"SiteRoles.UserRole": { Administrator: 0, ReadOnly: 1, ReadWrite: 2 },
} as const satisfies Record<string, Record<string, number>>;

export type EnumName = keyof typeof ENUMS;
/** Enums marked `[Flags]`: a value may OR members together. */
export const FLAG_ENUMS: readonly EnumName[] = [
	"DocFlagsFilters",
	"HttpCodeFilters",
];
/** Every type a DataContract field or scalar method param can declare. */
export type FieldType = BuiltinType | EnumName;

/** DataContracts that appear as method params: `__type` hint and fields in page order. */
export const CONTRACTS = {
	BlockedUrl: {
		__type: "BlockedUrl:#Microsoft.Bing.Webmaster.Api",
		fields: {
			Date: "DateTime",
			DaysToExpire: "int",
			EntityType: "BlockedUrl.BlockedUrlEntityType",
			RequestType: "BlockedUrl.BlockedUrlRequestType",
			Url: "string",
		},
	},
	CountryRegionSettings: {
		__type: "CountryRegionSettings:#Microsoft.Bing.Webmaster.Api",
		fields: {
			Date: "DateTime",
			TwoLetterIsoCountryCode: "string",
			Type: "CountryRegionSettings.CountryRegionSettingsType",
			Url: "string",
		},
	},
	// Fields follow the CrawlSettings page: live GetCrawlSettings returns exactly these, no AjaxEnabled (#13).
	CrawlSettings: {
		__type: "CrawlSettings:#Microsoft.Bing.Webmaster.Api",
		fields: {
			CrawlBoostAvailable: "bool",
			CrawlBoostEnabled: "bool",
			CrawlRate: "byte[]",
		},
	},
	FilterProperties: {
		__type: "FilterProperties:#Microsoft.Bing.Webmaster.Api",
		fields: {
			CrawlDateFilter: "CrawlDateFilter",
			DiscoveredDateFilter: "DiscoveredDateFilter",
			DocFlagsFilters: "DocFlagsFilters",
			HttpCodeFilters: "HttpCodeFilters",
		},
	},
	SiteMoveSettings: {
		__type: "SiteMoveSettings:#Microsoft.Bing.Webmaster.Api",
		fields: {
			Date: "DateTime",
			MoveScope: "SiteMoveSettings.Scope",
			MoveType: "SiteMoveSettings.Type",
			SourceUrl: "string",
			TargetUrl: "string",
		},
	},
	SiteRoles: {
		__type: "SiteRoles:#Microsoft.Bing.Webmaster.Api",
		fields: {
			Date: "DateTime",
			DelegatedCode: "string",
			DelegatedCodeOwnerEmail: "string",
			DelegatorEmail: "string",
			Email: "string",
			Expired: "bool",
			Role: "SiteRoles.UserRole",
			Site: "string",
			VerificationSite: "string",
		},
	},
} as const satisfies Record<
	string,
	{ __type: string; fields: Record<string, FieldType> }
>;

export type ContractName = keyof typeof CONTRACTS;
/** Every type a method param or DataContract field can declare. */
export type TypeName = FieldType | ContractName;

/** All IWebmasterApi methods, exact casing. Params in signature order: API name -> C# type. */
export const API = {
	// Sites
	GetUserSites: {},
	AddSite: { siteUrl: "string" },
	VerifySite: { siteUrl: "string" },
	RemoveSite: { siteUrl: "string" },
	GetSiteRoles: { siteUrl: "string", includeAllSubdomains: "bool" },
	AddSiteRoles: {
		siteUrl: "string",
		delegatedUrl: "string",
		userEmail: "string",
		authenticationCode: "string",
		isAdministrator: "bool",
		isReadOnly: "bool",
	},
	RemoveSiteRole: { siteUrl: "string", siteRole: "SiteRoles" },
	GetSiteMoves: { siteUrl: "string" },
	SubmitSiteMove: { siteUrl: "string", settings: "SiteMoveSettings" },
	// URL submission/crawl
	SubmitUrl: { siteUrl: "string", url: "string" },
	SubmitUrlBatch: { siteUrl: "string", urlList: "List<string>" },
	GetUrlSubmissionQuota: { siteUrl: "string" },
	FetchUrl: { siteUrl: "string", url: "string" },
	GetFetchedUrls: { siteUrl: "string" },
	GetFetchedUrlDetails: { siteUrl: "string", url: "string" },
	SubmitContent: {
		siteUrl: "string",
		url: "string",
		httpMessage: "string",
		structuredData: "string",
		dynamicServing: "int",
	},
	GetContentSubmissionQuota: { siteUrl: "string" },
	// Crawl stats/settings
	GetCrawlStats: { siteUrl: "string" },
	GetCrawlIssues: { siteUrl: "string" },
	GetCrawlSettings: { siteUrl: "string" },
	SaveCrawlSettings: { siteUrl: "string", crawlSettings: "CrawlSettings" },
	// Query/traffic stats
	GetQueryStats: { siteUrl: "string" },
	GetQueryTrafficStats: { siteUrl: "string", query: "string" },
	GetQueryPageStats: { siteUrl: "string", query: "string" },
	GetQueryPageDetailStats: {
		siteUrl: "string",
		query: "string",
		page: "string",
	},
	GetPageStats: { siteUrl: "string" },
	GetPageQueryStats: { siteUrl: "string", page: "string" },
	GetRankAndTrafficStats: { siteUrl: "string" },
	// Keywords
	GetKeyword: {
		q: "string",
		country: "string",
		language: "string",
		startDate: "DateTime",
		endDate: "DateTime",
	},
	GetKeywordStats: { q: "string", country: "string", language: "string" },
	GetRelatedKeywords: {
		q: "string",
		country: "string",
		language: "string",
		startDate: "DateTime",
		endDate: "DateTime",
	},
	// Link analysis
	GetLinkCounts: { siteUrl: "string", page: "short" },
	GetUrlLinks: { siteUrl: "string", link: "string", page: "short" },
	GetConnectedPages: { siteUrl: "string" },
	AddConnectedPage: { siteUrl: "string", masterUrl: "string" },
	// Blocked URLs
	GetBlockedUrls: { siteUrl: "string" },
	AddBlockedUrl: { siteUrl: "string", blockedUrl: "BlockedUrl" },
	RemoveBlockedUrl: { siteUrl: "string", blockedUrl: "BlockedUrl" },
	// Page preview blocks
	GetActivePagePreviewBlocks: { siteUrl: "string" },
	AddPagePreviewBlock: {
		siteUrl: "string",
		url: "string",
		reason: "BlockReason",
	},
	RemovePagePreviewBlock: { siteUrl: "string", url: "string" },
	// Deep link blocks
	GetDeepLinkBlocks: { siteUrl: "string" },
	AddDeepLinkBlock: {
		siteUrl: "string",
		market: "string",
		searchUrl: "string",
		deepLinkUrl: "string",
	},
	RemoveDeepLinkBlock: {
		siteUrl: "string",
		market: "string",
		searchUrl: "string",
		deepLinkUrl: "string",
	},
	// Deep link legacy (obsolete, kept for completeness)
	GetDeepLinkAlgoUrls: { siteUrl: "string" },
	GetDeepLink: { siteUrl: "string", url: "string" },
	UpdateDeepLink: {
		siteUrl: "string",
		algoUrl: "string",
		deepLink: "string",
		weight: "DeepLink.DeepLinkWeight",
	},
	// URL index info
	GetUrlInfo: { siteUrl: "string", url: "string" },
	GetUrlTrafficInfo: { siteUrl: "string", url: "string" },
	GetChildrenUrlInfo: {
		siteUrl: "string",
		url: "string",
		page: "ushort",
		filterProperties: "FilterProperties",
	},
	GetChildrenUrlTrafficInfo: {
		siteUrl: "string",
		url: "string",
		page: "ushort",
	},
	// Feeds/sitemaps
	GetFeeds: { siteUrl: "string" },
	GetFeedDetails: { siteUrl: "string", feedUrl: "string" },
	SubmitFeed: { siteUrl: "string", feedUrl: "string" },
	RemoveFeed: { siteUrl: "string", feedUrl: "string" },
	// Query params normalization
	GetQueryParameters: { siteUrl: "string" },
	AddQueryParameter: { siteUrl: "string", queryParameter: "string" },
	EnableDisableQueryParameter: {
		siteUrl: "string",
		queryParameter: "string",
		isEnabled: "bool",
	},
	RemoveQueryParameter: { siteUrl: "string", queryParameter: "string" },
	// Country/region
	GetCountryRegionSettings: { siteUrl: "string" },
	AddCountryRegionSettings: {
		siteUrl: "string",
		settings: "CountryRegionSettings",
	},
	RemoveCountryRegionSettings: {
		siteUrl: "string",
		settings: "CountryRegionSettings",
	},
} as const satisfies Record<string, Record<string, TypeName>>;

export type ApiMethod = keyof typeof API;
