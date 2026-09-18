/**
 * Device fingerprinting for the one-time login flow.
 *
 * We build a stable "digital fingerprint" of the physical device:
 *  - WebAuthn credential (device hardware keys) when available
 *  - tested hardware signals (cores / memory / touch / screen) otherwise
 *
 * The server stores this in the students` login-sessions table and ONLY the
 * registered device may use the session — so lending your logged-in phone to a
 * friend does not let them mark attendance with your account.
 */

const enc = new TextEncoder();

export async function sha256Hex(input) {
  try {
    if (crypto?.subtle?.digest) {
      const buf = await crypto.subtle.digest("SHA-256", enc.encode(String(input)));
      return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
    }
  } catch {
    /* fall through */
  }
  let h1 = 0xdeadbeef ^ String(input).length;
  let h2 = 0x41c6ce57 ^ String(input).length;
  const s = String(input);
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const toHex = (n) => (n >>> 0).toString(16).padStart(8, "0");
  return toHex(h1) + toHex(h2);
}

const b64url = (buf) => {
  let bin = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

function randomBuf(len) {
  const b = new Uint8Array(len);
  if (crypto?.getRandomValues) crypto.getRandomValues(b);
  return b;
}

const KEY = "attendx_device";

function loadStored() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveStored(obj) {
  try {
    localStorage.setItem(KEY, JSON.stringify(obj));
  } catch {
    /* ignore — fallback recomputes each visit */
  }
}

/**
 * Collect metadata. Cache the stable parts so silent-refresh requests
 * (after token expires) resolve the SAME fingerprint.
 */
export async function getDeviceProfile() {
  const cached = loadStored();
  const pad = (v, max) => (v == null ? null : String(v).slice(0, max) || null);

  const meta = {
    platform: pad(
      navigator.userAgentData?.platform || navigator.platform || "unknown",
      40
    ),
    browser: pad(
      (() => {
        const ua = navigator.userAgent || "";
        if (navigator.userAgentData?.brands?.length) {
          return navigator.userAgentData.brands
            .map((b) => b.brand)
            .join(" ");
        }
        if (/Edg\//.test(ua)) return "Edge";
        if (/OPR\//.test(ua)) return "Opera";
        if (/Firefox\//.test(ua)) return "Firefox";
        if (/Chrome\//.test(ua)) return "Chrome";
        if (/Safari\//.test(ua)) return "Safari";
        return "Browser";
      })(),
      60
    ),
    hardwareCores: navigator.hardwareConcurrency || null,
    deviceMemory: navigator.deviceMemory || null,
    touchPoints: navigator.maxTouchPoints || null,
    screen: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
    language: pad(navigator.language, 20),
  };

  // ── WebAuthn device credential (hardware-backed when supported) ─────
  let attestation = null;
  const hasCredential = cached?.attestation?.credentialId;
  if (!hasCredential && typeof PublicKeyCredential !== "undefined" && navigator.credentials) {
    try {
      const cc = await navigator.credentials.create({
        publicKey: {
          challenge: randomBuf(32),
          rp: { name: "AttendX" },
          user: {
            id: randomBuf(16),
            name: "attendx-device",
            displayName: "AttendX Device",
          },
          pubKeyCredParams: [{ type: "public-key", alg: -7 }],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "discouraged",
          },
          attestation: "none",
          timeout: 60000,
        },
      });
      if (cc) {
        const cId = cc.id; // base64url credential id
        const rawId =
          cc.rawId instanceof ArrayBuffer ? b64url(cc.rawId) : null;
        const resp = cc.response || {};
        const aaguid = resp.getAuthenticatorData
          ? (() => {
              const ab = new Uint8Array(resp.getAuthenticatorData());
              if (ab.length >= 53) {
                const g = ab.slice(37, 53);
                return [...g].map((b) => b.toString(16).padStart(2, "0")).join("");
              }
              return "";
            })()
          : "";
        attestation = { credentialId: cId, rawId, aaguid };
        // clean up (no pin/signature flow needed)
        try { cc.getClientExtensionResults?.(); } catch { /* ignore */ }
      }
    } catch {
      /* WebAuthn unavailable / cancelled → fallback fingerprint */
    }
  } else if (hasCredential) {
    attestation = cached.attestation;
  }

  // ── Reuse a previously persisted deviceId (keeps the pairing stable) ──
  let existingId = null;
  try {
    existingId = localStorage.getItem("attendx_device_id");
  } catch {
    /* ignore */
  }
  if (existingId && existingId.length >= 16) {
    saveStored({ attestation: attestation || cached?.attestation || null, meta });
    return {
      deviceId: existingId,
      attestation: attestation || cached?.attestation || null,
      meta,
      deviceLabel: `${
        meta.platform || "Device"
      } · ${meta.browser || "Browser"} · ${meta.screen || ""}`,
    };
  }

  // ── Fallback hardware fingerprint (deterministic per device) ────
  const fallbackParts = [
    "fallback",
    meta.platform,
    meta.hardwareCores,
    meta.deviceMemory,
    meta.touchPoints,
    meta.screen,
    meta.timezone,
  ];
  const fallback = await sha256Hex(fallbackParts.join("|"));
  fallbackParts.length = 0; // keep memory tidy

  const deviceId =
    (attestation
      ? await sha256Hex(
          `${attestation.aaguid || ""}:${attestation.credentialId}:${attestation.rawId || ""}`
        )
      : null) || fallback;

  saveStored({ attestation, meta, deviceId });
  try {
    localStorage.setItem("attendx_device_id", deviceId);
  } catch {
    /* ignore */
  }

  return {
    deviceId,
    attestation,
    meta,
    deviceLabel: `${
      meta.platform || "Device"
    } · ${meta.browser || "Browser"} · ${meta.screen || ""}`,
  };
}

/** Synchronously read the persisted deviceId (for the axios interceptor). */
export function currentDeviceId() {
  try {
    return localStorage.getItem("attendx_device_id") || null;
  } catch {
    return null;
  }
}

/** Whether this looks like the student's FIRST login on this device. */
export function isFirstLoginHere(rollNumberOrEmail) {
  try {
    const known = JSON.parse(
      localStorage.getItem("attendx_known_devices") || "{}"
    );
    const key = String(rollNumberOrEmail || "").toLowerCase();
    return !known[key];
  } catch {
    return true;
  }
}

export function rememberDevice(rollNumberOrEmail) {
  try {
    const known = JSON.parse(
      localStorage.getItem("attendx_known_devices") || "{}"
    );
    const key = String(rollNumberOrEmail || "").toLowerCase();
    known[key] = Date.now();
    localStorage.setItem("attendx_known_devices", JSON.stringify(known));
  } catch {
    /* ignore */
  }
}
