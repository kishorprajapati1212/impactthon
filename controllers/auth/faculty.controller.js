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