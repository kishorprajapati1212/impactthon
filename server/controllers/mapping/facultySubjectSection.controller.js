import FacultySubjectSection from "../../models/mapping/FacultySubjectSection.js";
export const createFacultySubjectSection = async (req, res, next) => {
  try {
    const { facultyId, subjectId, sectionId, academicYear, semester } = req.body;
    const year = academicYear || new Date().getFullYear();
    if (await FacultySubjectSection.findOne({ facultyId, subjectId, sectionId, academicYear: year, semester })) return res.status(400).json({ success: false, message: "Assignment already exists" });
    const assignment = await FacultySubjectSection.create({ facultyId, subjectId, sectionId, academicYear: year, semester });
    const populated = await FacultySubjectSection.findById(assignment._id).populate("facultyId").populate("subjectId", "subjectName subjectCode").populate("sectionId", "name semester");
    res.status(201).json({ success: true, message: "Assigned successfully", data: populated });
  } catch (e) { next(e); }
};
export const getFacultyAssignments = async (req, res, next) => {
  try {
    const assignments = await FacultySubjectSection.find({ facultyId: req.profileId, isActive: true })
      .populate("subjectId", "subjectName subjectCode credits")
      .populate({ path: "sectionId", select: "name semester batchYear", populate: { path: "departmentId", select: "name code" } })
      .sort({ createdAt: -1 });
    res.json({ success: true, count: assignments.length, data: assignments });
  } catch (e) { next(e); }
};
