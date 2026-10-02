# Password reset setup

Set `APP_BASE_URL` to the public HTTPS origin of the application (localhost HTTP is allowed for development), `RESEND_API_KEY` to a Resend sending API key, and `PASSWORD_RESET_FROM` to a sender on your verified Resend domain, for example `Crack IAS <support@example.com>`. Restart the server. The database tables are created automatically at startup.

API reference: https://resend.com/docs/api-reference/emails/send-email

The login page links to `/forgot-password`. Email links open `/reset-password` with a secret fragment, which the page removes from the address bar. Tokens are stored only as SHA-256 hashes, expire after 30 minutes, and are consumed transactionally. Successful resets revoke all sessions and outstanding reset links for the account. Google accounts can also set a password by proving access to their email.

Requests return the same message for unknown accounts, email throttling, and delivery failures. Delivery failures are logged without email addresses or tokens. Missing mail configuration returns 503. Limits allow three requests per email and 30 requests per socket IP per 15 minutes; when behind a proxy, the IP limit is shared by that proxy. Forwarded headers are deliberately not trusted without a configured trusted proxy policy.

Manual verification with a test account:

Automated tests: `node --experimental-test-module-mocks --test scripts/test-password-reset.mjs` (Node 22.18+). These isolate database and email boundaries; live delivery and PostgreSQL transaction behavior require the manual checks below.

1. Request a link from the login page and check the inbox, including spam.
2. Follow the link; confirm mismatched and short passwords are rejected.
3. Set a new password; verify the old password fails, the new one succeeds, and a previous session no longer works.
4. Reuse the link and verify it is rejected. Also verify an expired link is rejected.
5. Request for an unknown email and confirm the same acknowledgement appears.

Do not enable click tracking on reset emails: it can rewrite or expose secret links.
