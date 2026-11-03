/**
 * Compact base64url QR payload.
 * Keep payload short so modules stay large enough for phone cameras
 * even when the on-screen QR is very big (projection).
 */

// Must stay in sync with server/utils/generateQR.js
const MAX_AGE_MS = 25_000;
const FUTURE_SKEW_MS = 8_000;

const decodeBase64Url = (s) => {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  try {
    const json =
      typeof atob === "function"
        ? atob(b64 + pad)
        : Buffer.from(b64 + pad, "base64").toString("utf8");
    return JSON.parse(json);
  } catch {
    return null;
  }
};

export const buildQRString = (sessionToken, lectureSessionId, serverTimeOffset = 0) => {
  const payload = {
    token: sessionToken,
    lectureSessionId: String(lectureSessionId),
    ts: Date.now() - Number(serverTimeOffset || 0),
  };
  // Standard base64url (no padding) — same as server verify
  const json = JSON.stringify(payload);
  if (typeof btoa === "function") {
    return btoa(json).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  // Node / tests
  return Buffer.from(json, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
};

/**
 * Cheap local pre-check so the scanner can reject an obviously stale or
 * malformed code BEFORE spending a GPS fix and a network round-trip.
 * The server remains the source of truth for signature checks.
 */
export const verifyQRLocally = (qrString) => {
  if (!qrString || typeof qrString !== "string" || qrString.trim().length < 10) {
    return { valid: false, message: "This QR looks incomplete — hold steady and fill the frame." };
  }
  const payload = decodeBase64Url(qrString.trim());
  if (!payload || !payload.token || !payload.lectureSessionId || payload.ts == null) {
    return { valid: false, message: "Not an AttendX QR code. Scan the live code on the faculty screen." };
  }
  const ts = Number(payload.ts);
  if (!Number.isFinite(ts)) {
    return { valid: false, message: "QR timestamp is invalid — ask faculty to show a fresh code." };
  }
  const age = Date.now() - ts;
  if (age > MAX_AGE_MS) {
    return {
      valid: false,
      message: `QR expired (${Math.round(age / 1000)}s old). Scan the newest code — it refreshes every 5 seconds.`,
    };
  }
  if (age < -FUTURE_SKEW_MS) {
    return { valid: false, message: "Your phone clock appears ahead — enable automatic date & time." };
  }
  return { valid: true, data: payload };
};
