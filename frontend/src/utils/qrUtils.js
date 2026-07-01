/**
 * QR Utilities  (Frontend)
 * ========================
 *
 * FACULTY side  →  buildQRString()
 *   Called every 5 seconds (interval in QRGenerator).
 *   Encodes:  { token: sessionToken, lectureSessionId, ts: Date.now() }
 *   as base64url so the QR value changes with every new timestamp.
 *   The sessionToken (HMAC) never changes — only ts changes.
 *
 * STUDENT side  →  verifyQRLocally()
 *   Called immediately after scanning, BEFORE the network request.
 *   Only checks:
 *     • Can we decode the base64url JSON?
 *     • Is ts within the last 10 seconds?
 *       (Server uses the same ±10 s window, so this is a fast-fail UX guard.)
 *   The HMAC signature is NOT verified here (we don't have the secret).
 *   The server is the authoritative verifier.
 */

/** Faculty: build a new QR string embedding the current timestamp */
export const buildQRString = (sessionToken, lectureSessionId) => {
  const payload = {
    token: sessionToken,
    lectureSessionId: String(lectureSessionId),
    ts: Date.now(),
  };
  const json = JSON.stringify(payload);
  // base64url (no padding, URL-safe)
  return btoa(json)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

/**
 * Student: lightweight local check before hitting the server.
 * Returns { valid: true, qrString } or { valid: false, message }
 *
 * Window: ts must be within the last 10 s  AND  at most 5 s in the future
 * (allows for a small clock skew between devices).
 */
export const verifyQRLocally = (qrString) => {
  if (!qrString || typeof qrString !== 'string') {
    return { valid: false, message: 'Invalid QR code' };
  }
  try {
    const b64 = qrString.replace(/-/g, '+').replace(/_/g, '/');
    const pad  = '='.repeat((4 - (b64.length % 4)) % 4);
    const { token, lectureSessionId, ts } = JSON.parse(atob(b64 + pad));

    if (!token || !lectureSessionId || !ts) {
      return { valid: false, message: 'QR code is incomplete' };
    }

    const age = Date.now() - Number(ts);   // ms since the QR was generated
    // Reject if older than 10 s (server will also reject)
    if (age > 10_000) {
      return { valid: false, message: 'QR has expired — ask faculty to show the current QR' };
    }
    // Reject if ts is more than 5 s in the future (clock skew / tampered)
    if (age < -5_000) {
      return { valid: false, message: 'QR timestamp is invalid' };
    }

    return { valid: true, qrString };
  } catch {
    return { valid: false, message: 'Could not read QR code' };
  }
};
