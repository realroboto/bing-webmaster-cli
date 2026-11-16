import {
	API,
	type ApiMethod,
	type BuiltinType,
	CONTRACTS,
	type ContractName,
	ENUMS,
	type EnumName,
	type FieldType,
	FLAG_ENUMS,
	type TypeName,
} from "./contract.js";

const BASE_URL = "https://ssl.bing.com/webmaster/api.svc/json/";
export const API_KEY_ENV = "BING_WEBMASTER_API_KEY";
// undici waits up to 300 s for headers and again for the body; agent shells
// kill a command at 120 s with no message.
const TIMEOUT_S = 60;

/** Raw flag values as the CLI collects them; buildRequest coerces by declared type. */
export type Params = Record<string, string | number | boolean | string[]>;
/** Params after coercion: wire values keyed in API casing. */
type Wire = Record<string, unknown>;

const METHOD_LOOKUP = new Map(
	Object.keys(API).map((m) => [m.toLowerCase(), m as ApiMethod]),
);

/** Resolve a method name case-insensitively to its exact API casing. */
export function resolveMethod(name: string): ApiMethod | undefined {
	return METHOD_LOOKUP.get(name.toLowerCase());
}

export function getApiKey(env: NodeJS.ProcessEnv = process.env): string {
	const key = env[API_KEY_ENV];
	if (!key) {
		throw new Error(
			`Missing API key: set the ${API_KEY_ENV} environment variable.`,
		);
	}
	return key;
}

const isContract = (type: string): type is ContractName => type in CONTRACTS;

// WCF reads only scalars from a query string, so a Get* method with a
// DataContract param (GetChildrenUrlInfo) answers 405 to GET (#2).
export function verbOf(method: ApiMethod): "GET" | "POST" {
	return method.startsWith("Get") &&
		!Object.values<TypeName>(API[method]).some(isContract)
		? "GET"
		: "POST";
}

// A coercer turns one raw flag value into its wire value. It throws an Error
// whose message completes "--flag must be ...".
type Coercer = (value: Params[string]) => unknown;

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

// Member name (any case) or number → number. A [Flags] enum takes any OR of
// its members.
function enumOf(type: EnumName): Coercer {
	const members: Record<string, number> = ENUMS[type];
	const byName = new Map(
		Object.entries(members).map(([k, v]) => [k.toLowerCase(), v]),
	);
	const values = Object.values(members);
	const mask = FLAG_ENUMS.includes(type)
		? values.reduce((a, b) => a | b, 0)
		: undefined;
	const expected = `a ${type} member (${Object.keys(members).join(", ")}) or ${mask === undefined ? "its number" : "a number ORing members"}`;
	return (value) => {
		const s = String(single(value));
		const n =
			byName.get(s.toLowerCase()) ?? (/^\d+$/.test(s) ? Number(s) : NaN);
		if (values.includes(n)) return n;
		// n <= mask also rejects NaN, which & would turn into 0.
		if (mask !== undefined && n <= mask && (n & ~mask) === 0) return n;
		throw new Error(expected);
	};
}

// ECMAScript date-time string format: Date.parse reads it the same on every
// engine. Date-only means UTC. A time needs Z or an offset, so the request
// does not change with the machine time zone.
const ISO_8601 =
	/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2}))?$/;

// JSON.stringify calls toJSON: the body gets /Date(ms)/ (official examples).
// appendParams calls String: the GET query gets UTC ISO 8601 (verified live, #12).
const dateTime: Coercer = (value) => {
	const s = String(single(value));
	const ms = ISO_8601.test(s) ? Date.parse(s) : NaN;
	// Date.parse rolls 2026-02-30 over to March 2: the day must round-trip.
	const day = s.slice(0, 10);
	if (
		Number.isNaN(ms) ||
		new Date(Date.parse(day)).toISOString().slice(0, 10) !== day
	) {
		throw new Error(
			"an ISO 8601 date (2026-01-31, or 2026-01-31T12:00:00 plus Z or ±hh:mm)",
		);
	}
	const iso = new Date(ms).toISOString();
	return { toJSON: () => `/Date(${ms})/`, toString: () => iso };
};

const BUILTIN: Record<BuiltinType, Coercer> = {
	string: str,
	bool,
	short: int(-32768, 32767),
	ushort: int(0, 65535),
	int: int(-2147483648, 2147483647),
	"byte[]": list(int(0, 255)),
	DateTime: dateTime,
	"List<string>": list(str),
};

/** One coercer per scalar type; the compiler rejects an unmapped type. */
const COERCE = {
	...BUILTIN,
	...(Object.fromEntries(
		Object.keys(ENUMS).map((e) => [e, enumOf(e as EnumName)]),
	) as Record<EnumName, Coercer>),
} satisfies Record<FieldType, Coercer>;

// FilterProperties fields default to 0 = Any; the API accepts it (#2).
const DEFAULTS: Partial<Record<ContractName, Wire>> = {
	FilterProperties: Object.fromEntries(
		Object.keys(CONTRACTS.FilterProperties.fields).map((f) => [f, 0]),
	),
};

interface Flag {
	name: string;
	coerce: Coercer;
}

/** Flags a method accepts, keyed lowercase: its scalar params, plus the
 * fields of its DataContract params as flat flags. */
function flagsOf(method: ApiMethod): Map<string, Flag> {
	const flags = new Map<string, Flag>();
	const add = (name: string, type: FieldType) =>
		flags.set(name.toLowerCase(), { name, coerce: COERCE[type] });
	for (const [name, type] of Object.entries<TypeName>(API[method])) {
		if (!isContract(type)) add(name, type);
		else
			for (const [field, ft] of Object.entries<FieldType>(
				CONTRACTS[type].fields,
			))
				add(field, ft);
	}
	return flags;
}

/** Match flags to the method's params (case-insensitive), coerce each by its
 * declared type, and key the result in API casing, in signature order. Fold
 * DataContract fields into one object per param, `__type` first. Throws before any network
 * call on an unknown flag, a bad value, or a repeated scalar. */
function coerceParams(method: ApiMethod, params: Params): Wire {
	const flags = flagsOf(method);
	const names = [...flags.values()].map((f) => `--${f.name}`).join(", ");
	const valid = `Valid params for ${method}: ${names || "none"}.`;

	// --url and --URL name one param: group them so the repeat check sees both.
	const grouped = new Map<Flag, { key: string; values: Params[string][] }>();
	for (const [key, value] of Object.entries(params)) {
		// The key never rides argv, and a second apikey would join the query.
		if (key.toLowerCase() === "apikey") {
			throw new Error(
				`--${key} is reserved: bwt reads the key from the ${API_KEY_ENV} environment variable. Remove the flag.`,
			);
		}
		const flag = flags.get(key.toLowerCase());
		if (!flag) throw new Error(`Unknown flag --${key}. ${valid}`);
		const group = grouped.get(flag) ?? { key, values: [] };
		group.values.push(value);
		grouped.set(flag, group);
	}

	const flat: Wire = {};
	for (const [flag, { key, values }] of grouped) {
		const value =
			values.length === 1
				? values[0]
				: values.flatMap((v): string[] => (Array.isArray(v) ? v : [String(v)]));
		try {
			flat[flag.name] = flag.coerce(value);
		} catch (err) {
			const why = err instanceof Error ? err.message : String(err);
			throw new Error(`--${key} must be ${why}, got: ${value}. ${valid}`);
		}
	}

	const out: Wire = {};
	for (const [name, type] of Object.entries<TypeName>(API[method])) {
		if (!isContract(type)) {
			if (name in flat) out[name] = flat[name];
			continue;
		}
		const { __type, fields } = CONTRACTS[type];
		const given = Object.keys(fields).filter((f) => f in flat);
		if (!given.length && !DEFAULTS[type]) continue;
		const obj: Wire = { __type, ...DEFAULTS[type] };
		for (const f of given) obj[f] = flat[f];
		out[name] = obj;
	}
	return out;
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
	apiKey: string,
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
				body: JSON.stringify(wire),
			};

	return { method, request: { url, init } };
}

export interface CallOptions {
	fetchImpl?: typeof fetch;
	apiKey?: string;
}

/** Call the API and return the parsed response, {"d": ...} envelope kept
 * (unwrap strips it). Throws on a non-2xx status, with the Bing fault text,
 * and when the full answer takes longer than TIMEOUT_S. */
export async function callApi(
	methodInput: string,
	params: Params = {},
	opts: CallOptions = {},
): Promise<unknown> {
	const apiKey = opts.apiKey ?? getApiKey();
	const { method, request } = buildRequest(methodInput, params, apiKey);
	const fetchImpl = opts.fetchImpl ?? globalThis.fetch;
	// The signal also aborts a stalled body read (res.text, res.json).
	const signal = AbortSignal.timeout(TIMEOUT_S * 1000);
	try {
		const res = await fetchImpl(request.url, { ...request.init, signal });
		if (!res.ok) {
			const body = await res.text().catch(() => "");
			throw new Error(
				`Bing Webmaster API error ${res.status}: ${formatFault(body)}`,
			);
		}
		return (await res.json()) as { d?: unknown };
	} catch (err) {
		if (signal.aborted) {
			throw new Error(`${method} timed out after ${TIMEOUT_S} s.`, {
				cause: err,
			});
		}
		throw err;
	}
}

/** Bing faults are top-level {"ErrorCode":N,"Message":"..."} (not in the "d"
 * envelope). Render as "Message (ErrorCode N)", or "Message" when the code is
 * absent; fall back to the raw body. */
function formatFault(body: string): string {
	try {
		const f = JSON.parse(body) as {
			ErrorCode?: number | null;
			Message?: string;
		};
		if (f.Message) {
			return f.ErrorCode == null
				? f.Message
				: `${f.Message} (ErrorCode ${f.ErrorCode})`;
		}
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
