import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

// Isolate database and email boundaries: never mutate real accounts or send email.
const tokens = new Map();
const limits = new Map();
let storedPassword;
let sessions = 1;
let delivered;
const sql = async (parts, ...values) => {
  const query = parts.join('?').replace(/\s+/g, ' ').trim();
  if (query.startsWith('INSERT INTO password_reset_limits')) {
    const count = (limits.get(values[0]) || 0) + 1;
    limits.set(values[0], count);
    return [{ attempts: count }];
  }
  if (query.startsWith('DELETE FROM password_reset_limits')) return [];
  if (query.startsWith('SELECT id FROM accounts WHERE email')) return values[0] === 'student@example.com' ? [{ id: 1 }] : [];
  if (query.startsWith('INSERT INTO password_reset_tokens')) { tokens.set(values[0], { expires: Date.now() + 1800000 }); return []; }
  if (query.startsWith('SELECT id FROM accounts WHERE id')) return tokens.has(values[0]) ? [{ id: 1 }] : [];
  if (query.startsWith('DELETE FROM password_reset_tokens WHERE token_hash')) {
    const entry = tokens.get(values[0]);
    if (query.includes('RETURNING') && (!entry || entry.expires <= Date.now())) return [];
    tokens.delete(values[0]);
    return entry ? [{ account_id: 1 }] : [];
  }
  if (query.startsWith('DELETE FROM password_reset_tokens WHERE account_id')) { tokens.clear(); return []; }
  if (query.startsWith('DELETE FROM password_reset_tokens WHERE expires_at')) return [];
  if (query.startsWith('UPDATE accounts')) { storedPassword = values[0]; return []; }
  if (query.startsWith('DELETE FROM sessions')) { sessions = 0; return []; }
  throw new Error(`Unexpected query: ${query}`);
};
sql.begin = async callback => callback(sql);
mock.module(new URL('../db.ts', import.meta.url).href, { namedExports: { sql } });
const { requestPasswordReset, resetPassword, resetConfig } = await import('../password-reset.ts');
const { verifyPassword } = await import('../auth.ts');
process.env.APP_BASE_URL = 'https://example.com';
process.env.RESEND_API_KEY = 'test-key';
process.env.PASSWORD_RESET_FROM = 'support@example.com';
mock.method(globalThis, 'fetch', async (url, options) => {
  assert.equal(url, 'https://api.resend.com/emails');
  delivered = JSON.parse(options.body);
  return { ok: true };
});

test('reset lifecycle: hashed token, email link, password hash, revoked sessions, no reuse', async () => {
  await requestPasswordReset(' STUDENT@example.com ');
  const token = delivered.text.match(/#token=([a-f0-9]{64})/)[1];
  assert.deepEqual(delivered.to, ['student@example.com']);
  assert.ok(tokens.has(createHash('sha256').update(token).digest('hex')));
  assert.ok(!tokens.has(token));
  await resetPassword(token, 'new-password-123');
  assert.ok(await verifyPassword('new-password-123', storedPassword));
  assert.equal(sessions, 0);
  assert.equal(tokens.size, 0);
  await assert.rejects(resetPassword(token, 'another-password'), /invalid or expired/);
});
test('expired links, malformed tokens and invalid passwords fail', async () => {
  await requestPasswordReset('student@example.com');
  const token = delivered.text.match(/#token=([a-f0-9]{64})/)[1];
  for (const entry of tokens.values()) entry.expires = 0;
  await assert.rejects(resetPassword(token, 'another-password'), /invalid or expired/);
  await assert.rejects(resetPassword('bad', 'another-password'), /invalid or expired/);
  await assert.rejects(resetPassword(token, 'short'), /between 8 and 128/);
  await assert.rejects(resetPassword(token, 'x'.repeat(129)), /between 8 and 128/);
});
test('unknown accounts do not send mail; email limits apply; missing configuration fails', async () => {
  delivered = null;
  await requestPasswordReset('unknown@example.com');
  assert.equal(delivered, null);
  await requestPasswordReset('student@example.com');
  delivered = null;
  await requestPasswordReset('student@example.com');
  assert.equal(delivered, null);
  await assert.rejects(requestPasswordReset('invalid'), /valid email/);
  delete process.env.RESEND_API_KEY;
  assert.throws(resetConfig, /temporarily unavailable/);
});
