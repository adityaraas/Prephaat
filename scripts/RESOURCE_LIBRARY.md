# Study resource library

The library is available at `/library`, in each existing subject page, and in the site search. Its public JSON catalog is `public/data/resource-library.json`. It does not require database seeding or new dependencies.

## Included material

- 137 English/Hindi NCERT books selected from the live Classes 6–12 catalog, with 1,226 chapter PDF links, contents links and publisher ZIP downloads.
- 20 publicly linked Vajiram & Ravi Recitals issues from January 2025 through August 2026; the publisher directory provides older issues.
- Vajiram's study-material and prelims-revision directories. The latter uses the publisher's download flow, which can require registration.
- Government resources for economy, agriculture, environment, governance, ethics, security, international relations and Bihar.

Mappings and reading tasks are Crack IAS study guidance, not publisher endorsements. A book tagged for several subjects can contain only a portion relevant to each subject. Senior-secondary sciences should be read selectively for GS. The library does not claim to cover every optional, language paper or current-affairs issue.

## Editions and provenance

NCERT metadata was parsed from `https://ncert.nic.in/textbook.php?ln=en` on 2026-09-27. The script reads assignments as text; it does not execute publisher JavaScript. Chapter URL and ZIP patterns follow NCERT's own catalog implementation. Chapters are numbered because chapter titles were not extracted from the PDFs. Chapter destinations are catalog-derived, not all individually HTTP-checked.

The current catalog includes new integrated social-science and science books. Existing `ncert-*.json` revision notes reflect older editions and are preserved with a visible edition notice. Grade 8 Social Science Part II (`hees2`, `hhes2`) is deliberately excluded after NCERT's recall notice at `https://www.ncert.nic.in/`; review the publisher's replacement before enabling it.

Vajiram issue titles and PDF URLs were parsed from `https://vajiramandravi.com/upsc-study-materials/monthly-current-affairs-magazine/`. Free access does not establish redistribution permission. Publisher PDFs remain externally hosted; no paid course files, restricted portal content, PDF text, or third-party book copies are imported into the repository. Each card retains its publisher source link for fallback if the PDF moves.

## Refresh

Save the official NCERT catalog and Vajiram magazine page as HTML under `tmp/resources/`, then run:

```text
node scripts/build-resource-library.mjs tmp/resources/ncert.html tmp/resources/vajiram.html scripts/resource-supplements.json
node scripts/test-resource-library.mjs
```

Review curriculum changes, exclusions, issue-year selection and the checked date in the builder before publishing a refresh. Supplemental sources are maintained in `scripts/resource-supplements.json`. Regeneration is deterministic for the same input files.

`scripts/check-resource-links.ps1` checks representative PDFs across Classes 6–12, Vajiram and the Economic Survey. It requires internet access and writes a sample check report under `tmp/resources/`; it does not verify all 1,226 URLs. To preview without connecting to the application database, run `node scripts/preview-library.mjs` and visit `http://127.0.0.1:3100/library`.
