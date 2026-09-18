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

## Docs
- `WHAT_CHANGED.md` — this release explanation  
- `CREDENTIALS.md` — demo logins (`pass123`)  
- `BUGFIXES.md` — bug history  

## Demo logins
All passwords: **pass123**  
`admin@attendx.com` · `rajesh.k@attendx.com` · `cse2024001@attendx.com`
