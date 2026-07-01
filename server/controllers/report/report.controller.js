import Attendance from '../../models/Attendance/Attendance.js';
import LectureSession from '../../models/lecture/LectureSession.js';

// GET /api/report/student/my-attendance
export const getStudentAttendanceReport = async (req, res, next) => {
  try {
    const studentId = req.profileId;
    const attendances = await Attendance.find({ studentId })
      .populate({
        path: 'lectureSessionId',
        select: 'topic startTime subjectId',
        populate: { path: 'subjectId', select: 'subjectName subjectCode' },
      })
      .sort({ createdAt: -1 });

    const total   = attendances.length;
    const present = attendances.filter(a => a.status === 'PRESENT').length;

    // Build subject breakdown
    const map = {};
    attendances.forEach(att => {
      const name = att.lectureSessionId?.subjectId?.subjectName || 'Unknown';
      const code = att.lectureSessionId?.subjectId?.subjectCode || '';
      if (!map[name]) map[name] = { subject: name, subjectCode: code, total: 0, present: 0 };
      map[name].total++;
      if (att.status === 'PRESENT') map[name].present++;
    });

    const subjectBreakdown = Object.values(map).map(s => ({
      ...s,
      percentage: s.total > 0 ? parseFloat(((s.present / s.total) * 100).toFixed(1)) : 0,
    }));

    res.json({
      success: true,
      data: {
        summary: {
          totalLectures: total,
          present,
          absent: total - present,
          percentage: total > 0 ? parseFloat(((present / total) * 100).toFixed(1)) : 0,
        },
        subjectBreakdown,
        details: attendances.map(att => ({
          lectureId:   att.lectureSessionId?._id,
          subject:     att.lectureSessionId?.subjectId?.subjectName,
          subjectCode: att.lectureSessionId?.subjectId?.subjectCode,
          topic:       att.lectureSessionId?.topic,
          date:        att.lectureSessionId?.startTime,
          status:      att.status,
          markedAt:    att.markedAt,
        })),
      },
    });
  } catch (e) { next(e); }
};

// GET /api/report/lecture/:lectureSessionId/summary
export const getLectureAttendanceSummary = async (req, res, next) => {
  try {
    const { lectureSessionId } = req.params;
    const [lecture, attendances] = await Promise.all([
      LectureSession.findById(lectureSessionId)
        .populate('subjectId', 'subjectName subjectCode')
        .populate('sectionId', 'name')
        .populate('facultyId', 'employeeId'),
      Attendance.find({ lectureSessionId })
        .populate({
          path: 'studentId',
          select: 'rollNumber userId',
          populate: { path: 'userId', select: 'name email' },
        }),
    ]);
    if (!lecture) return res.status(404).json({ success: false, message: 'Lecture not found' });

    const present = attendances.filter(a => a.status === 'PRESENT').length;
    res.json({
      success: true,
      data: {
        lectureInfo: {
          id:          lectureSessionId,
          subject:     lecture.subjectId?.subjectName,
          subjectCode: lecture.subjectId?.subjectCode,
          section:     lecture.sectionId?.name,
          topic:       lecture.topic,
          date:        lecture.startTime,
          status:      lecture.status,
          startTime:   lecture.startTime,
          endTime:     lecture.endTime,
          location:    lecture.location,
        },
        summary: {
          totalStudents: attendances.length,
          present,
          absent:        attendances.length - present,
          attendanceRate: attendances.length > 0
            ? parseFloat(((present / attendances.length) * 100).toFixed(2))
            : 0,
        },
        students: attendances.map(a => ({
          rollNumber: a.studentId?.rollNumber,
          name:       a.studentId?.userId?.name,
          email:      a.studentId?.userId?.email,
          status:     a.status,
          markedAt:   a.markedAt,
          markMethod: a.markMethod,
          location:   a.location,
        })),
      },
    });
  } catch (e) { next(e); }
};

// GET /api/report/faculty/dashboard
export const getFacultyDashboardStats = async (req, res, next) => {
  try {
    const facultyId = req.profileId;
    const [total, active, completed] = await Promise.all([
      LectureSession.countDocuments({ facultyId }),
      LectureSession.countDocuments({ facultyId, status: 'ACTIVE' }),
      LectureSession.countDocuments({ facultyId, status: 'COMPLETED' }),
    ]);
    const recentLectures = await LectureSession.find({ facultyId })
      .populate('subjectId', 'subjectName')
      .populate('sectionId', 'name')
      .sort({ startTime: -1 })
      .limit(10)
      .lean();

    res.json({
      success: true,
      data: {
        stats: { totalLectures: total, activeLectures: active, completedLectures: completed },
        recentLectures: recentLectures.map(l => ({
          id:           l._id,
          topic:        l.topic,
          subject:      l.subjectId?.subjectName,
          section:      l.sectionId?.name,
          date:         l.startTime,
          status:       l.status,
          presentCount: l.totalMarked,
        })),
      },
    });
  } catch (e) { next(e); }
};
