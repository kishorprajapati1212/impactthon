import express from "express";
import {
  startLectureSession,
  endLectureSession,
  getFacultyDashboard,
  getMyActiveLecture,
  adminEndLecture,
  adminEndAllLectures,
  getActiveLectures,
  adminListLectures,
  getLectureDeletePreview,
  deleteLecture,
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

/* Phase 18 - every lecture (admin) and deleting a lecture.
 * The delete routes are registered here (before the attendance router's
 * GET /lecture/:lectureSessionId) and use a different method/suffix, so
 * nothing else matches them. */
r.get(
  "/admin/lectures",
  protect,
  authorizeRoles("ADMIN"),
  adminListLectures
);
r.get(
  "/lecture/:id/delete-preview",
  protect,
  getProfileId,
  authorizeRoles("FACULTY", "ADMIN"),
  getLectureDeletePreview
);
r.delete(
  "/lecture/:id",
  protect,
  getProfileId,
  authorizeRoles("FACULTY", "ADMIN"),
  deleteLecture
);

export default r;
