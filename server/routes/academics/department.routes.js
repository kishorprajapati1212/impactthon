import express from "express";
import { createDepartment, getAllDepartments, getDepartmentById } from "../../controllers/academics/department.controller.js";
import protect from "../../middleware/auth.middleware.js";
import authorizeRoles from "../../middleware/role.middleware.js";
const r = express.Router();
r.post("/department/create", protect, authorizeRoles("ADMIN"), createDepartment);
r.get("/departments", protect, getAllDepartments);
r.get("/department/:id", protect, authorizeRoles("ADMIN"), getDepartmentById);
export default r;
