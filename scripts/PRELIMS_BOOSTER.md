# Prelims Booster 2025

`/home#prelims-2025` opens a Prelims Booster collection with seven subjects:
Economics, Environment & Ecology, Government Schemes, History & Culture,
International Relations, Polity & Governance, and Science & Technology.

Each book has a Crack IAS cover and retains its original page count.
Publisher-name edits are limited to branding text. The cleanup verifies study
words, navigation destinations and page dimensions, and records edited pages in
`public/data/prelims-branding-audit.json`. Source originals in `study material`
are never edited. Final copies are written to `output/pdf` and identical download
copies to `public/prelims-2025`.

The website includes 813 content pages after the cover/blank/contents sections.
Web notes use native paragraphs, headings, 1,215 table regions and 592 diagrams.
Source-line ownership covers 34,415 included lines exactly once. Source contents
become chapter/topic navigation. All original content layouts remain available
as page images, including vector infographics and passages embedded in pictures.
An embedded PDF viewer and direct/download links provide the full books,
including original contents. Source facts and dates are not independently updated.

Search covers the current book's native text. Topic navigation opens the source
page; several topics can share a page. Exact source page labels are retained in
the footer, with explicit PDF page numbers for navigation. Links such as
`/home#prelims-2025-polity-p10` reopen a particular book page. Failed fetches can
be retried; successfully loaded books are cached for the visit.

Build with PyMuPDF installed (the script also checks `tmp/governance-pdf-tools`):

    python scripts/build-prelims-booster.py
    python scripts/verify-prelims-pdfs.py
    node scripts/test-prelims-booster.mjs

For cover-only updates, use `python scripts/build-prelims-booster.py --pdf-only`.
This still verifies every non-cover page. After editing covers, inspect all
`tmp/prelims-review/*-new-cover.png` files. A PDF artifact-operation marker must
be run before the first PDF authoring operation in an editing session, following
the PDF skill. Repeated builds within that operation do not need another marker.

`public/data/prelims-2025/catalog.json` contains the collection manifest. Individual
subject JSON files contain navigation, page content, source images and audit
counts. Do not substitute full-book contents for body coverage: the reader pages
are generated directly from the supplied PDF pages.
