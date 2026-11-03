# AttendX DB Models v3.1

## Key Features
- **Asymmetric geofence**: Per-direction bounds (north/south/east/west) for real classroom layouts
- **Audit logging**: All student/faculty changes tracked with `AuditLog`
- **10s QR window**: Tight proxy-proof window with server-only verification
- **Second-level attendance**: Attendance window checked per-second, not per-minute
- **fps:20 scanning**: Balanced between speed and CPU on old devices
- **QR level M**: Medium error correction for faster decode

## Models
### User — shared base
| Field | Type | Note |
|-------|------|------|
| name | String | required, maxlength:100 |
| email | String | unique, lowercase |
| password | String | minlength:6, select:false |
| role | String | ADMIN/FACULTY/STUDENT |
| isActive | Boolean | default:true |

### LectureSession — geofence
| Field | Type | Note |
|-------|------|------|
| location.radius | Number | default:100m |
| location.bounds.north | Number | max meters north |
| location.bounds.south | Number | max meters south |
| location.bounds.east | Number | max meters east |
| location.bounds.west | Number | max meters west |

Directional bounds: if set, student must be within the per-direction limit. If not set, falls back to circular radius.

### AuditLog
| Field | Type | Note |
|-------|------|------|
| entityType | String | STUDENT/FACULTY/ASSIGNMENT + **DEPARTMENT/SUBJECT/SECTION** (Phase 11) |
| entityId | ObjectId | which record |
| entityLabel | String | **Phase 11** — human name at the time of the action (survives a permanent delete) |
| changedBy | ObjectId→User | who changed it |
| action | String | CREATE/UPDATE/DEACTIVATE/REACTIVATE/DELETE |
| summary | String | **Phase 11** — ready-made sentence for the activity feed |
| changes | Mixed | what fields changed |
| previousValues | Mixed | before values |

## QR Security Model
1. Faculty generates QR with HMAC-signed token + server-offset timestamp
2. QR rotates every 5s (screenshot invalid in ≤10s)
3. Student scans → sent directly to server (no frontend check)
4. Server verifies: HMAC signature + ts within 10s + geofence + section + duplicate
5. Total time: scan→GPS→server = ~5s, well within 10s window

## Credentials (after seed)
All passwords: `123456`
- Email is `<firstname>@attendx.com` for every person.
- admin@attendx.com + 9 office admins (principal@, registrar@, examcell@, accounts@, library@, hostel@, placement@, transport@, itsupport@)
- 12 teachers: sahil@, jatin@, meet@ (CE) and one per other department (priya@ IT, kiran@ CSE, rohan@ ME, neha@ EE, vivek@ CIVIL, pooja@ EC, amit@ AIML, sneha@ CH, rakesh@ AS)
- 58 students in 11 classes: nihal@, jeel@, ritik@, darshit@ (+ aarav@, khushi@, dhruv@, mansi@) in CE · A 2024 — mentors Sahil → Nihal, Jeel · Jatin → Ritik, Darshit; yash@… in CE · B 2024; dev@… in CE · A 2025; 4–5 per other class
- 10 Parent rows (`parent.<student>@attendx.com`; `User.role` has no PARENT value, so these users carry role STUDENT and never log in — they exist for the NotificationLog demo)
- Seed data lives in `server/seed/data.js`; `server/seed/seed.js` writes it. Every collection gets ≥ 10 rows (see README → "What the demo college contains").

## Added in Phase 9 (additive only)
### MentorStudentHistory — who mentored whom, and when
| Field | Type | Note |
|-------|------|------|
| studentId / mentorId | ObjectId → Student / Faculty | the connection |
| startsAt / endsAt | Date | endsAt = null means "current mentor" |
| endReason | enum | MENTOR_CHANGED / STUDENT_LEFT / COURSE_COMPLETED / TRANSFERRED / SUSPENDED / ADMIN_REMOVED |
| assignedBy | ObjectId → User | admin who made the assignment |

### Student — 3 new fields (nothing renamed/removed)
`lifecycleStatus` (STUDYING/COMPLETED/LEFT/TRANSFERRED/SUSPENDED, default
STUDYING), `leftAt`, `leavingNote`. Lifecycle changes never delete
Attendance, LeaveApplication or history rows.

## Phase 11 — Admin console rebuild: model ↔ UI audit and the (small) changes it needed

> Rule followed: **no model, collection, field or route was renamed or removed.**
> Every change below is additive or behavioural, and each one says *why*.

### 11.1 What the admin screens may show and edit (one row per model field)
The old admin pages were written against fields that did not all exist (a
"description" box for subjects and classes, which neither model has) and left
real fields invisible (student `phone` / `parentPhone`, faculty `phone`,
`joiningYear`, section `batchEndYear`). The new console is generated from a
single field map (`frontend/src/admin/entities.jsx`) and a frontend test
(`adminEntities.test.jsx`) fails if a form field is not a model field.

| Model | Field | Shown in table | Editable | Note |
|-------|-------|:--:|:--:|------|
| **Department** | name, code | ✅ | ✅ | code is upper-cased, unique |
| | description | ✅ (sub-line) | ✅ | the **only** model with a description |
| | isActive | ✅ | ✅ toggle | |
| | *(derived)* sections / subjects / faculty / students counts | ✅ | — | `GET /departments?withCounts=1`, computed, not stored |
| **Subject** | subjectName, subjectCode | ✅ | ✅ | |
| | departmentId, semester, credits | ✅ | ✅ | |
| | isActive | ✅ | ✅ toggle | |
| | *(derived)* teacherCount / classCount | ✅ | — | from `FacultySubjectSection` |
| **Section** ("Class" in the UI) | name, departmentId, semester | ✅ | ✅ | shown as "CSE · A" |
| | batchYear, batchEndYear | ✅ (as 2024–28) | ✅ | end year was never editable before |
| | totalStudents | ✅ | — | **kept truthful now**, see 11.3 |
| | isActive | ✅ | ✅ toggle | |
| **Faculty** (+ its User) | User.name, User.email | ✅ | ✅ | |
| | User.password | — | create only | "temporary password" |
| | employeeId | ✅ | create only | immutable identifier |
| | departmentId, designation | ✅ | ✅ | |
| | phone, joiningYear, specialization | ✅ phone / detail | ✅ | **were invisible before** |
| | isActive | ✅ | ✅ toggle | |
| **Student** (+ its User) | User.name, User.email | ✅ | ✅ | |
| | User.password | — | create only | |
| | rollNumber | ✅ | ✅ | upper-cased, unique |
| | sectionId, departmentId, semester, enrollmentYear | ✅ | ✅ | |
| | mentorId | ✅ | ✅ | changes are recorded in `MentorStudentHistory` |
| | **phone, parentPhone** | ✅ "Contact" column | ✅ | **the missing phone number** — now in table, detail and form |
| | isActive | ✅ | ✅ toggle | |
| | lifecycleStatus, leftAt, leavingNote | ✅ status pill | via "Student status" | Phase 9 fields, unchanged |
| **FacultySubjectSection** ("Who teaches what") | facultyId, subjectId, sectionId | ✅ | ✅ | |
| | academicYear, semester | ✅ | ✅ | semester **defaults from the class** (the old page hard-coded `1`) |
| | isActive | ✅ | ✅ toggle | |

Fields deliberately **not** exposed: `User.role` (fixed by the screen),
`User.avatar` (no upload flow exists), `Student.leftAt` (set by the lifecycle
action, not typed), geofence/QR fields (faculty-side).

### 11.2 AuditLog — additive change
* `entityType` enum gained `DEPARTMENT`, `SUBJECT`, `SECTION`.
  **Why:** the console shows a "Recent activity" feed and a per-record history
  tab; academic-setup records were simply not auditable before, so a deleted
  department left no trace.
* New optional `entityLabel` (≤200 chars) and `summary` (≤300 chars).
  **Why:** after a permanent delete the record is gone, so `populate()` can
  never recover its name; storing the label and a ready sentence at write
  time keeps the feed readable forever and avoids re-deriving text on every
  page load. Old rows still load (defaults `null`).
* Indexes `{entityType, entityId, createdAt}`, `{changedBy, createdAt}`,
  `{createdAt}` for the two read paths (`GET /api/audit`,
  `GET /api/audit/:entityType/:entityId`).

### 11.3 Section.totalStudents — behaviour change, no schema change
The field existed from day one but was only written by the seeder, so the
"Students" column was wrong the moment an admin added, moved or removed a
student. Now `server/utils/sectionCounts.js` recounts the affected classes on
every student create / update / lifecycle / delete, and list endpoints attach a
live `studentCount` (what the UI shows). Only active, currently-studying
students are counted. **Why not drop the field:** reports/exports already read
it; keeping it (truthful) avoids touching those paths.

### 11.4 Validators — relaxed to match data the seed itself creates
`server/validators/index.js` rejected real names: the department
"Computer Science & Engineering" (`&`), the class "A" (1 character), subject
names with digits/hyphens and "Dr. X" person names. New rules:
department/subject titles 2–200 chars incl. digits and `& - . , ( ) / : + '`;
class names 1–50 chars letters/digits/space/hyphen; person names allow
`. ' -`. Error messages say exactly what is allowed. Covered by
`server/__tests__/adminConsole.test.js`.

### 11.5 Things that were considered and **not** changed
* No `description` on Subject/Section — the UI was wrong, not the model; a
  subject already has a name + code and a class has department + name +
  semester + batch, which is all an admin needs to recognise it.
* No separate "Contact" model — `phone` / `parentPhone` already live on
  Student and Faculty; they just were not displayed.
* No soft-delete flag beyond `isActive` — permanent delete now refuses
  (HTTP 409 `IN_USE`) when dependents exist, which gives the same safety
  without a new field.

## 12 — Phase 16: no schema change; one data-repair routine
- **No model, field or name changed.** The admin table bugs were a URL key
  collision in the console and a Mongoose aggregate casting bug, not data design.
- **Why `utils/repairLectureTotals.js` exists:** `finalizeLecturesBulk` used to
  pass string ids into an `aggregate()` `$in`, which Mongoose does not cast, so
  `LectureSession.totalMarked` was saved as 0 for every ended lecture (and
  `Section.totalStudents` could be zeroed the same way). The code paths now cast
  with `toObjectIds()`, and at every API start the repair recounts PRESENT/LATE
  per COMPLETED/ACTIVE lecture and rewrites only the rows that differ. It is
  idempotent, logs only when it changes something and needs no migration step.

## 13 — Phase 18: lecture deletion (additive enum value only)
- **Change:** `AuditLog.entity` enum gains `LECTURE` (nothing renamed or removed).
  **Why:** deleting a lecture is the most consequential admin/teacher action in
  the system, so it must appear in the admin "Recent changes" list with who did
  it and what was removed. `changes` carries `{ marksRemoved, presentRemoved,
  notPresentRemoved, leaveApplicationsUpdated, notificationsRemoved, status }`.
- **No other schema change.** Deleting a lecture is a *cascade over existing
  collections*, in this order (`server/utils/deleteLecture.js`):
  1. `Attendance` — `deleteMany({ lectureSessionId })` (the only place presence
     is stored; every percentage/report is computed from these rows, so removing
     them is what keeps the counts right everywhere).
  2. `LeaveApplication` — `$pull lectureIds` (the leave itself is kept; a leave
     is a student's request, not a property of the lecture).
  3. `NotificationLog` — `deleteMany({ lectureSessionId })` (absence messages
     about a lecture that never should have existed).
  4. `LectureSession` — `deleteOne`.
  5. `AuditLog` — `LECTURE / DELETE`.
  Grep-verified: no other model references `LectureSession`.
- **Considered and not done:** a soft-delete flag on `LectureSession`. It would
  force every one of the ~20 aggregate/report queries to filter it out and the
  user explicitly wants counts to behave "as if it never happened"; the audit
  log preserves the trail instead.
