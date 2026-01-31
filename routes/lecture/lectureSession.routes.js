import express from "express";
import protect from "../../middleware/auth.middleware.js";
import authorizeRoles from "../../middleware/role.middleware.js";
import { startLectureSession, endLectureSession, } from "../../controllers/lecture/lectureSession.controller.js";

const router = express.Router();

router.post("/lecture/start", protect, authorizeRoles("FACULTY","ADMIN"), startLectureSession );
router.post("/lecture/end", protect, authorizeRoles("FACULTY","ADMIN"), endLectureSession );

export default router;
