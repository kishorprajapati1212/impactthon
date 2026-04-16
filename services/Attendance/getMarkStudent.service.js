import Attendance from "../../models/Attendece/Attendance.js";
import AttendanceOverride from "../../models/Attendece/AttendanceOverride.js";
import Student from "../../models/users/Student.js";

export const getLectureAttendanceReport = async (lectureSessionId) => {

  // 1️⃣ Get attendance + overrides
  const [records, overrides] = await Promise.all([
    Attendance.find({ lectureSessionId })
      .select("studentEnrollmentNo gpsLocation createdAt")
      .lean(),
    AttendanceOverride.find({ lectureSessionId }).lean()
  ]);

  const attendanceMap = {};

  // 2️⃣ Add normal attendance (default present)
  records.forEach(a => {
    attendanceMap[a.studentEnrollmentNo] = {
      status: 1,
      gpsLocation: a.gpsLocation,
      createdAt: a.createdAt
    };
  });

  // 3️⃣ Apply overrides
  overrides.forEach(o => {
    const finalStatus = o.finalStatus === "PRESENT" ? 1 : 0;

    if (o.applyType === "ALL") {
      // If ALL absent → clear map
      if (finalStatus === 0) {
        Object.keys(attendanceMap).forEach(k => delete attendanceMap[k]);
      }
    } else {
      o.studentEnrollmentNos.forEach(enr => {
        if (finalStatus === 1) {
          attendanceMap[enr] = {
            status: 1,
            gpsLocation: null,
            createdAt: new Date()
          };
        } else {
          delete attendanceMap[enr]; // remove absent override
        }
      });
    }
  });

  // 4️⃣ Get only PRESENT student details
  const presentEnrollmentNos = Object.keys(attendanceMap);

  if (presentEnrollmentNos.length === 0) return [];

  const presentStudents = await Student.find({
    enrollmentNo: { $in: presentEnrollmentNos }
  })
    .select("enrollmentNo firstName lastName")
    .lean();

  // 5️⃣ Final response
  const report = presentStudents.map(s => {
    const data = attendanceMap[s.enrollmentNo];

    return {
      enrollmentNo: s.enrollmentNo,
      name: `${s.firstName} ${s.lastName}`,
      status: "PRESENT",
      gpsLocation: data?.gpsLocation || null,
      createdAt: data?.createdAt || null
    };
  });

  return report;
};
