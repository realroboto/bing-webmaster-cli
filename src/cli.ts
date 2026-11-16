#!/usr/bin/env node
import { API, type ApiMethod } from "./contract.js";
import { callApi, unwrap, getApiKey, verbOf, API_KEY_ENV, type Params } from "./client.js";

// Hand-rolled arg parse: method params are dynamic, so parseArgs (needs a
// per-option config) can't type them. --raw/--help are the CLI's own switches.
// The parser only collects: --k v / --k=v → string, repeated flag → array,
// bare flag → true. buildRequest coerces each value by its declared type.
interface Parsed {
  positional?: string;
  params: Params;
  raw: boolean;
  help: boolean;
}

function parseArgv(argv: string[]): Parsed {
  const params: Params = {};
  let positional: string | undefined;
  let raw = false;
  let help = false;

  const add = (key: string, value: string | true) => {
    const prev = params[key];
    if (prev === undefined) params[key] = value;
    else params[key] = [...(Array.isArray(prev) ? prev : [String(prev)]), String(value)];
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--raw") { raw = true; continue; }
    if (a === "--help") { help = true; continue; }
    if (a.startsWith("--")) {
      const body = a.slice(2);
      const eq = body.indexOf("=");
      if (eq >= 0) { add(body.slice(0, eq), body.slice(eq + 1)); continue; }
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith("--")) { add(body, next); i++; }
      else add(body, true);
      continue;
    }
    if (positional === undefined) positional = a;
  }

  return { positional, params, raw, help };
}

const METHODS = Object.keys(API) as ApiMethod[];

const USAGE = `bwt — Unofficial Bing Webmaster Tools CLI

Usage:
  bwt <Method> [--param value ...] [--raw]   call any API method
  bwt schema                                 dump methods (verb, params, types) as JSON
  bwt --help                                 this help

Auth: set ${API_KEY_ENV} in the environment.
Get* methods issue GET, others POST (GetChildrenUrlInfo is the lone
Get* that POSTs). Output is the unwrapped payload
(the {"d": ...} envelope); --raw prints the full envelope.

Flags: --name value or --name=value; a bare flag means true. Names match
case-insensitively. Lists take a repeated flag or a comma-join; strings keep
commas. Unknown flags and bad values fail before any request.

Methods:
${METHODS.map((m) => `  ${m}`).join("\n")}`;

async function main(argv: string[]): Promise<void> {
  const { positional, params, raw, help } = parseArgv(argv);

  if (help || positional === undefined) {
    console.log(USAGE);
    return;
  }

  if (positional.toLowerCase() === "schema") {
    const schema = Object.fromEntries(
      METHODS.map((m) => [m, { verb: verbOf(m), params: API[m] }])
    );
    console.log(JSON.stringify(schema, null, 2));
    return;
  }

  getApiKey(); // fail fast with a clear message before hitting the network
  const envelope = await callApi(positional, params);
  const out = raw ? envelope : unwrap(envelope);
  console.log(JSON.stringify(out, null, 2));
}

main(process.argv.slice(2)).catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
