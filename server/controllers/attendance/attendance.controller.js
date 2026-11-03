import asyncHandler from "../../utils/asyncHandler.js";
import Attendance from "../../models/Attendance/Attendance.js";
import LectureSession from "../../models/lecture/LectureSession.js";
import Student from "../../models/users/Student.js";
import { verifyQRData } from "../../utils/generateQR.js";
import { notifyParentsOnAttendance } from "../notification/parentNotification.controller.js";
import {
  buildLectureRosterView,
  finalizeLectureAbsentees,
} from "../../utils/finalizeAttendance.js";
import { invalidatePrefix } from "../../services/cacheService.js";
import { refId } from "../../utils/ids.js";
import dayjs from "dayjs";
import GEOFENCE from "../../config/geofence.js";

// Student attendance views change on every mark / manual mark / repair.
function invalidateStudentCaches() {
  invalidatePrefix("studentReport:");
  invalidatePrefix("facultyDash:");
  invalidatePrefix("facultyHist:");
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toR = (d) => (d * Math.PI) / 180;
  const p1 = toR(lat1),
    p2 = toR(lat2);
  const dp = toR(lat2 - lat1),
    dl = toR(lon2 - lon1);
  const a =
    Math.sin(dp / 2) ** 2 +
    Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function bearing(lat1, lon1, lat2, lon2) {
  const toR = (d) => (d * Math.PI) / 180,
    toD = (r) => (r * 180) / Math.PI;
  const dLon = toR(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toR(lat2));
  const x =
    Math.cos(toR(lat1)) * Math.sin(toR(lat2)) -
    Math.sin(toR(lat1)) * Math.cos(toR(lat2)) * Math.cos(dLon);
  return (toD(Math.atan2(y, x)) + 360) % 360;
}

function isWithinBounds(bounds, distanceMeters, bearingDeg) {
  if (!bounds) return true;
  const d = distanceMeters;
  const b = bearingDeg;
  // Match original sectors: N 315–45, E 45–135, S 135–225, W 225–315
  if (bounds.north != null && ((b >= 315 && b <= 360) || (b >= 0 && b <= 45))) {
    if (d > bounds.north) return false;
  } else if (bounds.east != null && b > 45 && b < 135) {
    if (d > bounds.east) return false;
  } else if (bounds.south != null && b >= 135 && b <= 225) {
    if (d > bounds.south) return false;
  } else if (bounds.west != null && b > 225 && b < 315) {
    if (d > bounds.west) return false;
  }
  return true;
}

export const markAttendance = asyncHandler(async (req, res) => {
  const { qrData, location } = req.body || {};
  const studentId = req.profileId;

  // Clear, specific errors (not generic "Validation failed")
  if (!qrData || typeof qrData !== "string" || qrData.trim().length < 10) {
    return res.status(400).json({
      success: false,
      code: "QR_REQUIRED",
      message:
        "No QR code was received. Point your camera at the faculty live QR until it locks, then hold still.",
    });
  }

  // GPS: prefer coords; allow slightly late GPS by accepting last known if numbers present
  const sLat = location?.latitude != null ? Number(location.latitude) : null;
  const sLon = location?.longitude != null ? Number(location.longitude) : null;
  const sAcc =
    location?.accuracy != null && Number.isFinite(Number(location.accuracy))
      ? Math.max(0, Math.round(Number(location.accuracy)))
      : null;
  const hasGps =
    sLat != null &&
    sLon != null &&
    Number.isFinite(sLat) &&
    Number.isFinite(sLon) &&
    Math.abs(sLat) <= 90 &&
    Math.abs(sLon) <= 180;

  const qrCheck = verifyQRData(qrData.trim());
  if (!qrCheck.valid) {
    return res.status(400).json({
      success: false,
      code: qrCheck.code || "QR_INVALID",
      message: qrCheck.message,
      data: qrCheck.data || undefined,
    });
  }

  const { lectureSessionId } = qrCheck.data;
  const lecture = await LectureSession.findById(lectureSessionId);
  if (!lecture) {
    return res.status(404).json({
      success: false,
      code: "LECTURE_NOT_FOUND",
      message:
        "This lecture was not found. The session may have been deleted. Ask faculty to start again.",
    });
  }
  if (lecture.status !== "ACTIVE") {
    return res.status(400).json({
      success: false,
      code: "LECTURE_" + lecture.status,
      message:
        lecture.status === "COMPLETED"
          ? "This lecture has already ended. You can no longer mark via QR. Ask faculty to mark you manually if needed."
          : "This lecture is not active (" +
            lecture.status.toLowerCase() +
            "). Ask faculty to start a live session.",
    });
  }

  // Attendance window: generous +30s grace for last-second scan + GPS + network
  const elapsedSec = dayjs().diff(dayjs(lecture.startTime), "second");
  const windowSec = (lecture.attendanceWindow || 15) * 60;
  const GRACE_SEC = 30;
  if (elapsedSec > windowSec + GRACE_SEC) {
    const over = elapsedSec - windowSec;
    return res.status(400).json({
      success: false,
      code: "WINDOW_CLOSED",
      message:
        "Attendance window closed about " +
        Math.floor(over / 60) +
        " min " +
        (over % 60) +
        "s ago. Ask your faculty to mark you Present manually (late mark).",
      data: { elapsedSec, windowSec, graceSec: GRACE_SEC },
    });
  }

  const lecLat = lecture.location?.latitude;
  const lecLon = lecture.location?.longitude;

  if (lecLat != null && lecLon != null) {
    if (!hasGps) {
      return res.status(400).json({
        success: false,
        code: "GPS_REQUIRED",
        message:
          "Location is required. Enable GPS/Location for the browser, set accuracy to on, go near the classroom, and scan again.",
      });
    }
    const distance = haversine(lecLat, lecLon, sLat, sLon);
    const bounds = lecture.location?.bounds || GEOFENCE.defaults;
    const brg = bearing(lecLat, lecLon, sLat, sLon);
    // Forgive noisy GPS: high-accuracy fixes can jump ±15-30m. Add up to
    // the accuracy itself so a legit in-class scan never gets a false
    // rejection on the FIRST try (common GPS complaint).
    const accuracyPad = Number.isFinite(sAcc) ? Math.min(sAcc, 60) : 0;
    if (!isWithinBounds(bounds, distance - accuracyPad, brg)) {
      return res.status(403).json({
        success: false,
        code: "GEOFENCE",
        message:
          "You are about " +
          Math.round(distance) +
          "m from the classroom. Move closer inside the allowed area and scan again (or ask faculty for a manual mark).",
        data: {
          distanceMeters: Math.round(distance),
          directionBearing: Math.round(brg),
          bounds,
          studentLocation: { latitude: sLat, longitude: sLon, accuracy: sAcc },
        },
      });
    }
  } else if (!hasGps) {
    // No classroom GPS set — still ok without student GPS
  }

  const student = await Student.findById(studentId);
  if (!student) {
    return res
      .status(404)
      .json({ success: false, message: "Student profile not found" });
  }
  if (student.sectionId && lecture.sectionId) {
    if (refId(student.sectionId) !== refId(lecture.sectionId)) {
      return res.status(403).json({
        success: false,
        code: "WRONG_SECTION",
        message:
          "This QR is for a different section than yours. You cannot mark attendance for another class.",
      });
    }
  }

  const existing = await Attendance.findOne({ lectureSessionId, studentId });
  if (existing) {
    if (existing.status === "PRESENT" || existing.status === "LATE") {
      return res.status(409).json({
        success: false,
        code: "ALREADY_MARKED",
        message: "You are already marked present for this lecture. No need to scan again.",
      });
    }
    // Upgrade ABSENT → PRESENT (late scan after finalize rare; allow if still ACTIVE)
    existing.status = "PRESENT";
    existing.markedAt = new Date();
    existing.markMethod = "QR";
    existing.location = { latitude: sLat ?? null, longitude: sLon ?? null, accuracy: sAcc };
    existing.deviceInfo = req.get("user-agent") || null;
    await existing.save();
    await LectureSession.findByIdAndUpdate(lectureSessionId, {
      $inc: { totalMarked: 1 },
    });
    invalidateStudentCaches();
    notifyParentsOnAttendance({
      studentId,
      lectureSessionId: lecture._id,
      status: "PRESENT",
    }).catch(() => {});
    return res.status(200).json({
      success: true,
      message: "Attendance updated to PRESENT",
      data: {
        attendanceId: existing._id,
        status: existing.status,
        markedAt: existing.markedAt,
      },
    });
  }

  const att = await Attendance.create({
    lectureSessionId,
    studentId,
    status: "PRESENT",
    markedAt: new Date(),
    markMethod: "QR",
    location: { latitude: sLat ?? null, longitude: sLon ?? null, accuracy: sAcc },
    deviceInfo: req.get("user-agent") || null,
  });

  await LectureSession.findByIdAndUpdate(lectureSessionId, {
    $inc: { totalMarked: 1 },
  });

  invalidateStudentCaches();

  notifyParentsOnAttendance({
    studentId,
    lectureSessionId: lecture._id,
    status: "PRESENT",
  }).catch(() => {});

  return res.status(201).json({
    success: true,
    message: "Attendance marked successfully!",
    data: {
      attendanceId: att._id,
      status: att.status,
      markedAt: att.markedAt,
      location: { latitude: sLat ?? null, longitude: sLon ?? null, accuracy: sAcc },
    },
  });
});

/** Live or completed lecture roster — always section-based totals */
export const getLectureAttendanceStatus = asyncHandler(async (req, res) => {
  const { lectureSessionId } = req.params;
  const view = await buildLectureRosterView(lectureSessionId);
  if (!view) {
    return res.status(404).json({ success: false, message: "Lecture not found" });
  }
  const { lecture, summary, students, absentees, attendances } = view;

  res.json({
    success: true,
    data: {
      lecture: {
        id: lecture._id,
        topic: lecture.topic,
        subject: lecture.subjectId,
        section: lecture.sectionId,
        status: lecture.status,
        startTime: lecture.startTime,
        endTime: lecture.endTime,
        location: lecture.location,
      },
      summary,
      students,
      attendances: attendances.map((a) => ({
        id: a._id,
        student: {
          id: a.studentId?._id,
          rollNumber: a.studentId?.rollNumber,
          name: a.studentId?.userId?.name,
          email: a.studentId?.userId?.email,
          parentPhone: a.studentId?.parentPhone,
        },
        status: a.status,
        markedAt: a.markedAt,
        markMethod: a.markMethod,
        location: {
          latitude: a.location?.latitude ?? null,
          longitude: a.location?.longitude ?? null,
          accuracy: a.location?.accuracy ?? null,
        },
      })),
      absentees,
    },
  });
});

/**
 * POST /lecture/:lectureSessionId/manual-mark
 * Faculty/Admin manually set PRESENT | ABSENT | LATE | EXCUSED
 * Body: { studentId, status, remarks? }
 */
export const manualMarkAttendance = asyncHandler(async (req, res) => {
  const { lectureSessionId } = req.params;
  const { studentId, status, remarks } = req.body || {};
  const allowed = ["PRESENT", "ABSENT", "LATE", "EXCUSED"];
  if (!studentId || !allowed.includes(status)) {
    return res.status(400).json({
      success: false,
      message: "studentId and status (PRESENT|ABSENT|LATE|EXCUSED) required",
    });
  }

  const lecture = await LectureSession.findById(lectureSessionId);
  if (!lecture) {
    return res.status(404).json({ success: false, message: "Lecture not found" });
  }

  // Faculty may only mark their own lectures
  if (req.user.role === "FACULTY") {
    const facId = req.profileId;
    if (refId(lecture.facultyId) !== refId(facId)) {
      return res.status(403).json({ success: false, message: "Not your lecture" });
    }
  }

  const student = await Student.findById(studentId);
  if (!student) {
    return res.status(404).json({ success: false, message: "Student not found" });
  }
  if (
    lecture.sectionId &&
    student.sectionId &&
    refId(student.sectionId) !== refId(lecture.sectionId)
  ) {
    return res.status(400).json({
      success: false,
      message: "Student is not in this lecture's section",
    });
  }

  let att = await Attendance.findOne({ lectureSessionId, studentId });
  const prev = att?.status;
  if (att) {
    att.status = status;
    att.markedAt = new Date();
    att.markMethod = "MANUAL";
    att.markedBy = req.user._id;
    if (remarks !== undefined) att.remarks = remarks;
    await att.save();
  } else {
    att = await Attendance.create({
      lectureSessionId,
      studentId,
      status,
      markedAt: new Date(),
      markMethod: "MANUAL",
      markedBy: req.user._id,
      remarks: remarks || null,
    });
  }

  const presentCount = await Attendance.countDocuments({
    lectureSessionId,
    status: { $in: ["PRESENT", "LATE"] },
  });
  await LectureSession.findByIdAndUpdate(lectureSessionId, {
    totalMarked: presentCount,
  });

  if (status === "PRESENT" || status === "ABSENT") {
    notifyParentsOnAttendance({
      studentId,
      lectureSessionId: lecture._id,
      status,
    }).catch(() => {});
  }

  invalidateStudentCaches();

  const view = await buildLectureRosterView(lectureSessionId);

  res.json({
    success: true,
    message: `Marked ${status}${prev && prev !== status ? ` (was ${prev})` : ""}`,
    data: {
      attendanceId: att._id,
      status: att.status,
      summary: view?.summary,
      students: view?.students,
    },
  });
});

/**
 * POST /lecture/:lectureSessionId/repair-roster
 * Force re-sync absents for completed lectures (admin/faculty)
 */
export const repairLectureRoster = asyncHandler(async (req, res) => {
  const { lectureSessionId } = req.params;
  const lecture = await LectureSession.findById(lectureSessionId);
  if (!lecture) {
    return res.status(404).json({ success: false, message: "Lecture not found" });
  }
  const fin = await finalizeLectureAbsentees(lectureSessionId, { notify: false });
  const view = await buildLectureRosterView(lectureSessionId);
  res.json({
    success: true,
    message: "Roster repaired",
    data: { ...fin, summary: view?.summary, students: view?.students },
  });
});
