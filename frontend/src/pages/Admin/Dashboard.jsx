import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  LogOut, Users, BookOpen, UserCheck, Layers, LayoutGrid,
  GraduationCap, BarChart3, Plus, Trash2, Edit3, X,
  RefreshCw, AlertCircle, Search, Building2, ArrowUp, ArrowDown,
  CheckCircle, XCircle, Clock, Smartphone
} from "lucide-react";
import { logout } from "../../store/authSlice.js";
import { toast } from "react-toastify";
import api from "../../utils/api.js";
import ThemeToggle from "../../components/UI/ThemeToggle.jsx";
import AnalyticsCharts from "../../components/Admin/AnalyticsCharts.jsx";
import OverviewMatrix from "../../components/Admin/OverviewMatrix.jsx";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "matrix", label: "Overview Matrix" },
  { id: "analytics", label: "Analytics" },
  { id: "logins", label: "Login Approvals" },
  { id: "departments", label: "Departments" },
  { id: "subjects", label: "Subjects" },
  { id: "sections", label: "Sections" },
  { id: "faculty", label: "Faculty" },
  { id: "students", label: "Students" },
  { id: "assignments", label: "Assignments" },
  { id: "active", label: "Active Lectures" },
];

// Flatten nested API response to flat form keys
function flattenForEdit(item, tab) {
  const flat = { ...item };
  // Extract userId fields
  if (item.userId && typeof item.userId === "object") {
    flat.name = item.userId.name || "";
    flat.email = item.userId.email || "";
  }
  // Extract ObjectId from populated refs
  if (item.departmentId && typeof item.departmentId === "object") {
    flat.departmentId = item.departmentId._id || "";
  }
  if (item.sectionId && typeof item.sectionId === "object") {
    flat.sectionId = item.sectionId._id || "";
  }
  if (item.facultyId && typeof item.facultyId === "object") {
    flat.facultyId = item.facultyId._id || "";
  }
  if (item.subjectId && typeof item.subjectId === "object") {
    flat.subjectId = item.subjectId._id || "";
  }
  if (item.mentorId && typeof item.mentorId === "object") {
    flat.mentorId = item.mentorId._id || "";
  }
  return flat;
}

function SortHeader({ label, field, currentSort, currentOrder, onSort }) {
  const isActive = currentSort === field;
  return (
    <button onClick={() => onSort(field)} className="flex items-center gap-1 text-xs uppercase tracking-wider text-slate-400 hover:text-cyan-400 transition-colors">
      {label}
      {isActive && (currentOrder === "asc" ? <ArrowUp size={12}/> : <ArrowDown size={12}/>)}
    </button>
  );
}

function EditModal({ title, fields, initial, onSave, onClose, loading }) {
  const [form, setForm] = useState(() => {
    // Initialize form with defaults from fields
    const defaults = {};
    (fields || []).forEach(f => {
      defaults[f.key] = initial?.[f.key] !== undefined ? initial[f.key] : (f.type === "toggle" ? false : "");
    });
    return defaults;
  });

  // Re-init when initial changes
  useEffect(() => {
    const defaults = {};
    (fields || []).forEach(f => {
      defaults[f.key] = initial?.[f.key] !== undefined ? initial[f.key] : (f.type === "toggle" ? false : "");
    });
    setForm(defaults);
  }, [initial, fields]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="glass-card p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"><X size={20}/></button>
        </div>
        <div className="space-y-3">
          {fields.map(f => (
            <div key={f.key}>
              <label className="input-label">{f.label}</label>
              {f.type === "toggle" ? (
                <button onClick={() => setForm(p => ({ ...p, [f.key]: !p[f.key] }))}
                  className={"w-full p-3 rounded-xl border text-sm font-medium transition-colors " + (form[f.key]
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                    : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-400")}>
                  {form[f.key] ? "Active - Click to deactivate" : "Inactive - Click to reactivate"}
                </button>
              ) : f.type === "select" ? (
                <select value={form[f.key] || ""} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} className="input-field">
                  <option value="">-- Select --</option>
                  {(f.options || []).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : (
                <input type={f.type || "text"} value={form[f.key] || ""} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} className="input-field" />
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={() => onSave(form)} disabled={loading} className="btn-primary flex-1">{loading ? "Saving..." : "Save Changes"}</button>
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
        </div>
      </div>
    </div>
  );
}

function ConfirmModal({ title, message, confirmLabel, confirmClass, onConfirm, onClose, loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="glass-card p-6 w-full max-w-sm text-center" onClick={e => e.stopPropagation()}>
        <AlertCircle size={40} className="mx-auto text-amber-400 mb-3" />
        <h3 className="font-bold text-lg mb-2 text-slate-900 dark:text-slate-100">{title}</h3>
        <p className="text-slate-400 text-sm mb-5">{message}</p>
        <div className="flex gap-3">
          <button onClick={onConfirm} disabled={loading} className={"flex-1 " + (confirmClass || "btn-danger")}>{loading ? "Processing..." : confirmLabel || "Confirm"}</button>
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
        </div>
      </div>
    </div>
  );
}

const overviewCards = [
  { label: "Create Department", icon: Building2, path: "/create-department", desc: "Add new academic department" },
  { label: "Create Subject", icon: Plus, path: "/create-subject", desc: "Add new subject with code and credits" },
  { label: "Create Section", icon: LayoutGrid, path: "/create-section", desc: "Add class sections with batch year range" },
  { label: "Assign Faculty", icon: UserCheck, path: "/assign-faculty", desc: "Map faculty to subjects and sections" },
  { label: "Register User", icon: UserCheck, path: "/register", desc: "Create student or faculty accounts" },
  { label: "View All Students", icon: Users, path: "/students", desc: "Browse and search student records" },
];

const AdminDashboard = () => {
  const { user } = useSelector(s => s.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [tab, setTab] = useState("overview");
  const [counts, setCounts] = useState({});
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [permDeleteItem, setPermDeleteItem] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [deptList, setDeptList] = useState([]);
  const [sectionList, setSectionList] = useState([]);
  const [facultyList, setFacultyList] = useState([]);

  useEffect(() => {
    api.get("/departments?showInactive=true").then(r => setDeptList(r.data?.data || []));
    api.get("/sections?showInactive=true").then(r => setSectionList(r.data?.data || []));
    api.get("/faculty").then(r => setFacultyList(r.data?.data || []));
  }, []);

  const fetchCounts = useCallback(async () => {
    try {
      const [st, fac, sub, dept] = await Promise.all([
        api.get("/students").then(r => r.data?.count || 0),
        api.get("/faculty").then(r => r.data?.count || 0),
        api.get("/subjects").then(r => r.data?.count || 0),
        api.get("/departments").then(r => r.data?.count || 0),
      ]);
      setCounts({ students: st, faculty: fac, subjects: sub, departments: dept });
    } catch {}
  }, []);

  useEffect(() => { fetchCounts(); }, [fetchCounts]);

  const handleSort = (field) => {
    if (sortBy === field) { setSortOrder(o => o === "asc" ? "desc" : "asc"); }
    else { setSortBy(field); setSortOrder("asc"); }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let endpoint = "";
      const q = [];
      if (showInactive) q.push("showInactive=true");
      if (sortBy) { q.push("sortBy=" + sortBy); q.push("order=" + sortOrder); }
      const qs = q.length ? "?" + q.join("&") : "";
      switch (tab) {
        case "departments": endpoint = "/departments" + qs; break;
        case "subjects": endpoint = "/subjects" + qs; break;
        case "sections": endpoint = "/sections" + qs; break;
        case "faculty": endpoint = "/faculty" + qs; break;
        case "students": endpoint = "/students" + qs; break;
        case "assignments": endpoint = "/assignments"; break;
        case "active": endpoint = "/admin/active-lectures"; break;
        case "logins": endpoint = "/api/device/admin/pending"; break;
      }
      if (endpoint) { const r = await api.get(endpoint); setData(r.data?.data || []); }
    } catch { toast.error("Failed to load data"); }
    finally { setLoading(false); }
  }, [tab, sortBy, sortOrder, showInactive]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = search.trim() ? data.filter(item => JSON.stringify(item).toLowerCase().includes(search.toLowerCase())) : data;

  // Open edit — flatten data first
  const openEdit = (item) => {
    setEditItem(flattenForEdit(item, tab));
  };

  const doEdit = async (form) => {
    setActionLoading(true);
    try {
      const map = { departments: "department", subjects: "subject", sections: "section", students: "student", faculty: "faculty" };
      await api.put("/" + (map[tab] || "department") + "/" + editItem._id, form);
      toast.success("Updated!");
      setEditItem(null); fetchData(); fetchCounts();
    } catch (e) { toast.error(e.response?.data?.message || "Update failed"); }
    finally { setActionLoading(false); }
  };

  const doDeactivate = async (item) => {
    setActionLoading(true);
    try {
      const map = { departments: "department", subjects: "subject", sections: "section", students: "student", faculty: "faculty", assignments: "assignment" };
      const base = map[tab] || "department";
      if (!item.isActive) {
        await api.put("/" + base + "/" + item._id, { isActive: true });
        toast.success("Reactivated!");
      } else {
        await api.delete("/" + base + "/" + item._id);
        toast.success("Deactivated!");
      }
      setDeleteItem(null); fetchData(); fetchCounts();
    } catch (e) { toast.error(e.response?.data?.message || "Operation failed"); }
    finally { setActionLoading(false); }
  };

  const doPermanentDelete = async () => {
    setActionLoading(true);
    try {
      const map = { departments: "department", subjects: "subject", sections: "section", students: "student", faculty: "faculty", assignments: "assignment" };
      await api.delete("/" + (map[tab] || "department") + "/" + permDeleteItem._id + "/permanent");
      toast.success("Permanently deleted!");
      setPermDeleteItem(null); fetchData(); fetchCounts();
    } catch (e) { toast.error(e.response?.data?.message || "Failed"); }
    finally { setActionLoading(false); }
  };

  const doForceEnd = async (id) => {
    try { await api.post("/admin/lecture/end", { lectureSessionId: id }); toast.success("Session force-ended"); fetchData(); }
    catch (e) { toast.error(e.response?.data?.message || "Failed"); }
  };

  const getEditFields = () => {
    if (tab === "departments") return [
      { key: "name", label: "Name", type: "text" },
      { key: "code", label: "Code", type: "text" },
      { key: "description", label: "Description", type: "text" },
      { key: "isActive", label: "Status", type: "toggle" },
    ];
    if (tab === "subjects") return [
      { key: "subjectName", label: "Subject Name", type: "text" },
      { key: "subjectCode", label: "Subject Code", type: "text" },
      { key: "departmentId", label: "Department", type: "select", options: deptList.map(d => ({ value: d._id, label: d.name + " (" + d.code + ")" })) },
      { key: "credits", label: "Credits (1-15)", type: "number" },
      { key: "semester", label: "Semester (1-16)", type: "number" },
      { key: "isActive", label: "Status", type: "toggle" },
    ];
    if (tab === "sections") return [
      { key: "name", label: "Section Name", type: "text" },
      { key: "departmentId", label: "Department", type: "select", options: deptList.map(d => ({ value: d._id, label: d.name + " (" + d.code + ")" })) },
      { key: "semester", label: "Semester", type: "number" },
      { key: "batchYear", label: "Batch Start Year", type: "number" },
      { key: "batchEndYear", label: "Batch End Year (optional)", type: "number" },
      { key: "isActive", label: "Status", type: "toggle" },
    ];
    if (tab === "faculty") return [
      { key: "name", label: "Full Name", type: "text" },
      { key: "email", label: "Email", type: "email" },
      { key: "departmentId", label: "Department", type: "select", options: deptList.map(d => ({ value: d._id, label: d.name + " (" + d.code + ")" })) },
      { key: "designation", label: "Designation", type: "text" },
      { key: "phone", label: "Phone (10-digit)", type: "text" },
      { key: "specialization", label: "Specialization", type: "text" },
      { key: "isActive", label: "Status", type: "toggle" },
    ];
    if (tab === "students") return [
      { key: "name", label: "Full Name", type: "text" },
      { key: "email", label: "Email", type: "email" },
      { key: "rollNumber", label: "Roll Number", type: "text" },
      { key: "sectionId", label: "Section", type: "select", options: sectionList.map(s => ({ value: s._id, label: (s.departmentId?.name || "") + " - " + s.name + " Sem " + s.semester + " Batch " + (s.batchLabel || s.batchYear) })) },
      { key: "departmentId", label: "Department", type: "select", options: deptList.map(d => ({ value: d._id, label: d.name + " (" + d.code + ")" })) },
      { key: "mentorId", label: "Mentor (Faculty)", type: "select", options: [{ value: "", label: "— No mentor —" }, ...facultyList.map(f => ({ value: f._id, label: (f.userId?.name || f.employeeId) + " (" + f.employeeId + ")" }))] },
      { key: "semester", label: "Semester", type: "number" },
      { key: "enrollmentYear", label: "Enrollment Year", type: "number" },
      { key: "phone", label: "Phone", type: "text" },
      { key: "parentPhone", label: "Parent Phone", type: "text" },
      { key: "isActive", label: "Status", type: "toggle" },
    ];
    return [];
  };

  const handleLogout = () => { dispatch(logout()); navigate("/login"); };
  const createLinkMap = { departments: "/create-department", subjects: "/create-subject", sections: "/create-section", faculty: "/register", students: "/register", assignments: "/assign-faculty" };

  const sortOptions = {
    departments: [{ field: "name", label: "Name" }, { field: "code", label: "Code" }, { field: "createdAt", label: "Created" }],
    subjects: [{ field: "subjectName", label: "Name" }, { field: "subjectCode", label: "Code" }, { field: "semester", label: "Semester" }],
    sections: [{ field: "name", label: "Name" }, { field: "semester", label: "Semester" }, { field: "batchYear", label: "Batch Year" }],
    faculty: [{ field: "createdAt", label: "Created" }, { field: "employeeId", label: "Emp ID" }, { field: "designation", label: "Designation" }],
    students: [{ field: "rollNumber", label: "Roll No" }, { field: "semester", label: "Semester" }, { field: "enrollmentYear", label: "Enrollment" }],
  };

  const statCards = [
    { label: "Students", value: counts.students || 0, icon: GraduationCap, color: "text-cyan-400" },
    { label: "Faculty", value: counts.faculty || 0, icon: UserCheck, color: "text-blue-400" },
    { label: "Subjects", value: counts.subjects || 0, icon: BookOpen, color: "text-purple-400" },
    { label: "Departments", value: counts.departments || 0, icon: Layers, color: "text-emerald-400" },
  ];

  const actionButtons = (item) => (
    <div className="flex items-center gap-1 shrink-0">
      <span className={item.isActive ? "badge badge-success text-xs" : "badge badge-danger text-xs"}>{item.isActive ? "Active" : "Inactive"}</span>
      <button onClick={() => openEdit(item)} className="p-1.5 text-slate-400 hover:text-blue-400" title="Edit"><Edit3 size={15}/></button>
      <button onClick={() => setDeleteItem(item)} className="p-1.5 text-slate-400 hover:text-rose-400" title={item.isActive ? "Deactivate" : "Reactivate"}>{item.isActive ? <XCircle size={15}/> : <CheckCircle size={15}/>}</button>
      {!item.isActive && <button onClick={() => setPermDeleteItem(item)} className="p-1.5 text-slate-400 hover:text-red-600" title="Permanent Delete"><Trash2 size={15}/></button>}
    </div>
  );

  const renderCard = (item) => {
    const cls = item.isActive === false ? "glass-card p-4 flex items-center justify-between opacity-60" : "glass-card p-4 flex items-center justify-between";
    if (tab === "departments") return (
      <div className={cls}><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 font-bold text-sm shrink-0">{item.code}</div><div className="min-w-0"><p className="font-medium text-sm text-slate-900 dark:text-slate-100 truncate">{item.name}</p><p className="text-xs text-slate-400 truncate">{item.description || "No description"}</p></div></div>{actionButtons(item)}</div>
    );
    if (tab === "subjects") return (
      <div className={cls}><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold text-sm shrink-0">{item.subjectCode}</div><div className="min-w-0"><p className="font-medium text-sm text-slate-900 dark:text-slate-100 truncate">{item.subjectName}</p><p className="text-xs text-slate-400">{item.departmentId?.name || "No dept"} | Sem {item.semester} | {item.credits}cr</p></div></div>{actionButtons(item)}</div>
    );
    if (tab === "sections") return (
      <div className={cls}><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 font-bold text-sm shrink-0">S{item.semester}</div><div className="min-w-0"><p className="font-medium text-sm text-slate-900 dark:text-slate-100">{item.name}</p><p className="text-xs text-slate-400">{item.departmentId?.name || "No dept"} | Batch {item.batchLabel || item.batchYear} | Sem {item.semester}</p></div></div>{actionButtons(item)}</div>
    );
    if (tab === "faculty") return (
      <div className={cls}><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center text-cyan-400 font-bold text-sm shrink-0">{(item.userId?.name || "F").charAt(0).toUpperCase()}</div><div className="min-w-0"><p className="font-medium text-sm text-slate-900 dark:text-slate-100 truncate">{item.userId?.name || "Unnamed"}</p><p className="text-xs text-slate-400">{item.employeeId} | {item.departmentId?.name || "No dept"} | {item.designation}</p></div></div>{actionButtons(item)}</div>
    );
    if (tab === "students") return (
      <div className={cls}><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center text-cyan-400 font-bold text-sm shrink-0">{(item.userId?.name || "S").charAt(0).toUpperCase()}</div><div className="min-w-0"><p className="font-medium text-sm text-slate-900 dark:text-slate-100 truncate">{item.userId?.name || "Unnamed"}</p><p className="text-xs text-slate-400">{item.rollNumber} | {item.sectionId?.name || "No section"} | {item.departmentId?.name || "No dept"} | Sem {item.semester}</p><p className="text-xs text-slate-400">{item.mentorId ? "Mentor: " + (item.mentorId.userId?.name || item.mentorId.employeeId || "") : "No mentor"}</p></div></div>{actionButtons(item)}</div>
    );
    if (tab === "assignments") return (
      <div className="glass-card p-4 flex items-center justify-between"><div className="min-w-0 flex-1"><p className="font-medium text-sm text-slate-900 dark:text-slate-100 truncate">{item.facultyId?.userId?.name || item.facultyId?.employeeId || "Unknown"}</p><p className="text-xs text-slate-400 truncate">{item.subjectId?.subjectName} ({item.subjectId?.subjectCode}) arrow {item.sectionId?.name} | {item.sectionId?.departmentId?.name || ""} Sem {item.sectionId?.semester} Batch {item.sectionId?.batchLabel || item.sectionId?.batchYear}</p></div><button onClick={() => { if (window.confirm("Remove this assignment permanently?")) { api.delete("/assignment/" + item._id + "/permanent").then(() => { toast.success("Removed!"); fetchData(); }).catch(e => toast.error(e.response?.data?.message || "Failed")); } }} className="p-1.5 text-slate-400 hover:text-rose-400 shrink-0 ml-2"><Trash2 size={15}/></button></div>
    );
    return null;
  };

  return (
    <div className="min-h-screen bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-50 transition-colors">
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/5 dark:bg-blue-600/10 blur-[120px] rounded-full"/>
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-500/5 dark:bg-purple-500/10 blur-[120px] rounded-full"/>
      </div>

      <header className="fixed top-0 left-0 right-0 z-40 glass-nav px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-black tracking-tight">Attend<span className="text-cyan-400">X</span><span className="text-xs font-medium text-slate-400 ml-2 uppercase tracking-wider">Admin</span></h1>
        <div className="flex items-center gap-2"><ThemeToggle /><button onClick={handleLogout} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/50 text-slate-400 hover:text-rose-400"><LogOut size={20}/></button></div>
      </header>

      <main className="pt-14 px-3 sm:px-4 max-w-6xl mx-auto pb-10">
        <div className="mt-3 mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Admin</h2>
            <p className="text-xs text-slate-400 mt-0.5">Academics · people · live lectures · analytics</p>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-4">
          {statCards.map((s, i) => (<div key={i} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 sm:p-4"><div className="flex items-center gap-1.5 mb-1"><s.icon size={14} className={s.color}/><span className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold">{s.label}</span></div><p className={"text-xl font-bold " + s.color}>{s.value}</p></div>))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="flex flex-wrap gap-1">
            {TABS.map(t => (<button key={t.id} onClick={() => { setTab(t.id); setSearch(""); setSortBy(""); }} className={"px-3 py-1.5 text-sm font-medium rounded-lg transition-colors " + (tab === t.id ? "bg-cyan-500/10 text-cyan-400" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300")}>{t.label}</button>))}
          </div>
          <div className="flex gap-2 items-center">
            {tab === "overview" && (<button onClick={() => setShowAnalytics(!showAnalytics)} className="btn-secondary text-sm py-2 px-4 flex items-center gap-2"><BarChart3 size={16}/> {showAnalytics ? "Hide Charts" : "Show Charts"}</button>)}
            {createLinkMap[tab] && (<Link to={createLinkMap[tab]} className="btn-primary text-sm py-2 px-4 flex items-center gap-2"><Plus size={16}/> Create New</Link>)}
          </div>
        </div>

        {sortOptions[tab] && (
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <span className="text-xs text-slate-400 uppercase tracking-wider">Sort:</span>
            {sortOptions[tab].map(o => (<SortHeader key={o.field} label={o.label} field={o.field} currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />))}
            <div className="flex-1"/>
            <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer"><input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} className="rounded accent-cyan-500"/>Show inactive</label>
            <div className="relative w-48"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-9 py-1.5 text-sm" placeholder={"Search " + tab + "..."}/></div>
            <button onClick={fetchData} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"><RefreshCw size={16}/></button>
          </div>
        )}

        {tab === "overview" && (
          <div>{showAnalytics && <div className="mb-8"><AnalyticsCharts /></div>}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {overviewCards.map((item, i) => (<Link key={i} to={item.path} className="glass-card p-5 flex items-center gap-4 hover:border-cyan-500/30 transition-all group"><div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center group-hover:scale-105 transition-transform"><item.icon size={24} className="text-cyan-400"/></div><div><h3 className="font-bold text-sm">{item.label}</h3><p className="text-xs text-slate-400 mt-0.5">{item.desc}</p></div></Link>))}
            </div>
          </div>
        )}

        {tab === "analytics" && (
          <div className="mb-4">
            <p className="text-sm text-slate-400 mb-4">Institution-wide trends · department · subject · faculty performance</p>
            <AnalyticsCharts />
          </div>
        )}

        {tab === "matrix" && <OverviewMatrix />}

        {tab === "logins" && (
          <div className="space-y-3">
            <p className="text-sm text-slate-400">Student login requests awaiting device approval.</p>
            {loading ? (
              <div className="flex justify-center py-12"><RefreshCw size={24} className="animate-spin text-cyan-400"/></div>
            ) : filtered.length === 0 ? (
              <p className="text-slate-400 text-center py-12">No pending login approvals.</p>
            ) : filtered.map((l) => (
              <div key={l.id} className="glass-card p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                      {l.student?.name || "Student"}
                      <span className="text-slate-400 font-normal ml-2">{l.student?.rollNumber}</span>
                    </p>
                    <p className="text-xs text-slate-400">
                      {l.student?.section ? `Sec ${l.student.section} · ` : ""}
                      {l.deviceLabel || "Unknown device"}
                      {l.createdAt ? " · " + new Date(l.createdAt).toLocaleString() : ""}
                    </p>
                    {l.mentor?.name && (
                      <p className="text-xs text-slate-400">Mentor: {l.mentor.name}</p>
                    )}
                  </div>
                  <span className="badge badge-warning shrink-0">PENDING</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      try {
                        const r = await api.post("/api/device/" + l.id + "/decision", { decision: "ACCEPT" });
                        toast.success(r.data?.message || "Approved");
                        fetchData();
                      } catch (e) { toast.error(e.response?.data?.message || "Failed"); }
                    }}
                    className="btn-primary flex-1 flex items-center justify-center gap-2 py-2.5"
                  >
                    <CheckCircle size={16} /> Accept login
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const r = await api.post("/api/device/" + l.id + "/decision", { decision: "REJECT" });
                        toast.success(r.data?.message || "Rejected");
                        fetchData();
                      } catch (e) { toast.error(e.response?.data?.message || "Failed"); }
                    }}
                    className="btn-danger flex-1 flex items-center justify-center gap-2 py-2.5"
                  >
                    <XCircle size={16} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab !== "overview" && tab !== "active" && tab !== "analytics" && tab !== "matrix" && tab !== "logins" && (
          <div className="space-y-2">{loading ? (<div className="flex justify-center py-12"><RefreshCw size={24} className="animate-spin text-cyan-400"/></div>) : filtered.length === 0 ? (<p className="text-slate-400 text-center py-12">No {tab} found.</p>) : filtered.map(item => <div key={item._id}>{renderCard(item)}</div>)}</div>
        )}

        {tab === "active" && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-slate-400">Live sessions across all faculty. Force end clears them for everyone.</p>
              <button
                type="button"
                className="btn-danger text-sm py-2 px-3"
                onClick={async () => {
                  if (!confirm("End ALL active lectures now?")) return;
                  try {
                    const r = await api.post("/admin/lecture/end-all");
                    toast.success(r.data?.message || "All ended");
                    fetchData();
                  } catch (e) {
                    toast.error(e.response?.data?.message || "Failed");
                  }
                }}
              >
                End all active
              </button>
            </div>
            {filtered.length === 0 ? (
              <p className="text-slate-400 text-center py-12">No active lectures right now.</p>
            ) : (
              filtered.map((l) => (
                <div key={l.id} className="glass-card p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-slate-900 dark:text-slate-100">{l.topic}</p>
                    <p className="text-xs text-slate-400">
                      {l.faculty ? `${l.faculty} · ` : ""}
                      {l.subject} | {l.section} | {l.presentCount} marked |{" "}
                      <Clock size={11} className="inline" /> {l.elapsedMin} min
                    </p>
                  </div>
                  <button type="button" onClick={() => doForceEnd(l.id)} className="btn-danger text-sm py-2 px-4 shrink-0">
                    Force End
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {editItem && (<EditModal title={"Edit " + tab.slice(0, -1)} fields={getEditFields()} initial={editItem} onSave={doEdit} onClose={() => setEditItem(null)} loading={actionLoading} />)}
      {deleteItem && (<ConfirmModal title={deleteItem.isActive ? "Deactivate?" : "Reactivate?"} message={deleteItem.isActive ? "This will deactivate this " + tab.slice(0, -1) + ". They can be reactivated later." : "This will reactivate this " + tab.slice(0, -1) + "."} confirmLabel={deleteItem.isActive ? "Deactivate" : "Reactivate"} confirmClass={deleteItem.isActive ? "btn-danger" : "btn-primary"} onConfirm={() => doDeactivate(deleteItem)} onClose={() => setDeleteItem(null)} loading={actionLoading} />)}
      {permDeleteItem && (<ConfirmModal title="Permanently Delete?" message="This CANNOT be undone. The record will be completely removed from the database." confirmLabel="Delete Forever" confirmClass="px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-500 transition-colors" onConfirm={doPermanentDelete} onClose={() => setPermDeleteItem(null)} loading={actionLoading} />)}
    </div>
  );
};
export default AdminDashboard;
