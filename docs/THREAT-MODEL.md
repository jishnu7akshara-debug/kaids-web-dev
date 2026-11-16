# KAIDS Security Threat Model (STRIDE)

This threat model analyzes the KAIDS website, serverless API, Neon database, and administrative portal using the STRIDE methodology.

---

## 1. Data Flows & Attack Surfaces

1. **Flow 1: Public Form ➔ API ➔ Database ➔ Email**
   - Untrusted public internet client submits JSON enquiry to `/api/enquiries`.
   - Vercel Serverless Function validates, rate limits, hashes IP, and stores to Neon Postgres.
   - Resend API dispatches plain-text notification email to office inboxes.

2. **Flow 2: Admin Login ➔ Session ➔ MFA Verification**
   - Administrative user submits credentials to `/api/auth`.
   - Argon2id password verification against Neon Postgres.
   - Enrolment and validation of RFC 6238 TOTP codes.
   - `__Host-kaids_session` cookie issued.

3. **Flow 3: Admin Data Reading & CSV Export**
   - Authenticated staff querying `/api/admin/enquiries` and downloading CSV.
   - Role-Based Access Control enforced on server.

4. **Flow 4: Automated Retention & Maintenance Cron**
   - Vercel Cron invoking `/api/cron/retention` with `CRON_SECRET` bearer token.

5. **Flow 5: Deployment & Infrastructure Pipeline**
   - Git repository, environment variables in Vercel project settings, database connection strings.

---

## 2. STRIDE Analysis & Controls Matrix

| Threat Category | Potential Attack Vector | Applied Countermeasure / Control | Verification Test |
|---|---|---|---|
| **Spoofing** | Forged enquiry submissions / Bot spam | Cloudflare Turnstile integration, Honeypot check, and 3-second timing threshold check. | `tests/integration/enquiries-api.test.ts` |
| **Spoofing** | Admin account impersonation / Brute-force | Argon2id hashing, 5-attempt progressive lockout, and mandatory RFC 6238 TOTP 2FA. | `tests/unit/auth.test.ts` |
| **Tampering** | Parameter pollution / Mass assignment | Strict Zod schema strips all non-whitelisted properties (`role`, `status`, `id`). | `tests/security/security-hardening.test.ts` |
| **Tampering** | SQL Injection | Drizzle ORM prepared queries with parameterized query execution (`$1`, `$2`). | `tests/security/security-hardening.test.ts` |
| **Tampering** | Formula Injection (CSV DDE attack) | Formula sanitizer prepends single quote (`'`) to any cell starting with `=`, `+`, `-`, `@`, `\t`, `\r`. | `tests/integration/admin-auth.test.ts` |
| **Repudiation** | Unauthorized status change / Data deletion | Append-only `audit_log` with system timestamps and hashed actor IDs. UPDATE/DELETE revoked. | `tests/unit/audit-permissions.test.ts` |
| **Information Disclosure** | User enumeration via login response latency | Equalized response time via constant-time dummy Argon2 verify on non-existent users. | `tests/security/security-hardening.test.ts` |
| **Information Disclosure** | Network surveillance / IP tracking | Salted HMAC-SHA256 IP hashing (`IP_HASH_SALT`). Raw IP never stored. | `tests/unit/auth.test.ts` |
| **Information Disclosure** | Stack trace or DB error leakage | Serverless handlers catch internal exceptions and return generic JSON errors with request IDs. | `api/enquiries.ts` |
| **Denial of Service** | Flooding enquiry endpoint | Strict IP-based sliding window rate limit: max 5 requests per 10m, 20 per day. Payload capped at 8 KB. | `tests/integration/enquiries-api.test.ts` |
| **Elevation of Privilege** | Viewer role accessing Owner deletion or export | Central server-side role check (`requireRole`) on every `/api/admin/*` handler. | `api/admin.ts` |
| **Elevation of Privilege** | Cross-Site Request Forgery (CSRF) | `SameSite=Strict`, `Origin` header validation, and `X-CSRF-Token` synchronizer token verification. | `tests/integration/admin-auth.test.ts` |
