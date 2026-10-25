# Environment & Ecology reader

`/home#environment` opens the same responsive topic reader used by IR. The source
is `study material/Environment & Ecology (Quick Book) -For web.pdf`, a **25-page
Drishti web preview**, not the full book. PDF pages 9–23 contain 15 non-consecutive
sample content pages. The full-book contents on PDF pages 4–8 must not be mistaken
for included chapters. The reader states this scope and links the original PDF.

The included extracts form nine chapter groups and 28 topics, with eight native
comparisons, 15 source diagrams, 11 photographs paired with their species rows,
and all five practice questions with four choices and the source answer key.
Printed pages are mapped individually: 11, 18, 32, 49, 50, 60, 87, 96, 97, 102,
104, 110, 141, 151 and 234. Every included body text line has one semantic owner;
745 lines are covered by the generated audit. Repeated headers, footers and
decorative chapter banners are excluded. Image-only animal and plant kingdom
charts are preserved and rotated for reading, with enlarge links. Dates and
species statuses reproduce the supplied edition without independent updates.

The existing 60-day foundation course remains at `/home#environment-day-1`.
Preview completion uses `chapter:environment:1` through `chapter:environment:9`,
separately from the course's `lesson:environment:*` progress.

Rebuild with Python and PyMuPDF installed (the builder also checks the local
`tmp/governance-pdf-tools` installation):

    python scripts/build-environment-reading.py
    node scripts/test-environment-source.mjs

Assets live in `public/environment-source`; generated reader content lives in
`public/data/environment-reading.json`. The parser uses source block order for
the two-column text, baseline coordinates for the PDF's unusually tall font
boxes, and ruled table cells for state/species/disease/movement pairings.
