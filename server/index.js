// ✅ dotenv MUST be first - before any imports that read process.env
import dotenv from "dotenv";
dotenv.config();

// Default to development if NODE_ENV is not set
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "development";
}

import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import connectDB from "./config/db.js";
import { repairLectureTotals } from "./utils/repairLectureTotals.js";
import errorHandler from "./middleware/errorHandler.js";
import { readFileSync } from "fs";

// Version of this API build (shown by GET /health so a stale deploy is obvious)
const APP_VERSION = (() => {
  try { return JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")).version || null; }
  catch { return null; }
})();

// Routes
import adminRoutes from "./routes/auth/admin.routes.js";
import facultyRoutes from "./routes/auth/faculty.routes.js";
import studentRoutes from "./routes/auth/student.routes.js";
import departmentRoutes from "./routes/academics/department.routes.js";
import sectionRoutes from "./routes/academics/section.routes.js";
import subjectRoutes from "./routes/academics/subject.routes.js";
import mappingRoutes from "./routes/mapping/facultySubjectSection.routes.js";
import lectureRoutes from "./routes/lecture/lectureSession.routes.js";
import attendanceRoutes from "./routes/attendance/attendance.routes.js";
import reportRoutes from "./routes/report/report.routes.js";
import leaveRoutes from "./routes/leave/leave.routes.js";
import deviceRoutes from "./routes/auth/device.routes.js";
import parentRoutes from "./routes/notification/parent.routes.js";
import auditRoutes from "./routes/history/audit.routes.js";

const app = express();

// ── Security ─────────────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(compression());
app.set("trust proxy", 1);

// ── CORS - Permissive in development, strict in production ───────────
const isDev = process.env.NODE_ENV === "development";

// Always open CORS when not strict production lock (IDX + local + Docker)
const openCors =
  isDev ||
  process.env.CORS_OPEN === "true" ||
  process.env.CORS_OPEN === "1";

if (openCors) {
  // Allow ALL origins (local, Project IDX preview hosts, Docker, etc.)
  app.use(
    cors({
      origin: true,
      credentials: true,
    })
  );
  console.log("🌍 CORS: All origins allowed (open mode, IDX friendly)");
} else {
  const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:5173")
    .split(",")
    .map((o) => o.trim());

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      },
      credentials: true,
    })
  );
  console.log(`🌍 CORS: Allowed origins: ${allowedOrigins.join(", ")}`);
}

// ── Body parsers ─────────────────────────────────────────────────────
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// ── Rate limiters ────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: "Too many attempts, try again in 15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const scanLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { success: false, message: "Too many scan attempts" },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Connect DB ───────────────────────────────────────────────────────
await connectDB();
// RESEED_KEY=<new value>: wipe + reload the demo college ONCE per value - the
// way to "run reseed" on hosts without a shell (Render, Railway…). See
// utils/reseedKey.js. Same value on later boots → nothing happens.
if (String(process.env.RESEED_KEY || "").trim()) {
  try {
    const { seedDatabase } = await import("./seed/seed.js");
    const { applyReseedKey } = await import("./utils/reseedKey.js");
    const mongoose = (await import("mongoose")).default;
    await applyReseedKey({ key: process.env.RESEED_KEY, meta: mongoose.connection.db.collection("seed_meta"), seedDatabase });
  } catch (e) {
    console.warn("[reseed] skipped:", e.message);
  }
}
// AUTO_SEED=true: load the demo college when the database is EMPTY (never wipes;
// FORCE_SEED is honoured only by the seeder CLI / Docker entrypoint).
if (["true", "1", "yes"].includes(String(process.env.AUTO_SEED).toLowerCase())) {
  try {
    const { seedDatabase } = await import("./seed/seed.js");
    const r = await seedDatabase({ force: false });
    if (r.seeded) console.log("🌱 Demo college loaded (password for everyone: 123456 · admin@attendx.com)");
  } catch (e) {
    console.warn("[seed] skipped:", e.message);
  }
}
// Self-heal data written by the pre-3.4.0 totalMarked bug (see utils/repairLectureTotals.js)
repairLectureTotals().catch((e) => console.warn("[repair] skipped:", e.message));

// ── Routes ───────────────────────────────────────────────────────────
// Every route is mounted twice: at the root (legacy paths such as /students)
// and under /api (same-origin mode). The frontend talks to /api/* on its OWN
// origin and the dev server (Vite proxy) or nginx (Docker) forwards it here, so
// the browser never makes a cross-origin request - no CORS, and it works on
// Project IDX / Firebase Studio, Codespaces and Docker on a remote host alike.
// Routes that already live under /api/… keep working at both /api/report/…
// and (harmlessly) /api/api/report/….
const api = express.Router();

api.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "OK",
    version: APP_VERSION,
    timestamp: new Date().toISOString(),
  });
});

// Rate limiters (inside the router so they also cover the /api alias)
api.use("/admin/login", authLimiter);
api.use("/faculty/login", authLimiter);
api.use("/student/login", authLimiter);
api.use("/student/mark", scanLimiter);

api.use(adminRoutes);
api.use(facultyRoutes);
api.use(studentRoutes);
api.use(departmentRoutes);
api.use(sectionRoutes);
api.use(subjectRoutes);
api.use(mappingRoutes);
api.use(lectureRoutes);
api.use(attendanceRoutes);
api.use(reportRoutes);
api.use(leaveRoutes);
api.use(deviceRoutes);
api.use(parentRoutes);
api.use(auditRoutes);

app.use(api);          // legacy root paths:   /students, /api/report/…
app.use("/api", api);  // same-origin alias:   /api/students, /api/health

// ── 404 ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
  });
});

app.use(errorHandler);

// ── Start ────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "0.0.0.0";

app.listen(PORT, HOST, () => {
  console.log("");
  console.log("╔════════════════════════════════════════════════════════╗");
  console.log("║  ✅ AttendX API READY                                  ║");
  console.log("╠════════════════════════════════════════════════════════╣");
  console.log(`║  Health : http://127.0.0.1:${PORT}/health`);
  console.log(`║  Bind   : http://${HOST}:${PORT}`);
  console.log(`║  Alias  : http://127.0.0.1:${PORT}/api/health  (same-origin mode)`);
  console.log("║  UI     : http://127.0.0.1:5173                        ║");
  console.log("║                                                        ║");
  console.log("║  The UI calls /api/* on its own origin; the dev server ║");
  console.log("║  or nginx forwards it here, no CORS set-up needed.    ║");
  console.log("║  Project IDX / Firebase Studio: open ONLY port 5173.   ║");
  console.log("╚════════════════════════════════════════════════════════╝");
  console.log("");
});
