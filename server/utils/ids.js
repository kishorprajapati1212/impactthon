/** Normalize Mongo id from ObjectId | populated doc | string */
export function refId(value) {
  if (value == null || value === "") return null;
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    if (value._id != null) return String(value._id);
    if (value.id != null) return String(value.id);
    // ObjectId
    if (typeof value.toString === "function") {
      const s = value.toString();
      if (/^[a-fA-F0-9]{24}$/.test(s)) return s;
    }
  }
  return String(value);
}

export const pct = (num, den, digits = 1) =>
  den > 0 ? parseFloat(((num / den) * 100).toFixed(digits)) : 0;
