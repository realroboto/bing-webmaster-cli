import { resolveMethod, type Method } from "./methods.js";

const BASE_URL = "https://ssl.bing.com/webmaster/api.svc/json/";
export const API_KEY_ENV = "BING_WEBMASTER_API_KEY";

export type Params = Record<string, string | number | boolean | string[]>;

export function getApiKey(env: NodeJS.ProcessEnv = process.env): string {
  const key = env[API_KEY_ENV];
  if (!key) {
    throw new Error(
      `Missing API key: set the ${API_KEY_ENV} environment variable.`
    );
  }
  return key;
}

// GetChildrenUrlInfo is the only Get* method whose signature takes a complex
// DataContract (FilterProperties), so it can't be expressed in a query string:
// the API answers 405 to GET and only accepts POST with a JSON body.
const CHILDREN_URL_INFO = "GetChildrenUrlInfo";

const FILTER_FIELDS = [
  "CrawlDateFilter",
  "DiscoveredDateFilter",
  "DocFlagsFilters",
  "HttpCodeFilters",
] as const;
const FILTER_LOOKUP = new Map(FILTER_FIELDS.map((f) => [f.toLowerCase(), f]));

function isGet(method: Method): boolean {
  return method.startsWith("Get") && method !== CHILDREN_URL_INFO;
}

/**
 * Fold the flat CLI flags into the body GetChildrenUrlInfo expects: filter
 * flags move inside `filterProperties` (defaulting to 0 = "any"), and `page`
 * plus the filters go as numbers — the DataContract rejects strings.
 */
function toInt(key: string, value: Params[string]): number {
  const n = Number(value);
  // Catches both typos and the CLI's comma-join array syntax, which Number()
  // would otherwise turn into NaN and JSON.stringify into a silent null.
  if (!Number.isFinite(n)) {
    throw new Error(`--${key} must be a single integer, got: ${value}`);
  }
  return n;
}

function childrenUrlInfoBody(params: Params): Record<string, unknown> {
  const filterProperties: Record<string, unknown> = {
    __type: "FilterProperties:#Microsoft.Bing.Webmaster.Api",
  };
  for (const field of FILTER_FIELDS) filterProperties[field] = 0;

  const body: Record<string, unknown> = { filterProperties };
  for (const [key, value] of Object.entries(params)) {
    const field = FILTER_LOOKUP.get(key.toLowerCase());
    if (field) filterProperties[field] = toInt(key, value);
    else if (key.toLowerCase() === "page") body.page = toInt(key, value);
    else body[key] = value;
  }
  return body;
}

function appendParams(qs: URLSearchParams, params: Params): void {
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      for (const v of value) qs.append(key, String(v));
    } else {
      qs.append(key, String(value));
    }
  }
}

export interface Request {
  url: string;
  init: RequestInit;
}

/** Build the fetch request for a method call. apikey is always a query param. */
export function buildRequest(
  methodInput: string,
  params: Params,
  apiKey: string
): { method: Method; request: Request } {
  const method = resolveMethod(methodInput);
  if (!method) {
    throw new Error(`Unknown method: ${methodInput}`);
  }

  const query = new URLSearchParams();
  query.set("apikey", apiKey);

  const get = isGet(method);
  if (get) appendParams(query, params);
  const url = `${BASE_URL}${method}?${query.toString()}`;

  const init: RequestInit = get
    ? { method: "GET" }
    : {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          method === CHILDREN_URL_INFO ? childrenUrlInfoBody(params) : params
        ),
      };

  return { method, request: { url, init } };
}

export interface CallOptions {
  fetchImpl?: typeof fetch;
  apiKey?: string;
}

/** Call the API and unwrap the {"d": ...} envelope. */
export async function callApi(
  methodInput: string,
  params: Params = {},
  opts: CallOptions = {}
): Promise<unknown> {
  const apiKey = opts.apiKey ?? getApiKey();
  const { request } = buildRequest(methodInput, params, apiKey);
  const fetchImpl = opts.fetchImpl ?? globalThis.fetch;
  const res = await fetchImpl(request.url, request.init);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Bing Webmaster API error ${res.status}: ${formatFault(body)}`);
  }
  const envelope = (await res.json()) as { d?: unknown };
  return envelope;
}

/** Bing faults are top-level {"ErrorCode":N,"Message":"..."} (not in the "d"
 * envelope). Render as "Message (ErrorCode N)"; fall back to the raw body. */
function formatFault(body: string): string {
  try {
    const f = JSON.parse(body) as { ErrorCode?: number; Message?: string };
    if (f.Message) return `${f.Message} (ErrorCode ${f.ErrorCode})`;
  } catch {}
  return body;
}

/** Unwrap the {"d": ...} envelope; returns the payload as-is if "d" is absent. */
export function unwrap(envelope: unknown): unknown {
  if (envelope && typeof envelope === "object" && "d" in envelope) {
    return (envelope as { d: unknown }).d;
  }
  return envelope;
}
