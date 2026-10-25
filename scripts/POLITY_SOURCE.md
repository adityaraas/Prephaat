# Polity study material

The Polity study room uses the same semantic chapter reader as ancient and medieval history, with chapter navigation, full-text search, native tables, inline illustrations and links to original PDF pages. The supplied 2026 book is reproduced as source material; its dated claims are not independently updated.

To rebuild with Python and PyMuPDF installed (or installed in `tmp/polity-pdf-tools`):

    python scripts/extract-polity-source.py
    python scripts/build-readable-history.py --polity
    node scripts/test-polity-source.mjs

The extraction reads `study material/V&R Mains Smasher Polity 2026 (2).pdf`. Generated files live in `public/polity-source` and `public/data/polity-*.json`. The 37 chapter starts are taken from the book contents; every included body text line is audited by the semantic builder. The cover, contents and opening divider precede the first chapter.
