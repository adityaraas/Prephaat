import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL is missing from .env");
}

export const sql = postgres(url, { ssl: "require", max: 4 });
