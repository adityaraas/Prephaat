# Monthly current affairs

The Current Affairs tab replaces the live newspaper cards, source filter and paper-reading guide with a curated monthly revision archive. Every issue expands to show its news trigger, exactly ten summary points, precise UPSC syllabus links with relevance, and its dated source link.

The initial snapshot spans **3 April 2025 through 3 October 2026**: exactly eighteen months, represented by **nineteen calendar buckets** because April 2025 and October 2026 are partial months. Months are listed newest first. Readers can search within a month or across all months and filter by UPSC paper. Site-wide search opens the corresponding issue in its correct month.

`public/data/monthly-current-affairs.json` ships all prepared content. Browsing and opening issues require no new API route, language-model call or publisher request. Notes describe developments at the source publication date rather than treating historical developments as current claims. They are selected issues, not a claim of exhaustive coverage of every news report.

Sources include accessible Indian Express Explained reporting and historical editorial context, clearly identified per issue. Many older Explained articles are subscriber-only; these are skipped. Editorial opinions or predictions must not be turned into established facts. Full publisher text is used transiently to prepare original short summaries and is not republished. Each item's summary plus news trigger is capped at 200 words; syllabus connections are educational interpretation.

Refresh from the project root with the existing Gemini key configured:

```powershell
node --experimental-strip-types scripts/build-monthly-current-affairs.ts --end=2026-10-03 --model=gemini-3.1-flash-lite-preview
node scripts/test-monthly-current-affairs.mjs
```

Omit `--end` for a snapshot ending today. `--month=YYYY-MM` prepares one month, `--refresh` rereads Explained archive metadata, and `--model` selects the preparation model. Metadata and prepared-note progress are retained in ignored `.cache/`. Generate the archive explicitly, not on each page view or deploy. The browser only reads the completed public JSON snapshot. Source dates, accessible full text, ten-line cardinality and content length are validated during generation; tests check that every month has substantive coverage, continuous dates and valid source links.
