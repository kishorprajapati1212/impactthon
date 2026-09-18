# AttendX — 2026 Upgrade Notes

A full pass over the codebase to fix the first-scan error, add caching,
speed up data loading, make lat/long a first-class citizen, modernise the UI
and make the home page SEO-friendly.

---

## 1. Fixed — "student first scan gives error even with permission"

**Root cause:** `navigator.geolocation.getCurrentPosition()` with a 6s
timeout throws when GPS has no fix yet. A *cold* GPS start can take 10–30s,
so the very first scan died with "Location required" even though permission
was granted.

**Fix (`frontend/src/utils/geolocation.js`, `QRScanner.jsx`):**
- **Pre-warm** GPS on the student dashboard mount (`prewarmLocation`).
- **`watchPosition` first-fix** resolution — resolves as soon as *any* fix
  arrives instead of failing at a hard timeout.
- **Warm cache** (in-memory + `sessionStorage`) so later scans are instant
  and tab-switches don't lose the fix.
- Graceful fallbacks: last-known-position, then one final one-shot attempt.
- Local QR pre-check (`verifyQRLocally`) rejects dead codes *before*
  spending a GPS fix.

## 2. Fixed — missing caching (frontend + backend)

- **Frontend SWR cache** (`utils/api.js`): GET requests deduped & cached by
  TTL; any write busts the cache. Dashboards/history/analytics now feel
  instant on tab switches.
- **Backend cache service** (`server/services/cacheService.js`): in-memory
  (always on) + optional Redis mirror. Wired into faculty dashboard,
  faculty history/filters, lecture summary, student report and admin
  analytics.
- **Invalidation on write**: lecture start/end/force-end, attendance mark,
  manual mark and repair all invalidate the right cache prefixes.

## 3. Fixed — slow data loading

- `getFacultyHistory` now batch-loads section rosters **once** (was N+1).
- Faculty dashboard & student report now run **one bulk finalize** for
  completed lectures instead of a query per lecture.
- Admin analytics & faculty dashboards are cached (see above).

## 4. Latitude / Longitude made first-class ✅

- Attendance rows now store **accuracy (m)** alongside lat/lon.
- Lecture location stores `accuracy` + `hasGps` flags.
- Server geofence adds **accuracy padding** (up to 60 m) so a legitimate
  in-class scan is never falsely rejected on noisy GPS.
- Students see their **exact coordinates** on the success screen and in the
  scanning/loading states.
- Maps show per-marker GPS accuracy in popups.

## 5. UI modernisation (2026 design)

- New design system (`card-2026`, `surface-nav`, refined buttons/inputs).
- **Faculty dashboard rebuilt**: sidebar nav (desktop) + bottom nav
  (mobile), stat cards, quick actions, recent sessions.
- **Student dashboard rebuilt**: sidebar, attendance ring chart, scan CTA.
- **Home page rebuilt**: hero with live demo QR, 9-feature grid, roles
  section, FAQ accordion, modern footer.
- Dedicated **Excel Reports** tab for faculty (removed the clumsy inline
  panel from History).

## 6. SEO-friendly home page

- Richer `<head>`: canonical, robots, Open Graph, Twitter cards.
- Structured data: `SoftwareApplication` + **`FAQPage`** schema.
- Semantic landmarks (`header/nav/main/section/footer`), skip-link.
- Keyword-rich but human-readable copy; `AppHelmet` updates title/description.

## 7. Other fixes

- `SessionHistory`/`LiveSession` corrected to always refresh after
  manual-mark / repair (cache invalidation).
- Server test `qr.test.js` had a broken import path — fixed.
- QR validity widened to **25s** (was 10–20s) to survive cold GPS + slow
  network on first scans; tests updated to the new contract.

## 8. Human-friendly Excel / CSV exports + enrollment navigation

- CSV export rewritten: readable headers (`Enrollment No`, `Student Name`,
  `Present`, `Late`, `Absent`, `On Leave`, `Total Classes`, `Attendance %`),
  date-titled lecture columns with `P/L/A/LV/E` codes and a legend row.
- **New `.xlsx` export** (`GET /api/report/faculty/attendance-sheet.xlsx`)
  producing a real two-sheet Excel workbook: **Attendance Register** (per-date
  matrix) + **Summary** (totals & %). Built with the `xlsx` package.
- Faculty "Excel Reports" tab now lets you **browse the class roster by
  enrollment number** before exporting (`/api/report/faculty/subject-roster`).

## 9. Student leave module (mentor approval)

- `LeaveApplication` model: student → mentor, `FULL` / `HALF` (first|second) /
  `LECTURE` (specific lectures), with `PENDING/APPROVED/REJECTED`.
- **Student side**: apply with reason, type and (for lecture-wise) the day's
  lectures; track status & mentor remark.
- **Mentor side**: approve/reject from the new **Mentorship** tab; approving
  credits attendance — the matching `Attendance` rows become `LEAVE` so the
  day does **not** count as absent (`utils/leaveService.js`).
- `Attendance.status` enum gains `LEAVE`; `finalizeAttendance` reports
  `onLeave`; report denominators exclude `LEAVE` from absentee counts.
- Pending leave also surfaced on faculty dashboard via badge count.

## 10. Mentors & mentees, batch-wise

- `Student.mentorId` field (+ indexes). During seed, every student gets a
  mentor; sections carry `totalStudents`.
- Faculty see their **mentees grouped batch-wise** (Mentorship tab).
- Admin can assign a student's **mentor** when creating/editing students.

## 11. Admin overview matrix

- New `GET /api/report/admin/overview` returns one-shot:
  - **subjects → faculty → sections → live student counts**
  - **faculty → subjects taught / sections / distinct students / mentees**
  - **mentors → mentees grouped batch-wise**
  - **batches → sections → student counts**
- Admin dashboard has an **Overview Matrix** tab rendering all four views
  (accordion), plus summary chips — no deep navigation needed.

## 13. One-time device-bound login (digital fingerprint)

**Requirement:** store a "digital fingerprint" in a table; once a student logs
out, the next login must be accepted by their mentor before they can enter —
otherwise they cannot login.

- `StudentSession` model — the table that stores: `deviceId` + `fingerprint` +
  hardware metadata (platform / browser / cores / memory / screen / timezone),
  status (`PENDING / ACTIVE / REJECTED / LOGGED_OUT`), the approving mentor and
  timestamps.
- Student login creates a **PENDING** session. The API returns `202` with a
  `loginId`; the frontend shows "Waiting for mentor approval" and polls
  `/api/student/approval/status` until accepted (auto-login) or rejected.
- **Mentor side:** new *Logins* tab in Mentorship — Accept / Reject the device
  login. **Admin side:** new *Login Approvals* tab for students without a
  mentor (or oversight).
- `studentLogout` flips the session to `LOGGED_OUT`, so the next login must be
  re-approved — exactly the required "logout → mentor re-accepts" loop.
- JWT now carries the `loginId`; `auth.middleware` enforces that a STUDENT
  request must come from the session's **registered device** (`X-Device-Id`
  header, checked against the stored fingerprint).

**Anti-proxy / phone-sharing (no WiFi needed):** the active login is bound to
ONE physical device. Even if a student hands their logged-in phone to a
friend, the friend's own browser/device sends a different `X-Device-Id` →
the API rejects with `AUTH_DEVICE_MISMATCH`, so the friend cannot scan/mark
with the student's account. Combined with the rotating QR (25s) + GPS geofence
+ mentor-approved logins, attendance impersonation becomes impractical without
WiFi/network validation.

- Fingerprint is generated client-side (`utils/device.js`) via WebAuthn
  credentials when available, falling back to deterministic hardware signals;
  persisted in `localStorage` so it is stable across visits. The server stores
  the client deviceId and compares it on every student request.

## 12. Seeder rewritten (mentors + batches)

- `seed/seed.js` now assigns mentors (`MENTORS`), attaches `mentorId` to
  every student, seeds sample leave applications (approved reject/approved +
  pending), maintains `Section.totalStudents`, and clears `LeaveApplication`
  before reseeding.

## Verified

- Frontend production build: ✅
- Frontend tests (`qrUtils`): ✅ 10/10
- Server tests (qr + attendance): ✅ 28/28
- Server syntax checks: ✅

## Files touched (highlights)

**Frontend**
- `utils/geolocation.js` *(new)*, `utils/api.js` *(new)*, `utils/device.js` *(new)*
- `components/Student/QRScanner.jsx`, `pages/Student/Dashboard.jsx`
- `components/Student/LeaveModule.jsx` *(new)*
- `pages/Auth/Login.jsx` (device fingerprint + mentor-approval wait screen)
- `components/Faculty/Mentorship.jsx` *(new)*
- `pages/Faculty/Dashboard.jsx`, `components/Faculty/ExcelReports.jsx` *(new)*
- `components/Faculty/SessionHistory.jsx`, `LiveSession.jsx`
- `components/Admin/OverviewMatrix.jsx` *(new)*, `pages/Admin/Dashboard.jsx`
- `pages/Auth/Register.jsx` (mentor selector)
- `index.css`, `index.html`
- Home: `LandingPage`, `HeroSection`, `FeaturesSection`, `HowItWorksSection`,
  `RolesSection` *(new)*, `FAQSection` *(new)*, `Header`, `CTA`, `Footer`

**Server**
- `services/cacheService.js` *(new)*
- `controllers/report/report.controller.js`
- `controllers/attendance/attendance.controller.js`
- `controllers/lecture/lectureSession.controller.js`
- `utils/finalizeAttendance.js` (bulk helpers)
- `models/Attendance/Attendance.js`, `models/lecture/LectureSession.js`
- `utils/generateQR.js` (25s window)
- `models/leave/LeaveApplication.js` *(new)*
- `controllers/leave/leave.controller.js` *(new)*, `routes/leave/leave.routes.js` *(new)*
- `utils/leaveService.js` *(new)*
- `models/users/StudentSession.js` *(new)*
- `services/deviceAuthService.js` *(new)*, `controllers/auth/deviceAuth.controller.js` *(new)*,
  `routes/auth/device.routes.js` *(new)*
- `middleware/auth.middleware.js` (device binding), `utils/generateToken.js` (loginId)
- `models/users/Student.js` (mentorId), `controllers/auth/student.controller.js`
- `controllers/mapping/facultySubjectSection.controller.js` (overview cache bust)
- `routes/report/report.routes.js` (xlsx + admin overview)
- `seed/seed.js` (mentors + batches + leaves)
- `xlsx@0.18.5` added to dependencies
