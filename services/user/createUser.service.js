import User from "../../models/users/User.js";
import hashPassword from "../../utils/hashPassword.js";

const createUser = async ({
  email,
  mobileNumber,
  password,
  role,
}) => {
  // Check existing user (email or mobile)
  const existingUser = await User.findOne({ email });

  if (existingUser) {
    throw new Error("User already exists");
  }
  console.log("-----------------------------try to do something --------------" , hashPassword(password))
  const user = await User.create({
    email,
    mobileNumber,
    role,
    passwordHash: await hashPassword(password),
    isActive: true,
  });
  console.log(user)
  return user;
};

export default createUser;
