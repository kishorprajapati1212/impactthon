/**
 * Landing-page content: one place for every word a visitor (or Google) reads.
 *
 * FAQS must stay identical to the FAQPage JSON-LD in index.html (Google only
 * accepts FAQ rich results when the visible text matches the markup);
 * src/__tests__/landingPage.test.jsx enforces that.
 */
import {
  QrCode, MapPin, Radar, FileSpreadsheet, BarChart3, Users, Smartphone, CalendarClock,
  ShieldCheck, UserCog, GraduationCap, MonitorPlay, ScanLine, LocateFixed, ClipboardCheck,
} from "lucide-react";

export const SITE_TITLE = "AttendX | QR Code Attendance System";
export const SITE_DESCRIPTION =
  "Free QR code attendance system for colleges & schools. Rotating QR + GPS geofence stops proxy attendance; admin, faculty and student dashboards; Excel reports.";

export const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Proxy check", href: "#proxy-check" },
  { label: "Roles", href: "#roles" },
  { label: "FAQ", href: "#faq" },
];

export const STATS = [
  { value: "4 s", label: "from scan to Present" },
  { value: "5 s", label: "QR refresh time" },
  { value: "0", label: "extra hardware to buy" },
  { value: "1 tap", label: "Excel attendance sheet" },
  { value: "3", label: "roles, one login page" },
];

/** The scan feed shown in the hero demo, one event per QR rotation. */
export const DEMO_EVENTS = [
  { name: "Nihal", detail: "scanned from the bench, GPS inside the room", status: "present" },
  { name: "Jeel", detail: "forwarded screenshot, QR already expired", status: "rejected" },
  { name: "Ritik", detail: "scanned from the hostel, outside the geofence", status: "blocked" },
  { name: "Darshit", detail: "scanned from the bench, GPS inside the room", status: "present" },
  { name: "Aarav", detail: "scanned from the bench, GPS inside the room", status: "present" },
  { name: "Riya", detail: "friend's phone, device not approved for her", status: "rejected" },
];

export const PROXY_TRICKS = [
  {
    trick: "Scan a screenshot a friend forwarded",
    register: "Works. Nobody can tell.",
    attendx: "The QR code changed 5 seconds after it was shown, so the old code is rejected.",
    status: "Rejected",
    tone: "danger",
  },
  {
    trick: "A friend scans for you from the hostel",
    register: "Works. A friend answers for them.",
    attendx: "GPS puts the phone outside the classroom geofence, so the mark is blocked.",
    status: "Blocked",
    tone: "danger",
  },
  {
    trick: "Sign the register for someone else",
    register: "Works. Signatures look alike.",
    attendx: "There is no register. Every mark is tied to a device-bound student login.",
    status: "Not possible",
    tone: "neutral",
  },
  {
    trick: "Answer the roll call from the canteen",
    register: "Works if the teacher does not look up.",
    attendx: "The GPS location is the canteen, so the student stays absent and is shown outside the geofence on the faculty map.",
    status: "Absent",
    tone: "warning",
  },
  {
    trick: "Change the record later",
    register: "Works. Nobody can tell what was changed.",
    attendx: "Every mark has a time stamp. Manual changes are saved with who made them and why.",
    status: "Audited",
    tone: "info",
  },
];

export const STEPS = [
  {
    icon: MonitorPlay,
    title: "Faculty starts the lecture",
    text: "Pick the class and subject, tap Start. A QR appears on the projector and rotates every 5 seconds.",
    vignette: "projector",
  },
  {
    icon: ScanLine,
    title: "Students scan from the bench",
    text: "The phone browser opens the camera, so there is no app to install. Zoom and torch help from the back row.",
    vignette: "phone",
  },
  {
    icon: LocateFixed,
    title: "GPS confirms the room",
    text: "The scan is accepted only inside the classroom geofence. Scans from the hostel, canteen or parking are blocked.",
    vignette: "geofence",
  },
  {
    icon: ClipboardCheck,
    title: "Attendance is saved",
    text: "Faculty see present, absent and blocked students live, then export the Excel sheet in one tap.",
    vignette: "sheet",
  },
];

export const FEATURES = [
  {
    icon: QrCode,
    title: "Rotating QR codes",
    text: "A new code every 5 seconds, signed by the server. A screenshot or a forwarded photo stops working within seconds.",
    size: "large",
  },
  {
    icon: MapPin,
    title: "GPS geofence verification",
    text: "Each classroom has coordinates and a radius. A scan from outside the fence is blocked and shown to the faculty on a map.",
    size: "large",
  },
  { icon: Radar, title: "Live session view", text: "Present, absent and blocked counts update as students scan; late arrivals can be marked manually." },
  { icon: FileSpreadsheet, title: "One-tap Excel reports", text: "Roll number, name and a per-date P/A/L/E grid with totals and percentage, filtered by class and date range." },
  { icon: BarChart3, title: "Plain attendance report", text: "Admins see who is below 75% and which lectures are stuck, written in plain sentences instead of charts." },
  { icon: Users, title: "Mentor view", text: "Mentors see every student they guide: attendance, leave applications and device logins, including former students." },
  { icon: Smartphone, title: "Device-bound student login", text: "A student's first login on a device needs mentor approval, so one phone cannot mark for a friend." },
  { icon: CalendarClock, title: "Leave & notifications", text: "Students apply for leave for specific lectures, and parents can be notified of absences." },
];

export const ROLES = [
  {
    icon: GraduationCap,
    title: "Students",
    accent: "text-emerald-600 dark:text-emerald-400",
    chip: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-400",
    tagline: "Scan, see your percentage, apply for leave.",
    points: [
      "Scan the lecture QR from any smartphone browser",
      "Subject-wise attendance percentage and history",
      "Your class, mentor and leave status in one place",
    ],
  },
  {
    icon: UserCog,
    title: "Faculty",
    accent: "text-cyan-700 dark:text-cyan-400",
    chip: "bg-cyan-100 text-cyan-800 dark:bg-cyan-500/15 dark:text-cyan-400",
    tagline: "Start a session in two taps, export in one.",
    points: [
      "Live rotating QR with present / absent / blocked counts",
      "Map of where every scan came from",
      "Excel sheets for your own classes and subjects",
    ],
  },
  {
    icon: ShieldCheck,
    title: "Admins",
    accent: "text-indigo-600 dark:text-indigo-400",
    chip: "bg-indigo-100 text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-400",
    tagline: "Set up the institution, then read plain reports.",
    points: [
      "Departments, classes, subjects, faculty and students in tables",
      "A dashboard that says what to do next",
      "Attendance report by department, class or mentor",
    ],
  },
];

export const FAQS = [
  {
    q: "How does the QR code attendance system work?",
    a: "A faculty member starts a live lecture and a QR code appears on screen, refreshing every 5 seconds so screenshots can't be reused. Students point their phone camera at the code; AttendX verifies the QR signature and the student's GPS location against the classroom geofence before marking them present.",
  },
  {
    q: "Can a student mark attendance from outside the classroom (proxy attendance)?",
    a: "No. Every scan is geofence-verified against the classroom coordinates and the student's live GPS. If they are outside the allowed area, the mark is rejected. The rotating QR also makes sharing a screenshot useless. That is how AttendX stops proxy attendance.",
  },
  {
    q: "Do I need biometric, RFID or any special hardware?",
    a: "No. You only need a screen or projector to show the QR and students' smartphones. There are no fingerprint scanners, RFID cards or biometric devices required, which is why a QR + GPS attendance system costs a fraction of biometric attendance.",
  },
  {
    q: "Is AttendX only for colleges, or also for schools and coaching institutes?",
    a: "AttendX works for any institution that teaches in rooms: colleges, universities, schools, coaching institutes and training centres. Departments, classes, subjects and batches are configured by the admin, so the same system fits a 200-student school and a multi-department college.",
  },
  {
    q: "Do students need to install an app?",
    a: "No app install. AttendX is a web app: students open the site in the phone browser, allow the camera and location once, and scan. It works on Android and iPhone.",
  },
  {
    q: "What if a student arrives late?",
    a: "Faculty can manually mark a late student as Present, Late or Excused from the live session or from the history view. Auto-finalization still marks everyone else correctly.",
  },
  {
    q: "Can teachers export attendance to Excel?",
    a: "Yes. Faculty generate a CSV/Excel sheet with roll numbers, names and a per-date P/A/L/E grid including totals and attendance percentage, filterable by date range. This is the attendance report most colleges need for the 75% rule.",
  },
  {
    q: "Is it free to try?",
    a: "AttendX is free to start. The demo includes seeded admin, faculty and student accounts so you can test the whole flow in minutes.",
  }
];
