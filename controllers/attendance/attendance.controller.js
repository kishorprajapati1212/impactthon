// controllers/attendance/attendance.controller.js
import Attendance from "../../models/Attendece/Attendance.js";
import LectureSession from "../../models/Attendece/LectureSession.js";
// import student from "../../models/users/Student.js"
// import Attendance from "../../models/Attendece/Attendance.js"
import Student from "../../models/users/Student.js";
import FacultySubjectSection from "../../models/mapping/FacultySubjectSection.js"

export const markAttendance = async (req, res) => {
  const { lectureSessionId, gpsLocation, source } = req.body;
  const studentProfileId = req.profileId;

  // 1️⃣ Get student
  const student = await Student.findById(studentProfileId);
  if (!student) {
    return res.status(404).json({ message: "Student not found" });
  }

  // 2️⃣ Get lecture
  console.log(lectureSessionId)
  const lecture = await LectureSession.findOne({ _id: lectureSessionId });
  if (!lecture || !lecture.isActive) {
    return res.status(400).json({ message: "Lecture not active" });
  }

  // 3️⃣ Section validation
//   console.log(lecture.sectionId)
//   console.log(student.sectionId)
//   if (!student.sectionId.includes(lecture.sectionId)) {
//     return res.status(403).json({
//       message: "Student does not belong to this section"
//     });
//   }

  // 4️⃣ Prevent duplicate attendance
  const exists = await Attendance.findOne({
    lectureSessionId,
    studentEnrollmentNo: student.enrollmentNo
  });

  if (exists) {
    return res.status(400).json({
      message: "Attendance already marked"
    });
  }

  // 5️⃣ Save attendance
  await Attendance.create({
    lectureSessionId,
    studentEnrollmentNo: student.enrollmentNo,
    gpsLocation,
    source
  });

  res.status(201).json({
    message: "Attendance marked successfully"
  });
};

export const getLectureAttendanceStatus = async (req, res) => {
  const { lectureSessionId } = req.params;

  // 1️⃣ Get lecture session (CORRECT MODEL)
  const lecture = await LectureSession.findById(lectureSessionId);
  if (!lecture) {
    return res.status(404).json({ message: "Lecture session not found" });
  }

  // 2️⃣ Find sectionId via facultySubjectSection
  // (optional but architecturally correct)
  const fss = await FacultySubjectSection.findById(
    lecture.facultySubjectSectionId
  );
 
  // 3️⃣ Total students in that section
  const totalStudents = await Student.countDocuments({
    sectionId: { $in: [fss.sectionId] } // or derived sectionId
  });
  // console.log(totalStudents)
  // const totalStudents   = 30
  // 4️⃣ Attendance records
  const attendanceRecords = await Attendance.find({
    lectureSessionId
  }).select("studentEnrollmentNo scannedAt source");

  const presentCount = attendanceRecords.length;

  // 5️⃣ Present enrollment numbers
  const presentEnrollmentNos = attendanceRecords.map(
    (a) => a.studentEnrollmentNo
  );

  res.status(200).json({
    lectureSessionId,
    totalStudents,
    presentCount,
    absentCount: totalStudents - presentCount,
    presentStudents: presentEnrollmentNos
  });
};
