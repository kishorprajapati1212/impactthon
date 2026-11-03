/**
 * Shared helpers for admin list endpoints (pure functions — unit tested).
 *
 * Why: the admin console needs server-side pagination, safe sorting and
 * consistent "showInactive" handling across departments / subjects /
 * classes / faculty / students. Before, every controller re-implemented
 * this slightly differently (and accepted ANY sortBy field from the client).
 *
 * Backwards compatible: when no `page` is sent the first page is returned
 * with the old default size, so existing callers keep working.
 */

/**
 * Turn a `?something=` list-filter value into a Mongo filter value.
 *   "none"            → null        (rows that have no such reference)
 *   a valid ObjectId  → that id
 *   anything else     → undefined   (filter ignored)
 * A list filter is a hint, not a resource id: a stale or foreign query string
 * (e.g. `?section=students` from an old build, or a typo) must never turn a
 * whole table into a 400 "record not found".
 */
export function refFilter(value) {
  if (value === undefined || value === null) return undefined;
  const v = String(value).trim();
  if (!v) return undefined;
  if (v.toLowerCase() === "none") return null;
  return /^[0-9a-fA-F]{24}$/.test(v) ? v : undefined;
}

/** Numeric list filter: returns a finite number or undefined (ignored). */
export function numFilter(value) {
  if (value === undefined || value === null || String(value).trim() === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export function parsePagination(query = {}, { defaultLimit = 200, maxLimit = 500 } = {}) {
  const limitRaw = Number.parseInt(query.limit, 10);
  const pageRaw = Number.parseInt(query.page, 10);
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, maxLimit) : defaultLimit;
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  return { page, limit, skip: (page - 1) * limit };
}

/** Only allow sorting on known fields; unknown → fallback. */
export function parseSort(query = {}, allowed = [], fallback = { field: "createdAt", order: "desc" }) {
  const ok = allowed.includes(query.sortBy);
  const field = ok ? query.sortBy : fallback.field;
  // An unknown sort field means the whole sort request is ignored (field AND order).
  const order = ok && (query.order === "asc" || query.order === "desc") ? query.order : fallback.order;
  return { [field]: order === "desc" ? -1 : 1 };
}

/** showInactive=true → no filter; otherwise only active rows. */
export function activeFilter(query = {}) {
  return query.showInactive === "true" || query.showInactive === "1" ? {} : { isActive: true };
}

/** Escape user input before using it inside a $regex. */
export function escapeRegex(s = "") {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Uniform list envelope: keeps `count` (old) and adds total/page/pages (new). */
export function listEnvelope(data, { total, page, limit }) {
  const pages = Math.max(1, Math.ceil((total || 0) / (limit || 1)));
  return { success: true, count: data.length, total: total ?? data.length, page: page || 1, pages, limit, data };
}
