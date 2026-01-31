import User from "../../models/users/User.js";
import comparePassword from "../../utils/comparePassword.js";

const authenticateUser = async ({ email, password }) => {
  // Find user by email
  const user = await User.findOne({ email });

  if (!user) {
    throw new Error("Invalid email or password");
  }

  // Check active
  if (!user.isActive) {
    throw new Error("User is inactive");
  }

  // Compare password
  const isMatch = await comparePassword(password, user.passwordHash);
  if (!isMatch) {
    throw new Error("Invalid email or password");
  }

  return user; // 👈 important
};

export default authenticateUser;
