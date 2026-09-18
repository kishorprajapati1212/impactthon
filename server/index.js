// ✅ dotenv MUST be first — before any imports that read process.env
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
import errorHandler from "./middleware/errorHandler.js";

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

// ── CORS — Permissive in development, strict in production ───────────
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
  console.log("🌍 CORS: All origins allowed (open mode — IDX friendly)");
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

// ── Health check ─────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "OK",
    timestamp: new Date().toISOString(),
  });
});

// ── Apply rate limiters ──────────────────────────────────────────────
app.use("/admin/login", authLimiter);
app.use("/faculty/login", authLimiter);
app.use("/student/login", authLimiter);
app.use("/student/mark", scanLimiter);

// ── Routes ───────────────────────────────────────────────────────────
app.use(adminRoutes);
app.use(facultyRoutes);
app.use(studentRoutes);
app.use(departmentRoutes);
app.use(sectionRoutes);
app.use(subjectRoutes);
app.use(mappingRoutes);
app.use(lectureRoutes);
app.use(attendanceRoutes);
app.use(reportRoutes);
app.use(leaveRoutes);
app.use(deviceRoutes);
app.use(parentRoutes);
app.use(auditRoutes);

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
  console.log(`║  Bind   : http://0.0.0.0:${PORT}`);
  console.log("║  UI     : http://127.0.0.1:5173");
  console.log("║                                                        ║");
  console.log("║  Project IDX → open Ports panel:                       ║");
  console.log("║    • 5173 = Frontend (Ctrl+click full https URL)       ║");
  console.log("║    • 3000 = API        (Ctrl+click full https URL)     ║");
  console.log("╚════════════════════════════════════════════════════════╝");
  console.log("");
});
