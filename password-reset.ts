import { createHash, randomBytes } from "node:crypto";
import { sql } from "./db.ts";
import { hashPassword } from "./auth.ts";

export const resetMessage = "If an account exists for that email, a password reset link will be sent. Check your inbox and spam folder.";
export class ResetError extends Error {
  status: number;
  constructor(message: string, status = 400) { super(message); this.status = status; }
}
const digest = (value: string) => createHash("sha256").update(value).digest("hex");

export function resetConfig() {
  const { RESEND_API_KEY: key, PASSWORD_RESET_FROM: from, APP_BASE_URL: base } = process.env;
  if (!key || !from || !base) throw new ResetError("Password reset is temporarily unavailable. Please try again later.", 503);
  const url = new URL(base);
  if (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))) {
    throw new ResetError("Password reset is temporarily unavailable. Please try again later.", 503);
  }
  return { key, from, origin: url.origin };
}

// Database-backed limits apply across server instances. Keys contain no raw emails or IPs.
export async function limitReset(key: string, maximum: number) {
  const [row] = await sql`
    INSERT INTO password_reset_limits (key, attempts, expires_at)
    VALUES (${digest(key)}, 1, NOW() + INTERVAL '15 minutes')
    ON CONFLICT (key) DO UPDATE SET
      attempts = CASE WHEN password_reset_limits.expires_at <= NOW() THEN 1 ELSE password_reset_limits.attempts + 1 END,
      expires_at = CASE WHEN password_reset_limits.expires_at <= NOW() THEN NOW() + INTERVAL '15 minutes' ELSE password_reset_limits.expires_at END
    RETURNING attempts
  `;
  await sql`DELETE FROM password_reset_limits WHERE expires_at < NOW()`;
  return row.attempts <= maximum;
}

export async function requestPasswordReset(value: unknown) {
  const email = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (email.length > 160 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ResetError("Enter a valid email address.");
  const config = resetConfig();
  if (!(await limitReset(`email:${email}`, 3))) return;
  const [account] = await sql`SELECT id FROM accounts WHERE email = ${email}`;
  if (!account) return;
  const token = randomBytes(32).toString("hex");
  const tokenHash = digest(token);
  await sql`DELETE FROM password_reset_tokens WHERE expires_at <= NOW()`;
  await sql`INSERT INTO password_reset_tokens (token_hash, account_id, expires_at)
    VALUES (${tokenHash}, ${account.id}, NOW() + INTERVAL '30 minutes')`;
  // Fragment keeps the secret out of HTTP requests and referrer headers.
  const link = `${config.origin}/reset-password#token=${token}`;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${config.key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: config.from, to: [email], subject: "Reset your Crack IAS password",
        text: `Reset your password using this link:\n\n${link}\n\nThis link expires in 30 minutes and can only be used once. If you did not request this, you can ignore this email.` }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error("Email provider rejected delivery");
  } catch {
    await sql`DELETE FROM password_reset_tokens WHERE token_hash = ${tokenHash}`;
    // Preserve the same public response for registered and unknown addresses.
    console.error("Password reset email delivery failed. Check email provider configuration.");
  }
}

export async function resetPassword(token: unknown, password: unknown) {
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) throw new ResetError("This reset link is invalid or expired. Request a new link.");
  if (typeof password !== "string" || password.length < 8 || password.length > 128) throw new ResetError("Password must be between 8 and 128 characters.");
  const tokenHash = digest(token);
  const passwordHash = await hashPassword(password);
  await sql.begin(async tx => {
    // Lock the account first so concurrent redemptions of different links serialize.
    const [account] = await tx`SELECT id FROM accounts WHERE id = (
      SELECT account_id FROM password_reset_tokens WHERE token_hash = ${tokenHash}
    ) FOR UPDATE`;
    if (!account) throw new ResetError("This reset link is invalid or expired. Request a new link.");
    const [valid] = await tx`DELETE FROM password_reset_tokens
      WHERE token_hash = ${tokenHash} AND expires_at > NOW() RETURNING account_id`;
    if (!valid) throw new ResetError("This reset link is invalid or expired. Request a new link.");
    await tx`UPDATE accounts SET password_hash = ${passwordHash} WHERE id = ${account.id}`;
    await tx`DELETE FROM sessions WHERE account_id = ${account.id}`;
    await tx`DELETE FROM password_reset_tokens WHERE account_id = ${account.id}`;
  });
}
