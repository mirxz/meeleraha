# Reusing the API-reference layout

Files:
- `api-reference-layout.html` : one file, no dependencies, works offline. Draws a reference page (left contents + search, one section per topic, tables with status labels) from a JSON block inside it.
- `openapi_to_spec.py` : turns any OpenAPI/Swagger file into that JSON block. Tested on the Mews Connector swagger: 220 operations, 79 groups, 0 console errors.

## The one idea

Never hand-write the page. The page is a drawing of `spec` (the JSON in `<script id="spec">`). You change the spec, never the drawing code. That is what stops the reference drifting from the code, and it is how the Distro Control Room Reference tab works too.

## Reuse in 5 steps

1. Copy `api-reference-layout.html` to a new name (for example `stripe-reference.html`).
2. Edit `brand`, `title`, `intro`, `badge`, `stamp` at the top of the spec. Leave `badge` empty when the data is real; keep "Sample data" until it is.
3. Fill sections by hand (rules, who does what, statuses) or generate the operations from a swagger:
   `python3 openapi_to_spec.py swagger.yaml --allow allowlist.json --brand "BOB W." --title "Mews Connector API" --html my-page.html`
   (`--html` writes the spec into the page. Needs `pip install pyyaml` for .yaml files.)
4. Keep `allowlist.json` yourself: `{"rates/getAll":"read","rates/update":"write","rates/delete":"off"}`. Anything not listed shows as **Not reviewed**, never as allowed. The swagger says what exists; only you say what is allowed.
5. Open the file in a browser. Check at desktop and phone width. Share the file or publish it.

## Spec shape (what you can put in a section)

```
{"id":"op-rates","group":"Operations","title":"Rates","lede":"one line",
 "blocks":[
  {"type":"kv","items":[["Label","value"]]},            key facts grid
  {"type":"note","text":"**Verified:** ... **Not verified:** ..."},
  {"type":"table","columns":["A","B"],"rows":[["x",{"s":"pass","t":"Pass"}]]},
  {"type":"ops","rows":[{"mode":"read","path":"rates/getAll","status":{"s":"pass","t":"Allowed"},"desc":"..."}]}
 ]}
```
Status `s` is one of `pass`, `gap`, `review`, `manual`, `off`. Text supports `code` and **bold** only; anything else is shown as plain text (so pasted content cannot inject HTML).

## House rules that make it work

1. **One source of truth.** The swagger and your allowlist generate the page. If the page is wrong, fix the source and rebuild.
2. **Stamp it.** Keep the `stamp` line (API version, date, file fingerprint). If the source changed after the stamp, say so before anyone relies on the page.
3. **Shape plus word on every status.** Labels never rely on colour alone (circle = pass, triangle = needs a look, diamond = manual, dashed ring = closed).
4. **Say what was not checked.** Every Overview has a Verified / Not verified note. An empty "not verified" list is said out loud, not left blank.
5. **Group like the vendor does.** Contents groups: Start, Guidelines, Usage, Operations, Guardrails, Reference. One section per API area, one row per operation.
6. **The page shows, it never runs.** No buttons that write anywhere.
7. **Re-skin with tokens only.** Change the `:root` colours and `--font` at the top of the CSS. Nothing else.
8. **Rebuild after every change** to the allowlist, the rules, or the API version, and re-open it before sharing.

## Limits

One level of contents, no per-field request/response schemas, no try-it-out. For those, use Swagger UI or Redoc and keep this page as the "what we allow and why" layer on top.
