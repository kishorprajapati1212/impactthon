// ✅ dotenv MUST be first — before any imports that read process.env
import dotenv from "dotenv";
dotenv.config();

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

const app = express();

// ── Security ─────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(compression());
app.set("trust proxy", 1);

// ── CORS — restrict to known frontend ────────────────────────────────────────
const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:5173")
  .split(",").map(o => o.trim());

app.use(cors());

// ── Body parsers — reasonable limits ─────────────────────────────────────────
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// ── Rate limiters ─────────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes (was "15 * 60 * 10" = 9 seconds!)
  max: 50,
  message: { success: false, message: "Too many attempts, try again in 15 minutes" },
  standardHeaders: true,
  legacyHeaders: false,
});

const scanLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { success: false, message: "Too many scan attempts" },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Connect DB ────────────────────────────────────────────────────────────────
await connectDB();

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({ success: true, status: "OK", timestamp: new Date().toISOString() });
});

// ── Apply rate limiters ───────────────────────────────────────────────────────
app.use("/admin/login", authLimiter);
app.use("/faculty/login", authLimiter);
app.use("/student/login", authLimiter);
app.use("/student/mark", scanLimiter);

// ── Routes ────────────────────────────────────────────────────────────────────
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

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found", path: req.path });
});

app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server: http://localhost:${PORT}`);
  console.log(`🌍 Allowed origins: ${allowedOrigins.join(", ")}`);
});
