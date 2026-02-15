import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";
// import dayjs from "dayjs";
// import utc from "dayjs/plugin/utc.js";
// import timezone from "dayjs/plugin/timezone.js";

// import LectureSession from "../../models/Attendece/LectureSession.js";
import Student from "../../models/users/Student.js";
// import Attendance from "../../models/Attendece/Attendance.js";
// import AttendanceOverride from "../../models/Attendece/AttendanceOverride.js";
// import ExcelExport from "../../models/Report/ExcelExport.js";

/**
 * Advanced Sync: Updates student list AND calculates attendance ratios.
 * Folder: uploads/attendance/{sectionId}/{year}/{month}.xlsx
 */
export const syncStudentListToExcel = async (sectionId, year, month) => {
    console.log(`\n--- Advanced Sync Started: ${month}/${year} ---`);

    const sectionIdStr = sectionId.toString();
    const baseDir = path.join("uploads", "attendance", sectionIdStr, year.toString());
    const filePath = path.join(baseDir, `${month}.xlsx`);

    if (!fs.existsSync(filePath)) {
        throw new Error(`Attendance file for ${month}/${year} not found. Create it by ending a lecture first.`);
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.getWorksheet("Attendance");

    /* ---------- 1. IDENTIFY MISSING STUDENTS ---------- */
    // Get fresh list from DB
    const studentsInDb = await Student.find({ sectionId }).sort({ enrollmentNo: 1 });
    
    // Get list of who is already in the Excel (Column A)
    const existingEnrollments = [];
    worksheet.eachRow((row, rowNumber) => {
        if (rowNumber >= 4) { // Data starts at Row 4
            const val = row.getCell(1).value;
            if (val) {
                // Handle possible object/text formats from Excel
                const cleanEnr = typeof val === 'object' ? val.text : val.toString();
                existingEnrollments.push(cleanEnr.trim());
            }
        }
    });

    /* ---------- 2. APPEND NEW STUDENTS & FILL GAPS ---------- */
    let addedCount = 0;
    let nextAvailableRow = worksheet.rowCount + 1;
    const totalCols = worksheet.columnCount;

    studentsInDb.forEach(student => {
        const dbEnr = student.enrollmentNo.toString().trim();
        
        if (!existingEnrollments.includes(dbEnr)) {
            console.log(`➕ Syncing new student: ${dbEnr}`);
            
            // Add Enrollment and Name
            worksheet.getCell(`A${nextAvailableRow}`).value = dbEnr;
            worksheet.getCell(`B${nextAvailableRow}`).value = `${student.firstName} ${student.lastName}`;

            // FILL GAPS: If there are already attendance columns (Column 5+), 
            // mark this new student as 0 (Absent) for all previous lectures.
            for (let col = 5; col <= totalCols; col++) {
                if (worksheet.getCell(1, col).value) { // Check if it's a valid date column
                    worksheet.getCell(nextAvailableRow, col).value = 0;
                }
            }

            nextAvailableRow++;
            addedCount++;
        }
    });

    /* ---------- 3. UPDATE LIVE RATIOS (COLUMNS C & D) ---------- */
    // Column C = Total Present | Column D = Percentage
    worksheet.getCell("C1").value = "Total Present";
    worksheet.getCell("D1").value = "Attendance %";
    
    const dataStartCol = 5; // Attendance data starts from Column E
    const lectureCount = totalCols >= dataStartCol ? (totalCols - dataStartCol + 1) : 0;

    // Loop through every student row to refresh the math
    for (let r = 4; r <= worksheet.rowCount; r++) {
        const enr = worksheet.getCell(r, 1).value;
        if (!enr) continue;

        let studentPresentCount = 0;
        for (let c = dataStartCol; c <= totalCols; c++) {
            const val = worksheet.getCell(r, c).value;
            if (val === 1 || val === "1") studentPresentCount++;
        }

        // Write math to C and D
        worksheet.getCell(r, 3).value = studentPresentCount;
        
        if (lectureCount > 0) {
            const ratio = (studentPresentCount / lectureCount) * 100;
            worksheet.getCell(r, 4).value = `${ratio.toFixed(2)}%`;

            // Color coding (Visual Logic)
            worksheet.getCell(r, 4).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: ratio >= 75 ? 'FFC6EFCE' : 'FFFFC7CE' } // Green for >= 75%, Red for less
            };
        } else {
            worksheet.getCell(r, 4).value = "0.00%";
        }
    }

    /* ---------- 4. FINAL FORMATTING & SAVE ---------- */
    worksheet.getColumn(1).width = 20; // Enrollment
    worksheet.getColumn(2).width = 30; // Name
    worksheet.getColumn(3).width = 15; // Total
    worksheet.getColumn(4).width = 15; // Percentage

    await workbook.xlsx.writeFile(filePath);
    console.log(`✅ Sync complete. Students Added: ${addedCount}`);

    return { addedCount, totalStudents: studentsInDb.length, lecturesFound: lectureCount };
};