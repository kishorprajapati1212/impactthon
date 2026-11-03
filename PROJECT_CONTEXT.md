# AttendX — Project context (updated)

## Product
**AttendX** = college/school **QR attendance** with:
- Faculty live rotating QR + optional **manual late mark**
- Student scan + GPS **geofence**
- On lecture **end**: unmarked students → **ABSENT** (updates student %)
- Admin academics + **analytics**
- Teacher **Excel** export (roll no × dates)

## Stack
- `frontend/` React + Vite + Tailwind
- `server/` Express + MongoDB (Mongoose)
- Docker Compose: mongo, redis, server :3000, frontend :5173

## Roles
| Role | Entry |
|------|--------|
| Admin | `/admin` |
| Faculty | `/faculty` — Live / History / Profile |
| Student | `/student` — Scan / Subjects / History |

## Key APIs
- `POST /lecture/start` · `POST /lecture/end` (finalizes absents)
- `POST /lecture/:id/manual-mark` `{ studentId, status }`
- `GET /lecture/:id` roster + summary + geofence location
- `GET /api/report/faculty/attendance-sheet.csv?subjectId&sectionId&from&to`
- `GET /api/report/student/my-attendance`

## Latest product rules
1. **Present = 0** → UI shows summary only (no long student dump). Absents still saved.
2. **Present > 0** → detail list shows **present students only**.
3. **Manual mark** = faculty tool for late arrivals (Live + History).
4. **Map** = classroom geofence rectangle + present student pins (History + session end).
5. **“Fix missing marks”** = rare repair; normal end-session already writes absents.
6. **Class names** are always `DEPT · Division · Batch` (e.g. `CE · A · 2024`) —
   `server/utils/classLabel.js` / `frontend/src/utils/classLabel.js`. Never print a
   bare "Section A".
7. **Lecture location is optional.** Start waits ≤ 8 s for GPS and can be skipped;
   without a location students scan without the distance check.
8. **Teachers export only their own subject × class pairs**; the sheet header and
   filename carry the batch (`AttendX_CE503_CE-A-2024_….xlsx`).
9. **Coding rule:** Mongoose does not cast `aggregate()` pipelines — wrap ids with
   `toObjectIds()` (`server/utils/ids.js`) inside any `$match … $in`. A startup
   self-heal (`utils/repairLectureTotals.js`) recounts `totalMarked`.
10. **No emojis in the UI** — lucide-react icons only. Light theme = off-white canvas
    with visible borders (palette in `frontend/tailwind.config.js`).
11. **Same-origin API.** The browser calls `/api/…` on the page's own origin; Vite
    (dev/preview) or nginx (Docker) forwards it to the API, which serves every route
    under `/api` as well as at the root. Never reintroduce host rewriting or
    cross-origin calls in the frontend — that is what broke Project IDX.
12. **List filters are hints**: non-id values are ignored (`refFilter`), never 400.
13. **The scanner owns the camera** (`components/Student/useQrCamera.js`): one
    stream, decoded in-house (BarcodeDetector → jsQR). Any new code that touches
    `getUserMedia` or `watchPosition` must release it on unmount / tab hide — the
    e2e checks assert every track is `ended` and GPS watches are cleared.
    Zoom controls live *on* the preview (− / slider / +, presets) and gestures
    come from `useZoomGestures.js` (drag, pinch, double-tap, wheel, keys);
    zoomed crops are up-scaled to 640 px before decoding — keep it that way.
14. **Deleting a lecture** goes only through `server/utils/deleteLecture.js`
    (Attendance → LeaveApplication → NotificationLog → LectureSession → AuditLog
    → cache). Admin: any lecture. Teacher: own lecture while running or with no
    one present. Counts need no recomputation because nothing stores them.

## Docs
- `WHAT_CHANGED.md` — this release explanation  
- demo logins: see README → "Demo logins" (password `123456`)  
- `BUGFIXES.md` — bug history  

## Demo logins
All passwords: **123456**  
Email = `<firstname>@attendx.com` for everyone. Admin `admin@attendx.com`
(+ `principal@`, `registrar@`, … 10 admins) · teachers `sahil@`, `jatin@`,
`meet@` (CE) + `priya@`, `kiran@`, `rohan@`, `neha@`, `vivek@`, `pooja@`,
`amit@`, `sneha@`, `rakesh@` · students `nihal@`, `jeel@`, `ritik@`, `darshit@`
(CE · A 2024), `yash@`… (CE · B 2024), `dev@`… (CE · A 2025) and 4–5 per other
class — 58 students in 11 classes. Full table: README → "Demo logins".
Student logins wait for the mentor's/admin's Accept (device binding).
