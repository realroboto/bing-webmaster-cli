import assert from "node:assert/strict";
import {
	API_KEY_ENV,
	buildRequest,
	callApi,
	getApiKey,
	unwrap,
} from "../dist/client.js";

// 1. Get* → GET, apikey in query, no body.
{
	const { method, request } = buildRequest("getusersites", {}, "KEY");
	assert.equal(method, "GetUserSites");
	assert.equal(request.init.method, "GET");
	assert.ok(new URL(request.url).searchParams.get("apikey") === "KEY");
	assert.equal(request.init.body, undefined);
}

// 2. mutating → POST, params in JSON body, apikey still in query.
{
	const { method, request } = buildRequest(
		"SubmitUrl",
		{ url: "https://x.com/p" },
		"KEY",
	);
	assert.equal(method, "SubmitUrl");
	assert.equal(request.init.method, "POST");
	assert.equal(new URL(request.url).searchParams.get("apikey"), "KEY");
	assert.deepEqual(JSON.parse(request.init.body), { url: "https://x.com/p" });
}

// 2b. a Get* method with a DataContract param POSTs: GetChildrenUrlInfo sends a
// nested filterProperties (0 defaults), numeric page, apikey still in the query.
{
	const { request } = buildRequest(
		"getchildrenurlinfo",
		{ siteUrl: "https://x.com", url: "https://x.com/d", page: "0" },
		"KEY",
	);
	assert.equal(request.init.method, "POST");
	assert.equal(new URL(request.url).searchParams.get("apikey"), "KEY");
	assert.deepEqual(JSON.parse(request.init.body), {
		siteUrl: "https://x.com",
		url: "https://x.com/d",
		page: 0,
		filterProperties: {
			__type: "FilterProperties:#Microsoft.Bing.Webmaster.Api",
			CrawlDateFilter: 0,
			DiscoveredDateFilter: 0,
			DocFlagsFilters: 0,
			HttpCodeFilters: 0,
		},
	});
}

// 2c. filter flags land inside filterProperties, as numbers, not at the top level.
{
	const { request } = buildRequest(
		"GetChildrenUrlInfo",
		{ siteUrl: "https://x.com", url: "https://x.com/d", httpCodeFilters: "4" },
		"KEY",
	);
	const body = JSON.parse(request.init.body);
	assert.equal(body.httpCodeFilters, undefined);
	assert.equal(body.filterProperties.HttpCodeFilters, 4);
	assert.equal(body.filterProperties.CrawlDateFilter, 0);
}

// 2d. the sibling method has no DataContract param, so it stays GET.
{
	const { request } = buildRequest(
		"GetChildrenUrlTrafficInfo",
		{ siteUrl: "https://x.com", url: "https://x.com/d" },
		"KEY",
	);
	assert.equal(request.init.method, "GET");
	assert.equal(request.init.body, undefined);
}

// 2e. a bad, repeated, or non-integer value errors instead of silently
// sending null (Number([..]) → NaN → null in JSON).
{
	const call = (params) => () =>
		buildRequest("GetChildrenUrlInfo", params, "KEY");
	assert.throws(
		call({ httpCodeFilters: "abc" }),
		/--httpCodeFilters must be a HttpCodeFilters member/,
	);
	assert.throws(
		call({ httpCodeFilters: ["4", "5"] }),
		/--httpCodeFilters must be given once/,
	);
	assert.throws(call({ page: "x" }), /--page must be a single integer/);
}

// 2f. string keeps its commas; list splits on commas into a JSON array.
{
	const get = buildRequest("GetKeywordStats", { q: "a,b" }, "KEY").request;
	assert.equal(new URL(get.url).searchParams.get("q"), "a,b");
	const post = buildRequest(
		"SubmitUrlBatch",
		{ siteurl: "https://x.com", urlList: "https://x.com/a,https://x.com/b" },
		"KEY",
	).request;
	assert.deepEqual(JSON.parse(post.init.body), {
		siteUrl: "https://x.com",
		urlList: ["https://x.com/a", "https://x.com/b"],
	});
}

// 2g. boolean and integer flags become JSON literals; bare flag (true) = true.
{
	const { request } = buildRequest(
		"SubmitContent",
		{
			siteUrl: "s",
			url: "u",
			httpMessage: "h",
			structuredData: "d",
			dynamicServing: "1",
		},
		"KEY",
	);
	assert.equal(JSON.parse(request.init.body).dynamicServing, 1);
	const bool = (v) =>
		JSON.parse(
			buildRequest(
				"EnableDisableQueryParameter",
				{ siteUrl: "s", queryParameter: "p", isEnabled: v },
				"KEY",
			).request.init.body,
		).isEnabled;
	assert.equal(bool("FALSE"), false);
	assert.equal(bool(true), true);
}

// 2h. unknown flag, bad value, and repeated scalar throw before network,
// naming the flag and listing the valid params.
{
	const call = (params) => () =>
		buildRequest(
			"EnableDisableQueryParameter",
			{ siteUrl: "s", ...params },
			"KEY",
		);
	const valid = /--siteUrl, --queryParameter, --isEnabled/;
	assert.throws(call({ queryParam: "p" }), /--queryParam/);
	assert.throws(call({ queryParam: "p" }), valid);
	assert.throws(call({ isEnabled: "yes" }), /--isEnabled/);
	assert.throws(call({ isEnabled: "yes" }), valid);
	assert.throws(call({ queryParameter: ["a", "b"] }), /--queryParameter/);
}

// 2i. enum flag: member name (any case) becomes its number.
{
	const weight = (v) =>
		JSON.parse(
			buildRequest(
				"UpdateDeepLink",
				{ siteUrl: "s", algoUrl: "a", deepLink: "d", weight: v },
				"KEY",
			).request.init.body,
		).weight;
	assert.equal(weight("high"), 3);
	assert.equal(weight("2"), 2);
	assert.throws(
		() => weight("7"),
		/--weight must be a DeepLink.DeepLinkWeight member/,
	);
}

// 2i'. a [Flags] enum takes an OR of members as a number, nothing outside them.
{
	const filters = (v) => () =>
		JSON.parse(
			buildRequest("GetChildrenUrlInfo", { httpCodeFilters: v }, "KEY").request
				.init.body,
		).filterProperties.HttpCodeFilters;
	assert.equal(filters("5")(), 5);
	assert.throws(
		filters("128"),
		/--httpCodeFilters must be a HttpCodeFilters member/,
	);
}

// 2j. DataContract fields as flat flags fold into one nested object, __type
// first, fields in contract order, omitted fields omitted. ISO 8601 date → /Date(ms)/.
{
	const { request } = buildRequest(
		"addblockedurl",
		{
			url: "https://x.com/u1",
			requesttype: "FullRemoval",
			siteUrl: "https://x.com",
			EntityType: "0",
			date: "2026-10-01T02:00:00+02:00",
		},
		"KEY",
	);
	const body = JSON.parse(request.init.body);
	assert.deepEqual(body, {
		siteUrl: "https://x.com",
		blockedUrl: {
			__type: "BlockedUrl:#Microsoft.Bing.Webmaster.Api",
			Date: "/Date(1790812800000)/",
			EntityType: 0,
			RequestType: 1,
			Url: "https://x.com/u1",
		},
	});
	assert.deepEqual(Object.keys(body.blockedUrl), [
		"__type",
		"Date",
		"EntityType",
		"RequestType",
		"Url",
	]);
	assert.throws(
		() => buildRequest("AddBlockedUrl", { blockedUrl: "x" }, "KEY"),
		/Unknown flag --blockedUrl/,
	);
}

// 2k. GET date: ISO 8601 in, UTC ISO 8601 in the query (live-verified on
// GetKeyword, #12). A bad date throws before network, naming the flag.
{
	const call = (dates) =>
		buildRequest(
			"GetKeyword",
			{ q: "books", country: "us", language: "en-US", ...dates },
			"KEY",
		);
	const qs = new URL(
		call({ startDate: "2026-10-01", endDate: "2026-10-31T23:59:59+01:00" })
			.request.url,
	).searchParams;
	assert.equal(qs.get("startDate"), "2026-10-01T00:00:00.000Z");
	assert.equal(qs.get("endDate"), "2026-10-31T22:59:59.000Z");
	assert.throws(
		() => call({ startDate: "2026-02-30" }),
		/--startDate must be an ISO 8601 date/,
	);
	assert.throws(
		() => call({ endDate: "10/31/2026" }),
		/--endDate must be an ISO 8601 date/,
	);
	assert.throws(
		() => call({ startDate: "2026-10-01T10:00" }),
		/--startDate must be an ISO 8601 date/,
	);
}

// 3. envelope unwraps; --raw keeps it (mock fetch).
{
	const fetchImpl = async () => ({
		ok: true,
		json: async () => ({ d: { x: 1 } }),
	});
	const envelope = await callApi(
		"GetUserSites",
		{},
		{ apiKey: "KEY", fetchImpl },
	);
	assert.deepEqual(envelope, { d: { x: 1 } });
	assert.deepEqual(unwrap(envelope), { x: 1 });
}

// 3b. non-ok response surfaces the Bing fault Message + ErrorCode.
{
	const fetchImpl = async () => ({
		ok: false,
		status: 400,
		text: async () =>
			JSON.stringify({ ErrorCode: 3, Message: "InvalidApiKey" }),
	});
	await assert.rejects(
		() => callApi("GetUserSites", {}, { apiKey: "KEY", fetchImpl }),
		/InvalidApiKey \(ErrorCode 3\)/,
	);
}

// 5. missing key throws, naming the variable.
{
	const { [API_KEY_ENV]: _, ...env } = process.env;
	assert.throws(() => getApiKey(env), new RegExp(API_KEY_ENV));
}

console.log("ok");
