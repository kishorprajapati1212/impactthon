/**
 * ── Centralized Input Validation ───────────────────────────────────────
 * Every controller uses these validators before touching the database.
 * All rules are exported as pure functions — easy to test and reuse.
 */

// ── Generic helpers ────────────────────────────────────────────────────
const ALPHA_SPACE = /^[A-Za-z\s]+$/;
const ALPHA_NUM_SPACE = /^[A-Za-z0-9\s]+$/;
const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const PHONE_RE = /^[6-9]\d{9}$/;
const OBJECT_ID_RE = /^[a-fA-F0-9]{24}$/;
const STRONG_PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

export const isNonEmptyStr = (v, min = 1, max = 200) =>
  typeof v === 'string' && v.trim().length >= min && v.trim().length <= max;

export const isName = (v) =>
  isNonEmptyStr(v, 2, 100) && ALPHA_SPACE.test(v.trim());

export const isEmail = (v) =>
  isNonEmptyStr(v, 5, 254) && EMAIL_RE.test(v.trim());

export const isPassword = (v) =>
  isNonEmptyStr(v, 6, 128);

export const isStrongPassword = (v) =>
  isNonEmptyStr(v, 8, 128) && STRONG_PASSWORD_RE.test(v);

export const isPhone = (v) =>
  v === null || v === undefined || v === '' || PHONE_RE.test(String(v).trim());

export const isRollNumber = (v) =>
  isNonEmptyStr(v, 3, 30);

export const isEmployeeId = (v) =>
  isNonEmptyStr(v, 2, 30);

export const isDepartmentCode = (v) =>
  isNonEmptyStr(v, 2, 10) && /^[A-Za-z0-9]+$/.test(v.trim());

export const isSubjectCode = (v) =>
  isNonEmptyStr(v, 2, 15) && /^[A-Za-z0-9]+$/.test(v.trim());

export const isSemester = (v) =>
  Number.isInteger(Number(v)) && Number(v) >= 1 && Number(v) <= 16;

export const isCredits = (v) =>
  Number.isInteger(Number(v)) && Number(v) >= 1 && Number(v) <= 15;

export const isBatchYear = (v) => {
  const n = Number(v);
  const currentYear = new Date().getFullYear();
  return Number.isInteger(n) && n >= 2000 && n <= currentYear + 10;
};

export const isObjectId = (v) =>
  typeof v === 'string' && OBJECT_ID_RE.test(v);

export const isAttendanceWindow = (v) =>
  Number.isInteger(Number(v)) && Number(v) >= 1 && Number(v) <= 120;

export const isTopic = (v) =>
  isNonEmptyStr(v, 2, 500);

export const isDescription = (v) =>
  v === null || v === undefined || v === '' || isNonEmptyStr(v, 0, 2000);

export const isDesignation = (v) =>
  v === null || v === undefined || isNonEmptyStr(v, 2, 100);

export const isSpecialization = (v) =>
  v === null || v === undefined || isNonEmptyStr(v, 2, 200);

export const isRadius = (v) =>
  Number.isInteger(Number(v)) && Number(v) >= 10 && Number(v) <= 10000;

export const isLatitude = (v) =>
  typeof v === 'number' && v >= -90 && v <= 90;

export const isLongitude = (v) =>
  typeof v === 'number' && v >= -180 && v <= 180;

// ── Composite validators (return { valid, errors[] }) ──────────────────

export const validateCreateDepartment = (body) => {
  const errors = [];
  const { name, code, description } = body || {};
  if (!isName(name)) errors.push({ field: 'name', msg: 'Department name must be 2-100 alphabetic characters' });
  if (!isDepartmentCode(code)) errors.push({ field: 'code', msg: 'Department code must be 2-10 alphanumeric characters' });
  if (description !== undefined && description !== null && description !== '' && !isDescription(description))
    errors.push({ field: 'description', msg: 'Description max 2000 characters' });
  return { valid: errors.length === 0, errors };
};

export const validateCreateSubject = (body) => {
  const errors = [];
  const { subjectName, subjectCode, departmentId, credits, semester } = body || {};
  if (!isName(subjectName)) errors.push({ field: 'subjectName', msg: 'Subject name must be 2-100 alphabetic characters' });
  if (!isSubjectCode(subjectCode)) errors.push({ field: 'subjectCode', msg: 'Subject code must be 2-15 alphanumeric characters' });
  if (departmentId && !isObjectId(departmentId)) errors.push({ field: 'departmentId', msg: 'Invalid department ID' });
  if (credits !== undefined && !isCredits(credits)) errors.push({ field: 'credits', msg: 'Credits must be 1-15' });
  if (semester !== undefined && !isSemester(semester)) errors.push({ field: 'semester', msg: 'Semester must be 1-16' });
  return { valid: errors.length === 0, errors };
};

export const validateCreateSection = (body) => {
  const errors = [];
  const { name, departmentId, semester, batchYear } = body || {};
  if (!isName(name)) errors.push({ field: 'name', msg: 'Section name must be 2-100 alphabetic characters' });
  if (!isObjectId(departmentId)) errors.push({ field: 'departmentId', msg: 'Valid department ID required' });
  if (!isSemester(semester)) errors.push({ field: 'semester', msg: 'Semester must be 1-16' });
  if (!isBatchYear(batchYear)) errors.push({ field: 'batchYear', msg: `Batch year must be 2000-${new Date().getFullYear() + 10}` });
  return { valid: errors.length === 0, errors };
};

export const validateCreateStudent = (body) => {
  const errors = [];
  const { name, email, password, rollNumber, sectionId, departmentId, mentorId, phone, parentPhone } = body || {};
  if (!isName(name)) errors.push({ field: 'name', msg: 'Name must be 2-100 alphabetic characters' });
  if (!isEmail(email)) errors.push({ field: 'email', msg: 'Valid email required' });
  if (!isPassword(password)) errors.push({ field: 'password', msg: 'Password must be at least 6 characters' });
  if (!isRollNumber(rollNumber)) errors.push({ field: 'rollNumber', msg: 'Roll number must be 3-30 characters' });
  if (sectionId && !isObjectId(sectionId)) errors.push({ field: 'sectionId', msg: 'Invalid section ID' });
  if (departmentId && !isObjectId(departmentId)) errors.push({ field: 'departmentId', msg: 'Invalid department ID' });
  if (mentorId && !isObjectId(mentorId)) errors.push({ field: 'mentorId', msg: 'Invalid mentor ID' });
  if (phone && !isPhone(phone)) errors.push({ field: 'phone', msg: 'Phone must be a valid 10-digit Indian number' });
  if (parentPhone && !isPhone(parentPhone)) errors.push({ field: 'parentPhone', msg: 'Parent phone must be a valid 10-digit Indian number' });
  return { valid: errors.length === 0, errors };
};

export const validateCreateFaculty = (body) => {
  const errors = [];
  const { name, email, password, employeeId, departmentId, designation, phone, specialization } = body || {};
  if (!isName(name)) errors.push({ field: 'name', msg: 'Name must be 2-100 alphabetic characters' });
  if (!isEmail(email)) errors.push({ field: 'email', msg: 'Valid email required' });
  if (!isPassword(password)) errors.push({ field: 'password', msg: 'Password must be at least 6 characters' });
  if (!isEmployeeId(employeeId)) errors.push({ field: 'employeeId', msg: 'Employee ID must be 2-30 characters' });
  if (departmentId && !isObjectId(departmentId)) errors.push({ field: 'departmentId', msg: 'Invalid department ID' });
  if (designation && !isDesignation(designation)) errors.push({ field: 'designation', msg: 'Designation must be 2-100 characters' });
  if (phone && !isPhone(phone)) errors.push({ field: 'phone', msg: 'Phone must be a valid 10-digit Indian number' });
  if (specialization && !isSpecialization(specialization)) errors.push({ field: 'specialization', msg: 'Specialization must be 2-200 characters' });
  return { valid: errors.length === 0, errors };
};

export const validateCreateAdmin = (body) => {
  const errors = [];
  const { name, email, password, employeeId, phone } = body || {};
  if (!isName(name)) errors.push({ field: 'name', msg: 'Name must be 2-100 alphabetic characters' });
  if (!isEmail(email)) errors.push({ field: 'email', msg: 'Valid email required' });
  if (!isPassword(password)) errors.push({ field: 'password', msg: 'Password must be at least 6 characters' });
  if (!isEmployeeId(employeeId)) errors.push({ field: 'employeeId', msg: 'Employee ID must be 2-30 characters' });
  if (phone && !isPhone(phone)) errors.push({ field: 'phone', msg: 'Phone must be a valid 10-digit Indian number' });
  return { valid: errors.length === 0, errors };
};

export const validateStartLecture = (body) => {
  const errors = [];
  const { subjectId, sectionId, topic, description, attendanceWindow, location } = body || {};
  if (!isObjectId(subjectId)) errors.push({ field: 'subjectId', msg: 'Please select a valid subject (missing subject id)' });
  if (!isObjectId(sectionId)) errors.push({ field: 'sectionId', msg: 'Please select a valid section (missing section id)' });
  if (!isTopic(topic)) errors.push({ field: 'topic', msg: 'Topic must be at least 2 characters' });
  if (description && !isDescription(description)) errors.push({ field: 'description', msg: 'Description max 2000 characters' });
  if (attendanceWindow !== undefined && !isAttendanceWindow(attendanceWindow))
    errors.push({ field: 'attendanceWindow', msg: 'Window must be 1-120 minutes' });
  if (location) {
    if (location.latitude !== undefined && !isLatitude(location.latitude))
      errors.push({ field: 'location.latitude', msg: 'Latitude must be -90 to 90' });
    if (location.longitude !== undefined && !isLongitude(location.longitude))
      errors.push({ field: 'location.longitude', msg: 'Longitude must be -180 to 180' });
  }
  return { valid: errors.length === 0, errors };
};

export const validateAssignFaculty = (body) => {
  const errors = [];
  const { facultyId, subjectId, sectionId, academicYear, semester } = body || {};
  if (!isObjectId(facultyId)) errors.push({ field: 'facultyId', msg: 'Valid faculty ID required' });
  if (!isObjectId(subjectId)) errors.push({ field: 'subjectId', msg: 'Valid subject ID required' });
  if (!isObjectId(sectionId)) errors.push({ field: 'sectionId', msg: 'Valid section ID required' });
  if (academicYear && !isBatchYear(academicYear)) errors.push({ field: 'academicYear', msg: 'Invalid academic year' });
  if (semester !== undefined && !isSemester(semester)) errors.push({ field: 'semester', msg: 'Semester must be 1-16' });
  return { valid: errors.length === 0, errors };
};

export const validateMarkAttendance = (body) => {
  const errors = [];
  const { qrData, location } = body || {};
  if (!qrData || typeof qrData !== 'string' || qrData.trim().length < 10)
    errors.push({ field: 'qrData', msg: 'QR data is required' });
  if (!location || typeof location.latitude !== 'number' || typeof location.longitude !== 'number')
    errors.push({ field: 'location', msg: 'Valid GPS location required' });
  return { valid: errors.length === 0, errors };
};
