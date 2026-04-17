import express from "express";
import { createStudent, getAllStudents, studentLogin, getMyStudent, updateStudent, deleteStudent, getStudentById } from "../../controllers/auth/student.controller.js";
import protect from "../../middleware/auth.middleware.js";
import authorizeRoles from "../../middleware/role.middleware.js";

const router = express.Router();

// Admin creates student
router.post("/student/create", protect, authorizeRoles("ADMIN"), createStudent);
router.post("/student/login", studentLogin);
router.get("/students", protect, authorizeRoles("ADMIN","FACULTY"), getAllStudents);  
// different user get by id 
router.get("/student/:id", protect, authorizeRoles("ADMIN", "FACULTY"), getStudentById);
// get my own detailed
router.get("/student/me", protect, getMyStudent);
router.put("/student/update/:id", protect, authorizeRoles("ADMIN"), updateStudent);
router.delete("/student/delete/:id", protect, authorizeRoles("ADMIN"), deleteStudent);

export default router;
