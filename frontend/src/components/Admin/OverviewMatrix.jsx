import { useState, useEffect, useCallback } from "react";
import {
  RefreshCw,
  BookOpen,
  UserCog,
  Users,
  GraduationCap,
  HeartHandshake,
  Layers,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { toast } from "react-toastify";
import api from "../../utils/api.js";

/**
 * Admin overview matrix — subject ↔ faculty ↔ student counts and
 * mentor → mentees (batch-wise) without any deep navigation.
 */
const OverviewMatrix = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("subjects"); // subjects | faculty | mentors | batches
  const [open, setOpen] = useState({}); // accordion keys

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get("/api/report/admin/overview");
      setData(r.data?.data || null);
    } catch {
      toast.error("Could not load overview");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = (k) => setOpen((o) => ({ ...o, [k]: !o[k] }));

  const views = [
    { id: "subjects", label: "Subjects → Faculty → Students", icon: BookOpen, count: data?.subjects?.length },
    { id: "faculty", label: "Faculty workload", icon: UserCog, count: data?.faculty?.length },
    { id: "mentors", label: "Mentors → Mentees", icon: HeartHandshake, count: data?.mentors?.length },
    { id: "batches", label: "Batch-wise sections", icon: Layers, count: data?.batches?.length },
  ];

  const summary = data?.summary || {};

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Institution Overview
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Direct view of who teaches what and who mentors whom — no deep
            navigation needed.
          </p>
        </div>
        <button onClick={load} className="btn-secondary flex items-center gap-2">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Summary chips */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {[
          { l: "Subjects", v: summary.subjects, c: "text-purple-500" },
          { l: "Faculty", v: summary.faculty, c: "text-blue-500" },
          { l: "Students", v: summary.students, c: "text-cyan-500" },
          { l: "Sections", v: summary.sections, c: "text-emerald-500" },
          { l: "Assignments", v: summary.assignments, c: "text-amber-500" },
          { l: "Mentors", v: summary.mentors, c: "text-rose-500" },
        ].map((s, i) => (
          <div key={i} className="card-2026 p-3 text-center">
            <p className={`text-xl font-bold ${s.c}`}>{s.v ?? 0}</p>
            <p className="text-[10px] uppercase tracking-wider text-slate-400">{s.l}</p>
          </div>
        ))}
      </div>

      {/* View switch */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {views.map((v) => {
          const Icon = v.icon;
          const active = view === v.id;
          return (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              className={
                "flex items-center gap-2 p-3 rounded-xl border text-sm font-semibold transition-all " +
                (active
                  ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-600 dark:text-cyan-400"
                  : "border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300 dark:hover:border-slate-600")
              }
            >
              <Icon size={16} className={active ? "text-cyan-500" : ""} />
              <span className="hidden sm:inline flex-1 text-left">{v.label}</span>
              <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 rounded-full px-2 py-0.5">
                {v.count ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="card-2026 p-10 flex justify-center">
          <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {/* ── Subjects → faculty → sections → students ─────────── */}
          {view === "subjects" &&
            (data?.subjects?.length ? (
              data.subjects.map((s) => {
                const k = `subj-${s.id}`;
                const isOpen = open[k];
                return (
                  <div key={s.id} className="card-2026 overflow-hidden">
                    <button onClick={() => toggle(k)} className="w-full flex items-center gap-3 p-4 text-left">
                      {isOpen ? (
                        <ChevronDown size={16} className="text-slate-400 shrink-0" />
                      ) : (
                        <ChevronRight size={16} className="text-slate-400 shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                          {s.name} <span className="text-slate-400 font-normal">({s.code})</span>
                        </p>
                        <p className="text-xs text-slate-400">
                          {s.facultyCount} faculty · {s.sectionCount} section(s) ·{" "}
                          {s.lectures} lecture(s)
                        </p>
                      </div>
                      <span className="text-sm font-bold text-cyan-500 shrink-0">
                        {s.studentCount} students
                      </span>
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 space-y-3">
                        {/* Faculty teaching this subject */}
                        <div>
                          <p className="text-[11px] uppercase tracking-wider text-slate-400 mb-1.5">
                            Faculty
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {s.faculty.map((f) => (
                              <span
                                key={f.id}
                                className="badge flex items-center gap-1.5 py-1.5"
                              >
                                <UserCog size={12} className="text-blue-400" />
                                {f.name}
                              </span>
                            ))}
                          </div>
                        </div>
                        {/* Sections */}
                        <div>
                          <p className="text-[11px] uppercase tracking-wider text-slate-400 mb-1.5">
                            Sections
                          </p>
                          <div className="space-y-1.5">
                            {s.sections.map((sec) => (
                              <div
                                key={sec.id}
                                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 text-sm"
                              >
                                <span className="text-slate-700 dark:text-slate-300">
                                  Sec {sec.name} · Sem {sec.semester} · Batch {sec.batchYear}
                                </span>
                                <span className="font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                  <GraduationCap size={13} /> {sec.students}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-slate-400 text-center py-10">No subjects assigned yet.</p>
            ))}

          {/* ── Faculty workload ─────────────────────────────────── */}
          {view === "faculty" &&
            (data?.faculty?.length ? (
              data.faculty.map((f) => {
                const k = `fac-${f.id}`;
                const isOpen = open[k];
                return (
                  <div key={f.id} className="card-2026 overflow-hidden">
                    <button onClick={() => toggle(k)} className="w-full flex items-center gap-3 p-4 text-left">
                      {isOpen ? (
                        <ChevronDown size={16} className="text-slate-400 shrink-0" />
                      ) : (
                        <ChevronRight size={16} className="text-slate-400 shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                          {f.name || f.employeeId}
                          <span className="text-slate-400 font-normal text-xs ml-2">{f.designation}</span>
                        </p>
                        <p className="text-xs text-slate-400">
                          {f.subjectCount} subject(s) · {f.sectionCount} section(s)
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-sm font-bold text-blue-500 block">
                          {f.taughtStudents}
                        </span>
                        <span className="text-[10px] text-slate-400 uppercase">students</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-sm font-bold text-rose-500 block">{f.menteeCount}</span>
                        <span className="text-[10px] text-slate-400 uppercase">mentees</span>
                      </div>
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 space-y-3">
                        <div>
                          <p className="text-[11px] uppercase tracking-wider text-slate-400 mb-1.5">
                            Teaches
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {f.subjects.map((s) => (
                              <span key={s.id} className="badge py-1.5">
                                {s.name} ({s.code})
                              </span>
                            ))}
                          </div>
                        </div>
                        <p className="text-xs text-slate-400">
                          Mentees: <span className="font-semibold text-rose-500">{f.menteeCount}</span>{" "}
                          (see “Mentors → Mentees” for batch-wise list)
                        </p>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-slate-400 text-center py-10">No faculty data.</p>
            ))}

          {/* ── Mentors → mentees batch-wise ─────────────────────── */}
          {view === "mentors" &&
            (data?.mentors?.length ? (
              data.mentors.map((m) => {
                const k = `men-${m.id}`;
                const isOpen = open[k];
                return (
                  <div key={m.id} className="card-2026 overflow-hidden">
                    <button onClick={() => toggle(k)} className="w-full flex items-center gap-3 p-4 text-left">
                      {isOpen ? (
                        <ChevronDown size={16} className="text-slate-400 shrink-0" />
                      ) : (
                        <ChevronRight size={16} className="text-slate-400 shrink-0" />
                      )}
                      <HeartHandshake size={18} className="text-rose-500 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                          {m.name || m.employeeId}
                          <span className="text-slate-400 font-normal text-xs ml-2">{m.employeeId}</span>
                        </p>
                        <p className="text-xs text-slate-400">
                          {m.batches.length} batch(es)
                        </p>
                      </div>
                      <span className="text-sm font-bold text-rose-500 shrink-0">
                        {m.menteeCount} mentees
                      </span>
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 space-y-3">
                        {m.batches.map((b) => (
                          <div key={b.batch}>
                            <p className="text-[11px] uppercase tracking-wider text-slate-400 mb-1.5">
                              {b.batch} · {b.count} mentee{b.count === 1 ? "" : "s"}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {b.students.map((st) => (
                                <span key={st.id} className="badge py-1.5 flex items-center gap-1.5">
                                  <Users size={12} className="text-cyan-500" />
                                  {st.rollNumber}
                                  {st.name ? ` · ${st.name}` : ""}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-slate-400 text-center py-10">
                No mentors assigned yet — seed the database with mentors.
              </p>
            ))}

          {/* ── Batches → sections ──────────────────────────────── */}
          {view === "batches" &&
            (data?.batches?.length ? (
              data.batches.map((b) => {
                const k = `bat-${b.batchYear}`;
                const isOpen = open[k];
                return (
                  <div key={b.batchYear} className="card-2026 overflow-hidden">
                    <button onClick={() => toggle(k)} className="w-full flex items-center gap-3 p-4 text-left">
                      {isOpen ? (
                        <ChevronDown size={16} className="text-slate-400 shrink-0" />
                      ) : (
                        <ChevronRight size={16} className="text-slate-400 shrink-0" />
                      )}
                      <Layers size={18} className="text-emerald-500 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                          Batch {b.label}
                        </p>
                        <p className="text-xs text-slate-400">{b.sectionCount} section(s)</p>
                      </div>
                      <span className="text-sm font-bold text-emerald-500 shrink-0">
                        {b.studentCount} students
                      </span>
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 space-y-1.5">
                        {b.sections.map((sec) => (
                          <div
                            key={sec.id}
                            className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 text-sm"
                          >
                            <span className="text-slate-700 dark:text-slate-300">
                              Sec {sec.name} · Sem {sec.semester}
                            </span>
                            <span className="font-semibold text-slate-500 dark:text-slate-400">
                              {sec.students} students
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-slate-400 text-center py-10">No sections yet.</p>
            ))}
        </div>
      )}
    </div>
  );
};

export default OverviewMatrix;
