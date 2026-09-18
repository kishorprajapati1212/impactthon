# Live session + student scan fixes

## Problem 1 — Other faculty blocked / admin force-end stuck
**Cause**
- Faculty UI restored a **ghost session** from `sessionStorage` even after admin force-ended it on the server.
- Active list sometimes didn’t refresh cleanly after force-end.
- (Design is per-faculty lock only — other teachers were never blocked server-side; the stuck UI felt global.)

**Fix**
- `GET /lecture/my-active` — faculty UI syncs with server on load; clears local storage if server has no ACTIVE session.
- Start only auto-closes **that faculty’s** own ACTIVE sessions.
- Admin force-end always completes lecture + finalizes absents; works if already ended.
- `POST /admin/lecture/end-all` + Admin UI **End all active**.
- Faculty end treats “already ended” as success and clears local UI.

## Problem 2 — Student scan slow / vague “validation error” / last second fails
**Cause**
- QR max age was **10s** while QR rotates every **5s** + GPS + network → false expiry.
- Generic “Validation failed” when body checks failed.
- GPS timeout too aggressive; no retry.

**Fix**
- QR valid **~20s** (last-second friendly across 5s rotations) + 8s clock skew.
- Specific error codes/messages: QR_EXPIRED, GEOFENCE, GPS_REQUIRED, WINDOW_CLOSED, ALREADY_MARKED, WRONG_SECTION, etc.
- Attendance window **+30s grace** after official close.
- Student scanner: GPS retry, clearer UI tips, 20s API timeout.
- Scanner copy: QR refreshes every 5s, valid ~20s.

## Rebuild
```bash
docker compose up --build -d
```
