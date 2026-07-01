# AttendX — QR Attendance System

## Quick Start

### Server
```bash
cd server
cp .env.example .env      # fill in MONGODB_URI + JWT_SECRET
npm install
npm run dev               # http://localhost:3000
```

### Frontend
```bash
cd frontend
cp .env.example .env      # VITE_API_URL=http://localhost:3000
npm install
npm run dev               # http://localhost:5173
```

## QR Security Model
- Server issues a stable HMAC-SHA256 **sessionToken** when faculty starts a lecture.
- Faculty frontend rebuilds the QR **every 5 seconds** by embedding `{ token, lectureSessionId, ts: Date.now() }`.
- Student scanner checks `Date.now() - ts ≤ 10 000 ms` locally (proxy-proof: screenshot is dead in ≤10 s).
- Server re-checks the HMAC signature + same ±10 s window + geofence (100 m default).

## Roles
| Role    | Login URL      | Can do |
|---------|---------------|--------|
| Admin   | /admin/login  | Create users, departments, sections, subjects, assign faculty |
| Faculty | /faculty/login| Start/end sessions, view attendance, session history + map |
| Student | /student/login| Scan QR, view own attendance per subject |
