import express from "express";
import { createStudent, studentLogin, getAllStudents } from "../../controllers/auth/student.controller.js";
import protect from "../../middleware/auth.middleware.js";
import authorizeRoles from "../../middleware/role.middleware.js";
const r = express.Router();
r.post("/student/create", protect, authorizeRoles("ADMIN"), createStudent);
r.post("/student/login", studentLogin);
r.get("/students", protect, authorizeRoles("ADMIN","FACULTY"), getAllStudents);
export default r;
