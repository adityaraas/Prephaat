Editorial details open with a short article summary and source-based takeaways, then an original concept diagram and explanations. Context, syllabus connections, broader perspectives, revision pointers and answer practice follow.

Prepared notes use their existing context and author argument as a summary, and their argument steps as takeaways. Older cached notes retain the same display and get a concept-map fallback. Newly generated notes include explicit summary, keyTakeaways and diagram fields. Combined source-based fields are capped at 200 words; diagrams and wider explanations are educational interpretation.

Run `node scripts/build-editorial-diagrams.mjs` to rebuild the 14 prepared diagrams and local SVG copies. Run `node --experimental-strip-types scripts/upload-editorial-diagrams.ts` to upload them to the existing configured bucket under `editorials/diagrams/v1/`. Uploads add a stored asset key to the prepared note. No expiring signed URLs or credentials are committed.

With AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY configured, newly generated notes also store their original SVG diagram in S3. AWS_REGION, AWS_ENDPOINT_URL_S3 (or AWS_ENDPOINT_URL) and S3_BUCKET use the existing storage configuration. Set EDITORIAL_DIAGRAM_STORAGE=off to disable automatic uploads. Storage failure leaves the inline diagram usable. The authenticated diagram endpoint signs only the expected recorded editorial key; it cannot sign arbitrary bucket objects.

Diagrams are original SVG images. No newspaper photographs or external illustrations are copied. Supporting web images can be added separately with source and licence information when they materially explain a specific article.

Checks: `node --experimental-strip-types scripts/test-editorials.mjs`, `node --experimental-strip-types scripts/test-editorial-visuals.mjs`, `node --experimental-strip-types scripts/test-editorial-generation.mjs`, and `npx.cmd tsc --noEmit`.
