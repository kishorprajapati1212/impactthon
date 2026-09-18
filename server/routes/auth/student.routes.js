import express from "express";
import {
  createStudent,
  studentLogin,
  studentLogout,
  studentApprovalStatus,
  getAllStudents,
  updateStudent,
  deleteStudent,
  permanentlyDeleteStudent,
} from "../../controllers/auth/student.controller.js";
import protect from "../../middleware/auth.middleware.js";
import authorizeRoles from "../../middleware/role.middleware.js";
import getProfileId from "../../middleware/identity.middleware.js";
const r = express.Router();
r.post("/student/create", protect, authorizeRoles("ADMIN"), createStudent);
r.post("/student/login", studentLogin);
r.post("/student/logout", protect, authorizeRoles("STUDENT"), studentLogout);
r.post("/student/approval/status", studentApprovalStatus);
r.get("/students", protect, authorizeRoles("ADMIN", "FACULTY"), getAllStudents);
r.put("/student/:id", protect, authorizeRoles("ADMIN"), updateStudent);
r.delete("/student/:id", protect, authorizeRoles("ADMIN"), deleteStudent);
r.delete("/student/:id/permanent", protect, authorizeRoles("ADMIN"), permanentlyDeleteStudent);
export default r;
