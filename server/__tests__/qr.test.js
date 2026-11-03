import { describe, it, expect, beforeAll } from 'vitest';

// Set JWT_SECRET before importing the module
process.env.JWT_SECRET = 'test_secret_key_for_qr_verification_min_32_chars!!';

// Dynamic import to ensure env is set before module loads
const { generateSessionToken, verifyQRData } = await import('../utils/generateQR.js');
const { buildQRString, verifyQRLocally } = await import('../../frontend/src/utils/qrUtils.js');

describe('QR Generation & Verification', () => {
  const lectureSessionId = '507f1f77bcf86cd799439011'; // valid ObjectId format
  let sessionToken;

  beforeAll(() => {
    sessionToken = generateSessionToken(lectureSessionId);
  });

  describe('generateSessionToken', () => {
    it('produces a 64-char hex HMAC', () => {
      expect(sessionToken).toHaveLength(64);
      expect(sessionToken).toMatch(/^[a-f0-9]{64}$/);
    });

    it('is deterministic for the same lectureSessionId', () => {
      const token2 = generateSessionToken(lectureSessionId);
      expect(token2).toBe(sessionToken);
    });

    it('produces different tokens for different IDs', () => {
      const token2 = generateSessionToken('507f1f77bcf86cd799439012');
      expect(token2).not.toBe(sessionToken);
    });

    it('throws if lectureSessionId is missing', () => {
      expect(() => generateSessionToken(null)).toThrow('lectureSessionId required');
      expect(() => generateSessionToken(undefined)).toThrow('lectureSessionId required');
    });
  });

  describe('verifyQRData (Server-side)', () => {
    it('accepts a valid QR string with current timestamp', () => {
      const qr = buildQRString(sessionToken, lectureSessionId, 0);
      const result = verifyQRData(qr);
      expect(result.valid).toBe(true);
      expect(result.data.lectureSessionId).toBe(lectureSessionId);
    });

    it('accepts a QR up to 25s old (cold-GPS grace window)', () => {
      const nearBoundary = Date.now() - 24_000;
      const payload = JSON.stringify({ token: sessionToken, lectureSessionId, ts: nearBoundary });
      const qr = btoa(payload).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      expect(verifyQRData(qr).valid).toBe(true);
    });

    it('rejects tampered QR (wrong token)', () => {
      // Build QR with valid token, then tamper with it
      const badToken = 'a'.repeat(64);
      const payload = JSON.stringify({ token: badToken, lectureSessionId, ts: Date.now() });
      const qr = btoa(payload).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      const result = verifyQRData(qr);
      expect(result.valid).toBe(false);
      expect(result.message.toLowerCase()).toContain('not valid');
    });

    it('rejects QR with old timestamp (> 25s)', () => {
      const oldTs = Date.now() - 26_000; // 26 seconds ago
      const payload = JSON.stringify({ token: sessionToken, lectureSessionId, ts: oldTs });
      const qr = btoa(payload).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      const result = verifyQRData(qr);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('expired');
    });

    it('rejects QR with future timestamp (> 8s)', () => {
      const futureTs = Date.now() + 11_000; // 11 seconds in future
      const payload = JSON.stringify({ token: sessionToken, lectureSessionId, ts: futureTs });
      const qr = btoa(payload).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      const result = verifyQRData(qr);
      expect(result.valid).toBe(false);
      expect(result.message.toLowerCase()).toContain('ahead');
    });

    it('accepts QR within valid window (near boundary)', () => {
      // 24 seconds old — should still be valid (within 25s window)
      const nearBoundary = Date.now() - 24_000;
      const payload = JSON.stringify({ token: sessionToken, lectureSessionId, ts: nearBoundary });
      const qr = btoa(payload).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      const result = verifyQRData(qr);
      expect(result.valid).toBe(true);
    });

    it('rejects malformed QR strings', () => {
      expect(verifyQRData('not-valid-base64!!!').valid).toBe(false);
      expect(verifyQRData('').valid).toBe(false);
      expect(verifyQRData(null).valid).toBe(false);
      expect(verifyQRData(undefined).valid).toBe(false);
    });

    it('rejects QR with missing fields', () => {
      const qr = btoa(JSON.stringify({ token: sessionToken }))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      expect(verifyQRData(qr).valid).toBe(false);
    });
  });

  describe('buildQRString (Frontend)', () => {
    it('generates a valid base64url string', () => {
      const qr = buildQRString(sessionToken, lectureSessionId, 0);
      expect(qr).toBeTruthy();
      expect(typeof qr).toBe('string');
      // Should be URL-safe base64 (no +, /, or =)
      expect(qr).not.toContain('+');
      expect(qr).not.toContain('/');
      expect(qr).not.toContain('=');
    });

    it('applies serverTimeOffset to timestamp', () => {
      const now = Date.now();
      const offset = 5000;
      const qr1 = buildQRString(sessionToken, lectureSessionId, 0);
      const qr2 = buildQRString(sessionToken, lectureSessionId, offset);

      const decode = (s) => {
        const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
        const pad = '='.repeat((4 - (b64.length % 4)) % 4);
        return JSON.parse(atob(b64 + pad));
      };

      const ts1 = decode(qr1).ts;
      const ts2 = decode(qr2).ts;
      // ts2 should be ~offset ms less than ts1
      expect(Math.abs((ts1 - ts2) - offset)).toBeLessThan(50); // 50ms tolerance
    });
  });

  describe('verifyQRLocally (Frontend)', () => {
    it('accepts a valid QR string', () => {
      const qr = buildQRString(sessionToken, lectureSessionId, 0);
      const result = verifyQRLocally(qr);
      expect(result.valid).toBe(true);
    });

    it('rejects QR older than 25 seconds', () => {
      // Simulate old QR by building with old timestamp
      const oldTs = Date.now() - 26_000;
      const payload = JSON.stringify({ token: sessionToken, lectureSessionId, ts: oldTs });
      const qr = btoa(payload).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      const result = verifyQRLocally(qr);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('expired');
    });

    it('rejects malformed strings', () => {
      expect(verifyQRLocally('garbage').valid).toBe(false);
      expect(verifyQRLocally('').valid).toBe(false);
    });
  });
});
