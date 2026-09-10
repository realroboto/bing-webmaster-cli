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
