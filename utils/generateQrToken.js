import crypto from "crypto";

const generateQrToken = () => {
  console.log("token")
  return crypto.randomBytes(16).toString("hex");
};

export default generateQrToken;
