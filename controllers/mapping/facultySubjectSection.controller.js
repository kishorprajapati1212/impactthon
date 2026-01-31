import asyncHandler from "../../middleware/asyncHandler.js";
import FacultySubjectSection from "../../models/mapping/FacultySubjectSection.js";
import Faculty from "../../models/users/Faculty.js";
import Subject from "../../models/Academics/Subject.js"
import Section from "../../models/Academics/Section.js"
import mongoose from "mongoose";

export const createFacultySubjectSection = asyncHandler(async (req, res) => {
  const { facultyId, subjectId, sectionId } = req.body;

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
