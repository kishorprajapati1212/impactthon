import express from "express";
import { createAdmin, loginAdmin } from "../../controllers/auth/admin.controller.js";
const r = express.Router();
r.post("/admin/create", createAdmin);
r.post("/admin/login", loginAdmin);
export default r;
