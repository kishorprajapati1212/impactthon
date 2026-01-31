import bcrypt from "bcryptjs";

const comparePassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

export default comparePassword;
