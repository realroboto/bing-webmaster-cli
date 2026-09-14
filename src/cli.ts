#!/usr/bin/env node
import { METHODS } from "./methods.js";
import { callApi, unwrap, getApiKey, API_KEY_ENV, type Params } from "./client.js";

// Hand-rolled arg parse: method params are dynamic, so parseArgs (needs a
// per-option config) can't type them. --raw/--help are the only booleans;
// every other --flag consumes the next token as its value. Repeated flags or
// comma-joined values collate into arrays.
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

  const add = (key: string, value: string) => {
    const parts: string | string[] = value.includes(",") ? value.split(",") : value;
    const prev = params[key];
    if (prev === undefined) params[key] = parts;
    else {
      const arr = Array.isArray(prev) ? prev : [String(prev)];
      params[key] = arr.concat(parts);
    }
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
      else add(body, "true");
      continue;
    }
    if (positional === undefined) positional = a;
  }

  return { positional, params, raw, help };
}

const USAGE = `bwt — Unofficial Bing Webmaster Tools CLI

Usage:
  bwt <Method> [--param value ...] [--raw]   call any API method
  bwt schema                                 dump the method list as JSON
  bwt --help                                 this help

Auth: set ${API_KEY_ENV} in the environment.
Get* methods issue GET, others POST (GetChildrenUrlInfo is the lone
Get* that POSTs). Output is the unwrapped payload
(the {"d": ...} envelope); --raw prints the full envelope.

Methods:
${METHODS.map((m) => `  ${m}`).join("\n")}`;

async function main(argv: string[]): Promise<void> {
  const { positional, params, raw, help } = parseArgv(argv);

  if (help || positional === undefined) {
    console.log(USAGE);
    return;
  }

  if (positional.toLowerCase() === "schema") {
    console.log(JSON.stringify(METHODS, null, 2));
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
