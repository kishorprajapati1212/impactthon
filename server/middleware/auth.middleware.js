import asyncHandler from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import User from "../models/users/User.js";
import StudentSession from "../models/users/StudentSession.js";
import { deviceIsAllowed } from "../services/deviceAuthService.js";

const protect = asyncHandler(async (req, res, next) => {
  let token;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Not authorized — no token provided. Please login.",
    });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Your session has expired. Please login again.",
      });
    }
    return res.status(401).json({
      success: false,
      message: "Invalid token. Please login again.",
    });
  }

  const user = await User.findById(decoded.id).select("-password");

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Account not found. Please login again.",
    });
  }

  if (!user.isActive) {
    return res.status(401).json({
      success: false,
      message: "Your account has been deactivated. Contact your administrator.",
    });
  }

  // ── Device binding for STUDENT sessions ─────────────────────────────
  // Once a student logs out (or logs in on a new device), the loginId changes
  // and must be re-approved by the mentor. Even while a session is ALIVE, the
  // request must come from the SAME physical device that was registered.
  // This is what stops a student from handing their phone to a friend: the
  // friend's device fails the fingerprint check (AUTH_DEVICE_REQUIRED) even
  // if they somehow copied the token.
  if (user.role === "STUDENT") {
    const devHeader = req.headers["x-device-id"];
    if (!devHeader || String(devHeader).length < 16) {
      return res.status(401).json({
        success: false,
        code: "AUTH_DEVICE_REQUIRED",
        message:
          "This device is not trusted for the student account. Please login again from your own phone — each login must be approved by your mentor.",
      });
    }

    let session = null;
    if (decoded.loginId) {
      session = await StudentSession.findOne({ loginId: decoded.loginId });
    } else {
      // Legacy tokens (pre device-binding): keep working until re-login
      return res.status(426).json({
        success: false,
        code: "AUTH_RELOGIN_REQUIRED",
        message:
          "Please login again — your account now uses device-bound login.",
      });
    }

    if (!session) {
      return res.status(401).json({
        success: false,
        code: "AUTH_SESSION_GONE",
        message: "Your login session was ended. Please login again.",
      });
    }

    if (session.status === "PENDING") {
      return res.status(401).json({
        success: false,
        code: "AUTH_APPROVAL_PENDING",
        message:
          "Your login is waiting for your mentor's approval. Ask your mentor to accept this device.",
        data: {
          loginId: session.loginId,
          deviceLabel: session.deviceLabel || null,
        },
      });
    }
    if (session.status === "REJECTED") {
      return res.status(401).json({
        success: false,
        code: "AUTH_REJECTED",
        message:
          "This login was rejected by your mentor. Please contact them.",
      });
    }
    if (session.status === "LOGGED_OUT") {
      return res.status(401).json({
        success: false,
        code: "AUTH_LOGGED_OUT",
        message:
          "You are logged out. Login again — your mentor will confirm the device.",
      });
    }

    // ACTIVE but wrong device → block (proxy attendance protection)
    if (!deviceIsAllowed(session, String(devHeader))) {
      return res.status(401).json({
        success: false,
        code: "AUTH_DEVICE_MISMATCH",
        message:
          "This device was not used to login. Attendance and data are tied to your own phone — please login from your registered device.",
      });
    }

    const lastSeen = session.lastSeenAt ? session.lastSeenAt.getTime() : 0;
    if (Date.now() - lastSeen > 60 * 1000) {
      session.lastSeenAt = new Date();
      session.save().catch(() => {});
    }
  }

  req.user = user;
  next();
});

export default protect;
