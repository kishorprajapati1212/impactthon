import express from "express";
import { createFacultySubjectSection, getFacultyAssignments } from "../../controllers/mapping/facultySubjectSection.controller.js";
import protect from "../../middleware/auth.middleware.js";
import authorizeRoles from "../../middleware/role.middleware.js";
import getProfileId from "../../middleware/identity.middleware.js";
const r = express.Router();
r.post("/faculty-subject-section", protect, authorizeRoles("ADMIN"), createFacultySubjectSection);
r.get("/faculty/assignments", protect, getProfileId, authorizeRoles("FACULTY","ADMIN"), getFacultyAssignments);
export default r;
