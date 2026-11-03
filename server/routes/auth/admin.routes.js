import express from "express";
import { createAdmin, loginAdmin } from "../../controllers/auth/admin.controller.js";
import adminCreateGuard from "../../middleware/firstAdmin.middleware.js";
const r = express.Router();
// First admin: open (fresh install). Afterwards: logged-in ADMIN only.
r.post("/admin/create", adminCreateGuard, createAdmin);
r.post("/admin/login", loginAdmin);
export default r;
