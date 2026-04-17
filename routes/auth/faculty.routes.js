import express from "express";
import { createFaculty, getAllFaculty, getMyFaculty,loginUser, getFacultyById, updateFaculty, deleteFaculty } from "../../controllers/auth/faculty.controller.js";
import protect from "../../middleware/auth.middleware.js";
import authorizeRoles from "../../middleware/role.middleware.js";

const router = express.Router();

router.post("/faculty/create",protect, authorizeRoles("ADMIN"), createFaculty );
router.post("/faculty/login", loginUser );
router.get("/faculty/me", protect, getMyFaculty);
router.get("/faculty/:id", protect, authorizeRoles("ADMIN"), getFacultyById);
router.put("/faculty/update/:id", protect, authorizeRoles("ADMIN"), updateFaculty);
router.delete("/faculty/delete/:id", protect, authorizeRoles("ADMIN"), deleteFaculty);
router.get("/faculty", protect, getAllFaculty);

export default router;
