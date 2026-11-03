import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from "lucide-react";
import { NOTIFY_EVENT } from "../../utils/notify.js";

const META = {
  success: { icon: CheckCircle2, bar: "bg-emerald-500", text: "text-emerald-500", label: "Success" },
  error: { icon: XCircle, bar: "bg-rose-500", text: "text-rose-500", label: "Error" },
  info: { icon: Info, bar: "bg-cyan-500", text: "text-cyan-500", label: "Info" },
  warning: { icon: AlertTriangle, bar: "bg-amber-500", text: "text-amber-500", label: "Warning" },
};
const MAX_VISIBLE = 4;

/** Renders AttendX notifications. Mount once (main.jsx). No external library. */
export default function NotificationCenter() {
  const [items, setItems] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    setItems((prev) => prev.filter((n) => n.id !== id));
    const t = timers.current.get(id);
    if (t) { clearTimeout(t); timers.current.delete(id); }
  }, []);

  useEffect(() => {
    const onNotify = (e) => {
      const n = e.detail;
      if (!n?.id) return;
      setItems((prev) => [...prev.slice(-(MAX_VISIBLE - 1)), n]);
      timers.current.set(n.id, setTimeout(() => dismiss(n.id), n.duration || 4500));
    };
    window.addEventListener(NOTIFY_EVENT, onNotify);
    return () => window.removeEventListener(NOTIFY_EVENT, onNotify);
  }, [dismiss]);

  const pause = (id) => { const t = timers.current.get(id); if (t) clearTimeout(t); };
  const resume = (n) => { pause(n.id); timers.current.set(n.id, setTimeout(() => dismiss(n.id), 2000)); };

  if (!items.length) return null;
  return (
    <div className="fixed z-[100] top-3 right-3 left-3 sm:left-auto flex flex-col gap-2 sm:w-[380px] pointer-events-none" role="status" aria-live="polite">
      {items.map((n) => {
        const meta = META[n.type] || META.info;
        const Icon = meta.icon;
        return (
          <div key={n.id} onMouseEnter={() => pause(n.id)} onMouseLeave={() => resume(n)}
            className="notify-enter pointer-events-auto relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl shadow-slate-900/10 p-3.5 pr-10">
            <div className="flex items-start gap-2.5">
              <Icon size={19} className={meta.text + " shrink-0 mt-0.5"} />
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{n.title || meta.label}</p>
                <p className="text-sm font-medium leading-snug text-slate-800 dark:text-slate-100 break-words">{n.message}</p>
              </div>
            </div>
            <button onClick={() => dismiss(n.id)} aria-label="Dismiss notification"
              className="absolute top-2.5 right-2.5 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800">
              <X size={14} />
            </button>
            <span className={"notify-progress absolute bottom-0 left-0 h-0.5 " + meta.bar} style={{ animationDuration: `${n.duration || 4500}ms` }} />
          </div>
        );
      })}
    </div>
  );
}
