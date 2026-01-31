import User from "../../models/users/User.js";
import Admin from "../../models/users/Admin.js";
import asyncHandler from "../../middleware/asyncHandler.js";
import generateToken from "../../utils/generateToken.js";
import createUser from "../../services/user/createUser.service.js";
import authenticateUser from "../../services/user/authenticateUser.service.js"

export const createAdmin = asyncHandler(async (req, res) => {
  const { name, email, password, mobileNumber } = req.body;

  // create the user with method
  const user = await createUser({
    email,
    mobileNumber,
    password,
    role: "ADMIN",
  });

  // ---------------------------------------------------------
//   console.log(user)

  // Create admin profile
  const admin = await Admin.create({
    userId: user._id,
    name,
  });
  // ---------------------------------------------------------
//   console.log(admin)

  res.status(201).json({
    message: "Admin created successfully",
    token: generateToken(user)
  });
});

export const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
  
    // 1. Check input
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }
  
    // 2. Find user
    const user = await authenticateUser({ email, password });

    // 5. Success
    res.status(200).json({
      message: "Login successful",
      token: generateToken(user)
    });
  });
