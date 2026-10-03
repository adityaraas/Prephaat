# Editorial desk

Open **Editorials** on `/home`, or go directly to `/home#editorials`. Opening a title displays an original study note with context, argument, concept explanations, syllabus links, wider perspectives, counterpoints, ways forward and a Mains practice question. Reading-list selections and answer drafts stay in the browser on the current device.

## Coverage

`public/data/editorials.json` is a dated snapshot for **3 October 2025 through 3 October 2026**, inclusive. It contains **890 Indian Express** entries and **133 The Hindu** entries. The Indian Express public editorial listings were traversed until their dates crossed the beginning of the window. This is coverage of those public listings, not a claim that deleted or unlisted articles were recovered.

The Hindu limits its public editorial pagination to nine pages; page 10 redirects to the section front. Its indexed entries currently run from **17 July 2026 to 3 October 2026**. Older daily archive pages returned HTTP 403. The UI explicitly identifies this partial coverage. A complete Hindu year needs an accessible, authorised archive export or a publisher-provided data source. No paywall or access restrictions are bypassed.

Only titles, publication dates, source URLs and keyword themes are stored in the catalog. Full articles are read transiently from the original publisher when generating a note; they are not republished. The theme filters are based on headline keywords; the detailed syllabus mapping comes from the study note.

## Refresh and notes

Run from the project root:

```powershell
node --experimental-strip-types scripts/build-editorials.ts --end=2026-10-03
node --experimental-strip-types scripts/prepare-editorial-notes.ts --limit=8
node --experimental-strip-types scripts/test-editorials.mjs
```

Before deployment, `node --experimental-strip-types scripts/prepare-editorial-notes.ts --cached-only` exports all validated local cached notes into the shipped pack without publisher or model calls. This prevents notes that worked locally from disappearing on deployment.

Omit `--end` to index the preceding calendar year as of the refresh date. Refresh is explicit; do not run the importer on every page load or deployment. It reports missing pages/articles and retains metadata in ignored `.cache/editorial-import.json` to resume work. At most four public article metadata requests run simultaneously.

Prepared notes live in `public/data/editorial-analysis.json`. Other titles generate notes on first opening through authenticated `POST /api/editorials/:id/analysis`. Generation uses the existing Gemini key aliases, with `EDITORIAL_MODEL` as an optional override; the default is `gemini-3.1-flash-lite-preview`. Unavailable, rate-limited or incomplete model responses fall back to another model within one shared deadline. Requests use structured JSON output and validated fields. Full source summaries are capped at 200 words; concept teaching, balanced perspectives and the practice question are original educational material. Notes are labelled as AI-assisted interpretations, not publisher text or official UPSC material.

Repeated requests for the same note share one job. At most three generation jobs run at once. New notes are retained in memory and optionally cached in ignored `.cache/editorial-analysis/`; a read-only filesystem must not turn a successful generation into a failed request. Disk cache needs persistent storage to survive deployments on an ephemeral host. Prepared notes ship with the project and remain available without a model call. Failed browser loads of the prepared-note file are retried on reopening. If a publisher blocks access, exposes only a teaser, changes the article date, or restricts its article, the UI shows a clear message and an original-source link instead of inventing a note.

Production must have `GEMINI_API_KEY` (or a supported key alias) set in the hosting environment; the local `.env` is deliberately excluded from the container. The Render blueprint declares the secret with `sync: false` so it is entered through Render, never committed. Existing deployments must also have this setting. Run `node --experimental-strip-types scripts/test-editorial-generation.mjs` to verify fallback, concurrent requests and read-only cache behavior without network requests or real credentials.

`scripts/preview-editorials.ts` serves an isolated visual preview on localhost port 3106. Its preview identity is unrelated to the production database; it does not access production accounts. Unprepared titles use the configured analysis service. Browser preview requires an available browser-control surface.
