import express from "express";
import {
  getStudentAttendanceReport,
  getLectureAttendanceSummary,
  getFacultyDashboardStats,
  getFacultyHistory,
  getFacultyHistoryFilters,
  getFacultySubjectRoster,
  exportFacultySubjectRosterCsv,
  exportFacultyDateRangeCsv,
  exportFacultyDateRangeXlsx,
  getAdminAnalytics,
  getAdminOverviewMatrix,
} from "../../controllers/report/report.controller.js";
import protect from "../../middleware/auth.middleware.js";
import authorizeRoles from "../../middleware/role.middleware.js";
import getProfileId from "../../middleware/identity.middleware.js";

const r = express.Router();

r.get(
  "/api/report/student/my-attendance",
  protect,
  getProfileId,
  authorizeRoles("STUDENT"),
  getStudentAttendanceReport
);
r.get(
  "/api/report/lecture/:lectureSessionId/summary",
  protect,
  authorizeRoles("FACULTY", "ADMIN"),
  getLectureAttendanceSummary
);
r.get(
  "/api/report/faculty/dashboard",
  protect,
  getProfileId,
  authorizeRoles("FACULTY", "ADMIN"),
  getFacultyDashboardStats
);
r.get(
  "/api/report/faculty/history/filters",
  protect,
  getProfileId,
  authorizeRoles("FACULTY", "ADMIN"),
  getFacultyHistoryFilters
);
r.get(
  "/api/report/faculty/history",
  protect,
  getProfileId,
  authorizeRoles("FACULTY", "ADMIN"),
  getFacultyHistory
);
r.get(
  "/api/report/faculty/subject-roster",
  protect,
  getProfileId,
  authorizeRoles("FACULTY", "ADMIN"),
  getFacultySubjectRoster
);
r.get(
  "/api/report/faculty/subject-roster/export.csv",
  protect,
  getProfileId,
  authorizeRoles("FACULTY", "ADMIN"),
  exportFacultySubjectRosterCsv
);
r.get(
  "/api/report/faculty/attendance-sheet.csv",
  protect,
  getProfileId,
  authorizeRoles("FACULTY", "ADMIN"),
  exportFacultyDateRangeCsv
);
r.get(
  "/api/report/faculty/attendance-sheet.xlsx",
  protect,
  getProfileId,
  authorizeRoles("FACULTY", "ADMIN"),
  exportFacultyDateRangeXlsx
);
r.get(
  "/api/report/admin/analytics",
  protect,
  authorizeRoles("ADMIN"),
  getAdminAnalytics
);
r.get(
  "/api/report/admin/overview",
  protect,
  authorizeRoles("ADMIN"),
  getAdminOverviewMatrix
);

export default r;
