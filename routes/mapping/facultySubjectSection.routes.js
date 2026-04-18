import express from "express";
import protect from "../../middleware/auth.middleware.js";
import authorizeRoles from "../../middleware/role.middleware.js";
import { createFacultySubjectSection, getFacultyAssignments, getFacultySectionStudents, getFacultySectionLectures, updateFacultySubjectSection } from "../../controllers/mapping/facultySubjectSection.controller.js";
import getProfileId from "../../middleware/identity.middleware.js";

const router = express.Router();

// assign the subject and section to user
router.post("/faculty-subject-section", protect, authorizeRoles("ADMIN"), createFacultySubjectSection );
router.get("/faculty/assignments", protect, getProfileId, authorizeRoles("ADMIN","FACULTY"),getFacultyAssignments)
router.put("/faculty-subject-section/:id", protect, authorizeRoles("ADMIN"), updateFacultySubjectSection);


// 1. Get student count and basic info for all assigned sections
router.get("/facultys/section-students", protect, getProfileId, authorizeRoles("FACULTY"), getFacultySectionStudents);

// 2. Get lecture history for a specific mapping (Total count + Paginated latest 5)
router.get("/faculty/section-lectures/:mappingId", protect, getProfileId, getFacultySectionLectures);


export default router;
