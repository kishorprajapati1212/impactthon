import Subject from "../../models/Academics/Subject.js";
export const createSubject = async (req, res, next) => {
  try {
    const { subjectName, subjectCode, departmentId, credits, semester } = req.body;
    if (await Subject.findOne({ subjectCode: subjectCode?.toUpperCase() })) return res.status(400).json({ success: false, message: "Subject code already exists" });
    const subject = await Subject.create({ subjectName, subjectCode: subjectCode.toUpperCase(), departmentId: departmentId || null, credits: credits || 3, semester: semester || 1 });
    res.status(201).json({ success: true, message: "Subject created", data: subject });
  } catch (e) { next(e); }
};
export const getAllSubjects = async (req, res, next) => {
  try {
    const subjects = await Subject.find({ isActive: true }).populate("departmentId", "name code").sort({ subjectName: 1 });
    res.json({ success: true, count: subjects.length, data: subjects });
  } catch (e) { next(e); }
};
