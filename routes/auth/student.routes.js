import express from "express";
import { createStudent, studentLogin } from "../../controllers/auth/student.controller.js";
import protect from "../../middleware/auth.middleware.js";
import authorizeRoles from "../../middleware/role.middleware.js";

const router = express.Router();

// Admin creates student
router.post("/student/create", protect, authorizeRoles("ADMIN"), createStudent);
router.post("/student/login", studentLogin);




export default router;
