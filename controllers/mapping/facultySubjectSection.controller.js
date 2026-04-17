import asyncHandler from "../../middleware/asyncHandler.js";
import FacultySubjectSection from "../../models/mapping/FacultySubjectSection.js";
import Faculty from "../../models/users/Faculty.js";
import Subject from "../../models/Academics/Subject.js"
import Section from "../../models/Academics/Section.js"
import Student from "../../models/users/Student.js";
import LectureSession from "../../models/Attendece/LectureSession.js";
import mongoose from "mongoose";

export const createFacultySubjectSection = asyncHandler(async (req, res) => {
  const { facultyId, subjectId, sectionId, academicYear } = req.body;

  // 1️⃣ Validate faculty exists
  const faculty = await Faculty.findById(facultyId);
  if (!faculty) {
    return res.status(404).json({ message: "Faculty not found" });
  }

  // 2️⃣ Check duplicate mapping
  const exists = await FacultySubjectSection.findOne({
    facultyId,
    subjectId,
    sectionId,
    academicYear,
  });

  if (exists) {
    return res.status(400).json({
      message: "Mapping already exists",
    });
  }

  // 3️⃣ Create mapping
  const mapping = await FacultySubjectSection.create({
    facultyId,
    subjectId,
    sectionId,
    academicYear,
  });

  res.status(201).json({
    message: "Faculty-Subject-Section mapped successfully",
  });
});

export const getFacultyAssignments = asyncHandler(async (req, res) => {
  const facultyId = req.profileId; // already ObjectId
  console.log("Faculty profileId:", facultyId);

  const assignments = await FacultySubjectSection.find({
    facultyId: facultyId,
  })
    .populate({
      path: "subjectId",
      select: "subjectName subjectCode semester",
    })
    .populate({
      path: "sectionId",
      select: "name semester",
    });

  // format response (optional but clean)
  const formatted = assignments.map((item) => ({
    _id: item._id,

    subjectId: item.subjectId?._id,
    subjectName: item.subjectId?.subjectName,

    sectionId: item.sectionId?._id,
    sectionName: item.sectionId?.name,
    sectionSemester: item.sectionId?.semester,
  }));

  res.status(200).json({
    count: formatted.length,
    assignments: formatted,
  });
});

export const getFacultyDashboardSummary = asyncHandler(async (req, res) => {
  const facultyId = new mongoose.Types.ObjectId(req.profileId);

  const summary = await FacultySubjectSection.aggregate([
    { $match: { facultyId: facultyId } },
    
    // Join with Subject
    {
      $lookup: {
        from: "subjects",
        localField: "subjectId",
        foreignField: "_id",
        as: "subject"
      }
    },
    { $unwind: "$subject" },

    // Join with Section
    {
      $lookup: {
        from: "sections",
        localField: "sectionId",
        foreignField: "_id",
        as: "section"
      }
    },
    { $unwind: "$section" },

    // Count Students (Handles sectionId as an array in Student model)
    {
      $lookup: {
        from: "students",
        localField: "sectionId",
        foreignField: "sectionId",
        as: "studentList"
      }
    },

    // Count Lectures (Ensuring ID types match using $expr)
    {
      $lookup: {
        from: "lecture_sessions",
        let: { mappingId: "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$facultySubjectSectionId", "$$mappingId"] } } }
        ],
        as: "lectureList"
      }
    },

    // Final Shape of data
    {
      $project: {
        _id: 0,
        mappingId: "$_id",
        subjectName: "$subject.subjectName",
        subjectCode: "$subject.subjectCode",
        sectionName: "$section.name",
        semester: "$section.semester",
        totalStudents: { $size: "$studentList" },
        totalLectures: { $size: "$lectureList" }
      }
    }
  ]);

  res.status(200).json({
    success: true,
    count: summary.length,
    data: summary
  });
});

export const getIndividualSectionStats = asyncHandler(async (req, res) => {
  const { mappingId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(mappingId)) {
    return res.status(400).json({ message: "Invalid Mapping ID" });
  }

  // 1. Fetch Mapping with Basic Details
  const mapping = await FacultySubjectSection.findById(mappingId)
    .populate("subjectId", "subjectName subjectCode")
    .populate("sectionId", "name semester");

  if (!mapping) return res.status(404).json({ message: "Mapping not found" });

  // 2. Parallel execution for performance (Scalability!)
  const [totalStudents, totalLectures, lastLecture] = await Promise.all([
    Student.countDocuments({ sectionId: mapping.sectionId }),
    LectureSession.countDocuments({ facultySubjectSectionId: mappingId }),
    LectureSession.findOne({ facultySubjectSectionId: mappingId }).sort({ lectureDate: -1 })
  ]);

  // 3. (Optional) Get attendance for the last lecture if it exists
  let lastLectureAttendance = 0;
  if (lastLecture) {
    const attendanceCount = await mongoose.model("Attendance").countDocuments({ 
      lectureSessionId: lastLecture._id 
    });
    lastLectureAttendance = totalStudents > 0 ? (attendanceCount / totalStudents) * 100 : 0;
  }

  res.status(200).json({
    success: true,
    data: {
      mappingId: mapping._id,
      subject: mapping.subjectId,
      section: mapping.sectionId,
      stats: {
        totalStudents,
        totalLectures,
        lastLectureDate: lastLecture?.lectureDate || null,
        lastLectureAttendancePercent: Math.round(lastLectureAttendance)
      }
    }
  });
});