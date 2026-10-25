# International Relations reader

The International Relations tab at `/home#ir` uses a dedicated topic reader. All seven chapters and all 78 content pages of the supplied 80-page PDF are organised into 45 numbered topics. The first two pages are the cover and contents; the contents become website navigation.

Study notes open first. Each source bullet is joined across its wrapped lines; subpoints stay indented. Institution and region labels remain paired with their own descriptions, including headerless table continuations. Two-column comparisons become named study cards; wider comparisons become native tables and labelled cards on mobile. There are 103 illustrations with reviewed captions and bounded display sizes. A separate Practice questions tab contains all 78 questions, four choices each, and the matching source answer behind a disclosure. Search covers notes, tables, entries and questions. Completion still contributes to the profile chart with seven IR chapters as the target.

Rebuild with Python and PyMuPDF installed, or use the existing installation in `tmp/polity-pdf-tools`:

    python scripts/extract-ir-source.py
    python scripts/build-ir-reading.py
    node scripts/test-ir-source.mjs

The extraction reads the International Relations PDF in `study material`. Generated assets live in `public/ir-source` and `public/data/ir-*.json`. Reviewed figure descriptions live in `scripts/ir-figure-captions.json`. Repeated advertising watermarks, headers and footers are excluded. Every included text line has exactly one semantic owner, checked by the builder and tests. Numeric table cells remain content, not page numbers. The PDF's coloured cell geometry, actual heading bars and numbered topics determine structure; bold body fragments do not become headings. Content reproduces the supplied edition; its references to events are not independently updated.
