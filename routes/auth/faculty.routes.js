import express from "express";
import { createFaculty,loginUser } from "../../controllers/auth/faculty.controller.js";
import protect from "../../middleware/auth.middleware.js";
import authorizeRoles from "../../middleware/role.middleware.js";

const router = express.Router();

router.post("/faculty/create",protect, authorizeRoles("ADMIN"), createFaculty );
router.post("/faculty/login", loginUser );

export default router;
