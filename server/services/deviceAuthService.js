import crypto from "crypto";

/**
 * Device security for student logins.
 *
 * Every student login is bound to ONE physical device. The browser computes a
 * "digital fingerprint" (WebAuthn deviceId when available + tested hardware
 * signals), the server stores it in `studentsessions`, and only the paired
 * device may use the session. A phone the student lends to a friend will not
 * match the registered fingerprint, so the friend's request is rejected at
 * the API layer with AUTH_DEVICE_REQUIRED.
 */

const sh = (v) =>
  crypto.createHash("sha256").update(String(v ?? "")).digest("hex");

/**
 * Recompute a trusted web-authn deviceId from the raw (server-verifiable)
 * credential parts — mirrors the same derivation done on the client.
 * We never trust a client-provided *final* ID blindly; we recompute it.
 */
function deriveDeviceId(attestation) {
  if (!attestation || !attestation.credentialId || !attestation.rawId) {
    return null;
  }
  let aaguid = String(attestation.aaguid || "").replace(/-/g, "");
  if (!/^[0-9a-fA-F]+$/.test(aaguid) || aaguid.length < 12) aaguid = "";
  return sh(`${aaguid}:${attestation.credentialId}:${attestation.rawId}`);
}

function sanitizeMeta(meta) {
  if (!meta || typeof meta !== "object") return {};
  const num = (v, max) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? Math.min(Math.round(n), max) : null;
  };
  const str = (v, max) => {
    if (v == null) return null;
    return String(v).slice(0, max) || null;
  };
  return {
    platform: str(meta.platform, 40),
    browser: str(meta.browser, 60),
    hardwareCores: num(meta.hardwareCores, 64),
    deviceMemory: num(meta.deviceMemory, 1024),
    touchPoints: Math.round(Number(meta.touchPoints) || 0) === 0 ? null : Math.round(Number(meta.touchPoints)),
    screen: str(meta.screen, 40),
    timezone: str(meta.timezone, 64),
    language: str(meta.language, 20),
  };
}

/**
 * Compute a fallback deviceId from hardware signals + the student's email.
 * Deterministic for the same physical device + account, different across
 * devices. This is the "safe" path when WebAuthn is unavailable.
 */
function fallbackDeviceId(studentEmail, meta) {
  const m = sanitizeMeta(meta);
  return sh(
    [
      "fallback",
      String(studentEmail || "").toLowerCase(),
      m.platform,
      m.hardwareCores,
      m.deviceMemory,
      m.touchPoints,
      m.screen,
      m.timezone,
      m.language,
    ]
      .join("|")
  );
}

export function deviceIsAllowed(session, deviceId) {
  if (!session) return false;
  if (!session.deviceId) return false;
  return String(session.deviceId) === String(deviceId);
}

export { deriveDeviceId, fallbackDeviceId, sanitizeMeta };
