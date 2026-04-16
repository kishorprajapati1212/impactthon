import asyncHandler from "../../middleware/asyncHandler.js";
import Subject from "../../models/Academics/Subject.js";
import Section from "../../models/Academics/Section.js";
import Department from "../../models/Academics/Department.js";

// GET Subjects
export const getAllSubjects = asyncHandler(async (req, res) => {
  const subjects = await Subject.find().select("_id subjectName subjectCode");

  res.status(200).json({
    message: "Subjects fetched successfully",
    data: subjects,
  });
});

// GET Sections
export const getAllSections = asyncHandler(async (req, res) => {
  const sections = await Section.find().select("_id name semester");

  res.status(200).json({
    message: "Sections fetched successfully",
    data: sections,
  });
});

// GET Departments
export const getAllDepartments = asyncHandler(async (req, res) => {
  const departments = await Department.find().select("_id name");

  res.status(200).json({
    message: "Departments fetched successfully",
    data: departments,
  });
});