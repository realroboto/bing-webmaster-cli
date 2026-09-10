# bing-webmaster-cli (`bwt`)

> **Unofficial. Not affiliated with or endorsed by Microsoft.** Wraps the public Bing Webmaster Tools JSON API.

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
bwt schema                            # dump the method list as JSON
bwt --help                            # usage + methods
```

- Method name is case-insensitive; the API is called with canonical casing.
- `Get*` → GET, everything else → POST. `apikey` is always sent in the query string.
- Output is the unwrapped JSON payload. `--raw` prints the full `{"d": ...}` envelope.
- Array params: repeat the flag or comma-join.

Covers all 62 API methods. See `SPEC.md` for the full inventory and design.

Skipped (add on demand): OAuth (apikey only), table/CSV output, disk cache, retries, per-command help.

## Agent skills

### Issue tracker

Issues and specs live as GitHub issues (`gh` CLI). See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context: `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

## License

MIT
