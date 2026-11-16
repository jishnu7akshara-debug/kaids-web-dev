# KAIDS Data Breach Incident Response Plan

Standard Operating Procedure for handling personal data breaches under the Digital Personal Data Protection Act, 2023 (DPDP Act) and CERT-In directions.

---

## 1. Breach Detection & Early Warning Triggers

A data breach event may be detected through:
1. **Unusual Export Activity:** Anomalous `enquiry.exported` actions in the audit log during off-hours or exceeding typical query volume.
2. **Authentication Spikes:** High frequency of failed login attempts or rapid account lockout triggers on admin accounts.
3. **Leaked Credentials / Secrets Alert:** Automated notification of exposed API keys or tokens in code repositories.
4. **Third-Party Intimation:** Notification from infrastructure processors (Vercel, Neon, Resend).

---

## 2. Emergency Call Tree & Incident Team

Upon detection, notify the following parties immediately in order:
1. **Primary Incident Lead / Owner:** Gurunath Vernekar / Tejas Vernekar (+91 99163 10226)
2. **Designated Legal Counsel / DPDP Advisor:** Legal Representative on file
3. **Lead Security Engineer:** Antigravity / Backend Team Lead

---

## 3. Immediate Containment Actions

Execute within 1 hour of breach confirmation:

### Step 1: Revoke All Active Sessions
Terminate every active staff session immediately by running the following SQL statement against Neon Postgres:
```sql
UPDATE sessions SET revoked_at = NOW() WHERE revoked_at IS NULL;
```
*(Can also be triggered via Admin Panel Settings > Revoke All Sessions)*.

### Step 2: Rotate Secrets
Immediately generate and rotate:
- `SESSION_SECRET`
- `TOTP_ENCRYPTION_KEY`
- `DATABASE_URL` (rotate application user password in Neon)
- `MAIL_PROVIDER_API_KEY` (revoke old key in Resend dashboard)
- `CRON_SECRET`

### Step 3: Disable Compromised User Accounts
```sql
UPDATE admin_users SET disabled_at = NOW() WHERE email = 'compromised.user@kaids.in';
```

---

## 4. Evidence Preservation

- Do not reboot or destroy serverless function instances prematurely.
- Export and securely preserve all Neon Postgres audit log rows from the incident window:
  ```sql
  COPY (SELECT * FROM audit_log WHERE at >= NOW() - INTERVAL '7 days') TO STDOUT WITH CSV HEADER;
  ```
- Retain edge request logs from the Vercel logging console.

---

## 5. Statutory DPDP Breach Notification Templates

### A. Initial Intimation to the Data Protection Board of India
*To be submitted without delay upon confirmation of breach:*
> **To:** Data Protection Board of India (DPBI) / CERT-In  
> **From:** Karnataka Industrial Documentation Services (KAIDS)  
> **Subject:** Intimation of Personal Data Breach under Section 8(6) of DPDP Act, 2023  
> 
> We hereby report a personal data security incident affecting Karnataka Industrial Documentation Services (KAIDS):  
> - **Date and Time of Discovery:** [Insert Timestamp]  
> - **Nature of Incident:** [e.g., Unauthorized access to enquiry record database]  
> - **Categories of Data Affected:** [Client contact details: Name, Phone, Email, Company, Service requested]  
> - **Approximate Number of Affected Data Principals:** [Insert Count]  
> - **Immediate Containment Measures Undertaken:** Sessions revoked, credentials rotated, database connection secured.  
> - **Designated Contact Person:** Gurunath Vernekar (grievance@kaids.in / +91 99163 10226).  
> A detailed 72-hour comprehensive report will follow.

### B. Intimation to Affected Data Principals
*To be sent directly to affected enquiry contacts:*
> **Subject:** Important Notice Regarding Your Information — KAIDS Data Protection Update  
> 
> Dear [Name],  
> 
> We are writing to notify you that on [Date], Karnataka Industrial Documentation Services identified an unauthorized security incident that may have involved contact details submitted via our website enquiry form (including your name, phone number, and enquiry description).  
> 
> **Actions We Have Taken:**  
> Our technical team contained the incident within [X] minutes by revoking all system credentials and fortifying database access controls. No financial details or payment records were stored or affected.  
> 
> **Recommendations for You:**  
> Please remain vigilant against potential phishing calls or unsolicited messages claiming to represent government industrial bodies. KAIDS will never call to ask for OTPs or banking passwords.  
> 
> If you have questions, please reach our Grievance Officer directly at grievance@kaids.in or +91 99163 10226.
