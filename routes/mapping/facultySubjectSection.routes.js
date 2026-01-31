import express from "express";
import protect from "../../middleware/auth.middleware.js";
import authorizeRoles from "../../middleware/role.middleware.js";
import { createFacultySubjectSection, getFacultyAssignments} from "../../controllers/mapping/facultySubjectSection.controller.js";
import getProfileId from "../../middleware/identity.middleware.js";

const router = express.Router();

router.post("/faculty-subject-section", protect, authorizeRoles("ADMIN"), createFacultySubjectSection );
router.get("/faculty/assignments", protect, getProfileId, authorizeRoles("ADMIN","FACULTY"),getFacultyAssignments)

export default router;
