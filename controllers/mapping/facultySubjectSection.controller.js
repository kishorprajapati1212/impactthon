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

export const updateFacultySubjectSection = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { facultyId, subjectId, sectionId, academicYear } = req.body;

  // 1. Validate Mapping ID
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid Mapping ID" });
  }

  // 2. Check if the updated mapping would create a duplicate
  // We check if another record (not this one) has the same combination
  if (facultyId || subjectId || sectionId || academicYear) {
    const duplicate = await FacultySubjectSection.findOne({
      _id: { $ne: id }, // Not this record
      facultyId: facultyId || undefined,
      subjectId: subjectId || undefined,
      sectionId: sectionId || undefined,
      academicYear: academicYear || undefined,
    });

    if (duplicate) {
      return res.status(400).json({ 
        message: "Another mapping with this combination already exists for this year" 
      });
    }
  }

  // 3. Perform Update
  const updatedMapping = await FacultySubjectSection.findByIdAndUpdate(
    id,
    { facultyId, subjectId, sectionId, academicYear },
    { new: true, runValidators: true }
  )
  

  if (!updatedMapping) {
    return res.status(404).json({ message: "Mapping not found" });
  }

  res.status(200).json({
    message: "Mapping updated successfully",
    data: updatedMapping,
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
export const getFacultySectionStudents = asyncHandler(async (req, res) => {
  const facultyId = new mongoose.Types.ObjectId(req.profileId);
  const academicYear = req.query.academicYear ? req.query.academicYear.trim() : "2025-26";

  const sections = await FacultySubjectSection.aggregate([
    { 
      $match: { 
        facultyId: facultyId,
        academicYear: academicYear 
      } 
    },
    // 1. Join Section
    {
      $lookup: {
        from: "sections", 
        localField: "sectionId",
        foreignField: "_id",
        as: "sectionData"
      }
    },
    { $unwind: { path: "$sectionData", preserveNullAndEmptyArrays: true } },

    // 2. Join Subject
    {
      $lookup: {
        from: "subjects",
        localField: "subjectId",
        foreignField: "_id",
        as: "subjectData"
      }
    },
    { $unwind: { path: "$subjectData", preserveNullAndEmptyArrays: true } },

    // 3. Join Students & Count
    {
      $lookup: {
        from: "students",
        localField: "sectionId",
        foreignField: "sectionId", // Matches if mapping.sectionId exists in student.sectionId array
        as: "studentList"
      }
    },
    {
      $project: {
        _id: 0,
        mappingId: "$_id",
        // If section is missing in DB, show a warning
        sectionName: { $ifNull: ["$sectionData.name", "DELETED SECTION"] },
        subjectName: { $ifNull: ["$subjectData.subjectName", "UNKNOWN SUBJECT"] },
        semester: "$sectionData.semester",
        totalStudents: { $size: "$studentList" },
        academicYear: 1
      }
    }
  ]);

  res.status(200).json({
    success: true,
    data: sections
  });
});

// GET /api/mapping/faculty/section-lectures/:mappingId?page=1&limit=5
export const getFacultySectionLectures = asyncHandler(async (req, res) => {
  const { mappingId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 5;
  const skip = (page - 1) * limit;

  // Parallel execution for speed
  const [totalLectures, lectures] = await Promise.all([
    LectureSession.countDocuments({ facultySubjectSectionId: mappingId }),
    LectureSession.find({ facultySubjectSectionId: mappingId })
      .sort({ lectureDate: -1, startTime: -1 })
      .skip(skip)
      .limit(limit)
      .select("lectureDate startTime endTime durationMinutes isActive")
  ]);

  res.status(200).json({
    success: true,
    totalLectures, 
    currentPage: page,
    totalPages: Math.ceil(totalLectures / limit),
    data: lectures 
  });
});