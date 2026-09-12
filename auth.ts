import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { IncomingMessage } from "node:http";
import { sql } from "./db.ts";

const scrypt = promisify(scryptCb);
const SESSION_DAYS = 7;

export type Account = {
  id: number;
  name: string;
  email: string;
  mobile_no: string | null;
  role?: "student" | "faculty";
};

export function cookie(name: string, value: string, maxAgeSeconds: number) {
  return `${name}=${encodeURIComponent(value)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAgeSeconds}`;
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt:${salt.toString("hex")}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [algo, saltHex, hashHex] = stored.split(":");
  if (algo !== "scrypt" || !saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const derived = (await scrypt(password, salt, expected.length)) as Buffer;
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}

export function parseCookies(req: IncomingMessage) {
  const header = req.headers.cookie ?? "";
  const cookies: Record<string, string> = {};
  for (const part of header.split(";")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const i = trimmed.indexOf("=");
    if (i === -1) continue;
    cookies[trimmed.slice(0, i)] = decodeURIComponent(trimmed.slice(i + 1));
  }
  return cookies;
}

export function sessionCookie(token: string, maxAgeSeconds: number) {
  return cookie("session", token, maxAgeSeconds);
}

export async function createSession(accountId: number) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await sql`
    INSERT INTO sessions (token, account_id, expires_at)
    VALUES (${token}, ${accountId}, ${expiresAt})
  `;
  return token;
}

export async function getAccountFromRequest(req: IncomingMessage): Promise<Account | null> {
  const token = parseCookies(req).session;
  if (!token) return null;
  const [row] = await sql<Account[]>`
    SELECT a.id, a.name, a.email, a.mobile_no, COALESCE(a.role, 'student') AS role
    FROM sessions s
    JOIN accounts a ON a.id = s.account_id
    WHERE s.token = ${token} AND s.expires_at > NOW()
  `;
  return row ?? null;
}

export async function destroySession(req: IncomingMessage) {
  const token = parseCookies(req).session;
  if (token) {
    await sql`DELETE FROM sessions WHERE token = ${token}`;
  }
  return sessionCookie("", 0);
}

export function publicAccount(account: Account) {
  return {
    id: account.id,
    name: account.name,
    email: account.email,
    role: account.role === "faculty" ? "faculty" : "student",
  };
}
