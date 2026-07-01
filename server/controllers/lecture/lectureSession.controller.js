import LectureSession from "../../models/lecture/LectureSession.js";
import FacultySubjectSection from "../../models/mapping/FacultySubjectSection.js";
import { generateSessionToken } from "../../utils/generateQR.js";
import dayjs from "dayjs";

export const startLectureSession = async (req, res, next) => {
  try {
    const { subjectId, sectionId, topic, description, location, attendanceWindow } = req.body;
    const facultyId = req.profileId;

    if (!topic?.trim()) return res.status(400).json({ success: false, message: "topic is required" });

    const assignment = await FacultySubjectSection.findOne({ facultyId, subjectId, sectionId, isActive: true });
    if (!assignment && req.user.role !== "ADMIN") return res.status(403).json({ success: false, message: "Not assigned to this subject-section" });

    const existingActive = await LectureSession.findOne({ facultyId, status: "ACTIVE" });
    if (existingActive) return res.status(400).json({ success: false, message: "You have an active lecture. End it first.", data: { activeLectureId: existingActive._id } });

    const lecture = await LectureSession.create({
      facultyId, subjectId, sectionId, topic: topic.trim(), description,
      status: "ACTIVE", startTime: new Date(),
      location: { latitude: location?.latitude ?? null, longitude: location?.longitude ?? null, radius: location?.radius ?? 100 },
      attendanceWindow: attendanceWindow || 15,
      sessionToken: "pending",
    });

    // Generate HMAC token using the real lecture _id
    const sessionToken = generateSessionToken(lecture._id);
    lecture.sessionToken = sessionToken;
    await lecture.save();

    res.status(201).json({
      success: true, message: "Lecture started",
      data: {
        lectureSessionId: lecture._id,
        sessionToken,        // Frontend holds this, appends ts every 10s to build QR
        topic: lecture.topic,
        startTime: lecture.startTime,
        status: lecture.status,
        location: lecture.location,
        attendanceWindow: lecture.attendanceWindow,
      },
    });
  } catch (e) { next(e); }
};

export const endLectureSession = async (req, res, next) => {
  try {
    const { lectureSessionId } = req.body;
    const facultyId = req.profileId;
    const lecture = await LectureSession.findOne({ _id: lectureSessionId, facultyId, status: "ACTIVE" });
    if (!lecture) return res.status(404).json({ success: false, message: "Active lecture not found" });
    lecture.status = "COMPLETED";
    lecture.endTime = new Date();
    lecture.sessionToken = null; // Invalidate token on end
    await lecture.save();
    res.json({ success: true, message: "Lecture ended", data: { lectureSessionId: lecture._id, duration: dayjs(lecture.endTime).diff(dayjs(lecture.startTime), "minute"), totalMarked: lecture.totalMarked } });
  } catch (e) { next(e); }
};

// Faculty dashboard stats
export const getFacultyDashboard = async (req, res, next) => {
  try {
    const facultyId = req.profileId;
    const [total, active, completed] = await Promise.all([
      LectureSession.countDocuments({ facultyId }),
      LectureSession.countDocuments({ facultyId, status: "ACTIVE" }),
      LectureSession.countDocuments({ facultyId, status: "COMPLETED" }),
    ]);
    const recentLectures = await LectureSession.find({ facultyId })
      .populate("subjectId", "subjectName")
      .populate("sectionId", "name")
      .sort({ startTime: -1 }).limit(5).lean();
    res.json({
      success: true,
      data: {
        stats: { totalLectures: total, activeLectures: active, completedLectures: completed },
        recentLectures: recentLectures.map(l => ({
          id: l._id, topic: l.topic,
          subject: l.subjectId?.subjectName,
          section: l.sectionId?.name,
          date: l.startTime, status: l.status,
          presentCount: l.totalMarked,
        })),
      },
    });
  } catch (e) { next(e); }
};
