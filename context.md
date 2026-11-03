# context.md — AttendX working context (update this after EVERY change)

> Rule for future work: read this file first, then MODELS.md. **Do not rename any
> model, collection, route prefix, or Docker service.** Work one priority at a time.

## Priority order (agreed, not the user's original list order)
| # | Priority | Status |
|---|----------|--------|
| P0 | Simple human errors everywhere; never show raw DB/library errors | ✅ Done (Phase 1 + 7) |
| P0 | Camera + GPS permission gate for new students (no reload needed) | ✅ Done (Phase 2) |
| P1 | Map always renders + session-end roster/map for every ended session | ✅ Done (Phase 3) |
| P1 | Mentor sees full mentee profile (attendance %, subjects, recent, leaves) | ✅ Done (Phase 4) |
| P2 | Student clarity: "My Class & Mentor" + subject teachers | ✅ Done (Phase 5, student side) |
| P2 | Admin UI professional redesign (responsive) | ✅ Done (Phase 11 — sidebar + tables, replaces 6/8/10) |
| P2 | Faculty clarity: my classes at a glance (reuse assignments) | ✅ Done (Phase 6) |

## Phase log
### Phase 1 — Human errors (P0)
- `server/middleware/errorHandler.js` rewritten: stable `code`, short message,
  **no stack / Mongo / Mongoose text in any response** (also in development).
  Duplicate key → 409 `ALREADY_EXISTS` with per-field human text; unknown 500 →
  generic message; real error logged server-side only.
- `frontend/src/utils/friendlyError.js` (new): `getFriendlyError(err, fallback)` —
  maps codes/status to one short sentence, caps trusted server text at 160 chars,
  rejects mongo/stack-looking strings. Wired into QRScanner, LiveSession, Mentorship, Admin.
- Test: `server/__tests__/errorHandler.test.js`.

### Phase 2 — Permission gate (P0)
- New `frontend/src/components/Student/PermissionGate.jsx`: shown **before** the
  scanner starts. Explains camera + location, live status (Allowed / Not asked /
  Blocked), one-tap Allow buttons (real `getUserMedia` test + real GPS fix),
  "Check again" re-query without reload, blocked-state unblock instructions.
- `QRScanner.jsx`: starts in `permission` phase; scanner only mounts after gate;
  raw html5-qrcode strings replaced by short messages; `ALREADY_MARKED` treated
  as a friendly success state.

### Phase 3 — Map + session end (P1)
- Root cause: Leaflet was loaded from unpkg CDN at runtime and failures were
  swallowed (`catch(()=>{})`), and markers drawn before map init never redrew.
- Fix: `leaflet` is now a bundled npm dependency (`AttendanceMap.jsx` imports it +
  CSS); a `mapReady` flag re-runs the marker effect after init.
- `LiveSession` ended screen now renders `AttendanceMap` for **every** ended
  session (no-GPS case shows an explanation instead of nothing) and shows an
  explicit "result could not be loaded → see History" card instead of a blank.
- QR timing unchanged on purpose: QR rotates 5s, server accepts 25s age +
  30s attendance-window grace — last-second scans keep working.

### Phase 4 — Mentor mentee detail (P1)
- New `GET /api/leave/mentor/mentees/:studentId/detail` (FACULTY mentor or ADMIN
  only; 403 for other faculty). Returns profile, section/department/mentor,
  overall %, present/absent/late/leave/excused, subject-wise breakdown,
  last 20 lectures, last 20 leaves. Uses existing models only.
- `Mentorship.jsx`: mentee rows are now tappable → detail panel with stats,
  subject bars, recent lectures, leaves.

### Phase 5 — Student clarity (P2, student side)
- `GET /api/report/student/my-attendance` now additively returns `myClass`:
  section, semester, batch, department, roll number, mentor (name/email) and
  subject→teacher list from `FacultySubjectSection`. No fields removed.
- Student dashboard shows a "My Class & Mentor" card on Home.

## Architecture (unchanged)
- Docker Compose: `mongo` (27017), `redis` (6379), `server` (3000), `frontend`
  (Nginx 5173→80), optional `seeder` profile. Start: `./start.sh` or
  `docker compose up --build` — same as before, nothing renamed.
- Backend: Express 5 + Mongoose 9, JWT, roles ADMIN/FACULTY/STUDENT.
- Models (DO NOT RENAME): User, Student, Faculty, Admin, Parent, StudentSession,
  Department, Section, Subject, FacultySubjectSection, LectureSession,
  Attendance, LeaveApplication, AuditLog, NotificationLog.
- Key relations: Student.sectionId→Section, Student.mentorId→Faculty,
  FacultySubjectSection = faculty×subject×section assignment,
  Attendance = one row per (LectureSession, Student) with GPS proof.

### Phase 6 — Admin UI + faculty clarity (P2, final)
- `frontend/src/pages/Admin/Dashboard.jsx` redesigned (no API/model changes):
  grouped desktop sidebar (Home / Academics / People / Live) with icons and
  the signed-in admin, sticky header showing the current section, horizontal
  scroll section picker on mobile/tablet, clickable summary cards, a single
  search + sort + show-inactive + refresh toolbar card for every list,
  skeleton loading cards, friendly empty states with result counts, and
  in-app confirmation modals (browser `confirm()`/`window.confirm` removed,
  including `frontend/src/pages/Admin/AssignFaculty.jsx` two-tap remove).
- Remaining raw `err.response...message` toasts across admin create pages,
  SessionHistory and LeaveModule now go through `getFriendlyError`.
- Faculty overview gains a "My Classes" section (from the existing
  `stats.assignments`): subject, section, semester, batch, with
  Start-session / View-history shortcuts; empty state tells faculty to
  contact admin.

### Phase 7 — Custom notification system (replaces the library)
- The previous library-based message display (`react-toastify`) is REMOVED
  completely: zero imports, zero CSS, package uninstalled from
  `frontend/package.json`.
- New in-house system: `frontend/src/utils/notify.js` (drop-in
  `toast.success/error/info/warning`) + `frontend/src/components/UI/NotificationCenter.jsx`
  (mounted once in `main.jsx`, uses the app theme, pause-on-hover, close
  button, progress bar, max 4 stacked).
- Every message passing through it is sanitised centrally: HTML stripped,
  whitespace collapsed, JSON dumps / Mongo / stack-like text replaced with a
  friendly fallback, hard cap of 180 characters, duplicate messages within
  2.5s shown only once. So no library (QR scanner, HTTP, etc.) can ever flood
  the screen with a huge raw message again.
- Tests: `frontend/src/__tests__/notify.test.js` (5 tests).

### Phase 8 — Admin console rebuilt (visibly new) + operations insight — *superseded by Phase 11; files below were deleted*
- The Admin dashboard is now a different product surface, not a restyle:
  dark navy sidebar (visible from tablet width), command-centre hero on
  Overview, and two NEW components:
  `frontend/src/components/Admin/AdminOverview.jsx` and
  `frontend/src/components/Admin/AdminDataTable.jsx`.
- AdminOverview (from existing list APIs only): "Needs your attention"
  (students without mentor/section, unassigned subjects, empty sections,
  waiting login approvals, live lectures — each with a jump-to-fix action),
  "Institution setup" checklist with % complete in the correct working
  order, and a "Find a person" search across students/faculty showing
  section + mentor.
- Every admin list is now a real desktop data table (name/code/class/
  mentor/status/actions columns) with cards retained on mobile, plus the
  search/sort/refresh toolbar. No API, route or model was changed.

### Phase 9 — Human navigation, mentor connections & student lifecycle
- Plain-language navigation (labels only; ids/routes/models unchanged):
  Admin: Command centre / Classes / Who teaches what / Students & mentors /
  Lectures running now / College attendance overview / Reports & trends,
  grouped as "Start here · Set up your college · People · Happening now".
  Faculty: Home / Take attendance / Past classes / My mentees / Download
  sheets. Student: My subjects / Apply for leave / My history.
- NEW additive table `MentorStudentHistory` (studentId, mentorId, assignedBy,
  startsAt, endsAt, endReason) + `server/utils/mentorshipHistory.js`.
  Student.mentorId remains the current-mentor pointer; history rows are
  written on student create, mentor change, and lifecycle change, with a
  lazy backfill for pre-existing mentees. No existing model was renamed or
  restructured — Student gained only lifecycleStatus/leftAt/leavingNote.
- `POST /student/:id/lifecycle` (admin): Completed/Left/Transferred/
  Suspended/Studying. Nothing is deleted; login is disabled, mentorship is
  closed with a reason, and the student moves to the mentor's new
  "Former students" tab (`GET /api/leave/mentor/former-mentees`), where the
  full detail (attendance %, subjects, recent lectures, leaves, mentor
  history timeline) stays openable — including by past mentors.
- Admin Students list has a "Student status" action (graduation-cap icon)
  for this; former students show "Left the college · records kept".

### Phase 10 — Professional Admin dashboard redesign — *superseded by Phase 11*
- Admin surface rebuilt again as a light, professional console (this
  supersedes the Phase 6/8 styling): white 276px sidebar with indigo
  active states and a proper logo block, breadcrumb + date top bar,
  1440px content area, flat KPI cards, and a clean white welcome panel
  (the dark gradient hero is gone).
- `AdminOverview.jsx` rewritten: attention queue as a proper action list
  with "Fix →" links, college-setup progress ring with numbered steps,
  a "Happening now" operations panel (live lectures + waiting approvals),
  and the people finder with avatar rows.
- Data tables, toolbar, modals and all Phase 9 labels/lifecycle behaviour
  are unchanged underneath. New `.admin-primary` button style in index.css.

### Phase 11 — Admin console rebuilt from the real use case (P2, replaces Phases 6/8/10 admin UI)
**Step 1 — who uses the admin screen and for what (written before coding).**
The admin is a college office person, not a developer. Their work falls in
three rhythms:
1. *Set-up (once a semester, in this order)*: Departments → Subjects → Classes
   → Faculty → Students → Who teaches what → give every student a mentor.
   Each step depends on the previous one (a class needs a department, a
   student needs a class, an assignment needs all three).
2. *Daily*: see lectures running right now and end a stuck one; approve a
   student's new-device login when the mentor is away; look a person up
   ("which class is Riya in, what is her parent's number, who is her
   mentor?"); fix a wrong mentor/class; add a late joiner.
3. *Periodic*: attendance overview and trends; mark students who completed
   or left (without losing their history).
Consequences for the design: a persistent sidebar grouped exactly by those
rhythms; one **table per record type** with search, filters, sort and
pagination; **Edit** and **Delete** as full-size labelled buttons on every
row (secondary actions behind "⋯"); a detail drawer that answers the
look-up questions (contact numbers, class, mentor, attendance, history);
a dashboard that lists what is blocking attendance; dangerous actions
confirmed in-app with plain words; nothing shown that the model lacks.

**Step 2 — model ↔ UI audit.** See `MODELS.md` §11 (full field map). Key
findings: student/faculty **phone numbers existed but were never shown**;
"description" was offered for subjects/classes that have no such field;
`AssignFaculty` hard-coded `semester: 1`; student search matched only roll
numbers; no pagination; `Section.totalStudents` drifted; permanent delete
had no integrity guard; AuditLog could not record setup entities.

**Step 3 — backend (all additive, old callers unaffected).**
- `GET /students` → paginated `{total,page,pages,limit,data}`, `search`
  across name/email/roll/phone, filters `section/department/semester/
  mentor(=none)/lifecycle/showInactive`, whitelisted `sortBy/order`,
  populated class/department/mentor.
- `GET /faculty` same shape; `GET /departments?withCounts=1`,
  `GET /subjects?withCounts=1`, `GET /sections` (+`studentCount`,
  `batchLabel`), `GET /assignments?faculty=&subject=&section=&showInactive=`.
- `POST /faculty-subject-section` defaults semester from the class and
  academic year to the current year; re-activates an inactive duplicate.
- Every admin write is audited with `summary` + `entityLabel`;
  `GET /api/audit?limit=&entityType=` and `GET /api/audit/:type/:id`.
- `DELETE …/permanent` answers **409 `IN_USE`** with a friendly sentence and
  counts when dependents exist (deactivate instead).
- `Section.totalStudents` recounted on every student write
  (`utils/sectionCounts.js`); validators relaxed to accept real names.
- New tests: `server/__tests__/adminConsole.test.js` (50/50 total).

**Step 4 — frontend (`frontend/src/admin/`, new; old pages deleted).**
- `AdminConsole.jsx` — shell: dark sidebar (slide-over on phones), breadcrumb,
  global "find a student or teacher", theme toggle, log out; pages are
  deep-linkable via `/admin?section=…` (`&new=1` opens the create form;
  old URLs `/students`, `/create-*`, `/assign-faculty` redirect there).
- `entities.jsx` — one config per record type (columns, filters, sort,
  form fields, payload mapping, API paths). `nav.js` — grouped sidebar.
- `components/` — `DataTable` (desktop table ≥lg with **sticky action
  column**, stacked cards below), `FilterBar`, `Pagination`, `RecordForm`
  (react-hook-form drawer, create/edit, inline validation), `RecordDetail`
  (related records + attendance + audit history), `ui.jsx` (Button, Pill,
  Drawer/ConfirmDialog rendered through portals, MenuButton, Stat…).
- `pages/` — `ResourcePage` (generic list → Edit / Delete / ⋯ View details ·
  Student status · Deactivate/Reactivate), `OverviewPage` (KPIs, "Needs your
  attention" with Fix links, setup checklist, live lectures, recent
  activity), `LivePages` (Lectures running now with End lecture / End all;
  Login approvals with Approve / Reject; auto-refresh), reports reuse
  `OverviewMatrix` + `AnalyticsCharts`.
- Visual QA was done with headless Chromium screenshots of the built app
  against mocked API data (desktop 1440/1280, phone 390, dark mode) — not by
  running a server.
- Tests: `adminFormat.test.js`, `adminEntities.test.jsx` (every form field
  must exist on the model; phone columns present), `adminConsole.test.jsx`
  (renders the console, edits a student incl. phone → `PUT /student/:id`,
  lifecycle → `POST /student/:id/lifecycle`, delete → 409 message shown,
  deactivate path, detail drawer). 48/48 frontend, build OK.

### Phase 12 — White / off-white theme + "why do I still see the old UI" hardening
- User screenshot showed the ORIGINAL dark dashboard (pre-Phase 6) although
  the ZIP contained the new console → a stale Docker image / old folder.
  Hardening: `start.sh` now runs `compose down` + `up --build --force-recreate`
  (`FRESH=1` → `build --no-cache --pull`); nginx serves `index.html` and
  `/version.json` with `no-store`; `npm run build` writes
  `public/version.json`; the sidebar footer shows **Console v<version> · built
  <date>** (from Vite `define`) and the console logs it; README/projectredme
  have a "still seeing the old screen" section. Frontend version → 3.0.0.
- Theme: default is now **light** for the whole app (`ThemeContext` no longer
  follows the OS preference; the header toggle still switches and remembers).
  Admin console: white sidebar (`border-r`, blue-50 active item), off-white
  canvas `#f6f7f9`, white panels; dark variants kept behind the toggle.
- Verified with headless-Chromium screenshots (admin desktop/phone, login).

### Phase 13 — Dashboard and Attendance report made plain (user: "AI slop", "not understandable")
- Problem: the dashboard was a greeting + icon KPI tiles + setup-% panels; the
  "Trends & analytics" page was four Chart.js charts (daily present/absent,
  dept/subject/faculty) that a new admin could not read. Both rewritten.
- **Dashboard** (`frontend/src/admin/pages/OverviewPage.jsx`) is now a list of
  sentences, each with ONE button: *What to do* (missing setup steps in
  order — departments → subjects → classes → faculty → students — then
  problems that block attendance: subjects/classes without a teacher,
  students without a class or mentor, empty classes, logins waiting;
  "Nothing to do" when clean), *Right now* (lectures running, logins
  waiting), *Attendance in the last 30 days* (one number + one sentence,
  link to the report), *Your college* (plain counts), *Recent changes*.
  Counts for "no mentor" / "no class" come from the paginated endpoint
  (`/students?mentor=none&limit=1` → `total`), so they stay correct at scale.
- **Attendance report** (`frontend/src/admin/pages/ReportPage.jsx`, replaces
  `components/Admin/AnalyticsCharts.jsx`, deleted; `chart.js` +
  `react-chartjs-2` uninstalled). Period buttons 7/30/90/all. The rule is
  written on the page — **75 %+ good · 60–74 watch · < 60 low; leave and
  excused not counted** — and used for every colour. Content: overall %
  with previous-period comparison, week-by-week bars, then tables lowest
  first: Classes (click → that class's students), Students below 75 %
  (≥ 3 lectures, active only, with mentor; "Open" → Students page searched
  by roll number), Subjects, Teachers. Empty period says so in words.
- **Server**: `utils/attendanceSummary.js` (pure `summariseAttendance()`,
  unit-tested in `__tests__/attendanceSummary.test.js`) +
  `GET /api/report/admin/attendance-summary?days=7|30|90|all` (ADMIN,
  cached 60 s). Lectures counted = COMPLETED/ACTIVE with `startTime` in the
  period; LEAVE/EXCUSED marks are neutral. `GET /students?section=none`
  added (students not in any class). Old `/api/report/admin/analytics` is
  kept for API compatibility but no longer used by the UI.
- Deep links: `ResourcePage` accepts `initialFilters`; `AdminConsole` fills
  them from URL params that match the page's filter keys
  (`?section=students&mentor=none`, `&section=none`). Students "Class"
  filter gained "Not in any class".
- Nav relabels (`admin/nav.js`): *Trends & analytics* → **Attendance
  report** (`?section=attendance-report`; old `analytics` URL aliases to
  it), *Attendance overview* → **Teaching & mentor map** (same
  `OverviewMatrix`). Frontend version → 3.1.0.
- Tests: server 56/56 (new helper tests), frontend 53/53 (dashboard to-do
  deep link, old-URL alias, report rule/tables/period/empty/open). Build OK;
  desktop + 390 px screenshots verified (no horizontal overflow).

### Phase 14 — Home page fixes (same design) + fresh demo data (Nihal, Jeel, Ritik, Darshit · Sahil, Jatin)
- **Home page bugs fixed, design untouched** (`frontend/src/components/Home/*`,
  `pages/Home/LandingPage.jsx`, `index.css`, `routes/AppRoutes.jsx`):
  - Mobile menu was see-through (translucent `surface-nav` over the hero
    text): now a solid panel, dimmed overlay to tap-close, Escape closes,
    page scroll locked, `aria-expanded`/`aria-controls`.
  - Floating hero chips were clipped off-screen on phones; emoji replaced by
    icons; the "refreshes every 5s" demo QR now really rotates with a countdown.
  - `#features / #how-it-works / #faq` landed under the fixed header →
    `scroll-padding-top`; `/#faq` deep links now scroll after React renders.
  - Two `<h1>`s → one. "Get Started" sends logged-in users to their own
    dashboard. Unknown URLs redirect to `/` instead of silently rendering home.
  - **Security:** footer "Create account" led to `/register`, whose Admin tab
    posted to `POST /admin/create`, which was **open to anyone**. Server now
    guards it (`middleware/firstAdmin.middleware.js`: allowed without login
    only while no admin exists; afterwards ADMIN token required); `/register`
    is admin-only in the router; footer says accounts come from the admin.
  - Copy updated to match the product (plain attendance report, mentor view).
- **Seed rewritten** (`server/seed/seed.js`): deletes EVERY collection
  (now including MentorStudentHistory) and loads: Admin `admin@attendx.com`;
  teachers Sahil (`sahil@`) and Jatin (`jatin@`); students Nihal, Jeel,
  Ritik, Darshit (`<name>@attendx.com`, rolls CE2024001–004); password
  `123456` for all; 1 department CE, 1 class CE · A sem 5, 3 subjects
  (Sahil: Web Dev + OS, Jatin: DBMS), mentors Sahil→Nihal, Jeel and
  Jatin→Ritik, Darshit (with MentorStudentHistory rows); 9 past lectures +
  36 marks (Nihal 100 %, Jeel 100 % after an approved leave, Darshit 78 %,
  Ritik 56 % → appears under "Students below 75 %"); 1 pending leave for
  Jatin. `SEED_HISTORY=false` → accounts/classes only. Data constants are
  exported and unit-tested (`__tests__/seedAndAdminGuard.test.js`); the seed
  was also run against a real MongoDB (in-memory) and checked through the
  real login + attendance-summary controllers.
- Ops: `reseed.sh` (wipe + reseed running stack), `WIPE_DATA=1 ./start.sh`
  (drop volume + rebuild + auto-seed), README section "Delete all data and
  load this demo college" with the plain docker commands. Login page hint
  shows the new demo password. Frontend version → 3.2.0.
- Tests: server 62/62, frontend 58/58 (new `landingPage.test.jsx`), build OK,
  desktop/phone/dark screenshots of the home page verified.

### Phase 15 — Bigger demo college: two more CE classes, more teachers, ≥ 10 rows in every table
- **Why:** the user asked for "two classes with a different batch and a
  different division, extra teachers, and around at least 10 entries in every
  table/model" so that every admin screen, filter and report has real data.
- **Data moved to `server/seed/data.js`** (plain exported constants, unit
  tested); `server/seed/seed.js` only writes them. Same switches as before
  (`FORCE_SEED`, `SEED_HISTORY=false`, skip when the DB has data).
- **What it loads now:** 10 admins (`admin@` + office accounts), 10
  departments, 11 classes — **CE · A 2024** (Nihal, Jeel, Ritik, Darshit + 4),
  **CE · B 2024** (same batch, other division, mentor Meet), **CE · A 2025**
  (newer batch, semester 3) and one class per other department — 12 teachers
  (Sahil, Jatin, Meet in CE + one per department), 16 subjects, 19 teaching
  assignments (every class has a teacher, every teacher a class), 58 students
  (`<firstname>@attendx.com`, unique first names), 10 parents, 61 mentor-history
  rows (3 closed → "Former students" has data), 80 lectures (78 completed over
  3 weeks, 1 cancelled, 1 running now with a valid session token), ~470 marks,
  12 leaves (pending/approved/rejected · full/half/lecture), 10 device logins
  (3 pending for mentors, 4 active, 2 logged out, 1 rejected), 21 parent
  notifications, 14 audit entries written with `describeAudit` so the Activity
  log reads like real admin work.
- **Deterministic:** everyone outside the four named students gets attendance
  from a fixed hash (`markFor(studentIndex, lectureIndex)`) around a "usual"
  percentage (58–94 %), so every machine shows identical numbers. The named
  four keep exact, documented figures: Nihal 100 %, Jeel 100 % (one approved
  leave), Darshit 67 %, Ritik 58 % (the CE · A list grew from 9 to 12
  lectures because Meet now teaches Computer Networks there).
- **Small report fix found by the new data:** two divisions named "A" (CE · A
  2024 and CE · A 2025) were indistinguishable in Trends & analytics →
  class labels now include the batch year (`CE · A · 2024`); the summary
  controller selects `batchYear`. Unit test added.
- Docs: README "Demo logins" table + "What the demo college contains" table,
  `projectredme.md`, `PROJECT_CONTEXT.md`, `MODELS.md` credentials, `start.sh`
  hints (student logins wait for the mentor's Accept — device binding).
  Frontend version → 3.3.0.
- Verified against a real in-memory MongoDB: fresh seed, skip-when-not-empty,
  `FORCE_SEED`, `SEED_HISTORY=false`; every collection ≥ 10 rows; all 90
  passwords are `123456`; admin/teacher/student logins through the real
  controllers; attendance summary across 11 classes (overall 78 %).

### Phase 15.1 — `./reseed.sh: Permission denied`
- **Cause:** the execute bit of `reseed.sh`/`start.sh` was lost (sandbox file
  restore) and the ZIP shipped them as `rw-r--r--`. Docker-side scripts were
  never affected (`Dockerfile`s run `chmod +x`).
- **Fix:** both scripts are `755` again (also recorded in the git index with
  `git add --chmod=+x`, so it survives); the ZIP now stores `rwxr-xr-x`.
  `reseed.sh` additionally explains the three other "permission denied" /
  "not reachable" cases (Docker missing, Docker socket needs sudo/docker
  group, daemon not running) instead of a bare "container not running".
  Headers of both scripts, `start.sh` hints and README say the always-working
  alternative: `sh reseed.sh` / `sh start.sh` (no chmod needed).

### Phase 16 — Wrong admin tables, "too white" theme, Excel batch, QR screen, student camera zoom (v3.4.0)
User's list: (1) admin "Teaching assignments" and "Students" pages showed wrong/empty
data; (2) light theme still too white, no emojis — icon library only; (3) Excel sheets
must show the batch and be limited to the teacher's own classes; (4) QR screen
progress bar not full width + "Start session" hangs without location permission;
(5) student scanner needs camera zoom + text overlap on phones; (6) anything else found.

**Method.** A private Playwright + real-API harness (MongoDB + API on 127.0.0.1 only,
never a preview) screenshotted every role on desktop/phone/dark before and after.
Two real bugs were only visible against the real API, not the old mock harness.

1. **Admin tables empty — root cause: URL key collision.** The admin shell used
   `?section=<page>` to pick the page, and entity lists also accept a `section`
   filter (class id). Opening Students sent `GET /students?section=students` →
   400 `INVALID_ID` → empty table; Teaching assignments the same. Fix: shell keys
   (`NAV_KEYS`) are never read as filters, and the class filter deep-links as
   `?class=` (`FILTER_URL_KEYS` in `admin/nav.js`, used by `AdminConsole.go()`).
   New `adminNav.test.js`; `adminConsole.test.jsx` extended.
2. **Wrong numbers — root cause: Mongoose does not cast `aggregate()` pipelines.**
   String ids inside `$match: { $in: [...] }` match nothing. `finalizeLecturesBulk`
   therefore wrote `totalMarked: 0` on every ended lecture and `recountSections`
   zeroed `Section.totalStudents`. Fix: `utils/ids.js → toObjectIds()` used in every
   aggregate `$in`; new `utils/repairLectureTotals.js` runs once at API start
   (idempotent, logs only when it changes something) so existing databases heal
   themselves — it corrected 34 lectures in the test DB. Rule recorded in
   `PROJECT_CONTEXT.md`: never put raw string ids into an aggregate.
3. **Admin dashboard reads like a real college.** New "Teaching & mentor map" page
   (`admin/pages/TeachingMapPage.jsx`, replaces the old OverviewMatrix) — one row per
   class with teachers per subject and mentors; audit lines say "mentor"/"class"
   instead of `mentorId`/`sectionId` (`describeAudit` + `humaniseSummary` for older
   rows). Students table shows the full class (`CE · A · 2024`) because the student
   list now nested-populates `sectionId.departmentId`.
4. **One class-naming rule everywhere.** `server/utils/classLabel.js` and
   `frontend/src/utils/classLabel.js`: `CE · A · 2024` (department · division ·
   batch), long form adds `· Sem 5`, slug `CE-A-2024` for filenames. Used by the
   faculty dashboard, history, mentorship, live/ended session headers, student
   home, admin live pages and exports. No more bare "Sec A"/"Section A".
5. **Light theme.** `tailwind.config.js` remaps the light slate scale (canvas
   `#eef1f5`, borders `#cdd4de`, body text `#2b3447`, `white` → `#fcfcfb`), cards
   get solid 1 px borders (`.card-2026`), muted text darkened. Dark mode re-checked
   by screenshot. **Every emoji removed** from all three apps; lucide-react icons
   instead (grep-verified).
6. **Excel / CSV (faculty).** Server lists only the teacher's own
   subject × class pairs (`/api/report/faculty/history/filters → assignmentPairs`,
   label includes batch); export of a pair the teacher does not teach → 403.
   Workbook title block: subject, "Class: CE · A · 2024 · Sem 5 (Computer
   Engineering)", "Batch: 2024 · Division: A · Semester: 5", teacher, period,
   legend; filename `AttendX_CE503_CE-A-2024_<from>_<to>.xlsx` from the
   `Content-Disposition` header. `ExcelReports.jsx` rewritten as a 3-step form.
7. **Take-attendance screen.** QR countdown bar now shares the QR plate's wrapper so
   it is exactly the plate width on every size and drains smoothly. Start flow:
   permission is pre-checked (`getLocationPermission`), the GPS wait is capped at
   8 s (`getLocationFast({timeoutMs})`), "Start without location" is always one tap
   away, denied/unsupported never waits; server treats lecture location as optional
   (students then scan without the distance check and the teacher is told so).
   Status row "Location ready (±N m)". Unit tests in `geolocation.test.js`.
8. **Student scanner.** Zoom slider + 1×/2×/3×/Max presets and a torch button,
   read from `html5-qrcode`'s `getRunningTrackCameraCapabilities()` after the camera
   starts (fallback `applyVideoConstraints({advanced:[{zoom}]})`); shown only when
   the device supports them, otherwise a "move closer" hint. Student home/leave/
   header layouts fixed for 390 px (no overlapping text, buttons no longer wrap).
9. **Other fixes found on the way:** faculty/student desktop header now shows
   "page · name · id/class"; LiveSession "End Session" no longer wraps; "Back to my
   classes" uses an icon; mentor lists/leave cards/mentee detail carry
   `classLabel`; API banner prints the real bind host; `index.js` self-heal call;
   version stamp 3.4.0. No model/schema changes (MODELS.md unchanged except the
   note in §12).

Tests: server 72/72 (`classLabel.test.js` new, audit test extended), frontend 75/75
(`adminNav`, `classLabel`, `geolocation` new), `vite build` OK. Verified in the real
stack: admin Students (58 rows, class column complete), Teaching assignments (19),
Teaching & mentor map, dashboard audit wording, live/ended session headers, start
form location row, QR plate-width bar, Excel/CSV headers + filename, faculty home
"My Classes", mentorship labels, student home/leave on 390 px, dark mode.

### Phase 17 — "Still broken on Project IDX": same-origin API, no CORS (v3.5.0)
**Report.** After 3.4.0 the user (working in Project IDX / Firebase Studio) still saw
"That record could not be found" with empty *Who teaches what* / *Students* tables,
CORS errors, and the QR countdown bar not filling its card.

**Why it kept happening.** The UI called the API **cross-origin**: on IDX the page
lives at `https://5173-<ws>.cloudworkstations.dev` and `axios.js` rewrote the host
to `https://3000-<ws>…`. Every call therefore depended on (a) CORS headers,
(b) the workstation's per-port auth cookie, (c) the user having opened port 3000
first. Any of those failing surfaces as a CORS error or a 404 that the error
mapper translated into "record could not be found" — the same words as the real
`INVALID_ID` bug fixed in 3.4.0, so it looked like nothing had changed.

**Fix (structural).**
1. **Same origin, always.** `resolveApiBase()` returns `/api` unless `VITE_API_URL`
   is set. `vite.config.js` proxies `/api` → `API_PROXY_TARGET` (default
   `http://127.0.0.1:3000`) for `dev` and `preview`; `nginx.conf` proxies
   `/api/` → `server:3000` (resolver 127.0.0.11 so nginx boots before the API).
   The server mounts the whole router twice (`app.use(api)` and
   `app.use("/api", api)`), so `/api/students` and legacy `/students` both work and
   nothing had to be renamed. The request interceptor strips a leading `/api`
   when the base is `/api` so API-native routes stay `/api/report/…` (both forms
   work). Docker build arg `VITE_API_URL` is now empty on purpose.
2. **Lenient list filters** (`refFilter`/`numFilter` in `utils/listQuery.js`): a
   filter value that is not a 24-hex id (or `none`) is ignored instead of 400.
   An old frontend build that still sends `?section=students` now gets the table.
3. **IDX workspace**: `.idx/dev.nix` (Node 20, `services.mongodb` on 27017,
   onCreate install, onStart API, web preview = Vite with the proxy) and
   `dev.sh` for any no-Docker run. The API honours `AUTO_SEED=true` itself
   (`seedDatabase()` on an open connection; never wipes).
4. **Build stamp on the login page** (`AttendX v3.5.0 · built …`) and
   `GET /health → version`, so "which build is this" is answerable in one look.
5. QR countdown bar = full card width in card mode (plate width only in
   projector mode); empty-state copy "No teaching assignments match".

**Verified** with the real stack through the Vite proxy (no `VITE_API_URL`): 40
API calls, all same-origin, all 2xx; admin tables 19 / 58 rows; live QR bar
694/696 px desktop, 308/310 px phone; projector bar = plate width; `vite preview`
proxy OK; nginx config `nginx -t` OK; fresh empty DB auto-seeded by the API.
Tests: server 75/75, frontend 78/78, build OK.

### Phase 18 — Camera/GPS leak, real zoom, lecture deletion, non-dull light palette (v3.6.0)
**Report.** (a) The student scanner's zoom was "not visible / forgotten"; (b) MAJOR:
after opening the scanner and navigating elsewhere the camera light and GPS kept
running; (c) there was no way to delete a lecture started by mistake (teacher
starts two at once) — and deletion must keep every presence count correct;
(d) light mode still looked dull.

**Why (a) and (b) happened.** `html5-qrcode` owned the camera. Its `start()` is
asynchronous and cannot be cancelled: leaving the tab during start-up left the
stream open forever, and a CSS `transform: scale()` on its preview changed only
what the student saw — the decoder still read the un-zoomed frame, so zoom "did
nothing" even though the slider existed in 3.4.0.

**Fix.**
1. **In-house camera + decoder** (`components/Student/useQrCamera.js`,
   `utils/qrDecoder.js`; `html5-qrcode` removed, `jsqr` added). One
   `getUserMedia` stream, a `<video>` element and a 10 fps loop that crops the
   centre of the frame by the zoom factor and decodes it with the browser's
   native `BarcodeDetector` when present, `jsQR` otherwise. Hardware zoom
   (`track.applyConstraints({ advanced:[{zoom}] })`) is used when the camera
   offers it; otherwise the same control is a **digital zoom** (crop + CSS
   scale) up to 4× — so zoom now really makes the code easier to read. Slider,
   −/+ buttons, 1×/2×/3×/Max presets, pinch gesture, torch, camera switch.
2. **Lifecycle guarantee.** Every start is tagged with a session id; any stream
   that resolves after the session was cancelled is stopped immediately. The
   hook stops all tracks on `active=false`, unmount, `pagehide` and when the tab
   is hidden ("Camera paused" + auto-resume). `useGeoWatchGuard` (geolocation.js)
   clears every `watchPosition` and aborts the GPS pre-warm when the student
   leaves the scanner; the Dashboard aborts its pre-warm on unmount. Verified in
   a real browser: after a successful scan, after switching tabs and when the
   tab is hidden, **every** camera track is `ended` and started GPS watches =
   cleared GPS watches.
3. **Lecture deletion — one server routine, one dialog.**
   `server/utils/deleteLecture.js` → `previewLectureDeletion()` (what would go)
   and `deleteLectureCascade()` which, in order: deletes the lecture's
   `Attendance` marks → `$pull`s the lecture id from `LeaveApplication.lectureIds`
   → deletes the lecture's `NotificationLog` rows → deletes the `LectureSession`
   → writes an `AuditLog` entry (`entity: LECTURE`, counts in `changes`) →
   `invalidateAll()` server caches. Nothing else references lectures (verified
   by grep; `MODELS.md` §13). Because every percentage, rate and report in the
   system is computed from `Attendance` rows at request time (none is stored),
   deleting the rows is what keeps presence counts correct everywhere — the
   live check showed the admin attendance summary going 79→78 lectures,
   472→464 counted, 367→362 present after deleting an 8-mark lecture.
   **Policy:** admin may delete any lecture; a teacher may delete *their own*
   lecture only while it is running or while nobody is marked present — once
   presence exists, "Ask an admin to delete it" (`DELETE_NEEDS_ADMIN`).
   Routes: `GET /lecture/:id/delete-preview`, `DELETE /lecture/:id`,
   `GET /admin/lectures` (filters: status/teacher/class/subject/date/search).
   UI: admin **Happening now → Lectures** page (every lecture, Delete per row),
   **Lectures running now** rows (End + Delete), faculty **Live Session** strip
   "Started this session by mistake? Delete it instead of ending it", faculty
   **Past classes** Delete per row. All use `components/UI/DeleteLectureDialog.jsx`:
   it loads the preview, lists exactly what will happen (marks/present, leave
   applications, notifications, "students scanning will see lecture not
   found"), requires a checkbox acknowledgement, and the button says
   "Delete lecture and N marks". Faculty polling a deleted live lecture gets a
   404 and returns to the start screen; the student scanning its QR gets
   "lecture not found".
4. **Palette** (`tailwind.config.js` + `index.css`): white cards on a cool
   `#f3f5f9` canvas with real borders (`#d9e0ea`), darker text scale, and —
   the actual cause of the dullness — the pale `*-400` accent utilities that
   were designed for dark backgrounds are darkened to `*-600` in light mode by
   a CSS layer (`.on-dark` opts out, used on the camera view). Dark mode is
   unchanged.

**Verified** against the real stack in a private browser harness (127.0.0.1,
stopped afterwards): fake-camera QR decoded by the in-house pipeline →
"Marked Present!" and server roster PRESENT; zoom slider present without
hardware zoom, 3× preset applies `scale(3)`; camera tracks ended after scan /
nav-away / hidden tab; GPS watches 4 started / 4 cleared; admin Lectures page
79 rows → 78 after delete; teacher refused on a finished lecture with presence,
allowed on their own running one; cascade removed 8 marks / 1 leave link / 9
notifications; audit sentence visible on the admin dashboard. Tests: server
83/83, frontend 92/92, build OK.

### Phase 18.1 — "You forgot the zoom": zoom made unmissable + drag / pinch gestures (v3.6.1)
**Report.** The user could not find the zoom on the student scanner and asked
for a "drag and zoom" control for students far from the screen.

**What was wrong.** Zoom existed (3.6.0) but lived *under* the camera as a thin
slider, only after the camera reached `running`; the pinch used React's
`onTouchMove`, which React registers as passive, so it worked only thanks to
`touch-action: none`. A far-away code was also still hard to read when zoomed,
because the digital crop was decoded at its native pixel size (a 270 px crop
stayed 270 px — ~2 px per module).

**Fix.**
1. **Zoom lives on the camera** (`QRScanner.jsx`): a bottom bar over the
   preview with big round **−** / **+** buttons, a thick draggable slider
   (`.zoom-range`, 30 px thumb) and a white **1.0×** badge, visible the moment
   the camera opens (disabled until it runs). Presets **1× 2× 3× Max** sit
   right below with "Zoom 2.0× · digital zoom · up to 4×". A hint chip "Far
   from the screen? Drag up on the camera, pinch, or tap + to zoom in" shows
   for 7 s or until the first zoom.
2. **Gestures** (`components/Student/useZoomGestures.js`, Pointer Events):
   one-finger **drag up/down** anywhere on the preview (60 % of the preview
   height = the whole range), two-finger **pinch**, **double-tap** 1× ↔ 2×,
   mouse **wheel**, keyboard **+ − ↑ ↓ 0**. Native non-passive `wheel` /
   `touchmove` / `gesturestart` listeners stop the page from scrolling or
   pinch-zooming (iOS Safari ignores `touch-action` for page zoom). Only the
   controls row swallows the pointer, so dragging on the dark gradient still
   zooms.
3. **Zoom now helps the decoder** (`cropForZoom`): when zoomed, the centre
   crop is scaled *up* to 640 px before decoding (high-quality smoothing), so a
   code at ~2 px/module becomes ~5 px/module. Hardware zoom values are pushed
   "latest wins" (`pushHardwareZoom`) so a pinch never queues dozens of slow
   `applyConstraints` calls, continuous autofocus is requested where offered,
   and the initial 1× is no longer awaited (a slow camera can't hold the
   scanner in "Opening camera…").

**Verified** in the private browser harness with a *1080p* fake camera showing
a 110 px code (≈2.2 px/module — a projector from the back row): not decoded
at 1× after 4 s; CDP touch pinch ×1.4 → 1.4×; double-tap → 1×; one-finger drag
up → zoom climbs and the code **decodes mid-drag at ≈1.7×** → "Marked
Present!" → roster PRESENT; slider/+/− sit inside the preview box; hint shows
then disappears. Tests: frontend 99/99 (7 new gesture tests), server 83/83,
build OK. The original repository commit had no zoom code at all; nothing
from it was removed.

## Status: all requested items are implemented (Phases 1–18)
Next work is only user acceptance testing with Docker:
`docker compose up --build` (frontend rebuild picks up bundled Leaflet).

## Verification (no live server was exposed, per request)
- `cd server && npm test` · `cd frontend && npm test && npm run build`
- Phases 16–18 additionally used a private Playwright harness against the real API on
  127.0.0.1 (stopped afterwards); screenshots were inspected, not shipped.
