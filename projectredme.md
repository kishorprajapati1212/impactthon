# AttendX - QR Attendance System

AttendX is a college attendance system where **faculty show a rotating QR code
(every 5 seconds)** and **students scan it with their phone**. The server checks
the QR signature, its age, the student's section, and the student's **GPS
location against the classroom geofence** before marking them present.

## What it does
- **Faculty**: start a live session (QR + classroom geofence when location is
  allowed - the start never waits more than 8 s for GPS and can run without it),
  watch students appear live, manually mark late students, end the session -
  everyone not marked is automatically saved **ABSENT**. After ending, faculty
  see the present list and a map of where each present student scanned. They
  download Excel/CSV registers **only for the subject × class pairs they teach**;
  the sheet header and filename carry the batch (`CE · A · 2024`).
- **Students**: log in, see their attendance % per subject, their class /
  mentor / subject teachers, apply for leave, and scan the QR to mark
  attendance (camera + location permission is explained step-by-step first).
  The scanner is our own (no third-party camera library): real zoom - hardware
  when the phone has it, otherwise a digital crop that is up-scaled before
  decoding so a far-away code becomes readable - with big − / + buttons and a
  slider on the camera, 1× 2× 3× Max presets, drag-up / pinch / double-tap
  gestures, torch and camera switch; the camera and GPS are released the
  moment the student leaves the scan screen, switches tabs or locks the phone.
- **Mentors (faculty)**: approve/reject mentee leave and device logins, and open
  any mentee to see their full profile - attendance %, subject-wise breakdown,
  recent lectures and leave history.
- **Admin**: manage departments, subjects, sections, faculty-subject-section
  assignments, students/faculty, live lectures and the attendance report.
- **Parents**: notified on attendance events (existing notification flow).

## How attendance is verified
1. Faculty starts a lecture → server creates a `LectureSession`, with classroom
   GPS + directional geofence bounds when a location was supplied (defaults in
   `server/config/geofence.js`); without a location students scan from anywhere.
2. The faculty screen renders a QR that **rotates every 5 seconds** (HMAC-signed
   session token + timestamp).
3. Student scans → phone sends QR + GPS to `POST /student/mark`.
4. Server verifies: signature, QR age (25s, so last-second scans still pass),
   attendance window (+30s grace), section match, duplicate mark, geofence.
5. On session end, unmarked roster students are written as ABSENT.

## Tech stack
React + Vite + Tailwind (frontend, Nginx) · Express + MongoDB/Mongoose +
Redis (backend) · Docker Compose (`mongo`, `redis`, `server`, `frontend`).

## How the UI reaches the API (why there is no CORS)
The page calls `/api/…` on **its own origin**. `npm run dev` / `vite preview`
proxy that to the API (`API_PROXY_TARGET`, default `127.0.0.1:3000`); in Docker
nginx proxies it to the `server` container. The API answers every route both at
the root and under `/api`. Open only the UI URL - on Project IDX / Firebase
Studio that is the web preview; `.idx/dev.nix` starts MongoDB and the API.

## Run (Docker - the supported way)
```bash
./start.sh            # or: docker compose up --build
```
- UI: http://127.0.0.1:5173 · API health: http://127.0.0.1:3000/health
- Demo logins (password `123456` for all, email = `<firstname>@attendx.com`):
  admin `admin@attendx.com` (+ 9 office accounts such as `principal@`);
  teachers `sahil@`, `jatin@`, `meet@` (CE) and one per other department;
  students `nihal@`, `jeel@`, `ritik@`, `darshit@` (CE · A 2024), `yash@` …
  (CE · B 2024), `dev@` … (CE · A 2025) and 4-5 per other class. The full
  demo college - 10 departments, 11 classes, 12 teachers, 58 students, 80
  lectures, and at least ten rows in every table - is listed in README →
  "Demo logins". Reset the data any time with `./reseed.sh`
  (or `WIPE_DATA=1 ./start.sh`).

Out of disk space during the build (`ENOSPC`)? `./clean.sh` removes Docker
build cache and dangling images (`DEEP=1 ./clean.sh` removes everything
unused, including the database volume), then `./start.sh` again.

## Errors users see
All errors are short, human sentences with a stable `code` (e.g. `QR_EXPIRED`,
`GEOFENCE`). Raw database/library errors and stack traces are never sent to
the client - see `server/middleware/errorHandler.js` and
`frontend/src/utils/friendlyError.js`. On-screen messages use AttendX's own
notification system (`frontend/src/utils/notify.js` +
`NotificationCenter.jsx`) - no toast library - which sanitises, shortens and
de-duplicates every message before it is shown.

## People & connections (how to navigate)
- **Admin** works in this order: *Set up your college* (Departments →
  Subjects → Classes → Who teaches what) → *People* (Students & mentors,
  Faculty) → *Happening now* and reports. Every student shows their class
  and mentor; every subject shows who teaches it to which class.
- **Faculty → My mentees** shows the students they guide now, their leave /
  login requests, and **Former students** - students who completed, moved
  or left stay fully viewable (attendance, subjects, leaves, and the
  "who guided this student" mentor-history timeline). Admins mark a
  student Completed/Left/Transferred from Students & mentors → student
  status; nothing is ever deleted by that action.

## Admin console
`/admin` is a white / off-white sidebar + table console (light theme by default; the header toggle switches to dark) built around how a college office
actually works:
- **Academic setup** - Departments, Subjects, Classes, Who teaches what.
- **People** - Faculty, Students (class, mentor, student *and* parent phone,
  status). Search by name / roll / email / phone, filter by department,
  class, semester, mentor; sort; paginate.
- **Happening now** - Lectures running now (end a stuck one, or delete one
  started by mistake), **Lectures** (every session with teacher, class, status
  and present / class size; delete from here), Login approvals (approve a
  student's new device when the mentor is away).
- **Dashboard** - a plain to-do list for the admin: missing setup steps and
  problems that block attendance (no teacher, no class, no mentor, logins
  waiting), each as one sentence with one button; what is running right now;
  attendance in the last 30 days in one line.
- **Reports** - *Attendance report* (overall %, week by week, then classes /
  students below 75 % / subjects / teachers, lowest first; the rule
  "75 %+ good · 60-74 watch · below 60 low, leave not counted" is printed on
  the page) and *Teaching & mentor map* (who teaches what, who mentors whom).
Every row has full-size **Edit** and **Delete** buttons plus "⋯" for View
details, Student status (completed / left / transferred - keeps history)
and Deactivate / Reactivate. Clicking a row opens a detail drawer with
related records, attendance and change history. Permanent delete is refused
with a plain sentence when the record still has students, lectures or
attendance. Every admin change is logged (who, what, when).
Field-by-field model ↔ screen map: `MODELS.md` §11.

**Deleting a lecture** (teacher started two at once, wrong class): admins can
delete any lecture; a teacher can delete their *own* lecture while it is
running or while nobody is marked present (from the live screen or *Past
classes*). The dialog first shows what will be removed - attendance marks
(present / absent), leave-application links, parent notification records -
and needs an explicit tick. The marks are removed with the lecture, so every
percentage, report and history updates at once; the deletion is written to
the audit log. Details: `MODELS.md` §13.

## Search Console tag (do not remove)
`frontend/index.html` contains the owner's Google Search Console verification
meta tag (`google-site-verification`). It must stay exactly as it is; a test
(`seoFiles.test.js`) fails if it is missing. Details in README, section
"Google Search Console".

## Home page
`/` is a public landing page (`src/pages/Home/LandingPage.jsx`, sections in
`src/components/Landing/`, all copy in `src/content/landing.js`). It uses the
same theme tokens as the dashboards, has in-page navigation (Features · How it
works · Proxy check · Roles · FAQ), a live rotating-QR demo, the proxy-trick
comparison table and the FAQ that is mirrored in the FAQPage JSON-LD of
`index.html`. The logo in every dashboard links back to it. The page root
must never get `overflow-hidden` (it would become a scroll container and
break anchor links - see `landingPage.test.jsx`).

## If you still see an old screen
Run `FRESH=1 ./start.sh` (rebuilds the Docker images without cache) and
hard-refresh the browser. The sidebar footer shows `Console v3.7.2 · built …`
and `/version.json` returns the running build.

## Docs
- `brand/BRAND.md` - logo, colours and the generated icon/OG assets (`frontend/scripts/brand-assets.py`)
- `SEO_KEYWORDS.md` - keyword plan, where each keyword sits on the landing page, Search Console routine
- `context.md` - current priorities, phase log, what to do next (**read first**)
- `MODELS.md` - database models · `GEOFENCE.md` - geofence configuration
