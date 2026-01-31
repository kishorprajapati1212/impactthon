import express from "express";
import { createSubject } from "../../controllers/academics/subject.controller.js";
import protect from "../../middleware/auth.middleware.js";
import authorizeRoles from "../../middleware/role.middleware.js";
import getProfileId from "../../middleware/identity.middleware.js"

const router = express.Router();

// Create subject (ADMIN only)
router.post("/subject/create", protect,getProfileId, authorizeRoles("ADMIN"), createSubject);

export default router;
