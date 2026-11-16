# Changelog

Notable changes per release. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versions: [SemVer](https://semver.org/); before 1.0, a minor version may break.

## 0.2.0 - 2026-11-16

API audit (#7). Every flag now follows the type in the official `IWebmasterApi` reference. Live status per method: [`docs/verification-matrix.md`](docs/verification-matrix.md).

### Breaking

- **Node ≥ 26** (was ≥ 20).
- **`bwt schema` format.** Was a JSON array of method names. Now an object: `{ "<Method>": { "verb": "GET"|"POST", "params": { "<name>": <type> } } }`. `<type>` is a .NET type string, `{ "enum", "flags"?, "members" }`, or `{ "contract", "__type", "fields" }`. Method names: `bwt schema | jq -r 'keys[]'`.
- **No comma split for strings.** Only list params (`List<string>`, `byte[]`) split on commas. `--q "a,b"` now sends one string.
- **DataContract params take flat field flags.** Pass `--Url`, `--EntityType`, and so on; bwt folds them into the nested object, `__type` first. The param flag itself (`--blockedUrl`, `--settings`, `--siteRole`, `--crawlSettings`, `--filterProperties`) is now an unknown flag.
- **Local checks fail before any request**, exit 1. The error names the flag and lists valid params:
  - unknown flag (was sent; the server ignored it);
  - repeated non-list flag (was sent as an array);
  - bad value: non-integer, integer out of range, bad boolean, unknown enum member, bad date.
- **`--apikey` is rejected.** The key comes only from `BING_WEBMASTER_API_KEY`.
- **`DateTime` flags take ISO 8601 only.** `/Date(ms)/` input fails.
- **AddPagePreviewBlock `--reason`** is the `BlockReason` enum: `Unknown` 0, `ContentNeedsToBeRemoved` 1, `PoorQualityAndIncorrect` 2. Names come from the live server; Microsoft documents none. `3` and up fail locally (were sent as given).

### Added

- Typed flags from `src/contract.ts`. `bool` and integers go as JSON literals. Enums take the member name (any case) or its number and send the number. `[Flags]` enums also take an OR of members as a number.
- DataContract fields as flat flags. AddBlockedUrl, RemoveBlockedUrl, AddCountryRegionSettings, RemoveCountryRegionSettings, RemoveSiteRole, SaveCrawlSettings, and SubmitSiteMove now send the body the API expects.
- Dates: ISO 8601 in. JSON body gets `/Date(<ms>)/`; GET query gets UTC ISO 8601.
- Flag names match case-insensitively; API casing is sent.
- Verb comes from the param types: a `Get*` with a DataContract param POSTs (`GetChildrenUrlInfo`).
- Each request times out after 60 s; the error names the method.
- Live verification matrix, 62 methods on 2026-11-16: 40 works, 11 empty, 3 fault (upstream 404), 8 not run.

### Fixed

- A fault without `ErrorCode` no longer prints `ErrorCode undefined`.
- Errors set `process.exitCode`: piped stderr is no longer cut.
- The API key is read once per call.

### Development

- TypeScript 7, pnpm 12. `pnpm lint` runs `biome check` (format, lint, import order).
