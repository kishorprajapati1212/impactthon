import { ArrowRight } from "lucide-react";

/** Professional desktop table for admin lists. On small screens the parent
 *  renders cards instead (this component is hidden below lg). */
const val = (v) => (v === null || v === undefined || v === "" ? "—" : v);
const person = (item) => item.userId?.name || "Unnamed";
const email = (item) => item.userId?.email || "";

const COLUMNS = {
  departments: [
    { label: "Department", get: (i) => <><b>{i.name}</b><small>{val(i.description)}</small></> },
    { label: "Code", get: (i) => <span className="admin-code">{i.code}</span> },
    { label: "Created", get: (i) => i.createdAt ? new Date(i.createdAt).toLocaleDateString() : "—" },
  ],
  subjects: [
    { label: "Subject", get: (i) => <><b>{i.subjectName}</b><small>{val(i.departmentId?.name)}</small></> },
    { label: "Code", get: (i) => <span className="admin-code">{i.subjectCode}</span> },
    { label: "Semester", get: (i) => `Semester ${val(i.semester)}` },
    { label: "Credits", get: (i) => val(i.credits) },
  ],
  sections: [
    { label: "Class", get: (i) => <><b>Class {i.name}</b><small>{val(i.departmentId?.name)}</small></> },
    { label: "Semester", get: (i) => `Semester ${val(i.semester)}` },
    { label: "Batch", get: (i) => val(i.batchLabel || i.batchYear) },
    { label: "Students", get: (i) => val(i.totalStudents) },
  ],
  faculty: [
    { label: "Faculty", get: (i) => <><b>{person(i)}</b><small>{email(i)}</small></> },
    { label: "Employee ID", get: (i) => <span className="admin-code">{i.employeeId}</span> },
    { label: "Department", get: (i) => val(i.departmentId?.name) },
    { label: "Designation", get: (i) => val(i.designation) },
  ],
  students: [
    { label: "Student", get: (i) => <><b>{person(i)}</b><small>{email(i)}</small></> },
    { label: "Roll number", get: (i) => <span className="admin-code">{i.rollNumber}</span> },
    { label: "Class", get: (i) => <>{val(i.sectionId?.name)}<small>{val(i.departmentId?.name)} · Sem {val(i.semester)}</small></> },
    { label: "Mentor", get: (i) => i.mentorId ? (i.mentorId.userId?.name || i.mentorId.employeeId) : <span className="text-amber-500 font-semibold">Not assigned</span> },
  ],
  assignments: [
    { label: "Faculty", get: (i) => <><b>{i.facultyId?.userId?.name || i.facultyId?.employeeId || "Unknown"}</b><small>{i.facultyId?.employeeId || ""}</small></> },
    { label: "Subject", get: (i) => <>{i.subjectId?.subjectName}<small>{i.subjectId?.subjectCode}</small></> },
    { label: "Class", get: (i) => <>{val(i.sectionId?.name)}<small>Sem {val(i.sectionId?.semester)} · Batch {val(i.sectionId?.batchLabel || i.sectionId?.batchYear)}</small></> },
    { label: "Department", get: (i) => val(i.sectionId?.departmentId?.name) },
  ],
};

export default function AdminDataTable({ tab, items, renderActions }) {
  const cols = COLUMNS[tab];
  if (!cols) return null;
  return (
    <div className="hidden lg:block overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
      <table className="w-full text-sm">
        <thead><tr className="bg-slate-50 dark:bg-slate-800/60 text-left">
          {cols.map((c) => <th key={c.label} className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">{c.label}</th>)}
          {tab !== "assignments" && <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Status</th>}
          <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-slate-400">Actions</th>
        </tr></thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {items.map((item) => (
            <tr key={item._id} className="hover:bg-indigo-50/60 dark:hover:bg-slate-800/40 transition-colors">
              {cols.map((c) => <td key={c.label} className="px-4 py-3 align-middle text-slate-600 dark:text-slate-300 [&_b]:block [&_b]:text-slate-900 [&_b]:dark:text-slate-100 [&_small]:block [&_small]:text-xs [&_small]:text-slate-400">{c.get(item)}</td>)}
              {tab !== "assignments" && <td className="px-4 py-3"><span className={item.isActive ? "badge badge-success" : "badge badge-danger"}>{item.isActive ? "Active" : "Inactive"}</span></td>}
              <td className="px-4 py-3"><div className="flex justify-end">{renderActions(item)}</div></td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="px-4 py-2.5 text-xs text-slate-400 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1">Showing {items.length} record{items.length === 1 ? "" : "s"} <ArrowRight size={12} /> use Edit / status actions on the right.</p>
    </div>
  );
}
