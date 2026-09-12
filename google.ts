import { randomBytes, timingSafeEqual } from "node:crypto";
import type { IncomingMessage } from "node:http";
import { sql } from "./db.ts";
import { cookie } from "./auth.ts";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

export type GoogleProfile = {
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
};

export function googleConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim());
}

export function googleRedirectUri() {
  const base = (process.env.APP_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
  return `${base}/api/auth/google/callback`;
}

export function createGoogleState() {
  const state = randomBytes(24).toString("hex");
  const header = cookie("oauth_state", state, 600);
  return { state, header };
}

export function googleAuthUrl(state: string) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri: googleRedirectUri(),
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  return `${AUTH_URL}?${params}`;
}

export function validGoogleState(req: IncomingMessage, state: string) {
  const cookieHeader = req.headers.cookie ?? "";
  const match = cookieHeader.split(";").map((part) => part.trim()).find((part) => part.startsWith("oauth_state="));
  const expected = match ? decodeURIComponent(match.slice("oauth_state=".length)) : "";
  if (!expected || !state || expected.length !== state.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(state));
}

export function clearGoogleStateCookie() {
  return cookie("oauth_state", "", 0);
}

export async function exchangeGoogleCode(code: string): Promise<GoogleProfile> {
  const body = new URLSearchParams({
    code,
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    redirect_uri: googleRedirectUri(),
    grant_type: "authorization_code",
  });

  const tokenRes = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const tokenData = (await tokenRes.json()) as { access_token?: string; error?: string };
  if (!tokenRes.ok || !tokenData.access_token) {
    throw new Error(tokenData.error || "Google token exchange failed");
  }

  const userRes = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  const profile = (await userRes.json()) as GoogleProfile & { error?: string };
  if (!userRes.ok || !profile.sub || !profile.email) {
    throw new Error(profile.error || "Could not read Google profile");
  }
  return profile;
}

export async function upsertGoogleAccount(profile: GoogleProfile) {
  const email = profile.email.trim().toLowerCase();
  const name = (profile.name || email.split("@")[0]).slice(0, 120);
  const googleId = profile.sub;

  const [byGoogle] = await sql<Array<{ id: number; name: string; email: string; mobile_no: string | null }>>`
    SELECT id, name, email, mobile_no FROM accounts WHERE google_id = ${googleId}
  `;
  if (byGoogle) return byGoogle;

  const [byEmail] = await sql<Array<{ id: number; name: string; email: string; mobile_no: string | null }>>`
    UPDATE accounts
    SET google_id = ${googleId}, name = COALESCE(NULLIF(name, ''), ${name})
    WHERE email = ${email}
    RETURNING id, name, email, mobile_no
  `;
  if (byEmail) return byEmail;

  const [created] = await sql<Array<{ id: number; name: string; email: string; mobile_no: string | null }>>`
    INSERT INTO accounts (name, email, google_id)
    VALUES (${name}, ${email}, ${googleId})
    RETURNING id, name, email, mobile_no
  `;
  return created;
}
