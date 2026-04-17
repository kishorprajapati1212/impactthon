import asyncHandler from "../../middleware/asyncHandler.js";
import createUser from "../../services/user/createUser.service.js";
import Student from "../../models/users/Student.js";
import user from "../../models/users/User.js";
import authenticateUser from "../../services/user/authenticateUser.service.js"
import generateToken from "../../utils/generateToken.js";
import mongoose from "mongoose";

export const createStudent = asyncHandler(async (req, res) => {
  const { email, password, mobileNumber, enrollmentNo, firstName, lastName, dob, sectionId, mentorFacultyId, academicYear, batch} = req.body;

  // 1️ Create USER
  const user = await createUser({ email, password, mobileNumber, role: "STUDENT", });

  // 2️ Create STUDENT profile
  const student = await Student.create({
    userId: user._id,
    enrollmentNo,
    firstName,
    lastName,
    dob,
    sectionId,
    mentorFacultyId,
    academicYear,
    batch,
    // x DO NOT set device / selfie here
  });

  res.status(201).json({
    message: "Student created successfully",
    token: generateToken(user)
  });
});

export const studentLogin = asyncHandler(async (req, res) => {
  // const { email, password, deviceId } = req.body;
  const { email, password } = req.body;
  const deviceId = "jrhfhfb";

  if (!email || !password) {
    return res.status(400).json({
      message: "Email, password and deviceId are required",
    });
  }

  // 1️⃣ Authenticate like normal user
  const user = await authenticateUser({ email, password });
  console.log(user)

  // 2️⃣ Ensure role is STUDENT
  if (user.role !== "STUDENT") {
    return res.status(403).json({
      message: "Not a student account",
    });
  }

  // 3️⃣ Get student profile
  const student = await Student.findOne({ userId: user._id });
  console.log(student)

  if (!student) {
    return res.status(404).json({
      message: "Student profile not found",
    });
  }

  const now = new Date();

  // 4️⃣ FIRST LOGIN → bind device
  if (!student.boundDeviceId) {
    student.boundDeviceId = deviceId;

    // Device valid for 30 days (example)
    student.deviceBoundUntil = new Date(
      now.getTime() + 12 * 30 * 24 * 60 * 60 * 1000
    );

    await student.save();
  } else {
    // 5️⃣ Device already bound → check
    if (student.boundDeviceId !== deviceId) {
      return res.status(403).json({
        message: "Login denied. Device mismatch.",
      });
    }

    // 6️⃣ Check device expiry
    if (student.deviceBoundUntil && student.deviceBoundUntil < now) {
      return res.status(403).json({
        message: "Device binding expired. Please rebind device.",
      });
    }
  }

  // 7️⃣ Login success
  res.status(200).json({
    message: "Student login successful",
    token: generateToken(user),
    student: {
      enrollmentNo: student.enrollmentNo,
      firstName: student.firstName,
      lastName: student.lastName,
      // deviceBoundUntil: student.deviceBoundUntil,
    },
  });
});

export const getAllStudents = asyncHandler(async (req, res) => {
  const students = await Student.find()
    .populate("userId", "name email") // ✅ improved
    .select("_id enrollmentNo firstName lastName");

  res.json(students);
});

// GET single student
export const getStudentById = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);

  if (!student) {
    return res.status(404).json({ message: "Student not found" });
  }

  res.status(200).json({
    message: "Student fetched successfully",
    data: student,
  });
});

// GET logged-in student
export const getMyStudent = asyncHandler(async (req, res) => {
  const student = await Student.findOne({ userId: req.user.id });

  res.status(200).json({
    message: "Student profile fetched",
    data: student,
  });
});

// UPDATE student
export const updateStudent = asyncHandler(async (req, res) => {
  const student = await Student.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  );

  res.status(200).json({
    message: "Student updated successfully",
    data: student,
  });
});

// DELETE student
export const deleteStudent = asyncHandler(async (req, res) => {
  const studentId = req.params.id;

  // 1. Start a Session for the Transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 2. Find the Student first to get their userId
    // Note: Use .session(session) to include this operation in the transaction
    const student = await Student.findById(studentId).session(session);

    if (!student) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Student record not found" });
    }

    // 3. Delete the User record using the userId stored in the Student document
    if (student.userId) {
      // We look for the _id in the User collection that matches student.userId
      await user.findByIdAndDelete(student.userId).session(session);
    }

    // 4. Delete the Student profile record
    await Student.findByIdAndDelete(studentId).session(session);

    // 5. Commit the changes
    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      message: "Student and associated User account deleted successfully",
    });
  } catch (error) {
    // If anything fails, abort the transaction to prevent partial deletion
    await session.abortTransaction();
    session.endSession();
    
    res.status(500).json({ 
      message: "Delete failed", 
      error: error.message 
    });
  }
});