import express from "express";
import { createSection, getAllSections } from "../../controllers/academics/section.controller.js";
import protect from "../../middleware/auth.middleware.js";
import authorizeRoles from "../../middleware/role.middleware.js";
const r = express.Router();
r.post("/section/create", protect, authorizeRoles("ADMIN"), createSection);
r.get("/sections", protect, getAllSections);
export default r;
