import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Calendar,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Search,
  RefreshCw,
  MapPin,
  UserCheck,
} from "lucide-react";
import api, { clearApiCache } from "../../utils/api.js";
import { toast } from "react-toastify";
import AttendanceMap from "./AttendanceMap.jsx";

const SessionHistory = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [detailCache, setDetailCache] = useState({});
  const [detailLoading, setDetailLoading] = useState(false);
  const [markingId, setMarkingId] = useState(null);
  const [search, setSearch] = useState("");

  const [filterOptions, setFilterOptions] = useState({
    divisions: [],
    semesters: [],
    batchYears: [],
    subjects: [],
    assignmentPairs: [],
  });
  const [pairFilter, setPairFilter] = useState("all");
  const [divisionFilter, setDivisionFilter] = useState("all");
  const [semesterFilter, setSemesterFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");

  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    fetchHistory(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [divisionFilter, semesterFilter, yearFilter, subjectFilter, pairFilter]);

  const fetchFilterOptions = async () => {
    try {
      const res = await api.get("/api/report/faculty/history/filters");
      setFilterOptions(
        res.data?.data || {
          divisions: [],
          semesters: [],
          batchYears: [],
          subjects: [],
          assignmentPairs: [],
        }
      );
    } catch {
      /* optional */
    }
  };

  const fetchHistory = async (page, replace) => {
    replace ? setLoading(true) : setLoadingMore(true);
    try {
      const params = { page, limit: 40 };
      if (divisionFilter !== "all") params.division = divisionFilter;
      if (semesterFilter !== "all") params.semester = semesterFilter;
      if (yearFilter !== "all") params.batchYear = yearFilter;
      if (subjectFilter !== "all") params.subjectId = subjectFilter;
      if (pairFilter !== "all") {
        const [subjectId, sectionId] = pairFilter.split("|");
        if (subjectId) params.subjectId = subjectId;
        if (sectionId) params.sectionId = sectionId;
      }
      const res = await api.get("/api/report/faculty/history", {
        params,
      });
      const data = res.data?.data;
      setSessions((prev) =>
        replace ? data?.lectures || [] : [...prev, ...(data?.lectures || [])]
      );
      setPagination({
        page: data?.pagination?.page || 1,
        totalPages: data?.pagination?.totalPages || 1,
      });
    } catch {
      toast.error("Failed to load sessions");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadDetail = useCallback(
    async (id, force = false) => {
      if (!force && detailCache[id]) return detailCache[id];
      setDetailLoading(true);
      try {
        const res = await api.get(`/api/report/lecture/${id}/summary`);
        const data = res.data?.data;
        setDetailCache((prev) => ({ ...prev, [id]: data }));
        return data;
      } catch {
        toast.error("Failed to load attendance");
        return null;
      } finally {
        setDetailLoading(false);
      }
    },
    [detailCache]
  );

  const toggleDetail = async (id) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    await loadDetail(id);
  };

  const manualMark = async (lectureId, studentId, status) => {
    const key = `${lectureId}:${studentId}`;
    setMarkingId(key);
    try {
      const res = await api.post(
        `/lecture/${lectureId}/manual-mark`,
        { studentId, status }
      );
      const data = res.data?.data;
      if (data?.students) {
        setDetailCache((prev) => ({
          ...prev,
          [lectureId]: {
            ...(prev[lectureId] || {}),
            summary: data.summary,
            students: data.students,
            lectureInfo: prev[lectureId]?.lectureInfo,
            lecture: prev[lectureId]?.lecture,
          },
        }));
      } else {
        await loadDetail(lectureId, true);
      }
      clearApiCache();
      setSessions((prev) =>
        prev.map((s) =>
          s.id === lectureId
            ? {
                ...s,
                presentCount: data?.summary?.present ?? s.presentCount,
                rosterSize: data?.summary?.totalStudents ?? s.rosterSize,
                attendanceRate:
                  data?.summary?.attendanceRate ?? s.attendanceRate,
              }
            : s
        )
      );
      toast.success(res.data?.message || `Marked ${status}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Manual mark failed");
    } finally {
      setMarkingId(null);
    }
  };

  /** Quiet repair — only when teacher asks; not needed every open */
  const repairRoster = async (lectureId) => {
    try {
      const res = await api.post(
        `/lecture/${lectureId}/repair-roster`
      );
      clearApiCache();
      await loadDetail(lectureId, true);
      toast.success(
        res.data?.message ||
          "Synced: any student still missing a mark is now ABSENT"
      );
      fetchHistory(1, true);
    } catch {
      toast.error("Sync failed");
    }
  };

  const filteredSessions = useMemo(() => {
    if (!search.trim()) return sessions;
    const q = search.toLowerCase();
    return sessions.filter(
      (s) =>
        (s.topic || "").toLowerCase().includes(q) ||
        (s.subject || "").toLowerCase().includes(q) ||
        (s.section || "").toLowerCase().includes(q)
    );
  }, [sessions, search]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
            Class History
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Past lectures · who was present · Excel for teachers
          </p>
        </div>
        <button
          type="button"
          onClick={() => fetchHistory(1, true)}
          className="btn-secondary text-sm py-2 px-3 flex items-center gap-1.5"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Filters — simple teacher language */}
      <div className="glass-card p-4 space-y-3">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Find your class
        </p>
        {filterOptions.assignmentPairs?.length > 0 && (
          <select
            value={pairFilter}
            onChange={(e) => {
              setPairFilter(e.target.value);
              setExpandedId(null);
            }}
            className="input-field text-sm py-2.5"
          >
            <option value="all">All my classes</option>
            {filterOptions.assignmentPairs.map((p) => (
              <option
                key={`${p.subjectId}|${p.sectionId}`}
                value={`${p.subjectId}|${p.sectionId}`}
              >
                {p.label}
              </option>
            ))}
          </select>
        )}
        <div className="grid grid-cols-2 gap-2">
          {filterOptions.subjects?.length > 0 && (
            <select
              value={subjectFilter}
              onChange={(e) => {
                setSubjectFilter(e.target.value);
                setExpandedId(null);
              }}
              className="input-field text-xs py-2"
            >
              <option value="all">All subjects</option>
              {filterOptions.subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code || s.name}
                </option>
              ))}
            </select>
          )}
          {filterOptions.semesters.length > 0 && (
            <select
              value={semesterFilter}
              onChange={(e) => {
                setSemesterFilter(e.target.value);
                setExpandedId(null);
              }}
              className="input-field text-xs py-2"
            >
              <option value="all">All semesters</option>
              {filterOptions.semesters.map((sem) => (
                <option key={sem} value={sem}>
                  Semester {sem}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search topic…"
            className="input-field pl-9 py-2.5 text-sm"
          />
        </div>
      </div>

      {/* Session list */}
      {filteredSessions.length === 0 ? (
        <div className="glass-card p-10 text-center">
          <Calendar
            size={48}
            className="mx-auto text-slate-300 dark:text-slate-600 mb-3"
          />
          <p className="text-slate-400">No lectures match this filter.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSessions.map((s) => {
            const isExpanded = expandedId === s.id;
            const detail = detailCache[s.id];
            const date = s.date ? new Date(s.date) : null;
            const rate =
              detail?.summary?.attendanceRate ?? s.attendanceRate ?? 0;
            const present = detail?.summary?.present ?? s.presentCount ?? 0;
            const total =
              detail?.summary?.totalStudents ?? s.rosterSize ?? 0;
            const absent =
              detail?.summary?.absent ?? Math.max(total - present, 0);
            const lectureLoc =
              detail?.lectureInfo?.location || detail?.lecture?.location;

            return (
              <div key={s.id} className="glass-card overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-slate-900 dark:text-slate-50 truncate">
                        {s.topic || "Lecture"}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        <span className="text-cyan-400 font-semibold">
                          {s.subjectCode || s.subject}
                        </span>
                        {" · "}Sec {s.section}
                        {s.semester != null ? ` · Sem ${s.semester}` : ""}
                        {s.batchYear != null ? ` · ${s.batchYear}` : ""}
                      </p>
                      {date && (
                        <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                          <Clock size={12} />
                          {date.toLocaleDateString()}{" "}
                          {date.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      )}
                    </div>
                    <span
                      className={`badge shrink-0 ${
                        s.status === "COMPLETED"
                          ? "badge-success"
                          : "badge-warning"
                      }`}
                    >
                      {s.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {[
                      { l: "Present", v: present, c: "text-emerald-400" },
                      { l: "Absent", v: absent, c: "text-rose-400" },
                      { l: "Class size", v: total, c: "text-slate-300" },
                      { l: "Rate", v: `${rate}%`, c: "text-cyan-400" },
                    ].map((x) => (
                      <div
                        key={x.l}
                        className="rounded-xl bg-slate-50 dark:bg-slate-800/50 px-2 py-2.5 text-center"
                      >
                        <p className={`text-base font-bold ${x.c}`}>{x.v}</p>
                        <p className="text-[10px] text-slate-500">{x.l}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => toggleDetail(s.id)}
                      className="btn-secondary text-xs py-2 px-3 flex items-center gap-1"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp size={14} /> Hide details
                        </>
                      ) : (
                        <>
                          <ChevronDown size={14} /> View details
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-slate-200 dark:border-slate-700/50 p-4 bg-slate-50/40 dark:bg-slate-900/30 space-y-4">
                    {detailLoading && !detail ? (
                      <div className="flex justify-center py-8">
                        <div className="w-6 h-6 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
                      </div>
                    ) : detail ? (
                      <>
                        {/* Geofence map restored */}
                        {lectureLoc?.latitude != null && (
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                              <MapPin size={12} className="text-cyan-400" />
                              Classroom geofence &amp; where present students scanned
                            </p>
                            <AttendanceMap
                              title="Present students on map"
                              classroom={lectureLoc}
                              students={(detail.students || []).filter(
                                (st) =>
                                  st.status === "PRESENT" || st.status === "LATE"
                              )}
                            />
                          </div>
                        )}

                        {/* Present-only names when present > 0 */}
                        {(detail.summary?.present || 0) > 0 ? (
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                              Present students
                            </p>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {(detail.students || [])
                                .filter(
                                  (st) =>
                                    st.status === "PRESENT" ||
                                    st.status === "LATE"
                                )
                                .map((st) => (
                                  <div
                                    key={st.id}
                                    className="flex items-center gap-3 p-2.5 rounded-xl bg-white dark:bg-slate-800/40"
                                  >
                                    <CheckCircle
                                      size={16}
                                      className="text-emerald-400"
                                    />
                                    <div className="min-w-0 flex-1">
                                      <p className="text-sm font-medium truncate">
                                        {st.name}
                                      </p>
                                      <p className="text-xs text-slate-400 font-mono">
                                        {st.rollNumber}
                                      </p>
                                    </div>
                                    <span className="text-xs font-semibold text-emerald-400">
                                      {st.status}
                                    </span>
                                  </div>
                                ))}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-6 rounded-xl bg-rose-500/5 border border-rose-500/20">
                            <XCircle
                              size={32}
                              className="mx-auto text-rose-400 mb-2"
                            />
                            <p className="font-semibold text-sm">
                              Nobody was present
                            </p>
                            <p className="text-xs text-slate-400 mt-1">
                              No present list shown · class marked absent for
                              students
                            </p>
                          </div>
                        )}

                        {/* Manual mark for late / fix — faculty only */}
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                            <UserCheck size={13} /> Mark late / correct
                            (faculty)
                          </p>
                          <div className="space-y-2 max-h-56 overflow-y-auto">
                            {(detail.students || [])
                              .filter(
                                (st) =>
                                  st.status !== "PRESENT" &&
                                  st.status !== "LATE"
                              )
                              .map((st) => {
                                const busy =
                                  markingId === `${s.id}:${st.id}`;
                                return (
                                  <div
                                    key={st.id}
                                    className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-xl bg-white dark:bg-slate-800/40"
                                  >
                                    <div className="min-w-0 flex-1">
                                      <p className="text-sm font-medium truncate">
                                        {st.name}
                                      </p>
                                      <p className="text-xs text-slate-400 font-mono">
                                        {st.rollNumber} · {st.status}
                                      </p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      <button
                                        type="button"
                                        disabled={busy}
                                        onClick={() =>
                                          manualMark(s.id, st.id, "PRESENT")
                                        }
                                        className="text-xs font-semibold px-3 py-2 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 disabled:opacity-40"
                                      >
                                        Present
                                      </button>
                                      <button
                                        type="button"
                                        disabled={busy}
                                        onClick={() =>
                                          manualMark(s.id, st.id, "LATE")
                                        }
                                        className="text-xs font-semibold px-3 py-2 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30 disabled:opacity-40"
                                      >
                                        Late
                                      </button>
                                      <button
                                        type="button"
                                        disabled={busy}
                                        onClick={() =>
                                          manualMark(s.id, st.id, "EXCUSED")
                                        }
                                        className="text-xs font-semibold px-3 py-2 rounded-lg bg-sky-500/15 text-sky-400 border border-sky-500/30 disabled:opacity-40"
                                      >
                                        Excused
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            {(detail.students || []).filter(
                              (st) =>
                                st.status !== "PRESENT" &&
                                st.status !== "LATE"
                            ).length === 0 && (
                              <p className="text-center text-sm text-slate-400 py-3">
                                Everyone present — nothing to correct.
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Advanced: sync — explained, not primary */}
                        {s.status === "COMPLETED" && (
                          <button
                            type="button"
                            onClick={() => repairRoster(s.id)}
                            className="text-xs text-slate-500 hover:text-cyan-400 underline-offset-2 hover:underline"
                            title="Only if counts look wrong: fills missing ABSENT marks for the class"
                          >
                            Fix missing marks (advanced)
                          </button>
                        )}
                      </>
                    ) : (
                      <p className="text-slate-400 text-sm text-center py-4">
                        No data
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {pagination.page < pagination.totalPages && (
            <button
              type="button"
              onClick={() => fetchHistory(pagination.page + 1, false)}
              disabled={loadingMore}
              className="btn-secondary w-full text-sm"
            >
              {loadingMore ? "Loading…" : "Load more lectures"}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default SessionHistory;
