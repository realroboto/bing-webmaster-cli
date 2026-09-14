import assert from "node:assert/strict";
import { buildRequest, callApi, unwrap, getApiKey, API_KEY_ENV } from "../dist/client.js";
import { METHODS } from "../dist/methods.js";

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
  const { method, request } = buildRequest("SubmitUrl", { url: "https://x.com/p" }, "KEY");
  assert.equal(method, "SubmitUrl");
  assert.equal(request.init.method, "POST");
  assert.equal(new URL(request.url).searchParams.get("apikey"), "KEY");
  assert.deepEqual(JSON.parse(request.init.body), { url: "https://x.com/p" });
}

// 2b. GetChildrenUrlInfo is the sole Get* exception: POST with a nested
// filterProperties DataContract, numeric page, apikey still in the query.
{
  const { request } = buildRequest("getchildrenurlinfo", { siteUrl: "https://x.com", url: "https://x.com/d", page: "0" }, "KEY");
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
  const { request } = buildRequest("GetChildrenUrlInfo", { siteUrl: "https://x.com", url: "https://x.com/d", httpCodeFilters: "4" }, "KEY");
  const body = JSON.parse(request.init.body);
  assert.equal(body.httpCodeFilters, undefined);
  assert.equal(body.filterProperties.HttpCodeFilters, 4);
  assert.equal(body.filterProperties.CrawlDateFilter, 0);
}

// 2d. the exception stays narrow: the sibling method has no filterProperties, so it stays GET.
{
  const { request } = buildRequest("GetChildrenUrlTrafficInfo", { siteUrl: "https://x.com", url: "https://x.com/d" }, "KEY");
  assert.equal(request.init.method, "GET");
  assert.equal(request.init.body, undefined);
}

// 2e. a non-numeric or comma-joined filter flag errors instead of silently
// sending null (Number([..]) → NaN → null in JSON).
{
  const call = (params) => () => buildRequest("GetChildrenUrlInfo", params, "KEY");
  assert.throws(call({ httpCodeFilters: "abc" }), /--httpCodeFilters must be a single integer/);
  assert.throws(call({ httpCodeFilters: ["4", "5"] }), /--httpCodeFilters must be a single integer/);
  assert.throws(call({ page: "x" }), /--page must be a single integer/);
}

// 3. envelope unwraps; --raw keeps it (mock fetch).
{
  const fetchImpl = async () => ({ ok: true, json: async () => ({ d: { x: 1 } }) });
  const envelope = await callApi("GetUserSites", {}, { apiKey: "KEY", fetchImpl });
  assert.deepEqual(envelope, { d: { x: 1 } });
  assert.deepEqual(unwrap(envelope), { x: 1 });
}

// 3b. non-ok response surfaces the Bing fault Message + ErrorCode.
{
  const fetchImpl = async () => ({
    ok: false,
    status: 400,
    text: async () => JSON.stringify({ ErrorCode: 3, Message: "InvalidApiKey" }),
  });
  await assert.rejects(
    () => callApi("GetUserSites", {}, { apiKey: "KEY", fetchImpl }),
    /InvalidApiKey \(ErrorCode 3\)/,
  );
}

// 4. all methods present.
assert.equal(METHODS.length, 62);

// 5. missing key throws, naming the variable.
{
  const { [API_KEY_ENV]: _, ...env } = process.env;
  assert.throws(() => getApiKey(env), new RegExp(API_KEY_ENV));
}

console.log("ok");
