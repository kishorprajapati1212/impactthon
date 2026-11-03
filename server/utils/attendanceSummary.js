/**
 * Numbers behind the admin "Attendance report" page.
 *
 * Pure function: give it plain arrays, get plain numbers back — no Mongo
 * here, so it is unit-tested without a database. ONE rule is used
 * everywhere (and written on the page itself):
 *
 *   attendance % = (PRESENT + LATE) ÷ (all marks except LEAVE / EXCUSED)
 *   75 % and above = good · 60–74 % = watch · below 60 % = low
 *
 * A lecture belongs to the period if it STARTED inside it; its attendance
 * rows follow the lecture (so a late manual correction does not move a
 * lecture into another week).
 */
export const GOOD = 75;
export const WATCH = 60;
export const AT_RISK_MIN_LECTURES = 3; // below this, a % is noise

export function band(p) {
  if (p === null || p === undefined) return "none";
  return p >= GOOD ? "good" : p >= WATCH ? "watch" : "low";
}

const id = (v) => (v && typeof v === "object" ? String(v._id ?? v.id ?? "") : v ? String(v) : "");
const pctOf = (present, counted) => (counted > 0 ? Math.round((present / counted) * 100) : null);
const isPresent = (st) => st === "PRESENT" || st === "LATE";
const isNeutral = (st) => st === "LEAVE" || st === "EXCUSED";
const COUNTED_LECTURE = new Set(["COMPLETED", "ACTIVE"]);

function startOfWeek(t) { // Monday 00:00 local
  const d = new Date(t); d.setHours(0, 0, 0, 0);
  const day = (d.getDay() + 6) % 7; d.setDate(d.getDate() - day);
  return d.getTime();
}
const weekLabel = (t) => new Date(t).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

/** Count present/counted marks into buckets keyed by `keyOf(lecture)`. */
function tally(rows, lectureById, keyOf) {
  const out = new Map();
  for (const a of rows) {
    const l = lectureById.get(id(a.lectureSessionId));
    if (!l || isNeutral(a.status)) continue;
    const k = keyOf(l, a);
    if (!k) continue;
    const t = out.get(k) || { present: 0, counted: 0 };
    t.counted += 1; if (isPresent(a.status)) t.present += 1;
    out.set(k, t);
  }
  return out;
}

export function summariseAttendance({ attendances = [], lectures = [], students = [], sections = [], subjects = [], faculty = [], since = 0, until = Date.now(), prevSince = null, days = null }) {
  const inPeriod = (l) => { const t = new Date(l.startTime).getTime(); return t >= since && t < until; };
  const inPrev = (l) => { const t = new Date(l.startTime).getTime(); return prevSince !== null && t >= prevSince && t < since; };
  const usable = lectures.filter((l) => COUNTED_LECTURE.has(l.status || "COMPLETED"));
  const current = usable.filter(inPeriod);
  const previous = usable.filter(inPrev);
  const curById = new Map(current.map((l) => [id(l), l]));
  const prevById = new Map(previous.map((l) => [id(l), l]));

  const rowsCur = attendances.filter((a) => curById.has(id(a.lectureSessionId)));
  const rowsPrev = attendances.filter((a) => prevById.has(id(a.lectureSessionId)));

  // ── overall ──────────────────────────────────────────────────────────
  const all = tally(rowsCur, curById, () => "all").get("all") || { present: 0, counted: 0 };
  const prevAll = tally(rowsPrev, prevById, () => "all").get("all") || { present: 0, counted: 0 };
  const overallPct = pctOf(all.present, all.counted);
  const prevPct = prevSince !== null ? pctOf(prevAll.present, prevAll.counted) : null;
  const overall = {
    percentage: overallPct, band: band(overallPct), present: all.present, counted: all.counted, absent: all.counted - all.present,
    lectures: current.length,
    previous: prevSince !== null ? { percentage: prevPct, lectures: previous.length } : null,
    change: overallPct !== null && prevPct !== null ? overallPct - prevPct : null,
  };

  // ── week by week (max 13 weeks, oldest first) ────────────────────────
  const lecturesByWeek = new Map();
  for (const l of current) { const w = startOfWeek(new Date(l.startTime).getTime()); lecturesByWeek.set(w, (lecturesByWeek.get(w) || 0) + 1); }
  const byWeek = tally(rowsCur, curById, (l) => String(startOfWeek(new Date(l.startTime).getTime())));
  const weekKeys = [...new Set([...lecturesByWeek.keys()].map(String))].map(Number).sort((a, b) => a - b).slice(-13);
  const weekly = weekKeys.map((w) => { const t = byWeek.get(String(w)) || { present: 0, counted: 0 }; const p = pctOf(t.present, t.counted); return { weekStart: new Date(w).toISOString(), label: `Week of ${weekLabel(w)}`, percentage: p, band: band(p), lectures: lecturesByWeek.get(w) || 0, counted: t.counted }; });

  // ── lookups ──────────────────────────────────────────────────────────
  const secById = new Map(sections.map((s) => [id(s), s]));
  const subjById = new Map(subjects.map((s) => [id(s), s]));
  const facById = new Map(faculty.map((f) => [id(f), f]));
  // "CE · A · 2024" — the batch year keeps two divisions with the same name apart (CE · A of 2024 vs CE · A of 2025)
  const classLabel = (sec) => { if (!sec) return "Unknown class"; const code = sec.departmentId?.code || sec.departmentId?.name; return [code, sec.name, sec.batchYear].filter(Boolean).join(" · ") || "Class"; };
  const personName = (x) => x?.userId?.name || x?.name || x?.employeeId || "Unknown";

  const activeStudents = students.filter((s) => s.isActive !== false && (!s.lifecycleStatus || s.lifecycleStatus === "STUDYING"));
  const studentsPerSection = new Map();
  for (const s of activeStudents) { const k = id(s.sectionId); if (!k) continue; studentsPerSection.set(k, (studentsPerSection.get(k) || 0) + 1); }
  const lecturesBy = (keyOf) => { const m = new Map(); for (const l of current) { const k = keyOf(l); if (k) m.set(k, (m.get(k) || 0) + 1); } return m; };
  const lowestFirst = (a, b) => (a.percentage ?? 101) - (b.percentage ?? 101) || b.lectures - a.lectures;

  // ── classes ──────────────────────────────────────────────────────────
  const lecBySec = lecturesBy((l) => id(l.sectionId));
  const tBySec = tally(rowsCur, curById, (l) => id(l.sectionId));
  const classes = [...lecBySec.keys()].map((k) => { const sec = secById.get(k); const t = tBySec.get(k) || { present: 0, counted: 0 }; const p = pctOf(t.present, t.counted); return { id: k, label: classLabel(sec), semester: sec?.semester ?? null, students: studentsPerSection.get(k) || 0, lectures: lecBySec.get(k), percentage: p, band: band(p) }; }).sort(lowestFirst);

  // ── subjects ─────────────────────────────────────────────────────────
  const lecBySubj = lecturesBy((l) => id(l.subjectId));
  const tBySubj = tally(rowsCur, curById, (l) => id(l.subjectId));
  const subjectsOut = [...lecBySubj.keys()].map((k) => { const su = subjById.get(k); const t = tBySubj.get(k) || { present: 0, counted: 0 }; const p = pctOf(t.present, t.counted); return { id: k, code: su?.subjectCode || "", name: su?.subjectName || "Unknown subject", lectures: lecBySubj.get(k), percentage: p, band: band(p) }; }).sort(lowestFirst);

  // ── teachers ─────────────────────────────────────────────────────────
  const lecByFac = lecturesBy((l) => id(l.facultyId));
  const tByFac = tally(rowsCur, curById, (l) => id(l.facultyId));
  const teachers = [...lecByFac.keys()].map((k) => { const f = facById.get(k); const t = tByFac.get(k) || { present: 0, counted: 0 }; const p = pctOf(t.present, t.counted); return { id: k, name: personName(f), employeeId: f?.employeeId || "", lectures: lecByFac.get(k), percentage: p, band: band(p) }; }).sort(lowestFirst);

  // ── students below 75 % ──────────────────────────────────────────────
  const tByStudent = tally(rowsCur, curById, (l, a) => id(a.studentId));
  const studentsAtRisk = activeStudents.map((s) => { const t = tByStudent.get(id(s)); if (!t || t.counted < AT_RISK_MIN_LECTURES) return null; const p = pctOf(t.present, t.counted); if (p === null || p >= GOOD) return null; const sec = s.sectionId && typeof s.sectionId === "object" ? s.sectionId : secById.get(id(s.sectionId)); return { id: id(s), name: personName(s), rollNumber: s.rollNumber || "", classLabel: classLabel(sec), sectionId: id(s.sectionId) || null, mentor: s.mentorId && typeof s.mentorId === "object" ? personName(s.mentorId) : null, percentage: p, band: band(p), lectures: t.counted, present: t.present }; }).filter(Boolean).sort(lowestFirst).slice(0, 100);

  return {
    period: { days, since: new Date(since).toISOString(), until: new Date(until).toISOString(), label: days ? `last ${days} days` : "all time" },
    rule: { good: GOOD, watch: WATCH, minLectures: AT_RISK_MIN_LECTURES },
    overall, weekly, classes, subjects: subjectsOut, teachers, studentsAtRisk,
    totals: { studentsCounted: tByStudent.size, studentsBelowGood: studentsAtRisk.length, classesBelowGood: classes.filter((c) => c.percentage !== null && c.percentage < GOOD).length },
  };
}
