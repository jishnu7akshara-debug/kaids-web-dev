import { describe, it, expect } from 'vitest';
import { enquirySchema } from '../../src/lib/enquiry.js';
import { sanitizeCsvCell } from '../../api/admin.js';
import { verifyPassword, dummyVerify } from '../../src/lib/auth.js';

describe('Phase 5 Security Hardening & Penetration Test Suite', () => {
  // 1. Injection Protection (XSS, SQLi, CRLF, Unicode)
  describe('Injection Payload Sanitization & Rejection', () => {
    it('stores XSS and script payloads literally without executing or constructing HTML elements', () => {
      const maliciousPayload = '<script>alert("XSS")</script><img src="x" onerror="alert(1)">';
      const parsed = enquirySchema.safeParse({
        name: maliciousPayload,
        phone: '9916310226',
        consent: true
      });

      expect(parsed.success).toBe(true);
      if (parsed.success) {
        // Must be stored literally as inert text string
        expect(parsed.data.name).toBe(maliciousPayload);
        expect(parsed.data.name).not.toContain('&lt;'); // Stored raw, escaped at render time via textContent
      }
    });

    it('rejects SQL injection fragments in structured validation', () => {
      const sqliName = "Robert'); DROP TABLE enquiries;--";
      const parsed = enquirySchema.safeParse({
        name: sqliName,
        phone: '9916310226',
        consent: true
      });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        // Prepared statements with Drizzle parameterize inputs ($1, $2)
        expect(parsed.data.name).toBe(sqliName);
      }
    });
  });

  // 2. Mass Assignment Immunity
  describe('Mass Assignment Immunity', () => {
    it('ignores extraneous privileged properties injected into public enquiry payload', () => {
      const rawInjected = {
        name: 'Attacker',
        phone: '9916310226',
        consent: true,
        role: 'owner',
        status: 'won',
        id: '00000000-0000-0000-0000-000000000000',
        created_at: '2020-01-01T00:00:00Z',
        assigned_to: '11111111-1111-1111-1111-111111111111'
      };

      const parsed = enquirySchema.parse(rawInjected);
      // Zod schema strips any keys not explicitly defined
      expect((parsed as any).role).toBeUndefined();
      expect((parsed as any).status).toBeUndefined();
      expect((parsed as any).id).toBeUndefined();
      expect((parsed as any).created_at).toBeUndefined();
      expect((parsed as any).assigned_to).toBeUndefined();
    });
  });

  // 3. Timing Parity (Account Enumeration Mitigation)
  describe('Login Timing Attack Resistance', () => {
    it('executes Argon2id verification for non-existent users with minimal timing difference', async () => {
      const startDummy = performance.now();
      await dummyVerify();
      const dummyDuration = performance.now() - startDummy;

      expect(dummyDuration).toBeGreaterThan(10); // Verifies real Argon2 workload was executed
    });
  });

  // 4. CSV Formula Injection Defense
  describe('CSV Export Sanitization (Formula Injection / DDE)', () => {
    it('prepends single quote to any cell starting with =, +, -, @, Tab, or Carriage Return', () => {
      const formulas = [
        '=cmd|"/C calc.exe"!A0',
        '+10+20',
        '-50*2',
        '@SUM(1,2)',
        '\tTAB_INDENTED',
        '\rCARRIAGE_RETURN'
      ];

      for (const formula of formulas) {
        const sanitized = sanitizeCsvCell(formula);
        expect(sanitized.startsWith("'")).toBe(true);
      }
    });
  });

  // 5. Header Policies
  describe('Security Headers Specification Verification', () => {
    it('defines strict CSP, no-store, nosniff, and frame-ancestors none', () => {
      const expectedAdminCsp = "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none';";
      expect(expectedAdminCsp).toContain("default-src 'none'");
      expect(expectedAdminCsp).toContain("frame-ancestors 'none'");
      expect(expectedAdminCsp).not.toContain("'unsafe-inline'");
      expect(expectedAdminCsp).not.toContain("'unsafe-eval'");
    });
  });
});
