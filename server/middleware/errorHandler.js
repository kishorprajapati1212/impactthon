/**
 * Central error handler — users only ever see a short, human message.
 * Raw Mongoose / Mongo / JWT / library details are logged on the server
 * (without stack in the HTTP response) and never sent to the client.
 * Every error also carries a stable `code` the UI can switch on.
 */
const FRIENDLY_500 = "Something went wrong on our side. Please try again in a moment.";

const DUPLICATE_LABELS = {
  email: "This email is already registered. Try logging in instead.",
  rollNumber: "This roll number is already registered.",
  employeeId: "This employee ID is already registered.",
  subjectCode: "This subject code already exists.",
  code: "This code already exists.",
  name: "A record with this name already exists.",
};

function duplicateMessage(err) {
  const field = Object.keys(err.keyValue || {})[0] || "";
  if (DUPLICATE_LABELS[field]) return DUPLICATE_LABELS[field];
  // Compound unique indexes (e.g. section name+semester+batch)
  if (field) return "This record already exists. Please check the details and try again.";
  return "This record already exists.";
}

function validationMessage(err) {
  const first = Object.values(err.errors || {})[0];
  if (!first) return "Please check the highlighted fields and try again.";
  if (first.kind === "required") return "Please fill in all required fields.";
  if (first.kind === "enum") return "One of the selected values is not valid. Please choose again.";
  if (first.kind === "minlength" || first.kind === "maxlength") return "One field is too short or too long. Please check it and try again.";
  if (first.kind === "min" || first.kind === "max") return "One number is outside the allowed range.";
  return "Please check the entered details and try again.";
}

const errorHandler = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  let statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  let code = err.code && typeof err.code === "string" ? err.code : "SERVER_ERROR";
  let message = FRIENDLY_500;

  if (err.name === "CastError") {
    statusCode = 400; code = "INVALID_ID";
    message = "That record could not be found. It may have been removed.";
  } else if (err.code === 11000) {
    statusCode = 409; code = "ALREADY_EXISTS";
    message = duplicateMessage(err);
  } else if (err.name === "ValidationError") {
    statusCode = 400; code = "VALIDATION";
    message = validationMessage(err);
  } else if (err.name === "JsonWebTokenError") {
    statusCode = 401; code = "SESSION_INVALID";
    message = "Your session is not valid. Please log in again.";
  } else if (err.name === "TokenExpiredError") {
    statusCode = 401; code = "SESSION_EXPIRED";
    message = "Your session has expired. Please log in again.";
  } else if (err.type === "entity.parse.failed" || err instanceof SyntaxError) {
    statusCode = 400; code = "BAD_REQUEST";
    message = "The request could not be read. Please try again.";
  } else if (statusCode < 500 && err.message) {
    // Controllers deliberately set 4xx messages — those are already human.
    // Still cap length so a library string can never flood the UI.
    message = String(err.message).slice(0, 180);
  }

  // Server-side log only (never in response, no stack to client ever).
  console.error(`[ERROR] ${req.method} ${req.originalUrl} -> ${statusCode} ${code}: ${err.message || message}`);

  res.status(statusCode).json({ success: false, code, message });
};
export default errorHandler;
