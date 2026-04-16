import express from "express";
import { getAllSubjects, getAllSections, getAllDepartments} from "../../controllers/academics/academic.controller.js";

import protect from "../../middleware/auth.middleware.js";

const router = express.Router();

router.get("/subjects", protect, getAllSubjects);
router.get("/sections", protect, getAllSections);
router.get("/departments", protect, getAllDepartments);

export default router;