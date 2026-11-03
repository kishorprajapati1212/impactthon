import { describe, it, expect } from 'vitest';
import { buildQRString, verifyQRLocally } from '../utils/qrUtils.js';

// Correct base64url decoder (padding computed, not hardcoded)
function decodeQR(s) {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  return JSON.parse(atob(b64 + pad));
}

describe('buildQRString', () => {
  const token = 'a'.repeat(64); // 64-char hex token
  const lectureId = '507f1f77bcf86cd799439011';

  it('returns a non-empty URL-safe base64 string', () => {
    const result = buildQRString(token, lectureId);
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(20);
    // Must not contain URL-unsafe chars
    expect(result).not.toContain('+');
    expect(result).not.toContain('/');
    expect(result).not.toContain('=');
  });

  it('embeds correct token, lectureSessionId, and ts', () => {
    const result = buildQRString(token, lectureId, 0);
    const decoded = decodeQR(result);
    expect(decoded.token).toBe(token);
    expect(decoded.lectureSessionId).toBe(lectureId);
    expect(typeof decoded.ts).toBe('number');
    expect(decoded.ts).toBeLessThanOrEqual(Date.now());
    expect(decoded.ts).toBeGreaterThan(Date.now() - 1000);
  });

  it('subtracts serverTimeOffset from timestamp', () => {
    const offset = 5000;
    const before = Date.now();
    const r1 = buildQRString(token, lectureId, 0);
    const r2 = buildQRString(token, lectureId, offset);

    const ts1 = decodeQR(r1).ts;
    const ts2 = decodeQR(r2).ts;

    // ts2 should be approximately offset ms less than ts1
    const diff = ts1 - ts2;
    expect(Math.abs(diff - offset)).toBeLessThan(100); // 100ms tolerance
  });

  it('produces different QRs when the timestamp differs', () => {
    const r1 = buildQRString(token, lectureId, 0);
    const r2 = buildQRString(token, lectureId, 1234);
    expect(r1).not.toBe(r2);
  });
});

describe('verifyQRLocally', () => {
  const token = 'b'.repeat(64);
  const lectureId = '507f1f77bcf86cd799439011';

  it('accepts a valid fresh QR', () => {
    const qr = buildQRString(token, lectureId, 0);
    expect(verifyQRLocally(qr).valid).toBe(true);
  });

  it('rejects empty/null input', () => {
    expect(verifyQRLocally('').valid).toBe(false);
    expect(verifyQRLocally(null).valid).toBe(false);
    expect(verifyQRLocally(undefined).valid).toBe(false);
  });

  it('rejects obviously expired QR (> 25s old)', () => {
    const oldTs = Date.now() - 26_000;
    const payload = btoa(JSON.stringify({ token, lectureSessionId: lectureId, ts: oldTs }));
    const qr = payload.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const result = verifyQRLocally(qr);
    expect(result.valid).toBe(false);
    expect(result.message).toContain('expired');
  });

  it('rejects QR with ts too far in future (> 8s)', () => {
    const futureTs = Date.now() + 15_000;
    const payload = btoa(JSON.stringify({ token, lectureSessionId: lectureId, ts: futureTs }));
    const qr = payload.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const result = verifyQRLocally(qr);
    expect(result.valid).toBe(false);
  });

  it('accepts QR at boundary (24s old — cold-GPS grace)', () => {
    const ts = Date.now() - 24_000;
    const payload = btoa(JSON.stringify({ token, lectureSessionId: lectureId, ts }));
    const qr = payload.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    expect(verifyQRLocally(qr).valid).toBe(true);
  });

  it('rejects garbled input', () => {
    expect(verifyQRLocally('!!!not-valid-base64!!!').valid).toBe(false);
    expect(verifyQRLocally('YWJj').valid).toBe(false); // "abc" — decodes but missing fields
  });
});
