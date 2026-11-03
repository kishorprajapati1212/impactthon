/**
 * ── Frontend Input Validation ───────────────────────────────────────
 * Mirror of server-side rules for real-time form feedback.
 * Used by react-hook-form's `validate` option.
 */

const ALPHA_SPACE = /^[A-Za-z\s]+$/;
const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const PHONE_RE = /^[6-9]\d{9}$/;

// ── Field validators (return true if valid, error string if not) ──

export const validators = {
  name: (v) => {
    if (!v || !v.trim()) return 'Name is required';
    if (v.trim().length < 2) return 'Name must be at least 2 characters';
    if (v.trim().length > 100) return 'Name must be under 100 characters';
    if (!ALPHA_SPACE.test(v.trim())) return 'Name can only contain letters and spaces';
    return true;
  },

  email: (v) => {
    if (!v || !v.trim()) return 'Email is required';
    if (!EMAIL_RE.test(v.trim())) return 'Enter a valid email address';
    return true;
  },

  password: (v) => {
    if (!v) return 'Password is required';
    if (v.length < 6) return 'Password must be at least 6 characters';
    if (v.length > 128) return 'Password must be under 128 characters';
    return true;
  },

  strongPassword: (v) => {
    if (!v) return 'Password is required';
    if (v.length < 8) return 'Password must be at least 8 characters';
    if (!/[A-Z]/.test(v)) return 'Must contain an uppercase letter';
    if (!/[a-z]/.test(v)) return 'Must contain a lowercase letter';
    if (!/\d/.test(v)) return 'Must contain a number';
    if (!/[@$!%*?&]/.test(v)) return 'Must contain a special character (@$!%*?&)';
    return true;
  },

  phone: (v) => {
    if (!v || v === '') return true; // optional
    if (!PHONE_RE.test(String(v).trim())) return 'Enter a valid 10-digit phone starting with 6-9';
    return true;
  },

  rollNumber: (v) => {
    if (!v || !v.trim()) return 'Roll number is required';
    if (v.trim().length < 3) return 'Roll number must be at least 3 characters';
    if (v.trim().length > 30) return 'Roll number must be under 30 characters';
    return true;
  },

  employeeId: (v) => {
    if (!v || !v.trim()) return 'Employee ID is required';
    if (v.trim().length < 2) return 'Employee ID must be at least 2 characters';
    if (v.trim().length > 30) return 'Employee ID must be under 30 characters';
    return true;
  },

  departmentCode: (v) => {
    if (!v || !v.trim()) return 'Code is required';
    if (v.trim().length < 2 || v.trim().length > 10) return 'Code must be 2-10 characters';
    if (!/^[A-Za-z0-9]+$/.test(v.trim())) return 'Code must be alphanumeric';
    return true;
  },

  subjectCode: (v) => {
    if (!v || !v.trim()) return 'Code is required';
    if (v.trim().length < 2 || v.trim().length > 15) return 'Code must be 2-15 characters';
    if (!/^[A-Za-z0-9]+$/.test(v.trim())) return 'Code must be alphanumeric';
    return true;
  },

  semester: (v) => {
    if (!v && v !== 0) return 'Semester is required';
    const n = Number(v);
    if (!Number.isInteger(n) || n < 1 || n > 8) return 'Semester must be 1-8';
    return true;
  },

  credits: (v) => {
    if (!v && v !== 0) return 'Credits is required';
    const n = Number(v);
    if (!Number.isInteger(n) || n < 1 || n > 10) return 'Credits must be 1-10';
    return true;
  },

  batchYear: (v) => {
    if (!v) return 'Batch year is required';
    const n = Number(v);
    const max = new Date().getFullYear() + 5;
    if (!Number.isInteger(n) || n < 2000 || n > max) return `Batch year must be 2000-${max}`;
    return true;
  },

  topic: (v) => {
    if (!v || !v.trim()) return 'Topic is required';
    if (v.trim().length < 3) return 'Topic must be at least 3 characters';
    if (v.trim().length > 500) return 'Topic must be under 500 characters';
    return true;
  },

  required: (v) => {
    if (!v || (typeof v === 'string' && !v.trim())) return 'This field is required';
    return true;
  },
};

export default validators;
