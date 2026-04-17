import express from "express";
import protect from "../../middleware/auth.middleware.js";
import authorizeRoles from "../../middleware/role.middleware.js";
import { createFacultySubjectSection, getFacultyAssignments, getFacultyDashboardSummary, getIndividualSectionStats } from "../../controllers/mapping/facultySubjectSection.controller.js";
import getProfileId from "../../middleware/identity.middleware.js";

const router = express.Router();

router.get("/faculty/assignments", protect, getProfileId, authorizeRoles("ADMIN","FACULTY"),getFacultyAssignments)
//  Get summary of all sections assigned to the faculty (with student & lecture counts)
router.get("/facultys/dashboard-summary", protect, getProfileId, getFacultyDashboardSummary);

//  Get detailed stats for a specific section + subject assigned to the faculty
router.get("/faculty/section-stats/:mappingId", protect, getProfileId, getIndividualSectionStats);

// assign the subject and section to user
router.post("/faculty-subject-section", protect, authorizeRoles("ADMIN"), createFacultySubjectSection );

export default router;
