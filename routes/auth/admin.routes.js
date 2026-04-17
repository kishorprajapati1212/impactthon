import express from "express";
import { createAdmin,loginUser, getAllAdmins, getAdminById, updateAdmin, deleteAdmin } from "../../controllers/auth/admin.controller.js";
import protect from "../../middleware/auth.middleware.js";
import authorizeRoles from "../../middleware/role.middleware.js";

const router = express.Router();

// First admin (no auth)
router.post("/admin/create", createAdmin);
router.post("/admin/login", loginUser);
router.get("/admins", protect, authorizeRoles("ADMIN"), getAllAdmins);
router.get("/admin/:id", protect, authorizeRoles("ADMIN"), getAdminById);
router.put("/admin/update/:id", protect, authorizeRoles("ADMIN"), updateAdmin);
router.delete("/admin/delete/:id", protect, authorizeRoles("ADMIN"), deleteAdmin);

export default router;
