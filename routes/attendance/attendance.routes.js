// routes/attendance/attendance.routes.js
import express from "express";
import { markAttendance, getLectureAttendanceStatus } from "../../controllers/attendance/attendance.controller.js";
import protect from "../../middleware/auth.middleware.js";
import authorizeRoles from "../../middleware/role.middleware.js";
import getProfileId from "../../middleware/identity.middleware.js";

const router = express.Router();

router.post("/student/mark", protect, getProfileId,authorizeRoles("STUDENT") ,markAttendance );
router.get("/lecture/:lectureSessionId", protect, authorizeRoles("FACULTY", "ADMIN"), getLectureAttendanceStatus );

export default router;
