import { useSelector } from "react-redux";
import { Mail, Shield, User, BookOpen } from "lucide-react";
const FacultyProfile = () => {
  const { user } = useSelector(s => s.auth);
  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold">Profile</h2>
      <div className="glass-card p-6 text-center">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-3xl mx-auto mb-4">{user?.name?.charAt(0)?.toUpperCase()||"F"}</div>
        <h3 className="text-xl font-bold">{user?.name||"Faculty"}</h3>
        <p className="text-cyan-400 text-sm font-medium mt-1">Faculty Member</p>
      </div>
      <div className="glass-card p-5 space-y-3">
        {[
          {icon:Mail,label:"Email",value:user?.email,color:"text-cyan-400"},
          {icon:Shield,label:"Role",value:user?.role,color:"text-purple-400"},
          {icon:User,label:"User ID",value:user?.id,color:"text-blue-400"},
        ].map((item,i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/40">
            <item.icon size={18} className={item.color}/>
            <div><p className="text-xs text-slate-500">{item.label}</p><p className="text-sm font-medium">{item.value||"N/A"}</p></div>
          </div>
        ))}
      </div>
    </div>
  );
};
export default FacultyProfile;
