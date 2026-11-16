> **Unofficial. Not affiliated with or endorsed by Microsoft.** Wraps the public Bing Webmaster Tools JSON API.

# bing-webmaster-cli (`bwt`)

Zero-dependency Node CLI covering every Bing Webmaster Tools API method.

## Install

```sh
npm i -g bing-webmaster-cli
export BING_WEBMASTER_API_KEY=<your key>   # from Bing Webmaster Tools → Settings → API Access
```

## Usage

```sh
bwt <Method> [--param value ...]      # call any API method
bwt GetUserSites
bwt SubmitUrl --siteUrl https://x.com --url https://x.com/page
bwt SubmitUrlBatch --siteUrl https://x.com --urlList https://x.com/a,https://x.com/b
bwt AddBlockedUrl --siteUrl https://x.com --Url https://x.com/old --EntityType Page --RequestType FullRemoval
bwt schema                            # dump methods (verb, params, types, enums, DataContracts) as JSON
bwt --help                            # usage + methods
```

- Method name is case-insensitive; the API is called with canonical casing.
- `Get*` → GET, everything else → POST. A `Get*` with a DataContract param (`GetChildrenUrlInfo`) is POST: a DataContract can't ride a query string. `apikey` is always sent in the query string.
- Output is the unwrapped JSON payload. `--raw` prints the full `{"d": ...}` envelope.
- Each request times out after 60 s; the error names the method. Errors go to stderr, exit code 1.
- The key comes only from `BING_WEBMASTER_API_KEY`. `--apikey` is rejected.
- Flags: `--name value` or `--name=value`; a bare flag means `true`. Names are case-insensitive; API casing is sent.
- Values follow the declared type. `bool` and integers go as JSON literals. `string` keeps commas.
- List params (`List<string>`, `byte[]`): repeat the flag or comma-join.
- Enum params: member name (case-insensitive) or its number; sent as the number. `[Flags]` enums also take an OR of members as a number.
- `DateTime` params: ISO 8601 (`2026-01-31`, `2026-01-31T12:00:00Z`, `2026-01-31T12:00:00+02:00`). Date-only means UTC midnight. A time needs `Z` or an offset. JSON body gets `/Date(<ms>)/`. GET query gets UTC ISO 8601 (`2026-01-31T00:00:00.000Z`).
- DataContract params: pass each field as a flat flag (`--Url`, `--EntityType`). They fold into one nested object, `__type` first. Omitted fields stay omitted; `FilterProperties` fields default to `0` (Any). The DataContract param itself is not a flag.
- Unknown flag, bad value, or repeated non-list flag: fails before any request. The error names the flag and lists valid params.
- `bwt schema` prints `{ "<Method>": { "verb": "GET"|"POST", "params": { "<name>": <type> } } }`. `<type>` is a .NET type string, `{ "enum", "flags"?, "members": { name: number } }`, or `{ "contract", "__type", "fields": { name: <type> } }`.

Covers all 62 API methods. See `SPEC.md` for the full inventory and design.

Skipped (add on demand): OAuth (apikey only), table/CSV output, disk cache, retries, per-command help.

## Develop

```sh
pnpm install   # Node >= 26, pnpm 12
pnpm test      # tsc build + smoke test
pnpm lint      # biome check: format, lint, import order
```

## Agent skills

### Issue tracker

Issues and specs live as GitHub issues (`gh` CLI). See `docs/agents/issue-tracker.md`.

### Triage labels

Canonical roles, label strings equal to their names. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

## License

MIT
