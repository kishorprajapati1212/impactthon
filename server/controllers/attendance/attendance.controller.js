import Attendance from "../../models/Attendance/Attendance.js";
import LectureSession from "../../models/lecture/LectureSession.js";
import Student from "../../models/users/Student.js";
import { verifyQRData } from "../../utils/generateQR.js";
import dayjs from "dayjs";

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const f1 = (lat1 * Math.PI) / 180, f2 = (lat2 * Math.PI) / 180;
  const df = ((lat2 - lat1) * Math.PI) / 180, dl = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(df/2)**2 + Math.cos(f1)*Math.cos(f2)*Math.sin(dl/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// POST /student/mark
export const markAttendance = async (req, res, next) => {
  try {
    const { qrData, location } = req.body;
    const studentId = req.profileId;

    // 1. Verify QR signature + timestamp
    const qrCheck = verifyQRData(qrData);
    if (!qrCheck.valid) return res.status(400).json({ success: false, message: qrCheck.message });

    const { lectureSessionId } = qrCheck.data;

    // 2. Load lecture
    const lecture = await LectureSession.findById(lectureSessionId);
    if (!lecture) return res.status(404).json({ success: false, message: "Lecture not found" });
    if (lecture.status !== "ACTIVE") return res.status(400).json({ success: false, message: `Lecture is ${lecture.status.toLowerCase()}` });

    // 3. Attendance window
    const minsSinceStart = dayjs().diff(dayjs(lecture.startTime), "minute");
    if (minsSinceStart > lecture.attendanceWindow) return res.status(400).json({ success: false, message: `Attendance window closed (${minsSinceStart} min since start)` });

    // 4. Geofence check (only if lecture has location)
    const lecLat = lecture.location?.latitude;
    const lecLon = lecture.location?.longitude;
    if (lecLat != null && lecLon != null) {
      const sLat = location?.latitude;
      const sLon = location?.longitude;
      if (sLat == null || sLon == null) return res.status(400).json({ success: false, message: "Your location is required to mark attendance" });

      const dist = haversineDistance(lecLat, lecLon, sLat, sLon);
      const radius = lecture.location.radius ?? 100;
      // const radius = 10000000; // Keeping your massive radius variable for testing override

      const reportedAccuracy = Number(location?.accuracy) || 0;
      const accuracyTolerance = Math.min(reportedAccuracy, 150); // cap at 150m
      const effectiveRadius = radius + accuracyTolerance;

      if (dist > effectiveRadius) {
        console.warn(`[markAttendance] Geofence rejected: student is ${Math.round(dist)}m away, allowed ${radius}m + ${Math.round(accuracyTolerance)}m GPS tolerance = ${Math.round(effectiveRadius)}m.`);
        return res.status(403).json({
          success: false,
          message: `You are ${Math.round(dist)}m from the classroom. Must be within ${radius}m (±${Math.round(accuracyTolerance)}m GPS tolerance).`,
          data: {
            distanceMeters: Math.round(dist),
            allowedRadius: radius,
            gpsAccuracy: reportedAccuracy || null,
            effectiveRadius: Math.round(effectiveRadius),
          },
        });
      }
    }

    // 5. Section check
    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ success: false, message: "Student profile not found" });
    if (student.sectionId && lecture.sectionId) {
      if (student.sectionId.toString() !== lecture.sectionId.toString()) {
        console.warn(`[markAttendance] Section mismatch: student ${studentId} is in section ${student.sectionId}, lecture ${lectureSessionId} is for section ${lecture.sectionId}`);
        return res.status(403).json({ success: false, message: "You are not enrolled in the section this lecture is for." });
      }
    } else if (!student.sectionId) {
      console.warn(`[markAttendance] Student ${studentId} has no sectionId assigned — section check skipped.`);
    }

    // 6. Explicit Duplicate Check (PREVENT DOUBLE ENTRIES CLEANLY)
    const existingAttendance = await Attendance.findOne({ lectureSessionId, studentId });
    if (existingAttendance) {
      return res.status(409).json({ 
        success: false, 
        message: "You have already marked your attendance for this lecture session." 
      });
    }

    // 7. Safe Creation
    try {
      const att = await Attendance.create({
        lectureSessionId, 
        studentId,
        status: "PRESENT", 
        markedAt: new Date(), 
        markMethod: "QR",
        location: { latitude: location?.latitude ?? null, longitude: location?.longitude ?? null },
        deviceInfo: req.get("user-agent") || null,
      });

      await LectureSession.findByIdAndUpdate(lectureSessionId, { $inc: { totalMarked: 1 } });
      
      return res.status(201).json({ 
        success: true, 
        message: "Attendance marked successfully!", 
        data: { attendanceId: att._id, status: att.status, markedAt: att.markedAt } 
      });
    } catch (err) {
      if (err.code === 11000) {
        return res.status(409).json({ success: false, message: "Attendance already recorded for this session." });
      }
      throw err;
    }
  } catch (e) { next(e); }
};

// GET /lecture/:lectureSessionId — attendance list with student locations for map
export const getLectureAttendanceStatus = async (req, res, next) => {
  try {
    const { lectureSessionId } = req.params;
    const lecture = await LectureSession.findById(lectureSessionId)
      .populate("subjectId", "subjectName subjectCode")
      .populate("sectionId", "name")
      .populate("facultyId", "employeeId");
    if (!lecture) return res.status(404).json({ success: false, message: "Lecture not found" });

    const attendances = await Attendance.find({ lectureSessionId })
      .populate({ path: "studentId", select: "rollNumber userId", populate: { path: "userId", select: "name email" } })
      .sort({ markedAt: 1 });

    const present = attendances.filter(a => a.status === "PRESENT").length;
    const presentStudentIds = new Set(attendances.map(a => a.studentId?._id?.toString()).filter(Boolean));

    const allSectionStudents = lecture.sectionId
      ? await Student.find({ sectionId: lecture.sectionId._id })
          .select("rollNumber userId")
          .populate({ path: "userId", select: "name email" })
          .lean()
      : [];

    const totalStudents = allSectionStudents.length;

    const absentees = allSectionStudents
      .filter(s => !presentStudentIds.has(s._id.toString()))
      .map(s => ({
        id: s._id,
        rollNumber: s.rollNumber,
        name: s.userId?.name || null,
        email: s.userId?.email || null,
        status: "ABSENT",
      }));

    res.json({
      success: true,
      data: {
        lecture: { id: lecture._id, topic: lecture.topic, subject: lecture.subjectId, section: lecture.sectionId, status: lecture.status, startTime: lecture.startTime, endTime: lecture.endTime, location: lecture.location },
        summary: {
          totalStudents,
          present,
          absent: Math.max(totalStudents - present, 0),
          attendanceRate: totalStudents > 0 ? parseFloat(((present / totalStudents) * 100).toFixed(2)) : 0,
        },
        attendances: attendances.map(a => ({
          id: a._id,
          student: { id: a.studentId?._id, rollNumber: a.studentId?.rollNumber, name: a.studentId?.userId?.name, email: a.studentId?.userId?.email },
          status: a.status, markedAt: a.markedAt, markMethod: a.markMethod,
          location: a.location,
        })),
        absentees,
      },
    });
  } catch (e) { next(e); }
};