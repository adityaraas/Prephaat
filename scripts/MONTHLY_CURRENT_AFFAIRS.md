# Monthly current affairs

The Current Affairs tab uses a curated monthly revision archive. Clicking a title opens an editorial-style brief: a two-sentence summary and three takeaways first, followed by the news trigger and precise UPSC relevance. A closed “Go deeper” section preserves the full ten-point note. Back navigation returns to that month; issue links still open directly and site-wide search still finds every prepared issue.

The initial snapshot spans **3 April 2025 through 3 October 2026**: exactly eighteen months, represented by **nineteen calendar buckets** because April 2025 and October 2026 are partial months. Months are listed newest first. Readers can search within a month or across all months and filter by UPSC paper. Site-wide search opens the corresponding issue in its correct month.

The expanded snapshot spans **4 April 2025 through 4 October 2026** and contains **191 issues**, including 76 newly prepared issues. All 19 calendar buckets have at least ten issues; boundary months are marked partial. Nineteen restricted or unavailable sources were skipped during expansion.

`public/data/monthly-current-affairs.json` ships all prepared content. Browsing and opening issues require no new API route, language-model call or publisher request. Notes describe developments at the source publication date rather than treating historical developments as current claims. They are selected issues, not a claim of exhaustive coverage of every news report.

Sources include accessible Indian Express Explained reporting and historical editorial context, clearly identified per issue. Many older Explained articles are subscriber-only; these are skipped. Editorial opinions or predictions must not be turned into established facts. Full publisher text is used transiently to prepare original short summaries and is not republished. Each item's summary plus news trigger is capped at 200 words; syllabus connections are educational interpretation.

Refresh from the project root with the existing Gemini key configured:

```powershell
node --experimental-strip-types scripts/build-monthly-current-affairs.ts --end=2026-10-04 --per-month=10 --model=gemini-3.1-flash-lite-preview
node scripts/test-monthly-current-affairs.mjs
```

Omit `--end` for a snapshot ending today. `--per-month=10` targets ten sourced issues per month; the accepted range is 6–30, and ten is the default. Previously prepared issues remain in the window even if not selected again. Restricted sources and invalid notes are skipped, so actual coverage depends on accessible reporting. `--month=YYYY-MM` prepares one month, `--refresh` rereads Explained archive metadata, and `--model` selects the preparation model. Metadata and prepared-note progress are retained in ignored `.cache/`. Generate the archive explicitly, not on each page view or deploy. The browser only reads the completed public JSON snapshot. Source dates, accessible full text, ten-line cardinality and content length are validated during generation; tests check substantive monthly coverage, continuous dates, source links, concise detail order and navigation.
