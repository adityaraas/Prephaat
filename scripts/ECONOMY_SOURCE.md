# Economics: Rau's IAS Mains Compass

The existing Economics subject (`/home#economy`) opens the same topic-reader component as IR. It contains 12 chapters, all 155 numbered topics, two chapter overviews and the publisher's preface from the supplied 216-page book. The 208 printed content pages are PDF pages 8–215 (printed page = PDF page minus 7). Covers, repeated outlines, promotional material and watermark text are not repeated as study notes. Chapter outlines are accounted for as navigation.

Native source text and ten image-only pages are combined into a single semantic dataset. OCR pages 31–40 have committed extraction caches and reviewed corrections under `scripts/economy-ocr/` and `scripts/economy-ocr-corrections.json`. Text recovered from scanned pages is labelled discreetly in the reader, with original-page links. OCR is not represented as equivalent to source-native text; corrections can be checked against the supplied PDF.

Ruled tables are reconstructed from their actual horizontal and vertical boundaries, including filled rectangle rules that ordinary line detection misses. Wrapped topic headings are joined completely, paragraph continuations stay together, and bullets and bold lead-ins become readable study points. The 63 inline diagrams retain source graphics rather than recreating charts from uncertain data.

The Recall & writing tab contains clearly labelled original study exercises. These are not extracted UPSC questions or publisher model answers. The existing 60-day foundation course remains accessible through `/home#economy-day-1`. Book chapter completion is recorded separately as `chapter:economy:1` through `chapter:economy:12`; existing course progress remains under its original lesson IDs.

Rebuild (Python, PyMuPDF, OpenCV and NumPy):

    python scripts/build-economy-reading.py
    node scripts/test-economy-source.mjs

The builder reads the `Raus*Economy*.pdf` file in `study material` and committed OCR caches. To regenerate OCR with RapidOCR installed in `tmp/economy-ocr`:

    python scripts/ocr-economy.py

The OCR tool caches each page and does not replace already reviewed outputs. If OCR is regenerated, its index-based correction map must be reviewed again. The semantic builder audits every included native or OCR text region and requires exactly one final owner. It also verifies all expected topic numbers in every chapter. Source-era claims, figures and recommendations reproduce the book; they are not independently updated.
