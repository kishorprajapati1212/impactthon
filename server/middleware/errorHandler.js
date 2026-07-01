const errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message || "Internal Server Error";

  if (err.name === "CastError") { statusCode = 400; message = `Invalid id: ${err.value}`; }
  if (err.code === 11000) { statusCode = 400; message = `${Object.keys(err.keyValue)[0]} already exists`; }
  if (err.name === "ValidationError") { statusCode = 400; message = Object.values(err.errors).map(v => v.message).join(", "); }
  if (err.name === "JsonWebTokenError") { statusCode = 401; message = "Invalid token"; }
  if (err.name === "TokenExpiredError") { statusCode = 401; message = "Token expired, please login again"; }

  res.status(statusCode).json({
    success: false,
    message,
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
};

export default errorHandler;
