import express from "express";
import { createSubject, getAllSubjects } from "../../controllers/academics/subject.controller.js";
import protect from "../../middleware/auth.middleware.js";
import authorizeRoles from "../../middleware/role.middleware.js";
const r = express.Router();
r.post("/subject/create", protect, authorizeRoles("ADMIN"), createSubject);
r.get("/subjects", protect, getAllSubjects);
export default r;
