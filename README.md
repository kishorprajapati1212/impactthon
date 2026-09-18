# AttendX — QR Attendance System

```
attendx/
├── frontend/     # React UI  → port 5173
├── server/       # Express   → port 3000
├── docker-compose.yml
├── start.sh      # recommended start
└── README.md
```

## Start (Docker) — use this

```bash
cd attendx
chmod +x start.sh
./start.sh
```

Or:

```bash
docker compose up --build
```

### What you should see

Mongo logs are **hidden**. You should see banners like:

```text
AttendX API — starting container
OPEN THESE IN BROWSER ...
AttendX FRONTEND (Nginx) is up
Local UI : http://127.0.0.1:5173
```

If you **only** see mongo JSON — you have an old compose file. Use this package.

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

Password for all: **`pass123`**

| Role | Email |
|------|--------|
| Admin | admin@attendx.com |
| Faculty | rajesh.k@attendx.com |
| Student | cse2024001@attendx.com |

Re-seed:

```bash
docker compose --profile seed run --rm seeder
```

## Manual (no Docker)

```bash
# terminal 1
cd server && cp -n .env.example .env && npm i && npm run seed && npm run dev

# terminal 2
cd frontend && cp -n .env.example .env && npm i && npm run dev
```

## Docs

- [IDX_URLS.md](./IDX_URLS.md) — Ctrl+click ports on Project IDX  
- [DOCKER_LOGS_EXPLAINED.md](./DOCKER_LOGS_EXPLAINED.md) — mongo INFO is not an error  
- [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md) — architecture  

## Netlify

`frontend/public/_redirects` fixes refresh 404 on SPA routes.
