/** Convert any API / browser / library error into one short human sentence.
 *  Never returns stack traces, Mongo errors, or raw library strings. */
const BY_CODE = {
  QR_EXPIRED: "That QR code has expired. Scan the fresh code on the faculty screen.",
  QR_MALFORMED: "That is not a valid AttendX QR code. Scan the live code on the faculty screen.",
  QR_SIGNATURE: "That QR code is not valid. Scan only the live code on the faculty screen.",
  GEOFENCE: "You seem to be outside the classroom area. Move closer and scan again.",
  GPS_REQUIRED: "Location is needed. Turn on Location, allow it for this site, then scan again.",
  WINDOW_CLOSED: "The attendance time for this lecture is over. Ask your faculty to mark you manually.",
  ALREADY_MARKED: "You are already marked present for this lecture.",
  ALREADY_EXISTS: "This already exists. Please check the details.",
  VALIDATION: "Please check the details you entered and try again.",
  SESSION_EXPIRED: "Your session has expired. Please log in again.",
  SESSION_INVALID: "Your session is not valid. Please log in again.",
  NOT_ASSIGNED: "You are not assigned to this class. Please contact the admin.",
  WRONG_SECTION: "This QR is for a different class, so it cannot be used for you.",
};
export function getFriendlyError(err, fallback = "Something went wrong. Please try again.") {
  if (!err) return fallback;
  if (typeof navigator !== "undefined" && navigator.onLine === false)
    return "No internet connection. Check your network and try again.";
  const data = err.response?.data;
  const code = data?.code;
  if (code && BY_CODE[code]) return BY_CODE[code];
  const status = err.response?.status;
  if (!err.response) {
    if (err.code === "ECONNABORTED") return "This is taking too long. Check your connection and try again.";
    return "Could not reach the server. Check your connection and try again.";
  }
  if (status === 401) return BY_CODE.SESSION_EXPIRED;
  if (status === 403) return data?.message && data.message.length <= 160 ? data.message : "You do not have permission to do this.";
  if (status === 404) return "That record could not be found. It may have been removed.";
  if (status === 409) return data?.message && data.message.length <= 160 ? data.message : BY_CODE.ALREADY_EXISTS;
  if (status >= 500) return "Something went wrong on our side. Please try again in a moment.";
  const msg = data?.message;
  // Only trust short server messages; long/library strings become the fallback.
  if (typeof msg === "string" && msg.length > 0 && msg.length <= 160 && !/mongo|mongoose|E11000|CastError|stack/i.test(msg)) return msg;
  return fallback;
}
export default getFriendlyError;
