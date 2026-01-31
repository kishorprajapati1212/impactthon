import asyncHandler from "../../middleware/asyncHandler.js";
import LectureSession from "../../models/Attendece/LectureSession.js";
import FacultySubjectSection from "../../models/mapping/FacultySubjectSection.js";
import generateQrToken from "../../utils/generateQrToken.js";

export const startLectureSession = asyncHandler(async (req, res) => {
  const { facultySubjectSectionId, gpsLocation } = req.body;

  // 1️⃣ Validate mapping exists
  const mapping = await FacultySubjectSection.findById(
    facultySubjectSectionId
  );

  if (!mapping) {
    return res.status(404).json({ message: "Invalid mapping" });
  }

  // 2️⃣ Check if lecture already active
  const activeLecture = await LectureSession.findOne({
    facultySubjectSectionId,
    isActive: true,
  });

  if (activeLecture) {
    return res.status(400).json({
      message: "Lecture already active for this class",
    });
  }

  // 3️⃣ Create lecture session
  const lecture = await LectureSession.create({
    facultySubjectSectionId,
    lectureDate: new Date(),
    startTime: new Date(),
    qrToken: generateQrToken(),
    gpsLocation,
    isActive: true,
  });
  console.log(lecture)
  res.status(201).json({
    message: "Lecture started successfully",
    lecture,
  });
});


export const endLectureSession = asyncHandler(async (req, res) => {
    const { lectureSessionId } = req.body;
  
    const lecture = await LectureSession.findById(lectureSessionId);
  
    if (!lecture || !lecture.isActive) {
      return res.status(404).json({ message: "Active lecture not found" });
    }
  
    const endTime = new Date();
    const durationMinutes = Math.round(
      (endTime - lecture.startTime) / (1000 * 60)
    );
  
    lecture.endTime = endTime;
    lecture.durationMinutes = durationMinutes;
    lecture.isActive = false;
  
    await lecture.save();
  
    res.status(200).json({
      message: "Lecture ended successfully",
      lecture,
    });
  });
  