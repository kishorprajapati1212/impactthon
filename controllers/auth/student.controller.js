import asyncHandler from "../../middleware/asyncHandler.js";
import createUser from "../../services/user/createUser.service.js";
import Student from "../../models/users/Student.js";
// import user from "../../models/users/User.js";
import authenticateUser from "../../services/user/authenticateUser.service.js"
import generateToken from "../../utils/generateToken.js";

export const createStudent = asyncHandler(async (req, res) => {
  const {email, password, mobileNumber, enrollmentNo, firstName, lastName, dob, sectionId, mentorFacultyId,} = req.body;

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

  if (!email || !password ) {
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