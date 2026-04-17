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


// GET all admins
export const getAllAdmins = asyncHandler(async (req, res) => {
  const admins = await Admin.find().select("_id name email");

  res.status(200).json({
    message: "Admins fetched successfully",
    data: admins,
  });
});

// GET admin by ID
export const getAdminById = asyncHandler(async (req, res) => {
  const admin = await Admin.findById(req.params.id);

  if (!admin) {
    return res.status(404).json({ message: "Admin not found" });
  }

  res.status(200).json({
    message: "Admin fetched successfully",
    data: admin,
  });
});

// UPDATE admin
export const updateAdmin = asyncHandler(async (req, res) => {
  const admin = await Admin.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  );

  res.status(200).json({
    message: "Admin updated successfully",
    data: admin,
  });
});

// DELETE admin
export const deleteAdmin = asyncHandler(async (req, res) => {
  const adminId = req.params.id;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Find admin to get the userId
    const admin = await Admin.findById(adminId).session(session);

    if (!admin) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Admin not found" });
    }

    // 2. Delete the User record
    if (admin.userId) {
      await User.findByIdAndDelete(admin.userId).session(session);
    }

    // 3. Delete the Admin record
    await Admin.findByIdAndDelete(adminId).session(session);

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({ message: "Admin and associated User deleted successfully" });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: "Delete failed", error: error.message });
  }
});