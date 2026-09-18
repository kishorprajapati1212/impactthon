import asyncHandler from "../../utils/asyncHandler.js";
import Parent from "../../models/users/Parent.js";
import Student from "../../models/users/Student.js";
import LectureSession from "../../models/lecture/LectureSession.js";
import NotificationLog from "../../models/users/NotificationLog.js";

/**
 * ── Parent Notification System ──────────────────────────────────────
 *
 * When a student marks attendance, `notifyParentsOnAttendance()` is
 * called automatically (fire-and-forget, non-blocking).
 *
 * In production, integrate with:
 *   • SMS:  Twilio, MSG91, TextLocal
 *   • Email: Nodemailer, SendGrid
 *
 * For now, notifications are logged to the database (can be viewed
 * via the admin panel or parent dashboard).
 */

/**
 * POST /api/parent/link
 * Link a parent to one or more students
 */
export const linkParentToStudent = asyncHandler(async (req, res) => {
  const { parentId, studentId } = req.body;

  if (!parentId || !studentId) {
    return res.status(400).json({
      success: false,
      message: "parentId and studentId are required",
    });
  }

  const parent = await Parent.findById(parentId);

  if (!parent) {
    return res.status(404).json({
      success: false,
      message: "Parent not found",
    });
  }

  const student = await Student.findById(studentId);

  if (!student) {
    return res.status(404).json({
      success: false,
      message: "Student not found",
    });
  }

  // Add student to parent's children array if not already linked
  const alreadyLinked = parent.children
    .map((c) => c.toString())
    .includes(studentId);

  if (!alreadyLinked) {
    parent.children.push(studentId);
    await parent.save();
  }

  // Update student's parentPhone for quick lookup
  if (!student.parentPhone && parent.phone) {
    student.parentPhone = parent.phone;
    await student.save();
  }

  res.json({
    success: true,
    message: `Parent linked to student ${student.rollNumber}`,
    data: parent,
  });
});

/**
 * GET /api/parent/student/:studentId
 * Find the parent linked to a specific student
 */
export const getParentByStudent = asyncHandler(async (req, res) => {
  const { studentId } = req.params;

  const parent = await Parent.findOne({ children: studentId })
    .populate("userId", "name email")
    .populate("children", "rollNumber")
    .lean();

  if (!parent) {
    return res.status(404).json({
      success: false,
      message: "No parent linked to this student",
    });
  }

  res.json({
    success: true,
    data: parent,
  });
});

/**
 * GET /api/parent/notifications/:parentId
 * Get notification history for a parent
 */
export const getParentNotifications = asyncHandler(async (req, res) => {
  const { parentId } = req.params;

  const logs = await NotificationLog.find({ parentId })
    .populate("studentId", "rollNumber")
    .populate("lectureId", "topic startTime")
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  res.json({
    success: true,
    count: logs.length,
    data: logs,
  });
});

/**
 * POST /api/parent/send-test
 * Send a test notification (development only)
 */
export const sendTestNotification = asyncHandler(async (req, res) => {
  const { parentId, studentId, lectureId, type } = req.body;

  const parent = await Parent.findById(parentId);

  if (!parent) {
    return res.status(404).json({
      success: false,
      message: "Parent not found",
    });
  }

  const student = await Student.findById(studentId).populate(
    "userId",
    "name"
  );

  if (!student) {
    return res.status(404).json({
      success: false,
      message: "Student not found",
    });
  }

  let lecture = null;

  if (lectureId) {
    lecture = await LectureSession.findById(lectureId).populate(
      "subjectId",
      "subjectName"
    );
  }

  const studentName = student.userId?.name || student.rollNumber;
  const subject = lecture?.subjectId?.subjectName || "Unknown";
  const topic = lecture?.topic || "Lecture";

  // Build message based on notification type
  let message = "";

  switch (type) {
    case "PRESENT":
      message =
        `Dear Parent, ${studentName} (${student.rollNumber}) ` +
        `was marked PRESENT for ${subject} - ${topic}. - AttendX`;
      break;

    case "ABSENT":
      message =
        `Dear Parent, ${studentName} (${student.rollNumber}) ` +
        `was ABSENT for ${subject} - ${topic}. Please follow up. - AttendX`;
      break;

    case "DAILY_SUMMARY":
      message =
        `Daily Attendance: ${studentName} attended all lectures today. - AttendX`;
      break;

    case "LOW_ATTENDANCE_WARNING":
      message =
        `WARNING: ${studentName}'s attendance has dropped below 75% ` +
        `in ${subject}. Please contact the institution. - AttendX`;
      break;

    default:
      message =
        `Attendance update for ${studentName}: ${type}. - AttendX`;
  }

  // Determine channel from parent preferences
  const prefs = parent.notificationPrefs || {};
  let channel = "SMS";

  if (prefs.sms && prefs.email) {
    channel = "BOTH";
  } else if (prefs.email) {
    channel = "EMAIL";
  }

  // Log the notification
  const log = await NotificationLog.create({
    parentId,
    studentId,
    lectureId: lectureId || null,
    subjectName: subject,
    topic,
    type,
    channel,
    status: "SENT",
    sentAt: new Date(),
    message,
  });

  // Update last notified timestamp
  parent.lastNotifiedAt = new Date();
  await parent.save();

  res.json({
    success: true,
    message: "Notification sent (simulated)",
    data: {
      log,
      notification: message,
    },
  });
});

/**
 * ── Internal: notify parents after attendance mark ───────────────────
 *
 * Called by the attendance controller after a successful mark.
 * Runs asynchronously and never throws — notification failure
 * must not block the attendance marking flow.
 */
export const notifyParentsOnAttendance = async ({
  studentId,
  lectureSessionId,
  status,
}) => {
  try {
    // Find all parents linked to this student
    const parents = await Parent.find({ children: studentId })
      .populate("userId", "name email");

    if (!parents.length) return;

    // Load student and lecture info for the message
    const [student, lecture] = await Promise.all([
      Student.findById(studentId).populate("userId", "name email"),
      LectureSession.findById(lectureSessionId).populate(
        "subjectId",
        "subjectName"
      ),
    ]);

    if (!student || !lecture) return;

    const studentName = student.userId?.name || student.rollNumber;
    const subjectName = lecture.subjectId?.subjectName || "Subject";
    const topic = lecture.topic;
    const notificationType = status === "PRESENT" ? "PRESENT" : "ABSENT";

    // Notify each parent who has instant notifications enabled
    for (const parent of parents) {
      const prefs = parent.notificationPrefs || {};

      // Skip if parent doesn't want instant notifications
      if (!prefs.instant) continue;

      const message =
        status === "PRESENT"
          ? `Dear Parent, ${studentName} (${student.rollNumber}) ` +
            `marked PRESENT in ${subjectName} - ${topic}. - AttendX`
          : `Dear Parent, ${studentName} (${student.rollNumber}) ` +
            `was ABSENT for ${subjectName} - ${topic}. - AttendX`;

      let channel = "SMS";

      if (prefs.sms && prefs.email) {
        channel = "BOTH";
      } else if (prefs.email) {
        channel = "EMAIL";
      }

      await NotificationLog.create({
        parentId: parent._id,
        studentId,
        lectureId: lectureSessionId,
        subjectName,
        topic,
        type: notificationType,
        channel,
        status: "SENT",
        sentAt: new Date(),
        message,
      });

      parent.lastNotifiedAt = new Date();
      await parent.save();
    }
  } catch (err) {
    // Non-blocking — log but never throw
    console.error(
      "[ParentNotification] Failed to notify parents:",
      err.message
    );
  }
};
