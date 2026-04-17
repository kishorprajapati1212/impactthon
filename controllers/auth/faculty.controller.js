import asyncHandler from "../../middleware/asyncHandler.js";
import createUser from "../../services/user/createUser.service.js";
import Faculty from "../../models/users/Faculty.js";
import generateToken from "../../utils/generateToken.js";
import authenticateUser from "../../services/user/authenticateUser.service.js";

export const createFaculty = asyncHandler(async (req, res) => {
  const { email, mobileNumber, password, employeeId, departmentID } = req.body;

  // 1. Create USER (common logic)
  const user = await createUser({
    email,
    mobileNumber,
    password,
    role: "FACULTY",
  });

  // 2. Create FACULTY profile
  const faculty = await Faculty.create({
    userId: user._id,
    employeeId,
    departmentID,
  });

  res.status(201).json({
    message: "Faculty created successfully",
    faculty: {
      id: faculty._id,
      employeeId: faculty.employeeId,
      userId: user._id,
    },
  });
});

export const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body; 
  
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }
  
    const user = await authenticateUser({ email, password });
  
    res.status(200).json({
      message: "Login successful",
      token: generateToken(user),
    });
  });

// GET all faculty
export const getAllFaculty = asyncHandler(async (req, res) => {
  const faculty = await Faculty.find()
    .populate("userId", "name email")
    .select("_id employeeId");

  res.status(200).json({
    message: "Faculty fetched successfully",
    data: faculty,
  });
});

// GET logged-in faculty
export const getMyFaculty = asyncHandler(async (req, res) => {
  console.log("req user Id", req.user._id);

  const faculty = await Faculty.findOne({ userId: req.user.id })
    .populate("userId", "email name")
    .populate("departmentId", "name");

  console.log(faculty);

  res.status(200).json({
    message: "Faculty profile fetched",
    data: faculty,
  });
});

export const getFacultyById = asyncHandler(async (req, res) => {
  const faculty = await Faculty.findById(req.params.id);

  if (!faculty) {
    return res.status(404).json({ message: "Faculty not found" });
  }

  res.status(200).json({
    message: "Faculty fetched successfully",
    data: faculty,
  });
});

export const updateFaculty = asyncHandler(async (req, res) => {
  const faculty = await Faculty.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  );

  res.status(200).json({
    message: "Faculty updated successfully",
    data: faculty,
  });
});

export const deleteFaculty = asyncHandler(async (req, res) => {
  const facultyId = req.params.id;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Find faculty to get the userId
    const faculty = await Faculty.findById(facultyId).session(session);

    if (!faculty) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Faculty not found" });
    }

    // 2. Delete the User record
    if (faculty.userId) {
      await User.findByIdAndDelete(faculty.userId).session(session);
    }

    // 3. Delete the Faculty record
    await Faculty.findByIdAndDelete(facultyId).session(session);

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({ message: "Faculty and associated User deleted successfully" });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: "Delete failed", error: error.message });
  }
});