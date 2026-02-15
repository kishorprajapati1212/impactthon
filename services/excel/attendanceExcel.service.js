import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";

import LectureSession from "../../models/Attendece/LectureSession.js";
import Student from "../../models/users/Student.js";
import Attendance from "../../models/Attendece/Attendance.js";
import AttendanceOverride from "../../models/Attendece/AttendanceOverride.js";
import ExcelExport from "../../models/Report/ExcelExport.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const IST = "Asia/Kolkata";

export const updateAttendanceExcel = async (lectureSessionId) => {
  console.log("\n========== EXCEL UPDATE START ==========");
  console.log("LectureSessionId:", lectureSessionId);

  const lecture = await LectureSession.findById(lectureSessionId).populate({
    path: "facultySubjectSectionId",
    populate: ["subjectId", "sectionId"],
  });

  if (!lecture) throw new Error("Lecture not found");

  const { sectionId, subjectId } = lecture.facultySubjectSectionId;
  const lectureDate = dayjs(lecture.lectureDate).tz(IST);
  const dateStr = lectureDate.format("YYYY-MM-DD");
  const year = lectureDate.format("YYYY");
  const month = lectureDate.format("MM");
  const timeSlot = `${dayjs(lecture.startTime).tz(IST).format("HH:mm")}-${dayjs(lecture.endTime).tz(IST).format("HH:mm")}`;
  const subjectCode = subjectId.subjectCode;

  const sectionIdStr = sectionId._id.toString();
  const baseDir = path.join("uploads", "attendance", sectionIdStr, year);
  if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });

  const fileName = `${month}.xlsx`;
  const filePath = path.join(baseDir, fileName);

  const workbook = new ExcelJS.Workbook();
  let worksheet;

  if (fs.existsSync(filePath)) {
    console.log("📂 Loading existing Excel");
    await workbook.xlsx.readFile(filePath);
    worksheet = workbook.getWorksheet("Attendance");
  } else {
    console.log("🆕 Creating new Excel");
    worksheet = workbook.addWorksheet("Attendance");
    worksheet.mergeCells("A1:A3");
    worksheet.mergeCells("B1:B3");
    worksheet.getCell("A1").value = "Enrollment No";
    worksheet.getCell("B1").value = "Student Name";

    const students = await Student.find({ sectionId }).sort({ enrollmentNo: 1 });
    let row = 4;
    students.forEach((s) => {
      worksheet.getCell(`A${row}`).value = s.enrollmentNo;
      worksheet.getCell(`B${row}`).value = `${s.firstName} ${s.lastName}`;
      row++;
    });
    
    const facultySubjectSectionId = lecture.facultySubjectSectionId;
    console.log(facultySubjectSectionId)
    const expo = await ExcelExport.findOneAndUpdate(
      { facultySubjectSectionId, sectionId, month },
      { filePath, generatedBy: facultySubjectSectionId.facultyId, generatedAt: new Date(), },
      { upsert: true }
    );
    // console.log("expo" + expo);
  }

  /* ---------- FIND OR CREATE COLUMN ---------- */
  let targetCol = -1;
  const colCount = worksheet.columnCount;
  for (let c = 3; c <= colCount; c++) {
    const hDate = worksheet.getCell(1, c).value;
    const hSub = worksheet.getCell(2, c).value;
    const hTime = worksheet.getCell(3, c).value;
    if (hDate === dateStr && hSub === subjectCode && hTime === timeSlot) {
      targetCol = c;
      break;
    }
  }

  if (targetCol === -1) {
    targetCol = Math.max(colCount, 2) + 1;
    console.log(`🆕 New Column created at: ${targetCol}`);
  } else {
    console.log(`🔄 Updating Existing Column at: ${targetCol}`);
  }

  worksheet.getCell(1, targetCol).value = dateStr;
  worksheet.getCell(2, targetCol).value = subjectCode;
  worksheet.getCell(3, targetCol).value = timeSlot;

  /* ---------- ATTENDANCE LOGIC ---------- */
  const attendanceMap = await buildAttendanceMap(lectureSessionId);

  for (let r = 4; r <= worksheet.rowCount; r++) {
    const rawEnr = worksheet.getCell(`A${r}`).value;
    let enrollmentNo = "";
    if (rawEnr && typeof rawEnr === 'object') {
      enrollmentNo = rawEnr.text ? rawEnr.text.toString().trim() : "";
    } else {
      enrollmentNo = rawEnr ? rawEnr.toString().trim() : "";
    }

    if (!enrollmentNo) continue;

    // --- ADDITIVE LOGIC ---
    // 1. Check if student is ALREADY present in the Excel sheet
    const existingValue = worksheet.getCell(r, targetCol).value;
    const alreadyPresentInExcel = (existingValue === 1 || existingValue === "1");

    // 2. Check if student is present in current Database/Overrides
    const presentInDB = attendanceMap[enrollmentNo] === 1;

    // Final Status: If they were present before OR they are present now -> mark 1
    let finalStatus = (alreadyPresentInExcel || presentInDB) ? 1 : 0;

    // Handle Override "ABSENT" logic: 
    // If the attendanceMap explicitly says 0 (because of an ABSENT override), we force 0
    if (attendanceMap[enrollmentNo] === 0) {
      finalStatus = 0;
    }

    if (r < 6 || enrollmentNo === "MCA20022") {
        console.log(`[Row ${r}] ${enrollmentNo}: PrevExcel(${alreadyPresentInExcel}) | DB(${presentInDB}) -> Final: ${finalStatus}`);
    }

    worksheet.getCell(r, targetCol).value = finalStatus;
  }

  await workbook.xlsx.writeFile(filePath);
  console.log("✅ Update complete.");
};

const buildAttendanceMap = async (lectureSessionId) => {
  console.log("🔎 Fetching Attendance Records...");
  const map = {};

  const attendanceRecords = await Attendance.find({ lectureSessionId });
  console.log(`Found ${attendanceRecords.length} DB records.`);

  // Sample check for your specific field "studentEnrollmentNo"
  if (attendanceRecords.length > 0) {
    console.log("DB Sample Field Check:", attendanceRecords[0].studentEnrollmentNo || "FIELD NOT FOUND");
  }

  attendanceRecords.forEach((a) => {
    const enr = a.studentEnrollmentNo || a.enrollmentNo;
    if (enr) map[enr.toString().trim()] = 1;
  });

  const overrides = await AttendanceOverride.find({ lectureSessionId });
  overrides.forEach((o) => {
    const val = o.finalStatus === "PRESENT" ? 1 : 0;
    if (o.applyType === "ALL") {
      // Note: If you have many students, you might want a different strategy for "ALL"
      // but this keeps your current logic.
      Object.keys(map).forEach(k => map[k] = val);
    } else {
      o.studentEnrollmentNos.forEach(enr => {
        if (enr) map[enr.toString().trim()] = val;
      });
    }
  });

  return map;
};




