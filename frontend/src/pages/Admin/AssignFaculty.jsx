import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import {
  ArrowLeft,
  UserCheck,
  Plus,
  Search,
  Trash2,
  BookOpen,
  ChevronDown,
  X,
} from "lucide-react";
import api from "../../utils/api.js";

/* ------------------------------------------------------------------ */
/*  SearchableDropdown                                                */
/*  A single reusable combobox that replaces the old native <select   */
/*  size={6}> "always-open list" pattern with a proper closed field   */
/*  that expands into a floating, searchable panel on click.          */
/* ------------------------------------------------------------------ */
const SearchableDropdown = ({
  label,
  required,
  placeholder = "Select an option",
  options,
  value,
  onChange,
  getKey,
  getLabel,
  getSublabel,
  error,
  emptyText = "No matches found",
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
        setQuery("");
      }
    };
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    // Autofocus the search input once the panel mounts
    requestAnimationFrame(() => inputRef.current?.focus());
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const filtered = query
    ? options.filter((o) => getLabel(o).toLowerCase().includes(query.toLowerCase()))
    : options;

  const selected = options.find((o) => getKey(o) === value);

  return (
    <div ref={wrapperRef} className="relative">
      <label className="input-label">
        {label} {required && <span className="text-rose-400">*</span>}
      </label>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`input-field w-full flex items-center justify-between gap-2 text-left transition-colors ${
          error
            ? "border-rose-400/70 focus:border-rose-400"
            : open
            ? "border-cyan-400/70"
            : ""
        }`}
      >
        <span
          className={`truncate ${
            selected ? "text-slate-900 dark:text-slate-100" : "text-slate-500"
          }`}
        >
          {selected ? getLabel(selected) : placeholder}
        </span>

        <span className="flex items-center gap-1 shrink-0">
          {selected && (
            <X
              size={14}
              className="text-slate-500 hover:text-rose-400 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
            />
          )}
          <ChevronDown
            size={16}
            className={`text-slate-500 transition-transform duration-200 ${
              open ? "rotate-180 text-cyan-400" : ""
            }`}
          />
        </span>
      </button>

      {open && (
        <div className="absolute z-30 mt-2 w-full rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-dark-800 shadow-xl shadow-black/5 dark:shadow-black/30 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="relative p-2 border-b border-slate-200 dark:border-slate-700/60 bg-slate-50/60 dark:bg-slate-900/40">
            <Search
              size={14}
              className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500"
            />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${label.toLowerCase()}...`}
              className="input-field pl-9 py-2 text-sm"
            />
          </div>

          <div className="max-h-60 overflow-y-auto no-scrollbar py-1">
            {filtered.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-6">{emptyText}</p>
            ) : (
              filtered.map((o) => {
                const key = getKey(o);
                const isSelected = key === value;
                return (
                  <button
                    type="button"
                    key={key}
                    onClick={() => {
                      onChange(key);
                      setOpen(false);
                      setQuery("");
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                      isSelected
                        ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400"
                        : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/40"
                    }`}
                  >
                    <span className="block truncate font-medium">{getLabel(o)}</span>
                    {getSublabel && (
                      <span className="block truncate text-xs text-slate-500 mt-0.5">
                        {getSublabel(o)}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {error && <p className="text-rose-400 text-xs mt-1">{error}</p>}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  AssignFaculty                                                     */
/* ------------------------------------------------------------------ */
const AssignFaculty = () => {
  const [faculty, setFaculty] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [sections, setSections] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [facultyId, setFacultyId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [errors, setErrors] = useState({});

  useEffect(() => {
    Promise.all([
      api.get("/faculty"),
      api.get("/subjects"),
      api.get("/sections"),
      api.get("/assignments"),
    ])
      .then(([fR, sR, secR, aR]) => {
        setFaculty(fR.data?.data || []);
        setSubjects(sR.data?.data || []);
        setSections(secR.data?.data || []);
        setAssignments(aR.data?.data || []);
      })
      .catch(() => toast.error("Failed to load data"))
      .finally(() => setLoading(false));
  }, []);

  const validate = () => {
    const next = {};
    if (!facultyId) next.facultyId = "Select a faculty member";
    if (!subjectId) next.subjectId = "Select a subject";
    if (!sectionId) next.sectionId = "Select a section";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await api.post("/faculty-subject-section", {
        facultyId,
        subjectId,
        sectionId,
        academicYear: new Date().getFullYear(),
        semester: 1,
      });
      toast.success("Faculty assigned!");
      setFacultyId("");
      setSubjectId("");
      setSectionId("");
      setErrors({});

      const aR = await api.get("/assignments");
      setAssignments(aR.data?.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Assignment failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async (id) => {
    if (!window.confirm("Remove this assignment?")) return;
    try {
      await api.delete(`/assignment/${id}`);
      toast.success("Assignment removed");
      setAssignments((prev) => prev.filter((a) => a._id !== id));
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to remove");
    }
  };

  const getFacultyLabel = (f) => f.userId?.name || "Unnamed";
  const getFacultySublabel = (f) => f.employeeId || "N/A";

  const getSubjectLabel = (s) => `${s.subjectName} (${s.subjectCode})`;
  const getSubjectSublabel = (s) => `${s.departmentId?.name || ""} · Sem ${s.semester}`;

  const getSectionLabel = (s) => `${s.name} — ${s.departmentId?.name || ""}`;
  const getSectionSublabel = (s) => `Sem ${s.semester} · Batch ${s.batchYear}`;

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-dark-900 flex items-center justify-center transition-colors">
        <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-50 transition-colors p-4">
      <div className="max-w-6xl mx-auto pt-6">
        <Link
          to="/admin"
          className="inline-flex items-center text-slate-500 hover:text-cyan-400 mb-6 text-sm transition-colors"
        >
          <ArrowLeft size={16} className="mr-1" /> Back to Admin
        </Link>

        {/* Two-column layout: assignments on the left, form on the right.
            Keeping them side by side (instead of stacked) means the dropdown's
            floating panel never has to push or overlap the list below it. */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
          {/* Existing Assignments — left */}
          <div className="glass-card overflow-hidden lg:col-span-2 lg:order-1 lg:sticky lg:top-4">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700/50 flex items-center justify-between">
              <h3 className="font-bold flex items-center gap-2">
                <BookOpen size={18} className="text-cyan-400" /> Current Assignments
              </h3>
              <span className="text-xs text-slate-500">{assignments.length} total</span>
            </div>
            <div className="p-4 max-h-[32rem] overflow-y-auto no-scrollbar">
              {assignments.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-6">No assignments yet.</p>
              ) : (
                <div className="space-y-2">
                  {assignments.map((a) => (
                    <div
                      key={a._id}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-slate-900 dark:text-slate-200 truncate">
                          {a.facultyId?.userId?.name || a.facultyId?.employeeId || "Unknown"}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {a.subjectId?.subjectName} ({a.subjectId?.subjectCode}) → {a.sectionId?.name}{" "}
                          — {a.sectionId?.departmentId?.name || ""} Sem {a.sectionId?.semester} Batch{" "}
                          {a.sectionId?.batchYear}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemove(a._id)}
                        className="p-2 text-slate-500 hover:text-rose-400 transition-colors shrink-0 ml-2"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Assign Faculty form — right */}
          <div className="glass-card p-6 lg:col-span-3 lg:order-2">
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
                <UserCheck size={28} className="text-emerald-400" />
              </div>
              <h2 className="text-2xl font-bold">Assign Faculty</h2>
              <p className="text-slate-500 text-sm mt-1">Map faculty to a subject and section</p>
            </div>

            <form onSubmit={onSubmit} className="space-y-5">
              <SearchableDropdown
                label="Faculty"
                required
                placeholder="Select faculty"
                options={faculty}
                value={facultyId}
                onChange={setFacultyId}
                getKey={(f) => f._id}
                getLabel={getFacultyLabel}
                getSublabel={getFacultySublabel}
                error={errors.facultyId}
                emptyText="No faculty match your search"
              />

              <SearchableDropdown
                label="Subject"
                required
                placeholder="Select subject"
                options={subjects}
                value={subjectId}
                onChange={setSubjectId}
                getKey={(s) => s._id}
                getLabel={getSubjectLabel}
                getSublabel={getSubjectSublabel}
                error={errors.subjectId}
                emptyText="No subjects match your search"
              />

              <SearchableDropdown
                label="Section"
                required
                placeholder="Select section"
                options={sections}
                value={sectionId}
                onChange={setSectionId}
                getKey={(s) => s._id}
                getLabel={getSectionLabel}
                getSublabel={getSectionSublabel}
                error={errors.sectionId}
                emptyText="No sections match your search"
              />

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Plus size={18} /> Assign
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssignFaculty;