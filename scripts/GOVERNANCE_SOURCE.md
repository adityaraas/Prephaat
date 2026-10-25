# Governance reader

`/home#governance` uses the same responsive reader and styles as IR. The source is
`study material/dec31-governance.pdf`, Vision IAS Governance VAM for Mains 2025.
Its five chapters contain 91 navigation topics (including chapter PYQ analysis),
51 Mains PYQs and 103 original diagrams. Questions retain source years and marks;
the source has no model answers. The practice tab shows the chapter's questions
from every topic. Completion records five chapters in My Profile.

The 78 body pages are audited by source line ID, each with exactly one owner.
The cover and navigation pages are excluded from notes. The publisher's preface,
macro PYQ analysis and overall contents remain available in the linked
`preparation-guide.pdf`. All topic footers link to original PDF pages, with the
printed numbering offset of nine. Source dates and numbering are preserved.
Embedded infographics retain their original text as images and can be enlarged.

Rebuild with Python and PyMuPDF installed:

    python scripts/build-governance-reading.py
    node scripts/test-governance-source.mjs
    node scripts/test-ir-source.mjs
    node scripts/test-economy-source.mjs

The builder also checks `tmp/governance-pdf-tools` for a local PyMuPDF install.
Generated data lives in `public/data/governance-reading.json`; source PDFs and
figure images live in `public/governance-source`.
