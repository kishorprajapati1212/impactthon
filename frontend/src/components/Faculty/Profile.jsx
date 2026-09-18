import { useSelector } from "react-redux";
import { Mail, Shield, Phone, BookOpen } from "lucide-react";

const FacultyProfile = () => {
  const { user } = useSelector(s => s.auth);

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Profile</h2>
      <div className="glass-card p-6 text-center">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-3xl mx-auto mb-4 shadow-lg">
          {user?.name?.charAt(0)?.toUpperCase() || "F"}
        </div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">{user?.name || "Faculty"}</h3>
        <p className="text-slate-400 text-sm mt-2">{user?.role || "Faculty"} &bull; {user?.employeeId || ""}</p>
      </div>

      <div className="glass-card p-5 space-y-1">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
          <Mail size={18} className="text-cyan-400 shrink-0"/>
          <div><p className="text-xs text-slate-400">Email</p><p className="text-sm font-medium text-slate-700 dark:text-slate-200">{user?.email || "N/A"}</p></div>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
          <Shield size={18} className="text-purple-400 shrink-0"/>
          <div><p className="text-xs text-slate-400">Role</p><p className="text-sm font-medium text-slate-700 dark:text-slate-200 capitalize">{user?.role || "N/A"}</p></div>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
          <BookOpen size={18} className="text-emerald-400 shrink-0"/>
          <div><p className="text-xs text-slate-400">Department</p><p className="text-sm font-medium text-slate-700 dark:text-slate-200">{user?.department?.name || "Not assigned"}</p></div>
        </div>
      </div>
    </div>
  );
};
export default FacultyProfile;
