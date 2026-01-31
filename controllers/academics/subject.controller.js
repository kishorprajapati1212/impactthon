import asyncHandler from "../../middleware/asyncHandler.js";
import Subject from "../../models/Academics/Subject.js";

export const createSubject = asyncHandler(async (req, res) => {
  const { subjectName, subjectCode, semester } = req.body;

  // Basic validation
  if (!subjectName || !subjectCode || !semester) {
    return res.status(400).json({
      message: "subjectName, subjectCode and semester are required",
    });
  }

  // Check duplicate subject code
  const existingSubject = await Subject.findOne({ subjectCode });
  if (existingSubject) {
    return res.status(409).json({
      message: "Subject with this code already exists",
    });
  }

  const subject = await Subject.create({
    subjectName,
    subjectCode,
    semester,
  });

  res.status(201).json({
    message: "Subject created successfully",
    subject,
  });
});
