import {
  API,
  type ApiMethod,
  type BuiltinType,
  CONTRACTS,
  ENUMS,
  type TypeName,
} from "./contract.js";

const BASE_URL = "https://ssl.bing.com/webmaster/api.svc/json/";
export const API_KEY_ENV = "BING_WEBMASTER_API_KEY";

/** Raw flag values as the CLI collects them; buildRequest coerces by declared type. */
export type Params = Record<string, string | number | boolean | string[]>;
/** Params after coercion: wire values keyed in API casing. */
type Wire = Record<string, unknown>;

const METHOD_LOOKUP = new Map(
  Object.keys(API).map((m) => [m.toLowerCase(), m as ApiMethod])
);

/** Resolve a method name case-insensitively to its exact API casing. */
export function resolveMethod(name: string): ApiMethod | undefined {
  return METHOD_LOOKUP.get(name.toLowerCase());
}

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

const FILTER_FIELDS = Object.keys(CONTRACTS.FilterProperties.fields);

export function verbOf(method: ApiMethod): "GET" | "POST" {
  return method.startsWith("Get") && method !== CHILDREN_URL_INFO
    ? "GET"
    : "POST";
}

// A coercer turns one raw flag value into its wire value. It throws an Error
// whose message completes "--flag must be ...".
type Coercer = (value: Params[string]) => unknown;

// A bare flag goes out as the string "true", as before typed dispatch.
const asIs: Coercer = (value) => (value === true ? "true" : value);

function single(value: Params[string]): string | number | boolean {
  if (Array.isArray(value)) throw new Error("given once, not repeated");
  return value;
}

const str: Coercer = (value) => {
  const v = single(value);
  if (typeof v !== "string") throw new Error("a string value");
  return v;
};

const bool: Coercer = (value) => {
  const v = single(value);
  if (typeof v === "boolean") return v;
  const s = String(v).toLowerCase();
  if (s === "true" || s === "false") return s === "true";
  throw new Error("true or false");
};

const int =
  (min: number, max: number): Coercer =>
  (value) => {
    // A repeated flag (array) fails the pattern too.
    const n =
      typeof value === "number" || /^-?\d+$/.test(String(value))
        ? Number(value)
        : NaN;
    if (!Number.isInteger(n) || n < min || n > max) {
      throw new Error(`a single integer in ${min}..${max}`);
    }
    return n;
  };

// Repeated flags and comma-joined values both add items.
const list =
  (item: Coercer): Coercer =>
  (value) => {
    const items: (string | number | boolean)[] = Array.isArray(value)
      ? value
      : [value];
    return items
      .flatMap<string | number | boolean>((v) =>
        typeof v === "string" ? v.split(",") : [v],
      )
      .map((v) => item(v));
  };

// shortcut: enums and DataContracts go out unvalidated, type them in #11.
const passThrough = <K extends string>(o: Record<K, unknown>) =>
  Object.fromEntries(Object.keys(o).map((k) => [k, asIs])) as Record<
    K,
    Coercer
  >;

const BUILTIN: Record<BuiltinType, Coercer> = {
  string: str,
  bool,
  short: int(-32768, 32767),
  ushort: int(0, 65535),
  int: int(-2147483648, 2147483647),
  "byte[]": list(int(0, 255)),
  DateTime: asIs, // shortcut: sent unvalidated, parse ISO 8601 in #12
  "List<string>": list(str),
};

/** One coercer per contract type; the compiler rejects an unmapped type. */
const COERCE: Record<TypeName, Coercer> = {
  ...BUILTIN,
  ...passThrough(ENUMS),
  ...passThrough(CONTRACTS),
};

interface Flag {
  name: string;
  coerce: Coercer;
}

/** Flags a method accepts, keyed lowercase: its params, plus the fields of its
 * DataContract params as flat flags. */
function flagsOf(method: ApiMethod): Map<string, Flag> {
  const flags = new Map<string, Flag>();
  for (const [name, type] of Object.entries(API[method]) as [
    string,
    TypeName,
  ][]) {
    flags.set(name.toLowerCase(), { name, coerce: COERCE[type] });
    if (type in CONTRACTS) {
      const { fields } = CONTRACTS[type as keyof typeof CONTRACTS];
      for (const field of Object.keys(fields)) {
        // shortcut: fields go top-level as given, except GetChildrenUrlInfo's
        // integer filters; fold every DataContract by field type in #11.
        const coerce = method === CHILDREN_URL_INFO ? int(0, 2147483647) : asIs;
        flags.set(field.toLowerCase(), { name: field, coerce });
      }
    }
  }
  return flags;
}

/** Match flags to the method's params (case-insensitive), coerce each by its
 * declared type, and key the result in API casing. Throws before any network
 * call on an unknown flag, a bad value, or a repeated scalar. */
function coerceParams(method: ApiMethod, params: Params): Wire {
  const flags = flagsOf(method);
  const names = [...flags.values()].map((f) => `--${f.name}`).join(", ");
  const valid = `Valid params for ${method}: ${names || "none"}.`;

  // --url and --URL name one param: group them so the repeat check sees both.
  const grouped = new Map<Flag, { key: string; values: Params[string][] }>();
  for (const [key, value] of Object.entries(params)) {
    const flag = flags.get(key.toLowerCase());
    if (!flag) throw new Error(`Unknown flag --${key}. ${valid}`);
    const group = grouped.get(flag) ?? { key, values: [] };
    group.values.push(value);
    grouped.set(flag, group);
  }

  const out: Wire = {};
  for (const [flag, { key, values }] of grouped) {
    const value = values.length === 1
        ? values[0]
        : values.flatMap((v): string[] => (Array.isArray(v) ? v : [String(v)]));
    try {
      out[flag.name] = flag.coerce(value);
    } catch (err) {
      const why = err instanceof Error ? err.message : String(err);
      throw new Error(`--${key} must be ${why}, got: ${value}. ${valid}`);
    }
  }
  return out;
}

/** Fold the coerced flags into the body GetChildrenUrlInfo expects: filter
 * fields move inside `filterProperties` (defaulting to 0 = "any"). */
function childrenUrlInfoBody(params: Wire): Wire {
  const filterProperties: Wire = {
    __type: "FilterProperties:#Microsoft.Bing.Webmaster.Api",
  };
  for (const field of FILTER_FIELDS) filterProperties[field] = 0;

  const body: Wire = { filterProperties };
  for (const [key, value] of Object.entries(params)) {
    if (FILTER_FIELDS.includes(key)) filterProperties[key] = value;
    else body[key] = value;
  }
  return body;
}

function appendParams(qs: URLSearchParams, params: Wire): void {
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
): { method: ApiMethod; request: Request } {
  const method = resolveMethod(methodInput);
  if (!method) {
    throw new Error(`Unknown method: ${methodInput}`);
  }

  const wire = coerceParams(method, params);
  const query = new URLSearchParams();
  query.set("apikey", apiKey);

  const get = verbOf(method) === "GET";
  if (get) appendParams(query, wire);
  const url = `${BASE_URL}${method}?${query.toString()}`;

  const init: RequestInit = get
    ? { method: "GET" }
    : {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          method === CHILDREN_URL_INFO ? childrenUrlInfoBody(wire) : wire
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
