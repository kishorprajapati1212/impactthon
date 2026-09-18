import express from "express";
import {
  startLectureSession,
  endLectureSession,
  getFacultyDashboard,
  getMyActiveLecture,
  adminEndLecture,
  adminEndAllLectures,
  getActiveLectures,
} from "../../controllers/lecture/lectureSession.controller.js";
import protect from "../../middleware/auth.middleware.js";
import authorizeRoles from "../../middleware/role.middleware.js";
import getProfileId from "../../middleware/identity.middleware.js";

const r = express.Router();

r.post(
  "/lecture/start",
  protect,
  getProfileId,
  authorizeRoles("FACULTY", "ADMIN"),
  startLectureSession
);
r.post(
  "/lecture/end",
  protect,
  getProfileId,
  authorizeRoles("FACULTY", "ADMIN"),
  endLectureSession
);
r.get(
  "/lecture/my-active",
  protect,
  getProfileId,
  authorizeRoles("FACULTY", "ADMIN"),
  getMyActiveLecture
);
r.get(
  "/faculty/dashboard",
  protect,
  getProfileId,
  authorizeRoles("FACULTY", "ADMIN"),
  getFacultyDashboard
);
r.post(
  "/admin/lecture/end",
  protect,
  authorizeRoles("ADMIN"),
  adminEndLecture
);
r.post(
  "/admin/lecture/end-all",
  protect,
  authorizeRoles("ADMIN"),
  adminEndAllLectures
);
r.get(
  "/admin/active-lectures",
  protect,
  authorizeRoles("ADMIN"),
  getActiveLectures
);

export default r;
