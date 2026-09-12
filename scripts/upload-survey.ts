import { join } from "node:path";
import { SURVEY_KEYS, ensureBucket, putPublicFile } from "../storage.ts";

const root = join(import.meta.dirname, "..");
const dir = join(root, "public", "survey");

await ensureBucket();
const uploaded = [];
uploaded.push(await putPublicFile(SURVEY_KEYS.fullPdf, join(dir, "Economic-Survey-2025-26.pdf"), "application/pdf"));
uploaded.push(await putPublicFile(SURVEY_KEYS.highlightsPdf, join(dir, "Economic-Survey-2025-26-Highlights.pdf"), "application/pdf"));
uploaded.push(await putPublicFile(SURVEY_KEYS.banner, join(dir, "banner.jpg"), "image/jpeg"));
uploaded.push(await putPublicFile(SURVEY_KEYS.cover, join(dir, "cover.png"), "image/png"));
console.log("uploaded", uploaded.join(", "));
