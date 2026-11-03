/**
 * Demo college data for the seeder - plain constants, no database code.
 *
 * Every person logs in with  <firstname>@attendx.com  and the password 123456.
 * The four students the user asked for - Nihal, Jeel, Ritik, Darshit - sit
 * together in class CE · A (2024 batch); Sahil and Jatin are their teachers
 * and mentors. Everything else exists so that EVERY table has at least ten
 * realistic rows (10 admins, 10 departments, 11 classes, 12 teachers,
 * 58 students, 16 subjects, 19 teaching assignments, 10 parents, …).
 */

export const PASSWORD = "123456";
export const emailFor = (name) => `${name.toLowerCase().replace(/[^a-z]/g, "")}@attendx.com`;

// ── Admin accounts (10) ───────────────────────────────────────────────
export const ADMINS = [
  { name: "Admin", email: "admin@attendx.com", employeeId: "ADM001", phone: "9800000001" },
  { name: "Principal", email: "principal@attendx.com", employeeId: "ADM002", phone: "9800000002" },
  { name: "Registrar", email: "registrar@attendx.com", employeeId: "ADM003", phone: "9800000003" },
  { name: "Exam Cell", email: "examcell@attendx.com", employeeId: "ADM004", phone: "9800000004" },
  { name: "Accounts Office", email: "accounts@attendx.com", employeeId: "ADM005", phone: "9800000005" },
  { name: "Library", email: "library@attendx.com", employeeId: "ADM006", phone: "9800000006" },
  { name: "Hostel Office", email: "hostel@attendx.com", employeeId: "ADM007", phone: "9800000007" },
  { name: "Placement Cell", email: "placement@attendx.com", employeeId: "ADM008", phone: "9800000008" },
  { name: "Transport Office", email: "transport@attendx.com", employeeId: "ADM009", phone: "9800000009" },
  { name: "IT Support", email: "itsupport@attendx.com", employeeId: "ADM010", phone: "9800000010" },
];
export const ADMIN = ADMINS[0];

// ── Departments (10) ─────────────────────────────────────────────────
export const DEPARTMENTS = [
  { code: "CE", name: "Computer Engineering", description: "Programming, databases, systems and web technologies." },
  { code: "IT", name: "Information Technology", description: "Software engineering, cloud and networks." },
  { code: "CSE", name: "Computer Science & Engineering", description: "Algorithms, theory and systems." },
  { code: "ME", name: "Mechanical Engineering", description: "Design, thermal and manufacturing engineering." },
  { code: "EE", name: "Electrical Engineering", description: "Power systems, machines and control." },
  { code: "CIVIL", name: "Civil Engineering", description: "Structures, construction and surveying." },
  { code: "EC", name: "Electronics & Communication", description: "Circuits, signals and communication systems." },
  { code: "AIML", name: "Artificial Intelligence & Machine Learning", description: "AI, machine learning and data science." },
  { code: "CH", name: "Chemical Engineering", description: "Process engineering and plant design." },
  { code: "AS", name: "Applied Sciences", description: "Mathematics and physics for first-year students." },
];

// ── Classes (11): key = dept-division-batch ──────────────────────────
export const CLASSES = [
  { key: "CE-A-2024", dept: "CE", name: "A", semester: 5, batchYear: 2024, batchEndYear: 2028 }, // Nihal, Jeel, Ritik, Darshit
  { key: "CE-B-2024", dept: "CE", name: "B", semester: 5, batchYear: 2024, batchEndYear: 2028 }, // same batch, other division
  { key: "CE-A-2025", dept: "CE", name: "A", semester: 3, batchYear: 2025, batchEndYear: 2029 }, // newer batch
  { key: "IT-A-2024", dept: "IT", name: "A", semester: 5, batchYear: 2024, batchEndYear: 2028 },
  { key: "CSE-A-2025", dept: "CSE", name: "A", semester: 3, batchYear: 2025, batchEndYear: 2029 },
  { key: "ME-A-2023", dept: "ME", name: "A", semester: 7, batchYear: 2023, batchEndYear: 2027 },
  { key: "EE-A-2024", dept: "EE", name: "A", semester: 5, batchYear: 2024, batchEndYear: 2028 },
  { key: "CIVIL-A-2025", dept: "CIVIL", name: "A", semester: 3, batchYear: 2025, batchEndYear: 2029 },
  { key: "EC-A-2024", dept: "EC", name: "A", semester: 5, batchYear: 2024, batchEndYear: 2028 },
  { key: "AIML-A-2026", dept: "AIML", name: "A", semester: 1, batchYear: 2026, batchEndYear: 2030 },
  { key: "CH-A-2023", dept: "CH", name: "A", semester: 7, batchYear: 2023, batchEndYear: 2027 },
];

// ── Teachers (12) ────────────────────────────────────────────────────
export const TEACHERS = [
  { name: "Sahil", employeeId: "FAC001", dept: "CE", designation: "Assistant Professor", specialization: "Web Development, Operating Systems", joiningYear: 2021 },
  { name: "Jatin", employeeId: "FAC002", dept: "CE", designation: "Assistant Professor", specialization: "Databases", joiningYear: 2022 },
  { name: "Meet", employeeId: "FAC003", dept: "CE", designation: "Associate Professor", specialization: "Computer Networks, Data Structures", joiningYear: 2017 },
  { name: "Priya", employeeId: "FAC004", dept: "IT", designation: "Assistant Professor", specialization: "Software Engineering, Cloud", joiningYear: 2020 },
  { name: "Kiran", employeeId: "FAC005", dept: "CSE", designation: "Professor", specialization: "Algorithms", joiningYear: 2012 },
  { name: "Rohan", employeeId: "FAC006", dept: "ME", designation: "Assistant Professor", specialization: "Heat Transfer", joiningYear: 2019 },
  { name: "Neha", employeeId: "FAC007", dept: "EE", designation: "Associate Professor", specialization: "Power Systems", joiningYear: 2016 },
  { name: "Vivek", employeeId: "FAC008", dept: "CIVIL", designation: "Assistant Professor", specialization: "Structural Analysis", joiningYear: 2021 },
  { name: "Pooja", employeeId: "FAC009", dept: "EC", designation: "Assistant Professor", specialization: "Digital Signal Processing", joiningYear: 2020 },
  { name: "Amit", employeeId: "FAC010", dept: "AIML", designation: "Professor", specialization: "Machine Learning", joiningYear: 2014 },
  { name: "Sneha", employeeId: "FAC011", dept: "CH", designation: "Assistant Professor", specialization: "Process Control", joiningYear: 2022 },
  { name: "Rakesh", employeeId: "FAC012", dept: "AS", designation: "Professor", specialization: "Engineering Mathematics", joiningYear: 2010 },
].map((t, i) => ({ ...t, email: emailFor(t.name), phone: String(9800000101 + i) }));

// ── Subjects (16) with the topics their lectures cover ───────────────
export const SUBJECTS = [
  { code: "CE501", name: "Web Development", dept: "CE", credits: 4, semester: 5, topics: ["HTML & CSS basics", "JavaScript & the DOM", "React components", "REST APIs with Express", "Authentication & sessions", "Deploying a web app"] },
  { code: "CE502", name: "Database Management Systems", dept: "CE", credits: 4, semester: 5, topics: ["ER diagrams", "SQL joins", "Normalisation", "Transactions & ACID", "Indexing"] },
  { code: "CE503", name: "Operating Systems", dept: "CE", credits: 3, semester: 5, topics: ["Processes & threads", "CPU scheduling", "Deadlocks", "Memory paging"] },
  { code: "CE504", name: "Computer Networks", dept: "CE", credits: 3, semester: 5, topics: ["OSI model & TCP/IP", "IP addressing & subnetting", "Routing basics", "HTTP & DNS"] },
  { code: "CE301", name: "Data Structures", dept: "CE", credits: 4, semester: 3, topics: ["Arrays & linked lists", "Stacks & queues", "Binary trees", "Hash tables", "Graphs - BFS & DFS"] },
  { code: "CE302", name: "Object-Oriented Programming", dept: "CE", credits: 4, semester: 3, topics: ["Classes & objects", "Inheritance", "Polymorphism", "Interfaces & generics"] },
  { code: "IT501", name: "Software Engineering", dept: "IT", credits: 3, semester: 5, topics: ["SDLC models", "Requirements engineering", "Agile & Scrum", "Testing strategies"] },
  { code: "IT502", name: "Cloud Computing", dept: "IT", credits: 3, semester: 5, topics: ["Cloud service models", "Virtualisation", "Containers & Docker", "Serverless"] },
  { code: "CS301", name: "Algorithms", dept: "CSE", credits: 4, semester: 3, topics: ["Asymptotic analysis", "Divide & conquer", "Greedy algorithms", "Dynamic programming", "Graph algorithms"] },
  { code: "ME701", name: "Heat Transfer", dept: "ME", credits: 4, semester: 7, topics: ["Conduction", "Convection", "Radiation", "Heat exchangers"] },
  { code: "EE501", name: "Power Systems", dept: "EE", credits: 4, semester: 5, topics: ["Generation overview", "Transmission lines", "Load flow", "Fault analysis"] },
  { code: "CV301", name: "Structural Analysis", dept: "CIVIL", credits: 4, semester: 3, topics: ["Trusses", "Beams & shear force", "Bending moment diagrams", "Influence lines"] },
  { code: "EC501", name: "Digital Signal Processing", dept: "EC", credits: 4, semester: 5, topics: ["Discrete signals", "Z-transform", "FIR filters", "FFT"] },
  { code: "AI101", name: "Introduction to AI", dept: "AIML", credits: 3, semester: 1, topics: ["What is AI?", "Search algorithms", "Knowledge representation", "Intro to machine learning"] },
  { code: "CH701", name: "Process Control", dept: "CH", credits: 3, semester: 7, topics: ["Control loops", "PID controllers", "Process dynamics", "Instrumentation"] },
  { code: "AS101", name: "Engineering Mathematics", dept: "AS", credits: 4, semester: 1, topics: ["Matrices", "Differential calculus", "Integration techniques", "Differential equations", "Probability basics"] },
];

// ── Who teaches what (19) ────────────────────────────────────────────
export const ASSIGNMENTS = [
  { teacher: "FAC001", subject: "CE501", cls: "CE-A-2024" }, { teacher: "FAC002", subject: "CE502", cls: "CE-A-2024" },
  { teacher: "FAC001", subject: "CE503", cls: "CE-A-2024" }, { teacher: "FAC003", subject: "CE504", cls: "CE-A-2024" },
  { teacher: "FAC001", subject: "CE501", cls: "CE-B-2024" }, { teacher: "FAC002", subject: "CE502", cls: "CE-B-2024" }, { teacher: "FAC003", subject: "CE504", cls: "CE-B-2024" },
  { teacher: "FAC003", subject: "CE301", cls: "CE-A-2025" }, { teacher: "FAC002", subject: "CE302", cls: "CE-A-2025" },
  { teacher: "FAC004", subject: "IT501", cls: "IT-A-2024" }, { teacher: "FAC004", subject: "IT502", cls: "IT-A-2024" },
  { teacher: "FAC005", subject: "CS301", cls: "CSE-A-2025" },
  { teacher: "FAC006", subject: "ME701", cls: "ME-A-2023" },
  { teacher: "FAC007", subject: "EE501", cls: "EE-A-2024" },
  { teacher: "FAC008", subject: "CV301", cls: "CIVIL-A-2025" },
  { teacher: "FAC009", subject: "EC501", cls: "EC-A-2024" },
  { teacher: "FAC010", subject: "AI101", cls: "AIML-A-2026" }, { teacher: "FAC012", subject: "AS101", cls: "AIML-A-2026" },
  { teacher: "FAC011", subject: "CH701", cls: "CH-A-2023" },
];

// ── Students (58): class → names, mentor (employeeId) ────────────────
const roster = (cls, prefix, names, mentorOf) => names.map((name, i) => ({
  name, email: emailFor(name), cls, rollNumber: `${prefix}${String(i + 1).padStart(3, "0")}`,
  mentor: typeof mentorOf === "function" ? mentorOf(i) : mentorOf,
}));
export const STUDENTS = [
  ...roster("CE-A-2024", "CE2024", ["Nihal", "Jeel", "Ritik", "Darshit", "Aarav", "Khushi", "Dhruv", "Mansi"], (i) => (i % 4 < 2 ? "FAC001" : "FAC002")),
  ...roster("CE-B-2024", "CE2024", ["Yash", "Riya", "Harsh", "Krupa", "Parth", "Nidhi", "Om", "Shreya"], "FAC003").map((s, i) => ({ ...s, rollNumber: `CE2024${101 + i}` })),
  ...roster("CE-A-2025", "CE2025", ["Dev", "Isha", "Kavya", "Jay", "Tanvi", "Smit", "Dhara", "Hetvi"], (i) => (i < 4 ? "FAC001" : "FAC003")),
  ...roster("IT-A-2024", "IT2024", ["Ankit", "Bhavya", "Chirag", "Diya", "Esha"], "FAC004"),
  ...roster("CSE-A-2025", "CS2025", ["Faizan", "Gauri", "Hardik", "Ira", "Jeet"], "FAC005"),
  ...roster("ME-A-2023", "ME2023", ["Karan", "Lakshya", "Mohit", "Nirav"], "FAC006"),
  ...roster("EE-A-2024", "EE2024", ["Palak", "Rudra", "Sakshi", "Tirth"], "FAC007"),
  ...roster("CIVIL-A-2025", "CV2025", ["Urvi", "Vedant", "Yug", "Zeel"], "FAC008"),
  ...roster("EC-A-2024", "EC2024", ["Aditi", "Bhargav", "Charmi", "Deep"], "FAC009"),
  ...roster("AIML-A-2026", "AI2026", ["Freya", "Gautam", "Hiral", "Ishan"], "FAC010"),
  ...roster("CH-A-2023", "CH2023", ["Jinal", "Kunal", "Mitali", "Naman"], "FAC011"),
].map((s, i) => ({ ...s, phone: String(9700000001 + i), parentPhone: String(9600000001 + i) }));

// Mentor changes that happened in the past (kept in MentorStudentHistory so the
// old mentor can still find the student under "Former students").
export const FORMER_MENTORS = [
  { student: "Ritik", mentor: "FAC001", from: "2024-07-01", to: "2025-06-30" },   // Sahil → now Jatin
  { student: "Yash", mentor: "FAC001", from: "2024-07-01", to: "2025-06-30" },    // Sahil → now Meet
  { student: "Ankit", mentor: "FAC005", from: "2024-07-01", to: "2025-01-15" },   // Kiran → now Priya
];

// ── The lectures of class CE · A (2024) are written out by hand so the four
//    named students have exact, explainable numbers:
//    Nihal 12/12 = 100 % · Jeel 11/11 = 100 % (one approved leave) · Darshit 8/12 = 67 % · Ritik 7/12 = 58 %
const N = "CE2024001", J = "CE2024002", R = "CE2024003", D = "CE2024004";
export const CE_A_LECTURES = [
  { subject: "CE501", topic: "HTML & CSS basics", daysAgo: 13, hour: 9, present: [N, J, R, D] },
  { subject: "CE502", topic: "ER diagrams", daysAgo: 12, hour: 10, present: [N, J, D] },
  { subject: "CE503", topic: "Processes & threads", daysAgo: 11, hour: 11, present: [N, J, D] },
  { subject: "CE504", topic: "OSI model & TCP/IP", daysAgo: 10, hour: 14, present: [N, J, R, D] },
  { subject: "CE501", topic: "JavaScript & the DOM", daysAgo: 9, hour: 9, present: [N, J, R] },
  { subject: "CE502", topic: "SQL joins", daysAgo: 8, hour: 10, present: [N, J, D] },
  { subject: "CE504", topic: "IP addressing & subnetting", daysAgo: 7, hour: 14, present: [N, J, R] },
  { subject: "CE501", topic: "React components", daysAgo: 6, hour: 9, present: [N, R, D] }, // Jeel: approved leave
  { subject: "CE503", topic: "CPU scheduling", daysAgo: 5, hour: 11, present: [N, J, R, D] },
  { subject: "CE504", topic: "Routing basics", daysAgo: 4, hour: 14, present: [N, J] },
  { subject: "CE502", topic: "Normalisation", daysAgo: 2, hour: 10, present: [N, J, R] },
  { subject: "CE501", topic: "REST APIs with Express", daysAgo: 1, hour: 9, present: [N, J, D] },
];
// One cancelled lecture (never counted) and one lecture running RIGHT NOW
export const CANCELLED_LECTURE = { subject: "CE502", cls: "CE-A-2024", topic: "Indexing (cancelled: faculty meeting)", daysAgo: 3, hour: 10 };
export const LIVE_LECTURE = { subject: "CE504", cls: "CE-B-2024", topic: "HTTP & DNS", minutesAgo: 12, presentCount: 5 };

// Generated lectures for every other assignment: one per topic, spread over the last three weeks
export const GENERATED_DAYS = [19, 16, 13, 10, 7, 4];

// ── Leave applications (12) ──────────────────────────────────────────
export const LEAVES = [
  { student: "Jeel", type: "FULL", daysAgo: 6, reason: "Fever, doctor advised rest", status: "APPROVED", remark: "Get well soon" },
  { student: "Darshit", type: "FULL", daysAgo: -2, reason: "Family function out of town", status: "PENDING" },
  { student: "Aarav", type: "HALF", halfWhich: "FIRST", daysAgo: 3, reason: "Medical check-up in the morning", status: "APPROVED", remark: "Okay" },
  { student: "Dhruv", type: "LECTURE", daysAgo: 1, reason: "Overslept", status: "REJECTED", remark: "Not a valid reason" },
  { student: "Yash", type: "FULL", daysAgo: 4, reason: "Cousin's wedding", status: "APPROVED", remark: "Approved" },
  { student: "Riya", type: "FULL", daysAgo: -1, reason: "Visa interview", status: "PENDING" },
  { student: "Ankit", type: "FULL", daysAgo: 2, reason: "Viral fever", status: "APPROVED", remark: "Take care" },
  { student: "Faizan", type: "HALF", halfWhich: "SECOND", daysAgo: 5, reason: "Personal work", status: "REJECTED", remark: "Please attend" },
  { student: "Karan", type: "FULL", daysAgo: -3, reason: "Inter-college sports tournament", status: "PENDING" },
  { student: "Palak", type: "FULL", daysAgo: 7, reason: "Hospital visit with family", status: "APPROVED", remark: "Approved" },
  { student: "Urvi", type: "LECTURE", daysAgo: 2, reason: "Bank work for scholarship", status: "PENDING" },
  { student: "Freya", type: "FULL", daysAgo: 1, reason: "Sick", status: "APPROVED", remark: "Rest well" },
];

// ── Student device logins (10) ───────────────────────────────────────
export const DEVICE_LOGINS = [
  { student: "Ritik", status: "PENDING", device: "Android · Chrome", platform: "Android", browser: "Chrome 130", screen: "412x915", minutesAgo: 6 },
  { student: "Riya", status: "PENDING", device: "iPhone · Safari", platform: "iOS", browser: "Safari 18", screen: "390x844", minutesAgo: 25 },
  { student: "Ankit", status: "PENDING", device: "Windows · Edge", platform: "Windows", browser: "Edge 130", screen: "1536x864", minutesAgo: 70 },
  { student: "Nihal", status: "ACTIVE", device: "Android · Chrome", platform: "Android", browser: "Chrome 130", screen: "393x873", minutesAgo: 180 },
  { student: "Jeel", status: "ACTIVE", device: "iPhone · Safari", platform: "iOS", browser: "Safari 18", screen: "390x844", minutesAgo: 240 },
  { student: "Yash", status: "ACTIVE", device: "Android · Chrome", platform: "Android", browser: "Chrome 129", screen: "412x915", minutesAgo: 300 },
  { student: "Faizan", status: "ACTIVE", device: "Android · Samsung Internet", platform: "Android", browser: "Samsung Internet 26", screen: "412x915", minutesAgo: 360 },
  { student: "Darshit", status: "LOGGED_OUT", device: "Android · Chrome", platform: "Android", browser: "Chrome 130", screen: "412x915", minutesAgo: 1440 },
  { student: "Dhruv", status: "LOGGED_OUT", device: "Windows · Chrome", platform: "Windows", browser: "Chrome 130", screen: "1366x768", minutesAgo: 2000 },
  { student: "Harsh", status: "REJECTED", device: "Android · Chrome", platform: "Android", browser: "Chrome 118", screen: "360x800", minutesAgo: 2880, remark: "Unknown device - come to my office" },
];

// ── Parents (10): the eight CE · A students + two from CE · B ────────
export const PARENTS = ["Nihal", "Jeel", "Ritik", "Darshit", "Aarav", "Khushi", "Dhruv", "Mansi", "Yash", "Riya"].map((student, i) => ({
  student, name: `${student}'s Parent`, email: `parent.${student.toLowerCase()}@attendx.com`, relationship: ["FATHER", "MOTHER", "GUARDIAN"][i % 3],
}));

// ── Deterministic attendance for everyone who is not written out by hand ──
// Each student has a "usual" attendance; the same (student, lecture) pair always
// gives the same answer, so the demo looks identical on every machine.
const PROFILES = [94, 88, 83, 79, 76, 71, 66, 58];
export const usualAttendance = (studentIndex) => PROFILES[(studentIndex * 5) % PROFILES.length];
export function markFor(studentIndex, lectureIndex, usual = usualAttendance(studentIndex)) {
  const h = (Math.imul(studentIndex + 1, 0x9e3779b1) ^ Math.imul(lectureIndex + 1, 0x85ebca77)) >>> 0;
  const roll = h % 100;
  if (roll >= usual) return "ABSENT";
  return roll >= usual - 6 ? "LATE" : "PRESENT";
}
