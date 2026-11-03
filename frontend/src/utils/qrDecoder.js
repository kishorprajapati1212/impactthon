/**
 * QR decoding for the student scanner (Phase 18).
 *
 * Two engines behind one tiny interface:
 *   1. the browser's native `BarcodeDetector` (Chrome/Edge on Android & desktop,
 *      hardware-accelerated, very tolerant of small or blurry codes)
 *   2. `jsQR` - pure JavaScript, works everywhere else (iOS Safari, Firefox,
 *      older browsers). Loaded on demand so it never weighs on the login or
 *      dashboard bundles.
 *
 * Why not keep html5-qrcode: it owns the <video> element and the decode loop,
 * which made two things impossible - a digital zoom that actually reaches
 * the decoder, and a guaranteed camera release when the user navigates away
 * mid-start. The scanner now owns both (see useQrCamera.js) and only needs a
 * function that turns a canvas into text.
 */

const QR_FORMAT = "qr_code";

async function nativeDetector() {
  if (typeof window === "undefined" || typeof window.BarcodeDetector !== "function") return null;
  try {
    const formats = (await window.BarcodeDetector.getSupportedFormats?.()) || [];
    if (!formats.includes(QR_FORMAT)) return null; // e.g. Chrome on Linux: the class exists, QR does not
    return new window.BarcodeDetector({ formats: [QR_FORMAT] });
  } catch {
    return null;
  }
}

let jsqrPromise = null;
function loadJsQR() {
  if (!jsqrPromise) {
    jsqrPromise = import("jsqr").then((m) => m.default || m).catch((e) => {
      jsqrPromise = null;
      throw e;
    });
  }
  return jsqrPromise;
}

/**
 * Build a decoder. Returns { engine: "native" | "jsqr", decode(canvas) → Promise<string|null> }.
 * `decode` never throws; a broken native detector permanently falls back to jsQR.
 */
export async function createQrDecoder({ preferNative = true } = {}) {
  let detector = preferNative ? await nativeDetector() : null;
  let jsQR = detector ? null : await loadJsQR();
  let frame = 0;

  const withJsQR = (canvas) => {
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const { width, height } = canvas;
    if (!width || !height) return null;
    const img = ctx.getImageData(0, 0, width, height);
    // Inverted codes (light-on-dark) are rare for a projected QR - try them
    // only every third frame so the common case stays fast.
    const inversionAttempts = frame++ % 3 === 0 ? "attemptBoth" : "dontInvert";
    const hit = jsQR(img.data, width, height, { inversionAttempts });
    return hit?.data ? hit.data : null;
  };

  return {
    get engine() {
      return detector ? "native" : "jsqr";
    },
    async decode(canvas) {
      if (detector) {
        try {
          const codes = await detector.detect(canvas);
          const text = codes?.find((c) => c.rawValue)?.rawValue;
          return text ? String(text) : null;
        } catch {
          // Some builds expose the API but fail at runtime - switch engines for good.
          detector = null;
          try {
            jsQR = await loadJsQR();
          } catch {
            return null;
          }
        }
      }
      try {
        return withJsQR(canvas);
      } catch {
        return null;
      }
    },
  };
}
