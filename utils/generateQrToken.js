import crypto from "crypto";

const generateQrToken = () => {
  return crypto.randomBytes(16).toString("hex");
};

export default generateQrToken;
