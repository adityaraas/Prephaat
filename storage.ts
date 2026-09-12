import "dotenv/config";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  CreateBucketCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { readFile } from "node:fs/promises";

export const SURVEY_BUCKET = process.env.S3_BUCKET || "assets";

const endpoint = process.env.AWS_ENDPOINT_URL_S3 || process.env.AWS_ENDPOINT_URL;

export const s3 = new S3Client({
  region: process.env.AWS_REGION || "us-east-2",
  forcePathStyle: true,
  ...(endpoint ? { endpoint } : {}),
});

export const SURVEY_KEYS = {
  fullPdf: "survey/economic-survey-2025-26.pdf",
  highlightsPdf: "survey/economic-survey-2025-26-highlights.pdf",
  banner: "survey/banner.jpg",
  cover: "survey/cover.png",
} as const;

export async function ensureBucket(bucket = SURVEY_BUCKET) {
  try {
    await s3.send(new CreateBucketCommand({ Bucket: bucket }));
  } catch (err) {
    const name = err instanceof Error ? err.name : "";
    if (name !== "BucketAlreadyOwnedByYou" && name !== "BucketAlreadyExists") throw err;
  }
}

export async function putPublicFile(key: string, filePath: string, contentType: string) {
  const Body = await readFile(filePath);
  await s3.send(
    new PutObjectCommand({
      Bucket: SURVEY_BUCKET,
      Key: key,
      Body,
      ContentType: contentType,
    })
  );
  return key;
}

export async function objectExists(key: string) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: SURVEY_BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

export async function signedGetUrl(key: string, expiresIn = 3600) {
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: SURVEY_BUCKET, Key: key }), { expiresIn });
}
