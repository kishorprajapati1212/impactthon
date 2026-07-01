import Section from "../../models/Academics/Section.js";
export const createSection = async (req, res, next) => {
  try {
    const { name, departmentId, semester, batchYear } = req.body;
    if (!departmentId) return res.status(400).json({ success: false, message: "departmentId is required" });
    if (!semester) return res.status(400).json({ success: false, message: "semester is required" });
    if (!batchYear) return res.status(400).json({ success: false, message: "batchYear is required" });
    if (await Section.findOne({ name, departmentId, semester, batchYear })) return res.status(400).json({ success: false, message: "Section already exists" });
    const section = await Section.create({ name, departmentId, semester, batchYear });
    res.status(201).json({ success: true, message: "Section created", data: section });
  } catch (e) { next(e); }
};
export const getAllSections = async (req, res, next) => {
  try {
    const sections = await Section.find({ isActive: true }).populate("departmentId", "name code").sort({ batchYear: -1, semester: 1 });
    res.json({ success: true, count: sections.length, data: sections });
  } catch (e) { next(e); }
};
