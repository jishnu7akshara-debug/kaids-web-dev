# Legal & DPDP Compliance Checklist

**Status as of:** 16 November 2026 (Checked against MeitY DPDP Act, 2023 and DPDP Rules, 2025).

> [!IMPORTANT]
> The following draft legal pages (`privacy.html`, `terms.html`, `cookies.html`) are marked with `<!-- Draft for review by KAIDS's legal adviser -->`. They require formal review and sign-off by KAIDS's designated legal counsel before live production deployment.

---

## 1. Counsel Confirmation Items

- [ ] **Legal Entity Identification:** Confirm official corporate registry name (`Karnataka Industrial Documentation Services`) and registered office address (`#84, Unit No 1102, 11th Floor, Barton Centre, M G Road, Bengaluru, Karnataka 560001`).
- [ ] **Grievance Officer Appointment:** Formally designate the Grievance Officer and confirm the email (`grievance@kaids.in`) and telephone contact (+91 99163 10226) displayed in Section 7 of the Privacy Notice.
- [ ] **Client Trademark & Logo Permissions:** Confirm written consent or customer agreement clauses permitting display of client logos in the public client index.
- [ ] **Data Retention Window:** Confirm that the 24-month retention period for closed enquiries complies with statutory limitation periods for potential contract claims.
- [ ] **Cross-Border Cloud Processing:** Validate the disclosure of overseas data processors (Vercel edge hosting, Neon database, Resend email dispatch) under DPDP transfer guidelines.
- [ ] **Limitation of Liability & Forum:** Confirm that exclusive jurisdiction at the competent courts in Bengaluru, Karnataka, is appropriate for website disputes.

---

## 2. DPDP Act, 2023 Regulatory Mapping

| DPDP Requirement | Technical Implementation | Status |
|---|---|---|
| **Notice & Itemized Consent (Sec 5 & 6)** | Consent checkbox on enquiry form; itemized plain-language notice in `privacy.html`. | Implemented |
| **Withdrawal of Consent (Sec 6(4))** | Mechanism provided via Grievance Officer and Admin Panel privacy queue. | Implemented |
| **Purpose Limitation (Sec 7)** | Enquiries used strictly to respond to liaison requests; no tracking cookies or ad profiling. | Implemented |
| **Data Security Safeguards (Sec 8(5))** | Salted HMAC-SHA256 IP hashing, Argon2id passwords, TOTP 2FA, HTTPS TLS 1.3, CSP nosniff. | Implemented |
| **Personal Data Breach Intimation (Sec 8(6))** | Incident Response SOP documented in `docs/INCIDENT-RESPONSE.md`. | Implemented |
| **Storage Limitation (Sec 8(7))** | Daily automated retention purge (`api/cron/retention.ts`). | Implemented |
| **Data Principal Rights (Sec 11-14)** | Admin Rights Queue (`/admin/privacy.html`) handling Access, Correction, Erasure, Nomination. | Implemented |
