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
import AttendanceExcelMetadata from "../../models/Attendece/AttendanceExcelMetadata.js";
import StudentAttendanceSummary from "../../models/Report/StudentAttendanceSummary.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const IST = "Asia/Kolkata";

export const updateAttendanceExcel = async (lectureSessionId) => {
  console.log("\n" + "=".repeat(40));
  console.log("🚀 STARTING ATTENDANCE & SUMMARY SYNC");
  console.log("📍 Lecture ID:", lectureSessionId);

  /* ---------- 1. PREPARE LECTURE CONTEXT ---------- */
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

  const filePath = path.join(baseDir, `${month}.xlsx`);
  const workbook = new ExcelJS.Workbook();
  let worksheet;

  /* ---------- 2. METADATA (TABLE 1) ---------- */
  let meta = await AttendanceExcelMetadata.findOneAndUpdate(
    { sectionId: sectionId._id, year, month },
    { $setOnInsert: { totalLectures: 0 } },
    { upsert: true, new: true }
  );
  console.log(`📊 Current Monthly Total Lectures: ${meta.totalLectures}`);

  /* ---------- 3. EXCEL HANDLING ---------- */
  if (fs.existsSync(filePath)) {
    console.log("📂 Loading Excel file...");
    await workbook.xlsx.readFile(filePath);
    worksheet = workbook.getWorksheet("Attendance");
  } else {
    console.log("🆕 New Month: Creating Excel Workbook...");
    worksheet = workbook.addWorksheet("Attendance");
    worksheet.mergeCells("A1:A3"); worksheet.mergeCells("B1:B3");
    worksheet.getCell("A1").value = "Enrollment No";
    worksheet.getCell("B1").value = "Student Name";

    const students = await Student.find({ sectionId }).sort({ enrollmentNo: 1 });
    students.forEach((s, i) => {
      worksheet.getCell(`A${i + 4}`).value = s.enrollmentNo;
      worksheet.getCell(`B${i + 4}`).value = `${s.firstName} ${s.lastName}`;
    });

    await ExcelExport.findOneAndUpdate(
      { facultySubjectSectionId: lecture.facultySubjectSectionId, sectionId, month },
      { filePath, generatedBy: lecture.facultySubjectSectionId.facultyId, generatedAt: new Date() },
      { upsert: true }
    );
  }

  /* ---------- 4. COLUMN LOGIC ---------- */
  let targetCol = -1;
  const colCount = worksheet.columnCount;
  for (let c = 3; c <= colCount; c++) {
    if (worksheet.getCell(1, c).value === dateStr && worksheet.getCell(2, c).value === subjectCode && worksheet.getCell(3, c).value === timeSlot) {
      targetCol = c; break;
    }
  }

  const isNewLecture = (targetCol === -1);
  if (isNewLecture) {
    targetCol = Math.max(colCount, 2) + 1;
    console.log(`🆕 NEW Column identified at index: ${targetCol}`);
  } else {
    console.log(`🔄 UPDATE identified for Column index: ${targetCol}`);
  }

  worksheet.getCell(1, targetCol).value = dateStr;
  worksheet.getCell(2, targetCol).value = subjectCode;
  worksheet.getCell(3, targetCol).value = timeSlot;

  /* ---------- 5. ATTENDANCE & SUMMARY LOOP (TABLE 2) ---------- */
  const attendanceMap = await buildAttendanceMap(lectureSessionId);

  console.log("\n--- Student Processing Started ---");
  for (let r = 4; r <= worksheet.rowCount; r++) {
    const rawEnr = worksheet.getCell(`A${r}`).value;
    const enrollmentNo = (rawEnr && typeof rawEnr === 'object') ? rawEnr.text?.toString().trim() : rawEnr?.toString().trim();
    if (!enrollmentNo) continue;

    // Determine final status based on Map and Overrides
    const isPresentInDB = attendanceMap[enrollmentNo] === 1;
    let finalStatus = isPresentInDB ? 1 : 0;
    if (attendanceMap[enrollmentNo] === 0) finalStatus = 0; // Force absent override

    // ⚡ UPDATE THE SUMMARY TABLE
    await updateStudentSummary(enrollmentNo, sectionId._id, year, month, finalStatus, isNewLecture, meta._id);

    worksheet.getCell(r, targetCol).value = finalStatus;
  }
  console.log("--- Student Processing Finished ---\n");

  /* ---------- 6. FINALIZE METADATA ---------- */
  if (isNewLecture) {
    meta.totalLectures += 1;
    await meta.save();
    console.log(`📈 SUCCESS: Monthly lectures incremented to ${meta.totalLectures}`);
  }

  await workbook.xlsx.writeFile(filePath);
  console.log("✅ SYNC COMPLETED SUCCESSFULLY\n" + "=".repeat(40));
};

/**
 * UPDATED: Helper for Table 2 (Summaries)
 */
const updateStudentSummary = async (enrollmentNo, sectionId, year, month, finalStatus, isNewLecture, metadataId) => {
    // We only care about adding a "Present" count if they are actually present (finalStatus === 1)
    let presentInc = (finalStatus === 1 && isNewLecture) ? 1 : 0;

    // Handle updates: This logic can be expanded if you need to subtract when a status changes 0 -> 1 
    // but here we focus on the raw incremental sync for new lectures.

    let summary = await StudentAttendanceSummary.findOne({ enrollmentNo, year, sectionId });

    if (!summary) {
        summary = new StudentAttendanceSummary({ enrollmentNo, sectionId, year, monthlyData: [] });
    }

    let mIdx = summary.monthlyData.findIndex(m => m.month === month);
    if (mIdx === -1) {
        summary.monthlyData.push({ month, presentCount: presentInc, metadataId });
    } else {
        summary.monthlyData[mIdx].presentCount += presentInc;
        summary.monthlyData[mIdx].metadataId = metadataId;
    }

    // Console Log only for successful presence additions
    if (presentInc > 0) {
        console.log(`✨ [SUMMARY] ${enrollmentNo}: PresentCount incremented (+1) for month ${month}`);
    }

    // --- OVERALL PERCENTAGE LOGIC ---
    const allMeta = await AttendanceExcelMetadata.find({ sectionId, year });
    let classTotal = allMeta.reduce((acc, curr) => acc + curr.totalLectures, 0);
    if (isNewLecture) classTotal += 1;

    let studentTotalPresent = summary.monthlyData.reduce((acc, curr) => acc + curr.presentCount, 0);
    summary.overallPercentage = classTotal > 0 ? (studentTotalPresent / classTotal) * 100 : 0;

    await summary.save();
};

const buildAttendanceMap = async (id) => {
  const map = {};
  const records = await Attendance.find({ lectureSessionId: id });
  records.forEach(a => map[(a.studentEnrollmentNo || a.enrollmentNo).toString().trim()] = 1);
  const overrides = await AttendanceOverride.find({ lectureSessionId: id });
  overrides.forEach(o => {
    const v = o.finalStatus === "PRESENT" ? 1 : 0;
    if (o.applyType === "ALL") Object.keys(map).forEach(k => map[k] = v);
    else o.studentEnrollmentNos.forEach(e => map[e.toString().trim()] = v);
  });
  return map;
};