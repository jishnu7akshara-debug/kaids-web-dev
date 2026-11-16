# KAIDS Operations Guide

## 1. Environment Variables & Generation

Every variable is validated at cold start with Zod. Missing or malformed variables return a generic 500 error and log only the variable name (never its value).

| Variable | Purpose | How to Generate / Obtain |
|---|---|---|
| `DATABASE_URL` | Neon pooled connection string for runtime app role | Neon Console > Connection Details > Pooled connection string |
| `DATABASE_URL_MIGRATE` | Direct connection string for migration role | Neon Console > Direct connection string (CI & local only) |
| `SESSION_SECRET` | 32+ random bytes for signing CSRF tokens | `openssl rand -base64 32` |
| `IP_HASH_SALT` | 32+ random bytes to hash IP addresses before storage | `openssl rand -base64 32` |
| `TOTP_ENCRYPTION_KEY` | 32 random bytes AES-256-GCM key for TOTP secrets | `openssl rand -base64 32` |
| `MAIL_PROVIDER_API_KEY` | Email sending provider API key (Resend) | Resend Dashboard > API Keys |
| `MAIL_FROM` | Verified sender address | e.g. `KAIDS <enquiries@notify.kaids.in>` |
| `NOTIFY_TO` | Inboxes receiving enquiry notifications | Comma-separated emails (e.g. `admin@kaids.in`) |
| `CRON_SECRET` | Bearer token for Vercel Cron jobs | `openssl rand -base64 24` |
| `TURNSTILE_ENABLED` | Toggle Cloudflare Turnstile anti-bot | `false` (default) or `true` |
| `TURNSTILE_SECRET_KEY` | Turnstile secret key | Cloudflare Dashboard > Turnstile |
| `APP_ORIGIN` | Allowed origin for CSRF & form submissions | `https://www.kaids.in` (prod) or preview URL |
| `PRIVACY_NOTICE_VERSION` | Version of DPDP privacy notice consented to | e.g. `2026-11-v1` |

---

## 2. Neon Database Branches & Point-in-Time Restore

### Three Branch Topology
1. **`main`**: Production database.
2. **`preview`**: Vercel preview deployments.
3. **`dev`**: Local development and testing.

### Point-in-Time Restore (PITR)
- **Retention Window**: 7 days continuous point-in-time recovery on `main`.
- **Restoration**: Neon Console > Branch > Select Timestamp > Create New Branch from State.

---

## 3. Database Roles & Privilege Separation

- **Runtime Role (`app_user`)**: Granted `SELECT`, `INSERT`, `UPDATE`, `DELETE` on application tables. Explicitly `REVOKE UPDATE, DELETE ON audit_log`.
- **Migration Role (`migration_user`)**: Used solely during CI and local schema migration steps (`npm run db:migrate`). Never exposed in Vercel serverless functions.

---

## 4. Seeding & User Administration

To seed or reset the primary Owner account:
```bash
npm run db:seed-owner -- --email owner@kaids.in --name "Gurunath Vernekar"
```
The script outputs a one-time temporary password. The Owner is required to change it and enrol 2FA upon first login.
