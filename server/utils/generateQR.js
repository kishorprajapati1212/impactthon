import crypto from "crypto";

const secret = () => {
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET not set");
  return process.env.JWT_SECRET;
};

/** QR rotates every 5s on faculty screen — allow enough skew for last-second scans.
 *  25s max age gives a first-time scanner (cold GPS + slower network) a full
 *  buffer even when they lock onto a QR a couple of frames old. */
export const QR_MAX_AGE_MS = Number(process.env.QR_MAX_AGE_MS || 25_000); // 25s
export const QR_FUTURE_SKEW_MS = Number(process.env.QR_FUTURE_SKEW_MS || 8_000); // 8s clock skew

export const generateSessionToken = (lectureSessionId) => {
  if (!lectureSessionId) throw new Error("lectureSessionId required");
  return crypto
    .createHmac("sha256", secret())
    .update(String(lectureSessionId))
    .digest("hex");
};

export const verifyQRData = (qrString) => {
  if (!qrString || typeof qrString !== "string") {
    return {
      valid: false,
      code: "QR_EMPTY",
      message: "No QR code data received. Point your camera at the faculty QR and try again.",
    };
  }

  const trimmed = qrString.trim();
  if (trimmed.length < 10) {
    return {
      valid: false,
      code: "QR_TOO_SHORT",
      message: "QR code looks incomplete. Hold steady and scan the full code on the screen.",
    };
  }

  let payload;
  try {
    const b64 = trimmed.replace(/-/g, "+").replace(/_/g, "/");
    const pad = "=".repeat((4 - (b64.length % 4)) % 4);
    const json = Buffer.from(b64 + pad, "base64").toString("utf8");
    payload = JSON.parse(json);
  } catch {
    return {
      valid: false,
      code: "QR_MALFORMED",
      message:
        "Could not read this QR code. Make sure you are scanning the AttendX live QR (not a photo of an old one).",
    };
  }

  const { token, lectureSessionId, ts } = payload || {};
  if (!token || !lectureSessionId || ts == null) {
    return {
      valid: false,
      code: "QR_INCOMPLETE",
      message:
        "QR code is missing session data. Ask faculty to refresh or restart the live session.",
    };
  }

  let expected;
  try {
    expected = crypto
      .createHmac("sha256", secret())
      .update(String(lectureSessionId))
      .digest("hex");
  } catch {
    return {
      valid: false,
      code: "SERVER_CONFIG",
      message: "Server configuration error. Please contact admin.",
    };
  }

  try {
    const tokBuf = Buffer.from(String(token), "hex");
    const expBuf = Buffer.from(expected, "hex");
    if (
      tokBuf.length !== expBuf.length ||
      !crypto.timingSafeEqual(tokBuf, expBuf)
    ) {
      return {
        valid: false,
        code: "QR_SIGNATURE",
        message:
          "This QR is not valid for AttendX (wrong or forged code). Scan only the live QR on the faculty screen.",
      };
    }
  } catch {
    return {
      valid: false,
      code: "QR_SIGNATURE",
      message:
        "This QR is not valid for AttendX. Scan only the live QR on the faculty screen.",
    };
  }

  const tsNum = Number(ts);
  if (!Number.isFinite(tsNum)) {
    return {
      valid: false,
      code: "QR_BAD_TIME",
      message: "QR timestamp is invalid. Ask faculty to show a fresh QR.",
    };
  }

  const age = Date.now() - tsNum;
  // Last-second friendly: QR rotates every 5s; allow full 20s so a scan of
  // the previous frame still works while network/GPS finishes.
  if (age > QR_MAX_AGE_MS) {
    return {
      valid: false,
      code: "QR_EXPIRED",
      message: `QR expired (${Math.round(age / 1000)}s old). Look at the faculty screen for the newest QR (it changes every 5 seconds) and scan again immediately.`,
      data: { ageMs: age, maxAgeMs: QR_MAX_AGE_MS },
    };
  }
  if (age < -QR_FUTURE_SKEW_MS) {
    return {
      valid: false,
      code: "QR_FUTURE",
      message:
        "Your phone clock appears ahead of the server. Enable automatic date & time, then try again.",
      data: { ageMs: age },
    };
  }

  return {
    valid: true,
    data: { lectureSessionId: String(lectureSessionId), ts: tsNum, ageMs: age },
  };
};
