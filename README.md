# AttendX — QR Attendance System

```
attendx/
├── frontend/     # React UI  → port 5173  (calls the API on its OWN origin: /api/…)
├── server/       # Express   → port 3000  (every route also served under /api)
├── .idx/dev.nix  # Project IDX / Firebase Studio workspace (Node + MongoDB + preview)
├── docker-compose.yml
├── start.sh      # Docker start (recommended on a laptop/server)
├── dev.sh        # no-Docker start (IDX, Codespaces, laptop with local MongoDB)
└── README.md
```

> **No CORS, ever.** The browser only talks to the page's own origin under
> `/api/…`. In development Vite proxies that to the API, in Docker nginx does.
> That is why it works unchanged on localhost, Docker on a remote machine,
> Project IDX / Firebase Studio and GitHub Codespaces — you open **one** URL
> (the 5173 one) and never need port 3000 in the browser.

## Project IDX / Firebase Studio (cloud IDE)

1. Upload/unzip this folder into the workspace (it must contain `.idx/dev.nix`).
2. Run **Firebase Studio: Rebuild environment** (Command palette). The config
   installs Node 20, starts **MongoDB on 27017**, installs both apps, seeds the
   demo college when the DB is empty and starts the API in the background.
3. Open the **Web preview** (it is the frontend, Vite). Log in with
   `admin@attendx.com` / `123456`. Do **not** open port 3000 — the preview
   reaches the API through `/api/…` on its own origin.
4. Without rebuilding (or in any other cloud IDE / laptop with a MongoDB):
   ```bash
   ./dev.sh                  # or: sh dev.sh   — API :3000 + UI :5173 in one terminal
   FORCE_SEED=true ./dev.sh  # wipe + reload the demo college first
   ```
   `dev.sh` creates `server/.env` from the example, installs dependencies,
   checks MongoDB, seeds if empty and runs both apps.

How to confirm you are on this build: the **login page** footer says
`AttendX v3.6.4 · built <date>`, the admin sidebar says `Console v3.6.4`, and
`<your-url>/api/health` returns `"version":"3.6.4"`.

## Start (Docker) — use this on a laptop/server

```bash
cd attendx
chmod +x start.sh
./start.sh
```

Or:

```bash
docker compose up --build
```

### Still seeing the OLD admin screen (dark page, "Create Department" tiles)?
That is a **previous Docker image or an old folder**, not this package. Do this, in order:

```bash
# 1. make sure you are inside the folder you just unzipped
cd attendx            # (the folder that contains this README)
# 2. full rebuild without Docker cache + start
FRESH=1 ./start.sh    # or:  docker compose build --no-cache && docker compose up --force-recreate
# 3. hard-refresh the browser:  Ctrl+Shift+R  (Cmd+Shift+R on Mac)
```

How to confirm you are on the new build: the admin page has a **white sidebar**
with *Dashboard · Departments · Subjects · Classes · Who teaches what · Faculty
· Students · Lectures running now · Login approvals*, and the bottom of the
sidebar says **Console v3.6.4 · built <date>**. `http://127.0.0.1:5173/version.json`
shows the same version, and so does the login page footer.

### What you should see

Mongo logs are **hidden**. You should see banners like:

```text
AttendX API — starting container
OPEN THESE IN BROWSER ...
AttendX FRONTEND (Nginx) is up
Local UI : http://127.0.0.1:5173
```

If you **only** see mongo JSON — you have an old compose file. Use this package.

### What's new in 3.6.4
- **Keyword-optimised landing page**: title, meta description, hero, section
  headings, intro and an 8-question FAQ written around "QR code attendance
  system for colleges", "student attendance management system", "GPS /
  geofence attendance" and "proxy attendance"; Organization + WebSite
  structured data; login page title. The full keyword plan and the Search
  Console routine are in `SEO_KEYWORDS.md`.

### What's new in 3.6.3
- **SEO files generated at build**: real `sitemap.xml` and `robots.txt`
  (fixes Search Console "Sitemap is HTML"), absolute canonical / Open Graph
  URLs from `SITE_URL`, a social preview image, `noindex` on dashboards. See
  "SEO & Google Search Console".

### What's new in 3.6.2
- **Reseed on Render / any PaaS** with the `RESEED_KEY` environment variable
  (wipe + reload once per new value; same value = no change). See
  "Reseed on Render" below.

### What's new in 3.6.1
- **Zoom you cannot miss** on the student scanner: big − / + buttons and a
  thick slider on the camera itself, 1× 2× 3× Max presets, plus phone-camera
  gestures — **drag up/down on the preview**, **pinch**, **double-tap**
  (1× ↔ 2×), mouse wheel and keyboard. Zoomed frames are up-scaled before
  decoding, so a far-away code on a projector actually becomes readable.

### What's new in 3.6.0
- **Delete a lecture** started by mistake: admin → *Happening now → Lectures*
  (or the running-now list); teachers from the live screen / *Past classes*
  while it is running or has nobody present. The dialog shows exactly what will
  be removed; attendance marks go with it, so every percentage and report
  updates immediately. Written to the audit log.
- **Student scanner rebuilt** (no third-party camera library): real zoom
  (hardware when available, digital crop otherwise — the decoder reads the
  zoomed frame), pinch, torch, camera switch; the camera and GPS are **always
  released** when you leave the scan screen, switch tabs or lock the phone.
- Crisper light theme: white cards on a cool canvas, readable accents.

### What's new in 3.5.0
- **Same-origin API** (`/api/…` + Vite/nginx proxy): no CORS configuration, no
  second port to open — fixes the Project IDX "CORS problem" for good.
- `.idx/dev.nix` + `dev.sh` for cloud IDEs and no-Docker runs; the API seeds
  the demo college itself when `AUTO_SEED=true` and the database is empty.
- Admin list filters are lenient: a stale/foreign value (e.g. an old build's
  `?section=students`) is ignored instead of blanking the whole table.
- QR countdown bar spans the full card on every screen; login page build stamp.

### What's new in 3.4.0
- Admin **Students** and **Teaching assignments** tables load correctly (URL filter
  collision fixed) and lecture totals self-heal at API start.
- New admin page **Teaching & mentor map** (who teaches / mentors every class).
- Off-white light theme with visible borders; no emojis — icons only.
- Teacher Excel/CSV: only your own classes, batch in the header and filename.
- Take-attendance screen: full-width QR timer, start never hangs on GPS.
- Student scanner: camera zoom (slider + presets) and torch where supported.

### URLs

| Where | Frontend | API health |
|-------|----------|------------|
| **Local PC** | http://127.0.0.1:5173 | http://127.0.0.1:3000/health |
| **Project IDX** | Ports panel → **5173** | Ports panel → **3000** → add `/health` |

IDX full links look like:

- `https://5173-<workspace>.cloudworkstations.dev`
- `https://3000-<workspace>.cloudworkstations.dev/health`

**There is no port list inside Mongo logs.** Ports appear when **server** and **frontend** containers are running.

Check:

```bash
docker compose ps
curl http://127.0.0.1:3000/health
```

### Demo logins (auto-seeded)

Password for **everyone**: **`123456`**. Every person's email is
`<firstname>@attendx.com`.

| Role | Email | Who |
|------|-------|-----|
| Admin | admin@attendx.com | Main admin (plus 9 office accounts: `principal@`, `registrar@`, `examcell@`, `accounts@`, `library@`, `hostel@`, `placement@`, `transport@`, `itsupport@attendx.com`) |
| Teacher | sahil@attendx.com | Sahil (CE) — Web Development + Operating Systems in CE · A and CE · B; mentors Nihal, Jeel, Aarav, Khushi (+ 4 in CE · A 2025) |
| Teacher | jatin@attendx.com | Jatin (CE) — Database Management Systems in CE · A and CE · B, OOP in CE · A 2025; mentors Ritik, Darshit, Dhruv, Mansi |
| Teacher | meet@attendx.com | Meet (CE) — Computer Networks (CE · A, CE · B), Data Structures (CE · A 2025); mentors all of CE · B |
| Teacher | priya@ · kiran@ · rohan@ · neha@ · vivek@ · pooja@ · amit@ · sneha@ · rakesh@attendx.com | One teacher per other department (IT, CSE, ME, EE, CIVIL, EC, AIML, CH, Applied Sciences) |
| Student | nihal@attendx.com | Nihal (CE2024001, CE · A 2024, mentor Sahil) — 100 % |
| Student | jeel@attendx.com | Jeel (CE2024002, CE · A 2024, mentor Sahil) — 100 % after one approved leave |
| Student | ritik@attendx.com | Ritik (CE2024003, CE · A 2024, mentor Jatin) — 58 %, listed under "below 75 %" |
| Student | darshit@attendx.com | Darshit (CE2024004, CE · A 2024, mentor Jatin) — 67 %, one pending leave |
| Student | yash@ … shreya@attendx.com | CE · B 2024 (same batch, other division), e.g. `yash@`, `riya@`, `harsh@` |
| Student | dev@ … hetvi@attendx.com | CE · A 2025 (newer batch, semester 3), e.g. `dev@`, `isha@`, `kavya@` |
| Student | ankit@attendx.com, faizan@attendx.com, … | 4–5 students in every other class (`node seed/seed.js` prints the full list) |

A student's first login is **held until the mentor (or any admin) taps
Accept** on the "Login approvals" screen — that is the device-binding feature,
not a bug. Open the mentor's account in a second tab to approve it.

**What the demo college contains** (every table has at least ten rows):

| Table | Rows | Notes |
|-------|-----:|-------|
| Admins | 10 | `admin@` + office accounts |
| Departments | 10 | CE, IT, CSE, ME, EE, CIVIL, EC, AIML, CH, AS |
| Classes | 11 | **CE · A 2024** (sem 5), **CE · B 2024** (sem 5, other division), **CE · A 2025** (sem 3, newer batch) + one class per other department |
| Teachers | 12 | three in CE, one per other department |
| Students | 58 | 8 in each CE class, 4–5 elsewhere; rolls like `CE2024001`, `CE2024101` (B), `CE2025001` |
| Subjects | 16 | 6 CE + 10 others, each with a teacher |
| Teaching assignments | 19 | every class has a teacher, every teacher has a class |
| Parents | 10 | the CE · A students + two from CE · B (phone alerts) |
| Mentor history | 61 | one open row per student + 3 closed rows (Ritik, Yash, Ankit changed mentor → visible under "Former students") |
| Lectures | 80 | 78 completed over the last 3 weeks, 1 cancelled, **1 running right now** (Meet · Computer Networks · CE · B) |
| Attendance marks | ~470 | present / late / absent / leave |
| Leave applications | 12 | 4 pending, 6 approved, 2 rejected (full day, half day, single lecture) |
| Device logins | 10 | 3 pending approval (Ritik → Jatin, Riya → Meet, Ankit → Priya), 4 active, 2 logged out, 1 rejected |
| Parent notifications | 21 | present / absent SMS log + one low-attendance warning |
| Audit entries | 14 | what the admin office created/changed while setting the college up |

Attendance for everyone except the four named students is generated by a
fixed formula (each student has a "usual" percentage between 58 % and 94 %),
so the numbers are identical on every machine and every reseed.

### Reseed on Render (no Docker, no shell needed)
Render has no `docker compose`, and the free instance type has no Shell tab,
so the API reseeds itself from an environment variable:

1. Render dashboard → your **API** web service → **Environment**.
2. Add `RESEED_KEY` = any **new** value, e.g. `2026-11-03a` → **Save changes**
   (Render redeploys automatically; otherwise *Manual Deploy → Deploy latest*).
3. Watch **Logs** for `RESEED_KEY "2026-11-03a" applied — database wiped and
   the demo college reloaded`. Log in with `admin@attendx.com` / `123456`.

The value is remembered in the database (`seed_meta`), so later restarts and
deploys with the **same** value change nothing. To reseed again, change the
value (`…03b`). Remove the variable when you are done. Keep `AUTO_SEED=true`
as well — it only fills an *empty* database and never wipes.

Paid instance with a Shell tab? `FORCE_SEED=true node seed/seed.js`
(working directory is the `server` folder, `/app` in the Docker image) does
the same thing immediately.

### Delete all data and load this demo college

The database lives in the Docker volume `attendx_mongo_data`, so it survives
restarts. Pick one:

```bash
# A) containers are running → wipe + reseed in place (10 seconds)
./reseed.sh
#    same thing without the script:
docker compose exec -e FORCE_SEED=true server node seed/seed.js

# B) start from zero: delete the volume, rebuild, start (seed runs automatically)
WIPE_DATA=1 ./start.sh
#    same thing without the script:
docker compose down -v
docker compose up --build

# C) accounts and classes only — no past lectures / leaves
SEED_HISTORY=false ./reseed.sh
```

**`./reseed.sh: Permission denied`?** The execute bit was lost when the
folder was unzipped/copied. Either run the script through the shell — no
chmod needed:

```bash
sh reseed.sh                 # same for:  sh start.sh
```

…or make both scripts executable once:

```bash
chmod +x start.sh reseed.sh
```

If the message is *"permission denied while trying to connect to the Docker
daemon socket"* instead, it is Docker itself that needs rights on this
machine: `sudo sh reseed.sh`, or add your user to the docker group once
(`sudo usermod -aG docker $USER`, then log out and back in).

Windows PowerShell / CMD: the `docker compose …` lines above work as-is
(`FORCE_SEED` is passed with `-e`, no shell export needed).

After a reseed, **log out and log in again** — a browser session from before
the wipe belongs to an account that no longer exists.

## Manual (no Docker)

```bash
./dev.sh          # does everything below in one terminal
```
or by hand:
```bash
# terminal 1
cd server && cp -n .env.example .env && npm i && npm run seed && npm run dev

# terminal 2  (no .env needed — the UI calls /api on its own origin)
cd frontend && npm i && npm run dev
```
API on another port? `API_PROXY_TARGET=http://127.0.0.1:4000 npm run dev`.
API on another **domain** (UI on Netlify, API on Render)? Build the UI with
`VITE_API_URL=https://your-api` and allow that origin on the API
(`FRONTEND_URL=…` or `CORS_OPEN=true`). That is the only case where CORS exists.

## Docs

- [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md) — architecture & product rules  
- [projectredme.md](./projectredme.md) — what the product does, how to navigate  
- [MODELS.md](./MODELS.md) — data model and every change made to it (with why)  
- [context.md](./context.md) — engineering log of every phase  

## Netlify

`frontend/public/_redirects` fixes refresh 404 on SPA routes. Build command
`npm run build`, publish directory `dist` (see `frontend/netlify.toml`).
Use the `/api/*` proxy rule in `netlify.toml` (same origin, no CORS) or set
`VITE_API_URL` to your API host.

## SEO & Google Search Console

**"Sitemap is HTML" / "Sitemap could not be read".** A single-page app answers
*every* path with `index.html` — so `/home` (which is not a page of this app)
and a missing `/sitemap.xml` both returned the landing page, and Google
rejected it. Since 3.6.3 `npm run build` generates real files into `dist/`:

| URL | What it is |
|---|---|
| `/sitemap.xml` | XML sitemap with **absolute** URLs of the public pages (`/`, `/login`) |
| `/robots.txt` | allows the public site, disallows `/admin`, `/faculty`, `/student`, `/register`, `/api/`, links the sitemap |
| `/og-image.png` | 1200×630 social preview used by Open Graph / Twitter tags |

The domain comes from `SITE_URL` (Netlify → Site configuration → Environment
variables), else Netlify's own `URL`, else `https://attendex12345.netlify.app`.
The canonical, `og:url`, `og:image` and structured-data URLs in `index.html`
use the same value. Pages behind a login also set `robots: noindex` while open.

**Steps in Search Console after deploying 3.6.3**
1. Open `https://<your-site>/sitemap.xml` in the browser — you must see XML.
2. Sitemaps → delete the `/home` entry → add `sitemap.xml` → Submit.
   Status should become *Success*, Discovered pages 2.
3. URL Inspection → `https://<your-site>/` → **Request indexing**.
4. Settings → Crawl stats / Pages: within days the home page appears for the
   query `AttendX` (brand); generic queries ("QR attendance system") need
   content, time and links — see below.

**What actually moves ranking** (beyond the files above): a custom domain
(`attendx.yourcollege.edu` beats `attendex12345.netlify.app`), the landing
page text (already keyword-rich, keep it updated), fast loading (static Netlify
+ cached assets), links from the college website / social pages / GitHub
README to the site, and a Google Business / LinkedIn page that links back.
Dashboards are intentionally not indexed — only the landing page and login
should rank. Keyword plan, where each keyword sits on the page and the weekly
Search Console routine: **`SEO_KEYWORDS.md`**.

