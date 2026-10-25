# Readable history chapters

The frontend uses public/data/history-reading.json through public/history-source.js. It renders selectable website text, headings, lists and native HTML tables. Complete chapters flow continuously rather than displaying PDF page images. Actual source maps, timelines and diagrams appear inline with captions and enlargement links. Ancient History, Medieval History and Art and Culture filters are retained.

Content: 29 chapters covering 133 body pages, 265 reconstructed tables and 17 genuine visual illustrations. The PDF cover and contents are represented by website chapter navigation. The builder audits every included source text line for representation. Decorative backgrounds behind exam questions are excluded as images; the questions remain normal website text.

Build with Python and PyMuPDF installed:

    python scripts/build-readable-history.py
    node scripts/test-history-source.mjs

The builder reads public/history-source/book.pdf and the existing source extraction manifest in public/data/history-source.json. It uses optional workspace dependencies in tmp/pdf-tools or an ordinary PyMuPDF installation.

The former image-based page and panel reader is no longer used by the frontend. Those source assets remain available to the extraction tools. Regenerating page crops is optional and is not required to build readable chapters.

Validation covers 29 chapters, all 133 content pages, line coverage, native tables and merged cells, real inline maps, absence of page screenshots and panel images in the reader, search, Art and Culture filtering and integration with the daily history course.
