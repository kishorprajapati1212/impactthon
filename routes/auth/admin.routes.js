import express from "express";
import { createAdmin,loginUser } from "../../controllers/auth/admin.controller.js";

const router = express.Router();

// First admin (no auth)
router.post("/admin/create", createAdmin);
router.post("/admin/login", loginUser);

export default router;
