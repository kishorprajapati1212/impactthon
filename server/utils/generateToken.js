import jwt from "jsonwebtoken";

const generateToken = (id, role, loginId) => {
  const payload = { id, role };
  if (loginId) payload.loginId = loginId;
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "7d",
  });
};

export default generateToken;
