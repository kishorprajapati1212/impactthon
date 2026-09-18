/**
 * ── Error Handler Middleware ──────────────────────────────────────────
 * Catches errors from asyncHandler and formats them consistently.
 * All controllers use asyncHandler so you never write try/catch.
 */

const errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message || "Internal Server Error";

  // Mongoose bad ObjectId
  if (err.name === "CastError") {
    statusCode = 400;
    message = `Invalid ID format: "${err.value}". Expected a 24-character hex string.`;
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue || {})[0] || "field";
    const value = err.keyValue?.[field] || "";
    message = `"${value}" is already in use. Please use a different ${field}.`;
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((v) => v.message)
      .join(". ");
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid authentication token. Please login again.";
  }

  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Your session has expired. Please login again.";
  }

  // Log in development
  if (process.env.NODE_ENV !== "production") {
    console.error(`[ERROR] ${statusCode} — ${message}`);
    if (err.stack) {
      console.error(err.stack.split("\n").slice(0, 3).join("\n"));
    }
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
};

export default errorHandler;
