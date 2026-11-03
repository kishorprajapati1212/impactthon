import { useCallback, useEffect, useState } from "react";
import { Radio, Smartphone, Square, CheckCircle2, XCircle, RefreshCw, Trash2 } from "lucide-react";
import api, { clearApiCache } from "../../utils/api.js";
import toast from "../../utils/notify.js";
import getFriendlyError from "../../utils/friendlyError.js";
import DataTable from "../components/DataTable.jsx";
import { Button, ConfirmDialog, Pill } from "../components/ui.jsx";
import { formatDateTime, timeAgo } from "../adminFormat.js";
import DeleteLectureDialog from "../../components/UI/DeleteLectureDialog.jsx";

function useLive(url, intervalMs = 20000) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    try { clearApiCache(`get:${url}`); const r = await api.get(url); setRows(r.data?.data || []); }
    catch (e) { toast.error(getFriendlyError(e, "Could not refresh.")); }
    finally { setLoading(false); }
  }, [url]);
  useEffect(() => { load(); const t = setInterval(load, intervalMs); return () => clearInterval(t); }, [load, intervalMs]);
  return { rows, loading, reload: load };
}

const Header = ({ icon: Icon, title, hint, children }) => (
  <div className="flex flex-wrap items-start justify-between gap-3">
    <div className="flex min-w-0 items-start gap-3">
      <span className="mt-0.5 hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white sm:flex"><Icon size={20} /></span>
      <div><h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">{title}</h1><p className="mt-0.5 max-w-2xl text-[13px] text-slate-500">{hint}</p></div>
    </div>
    <div className="flex flex-wrap gap-2">{children}</div>
  </div>
);

/* ── Lectures running now ──────────────────────────────────────────── */
export function LiveLecturesPage() {
  const { rows, loading, reload } = useLive("/admin/active-lectures");
  const [confirm, setConfirm] = useState(null); // { all: true } | { lecture }
  const [deleting, setDeleting] = useState(null); // lecture started by mistake → delete, not end
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      if (confirm.all) { const r = await api.post("/admin/lecture/end-all"); toast.success(r.data?.message || "All lectures ended."); }
      else { await api.post("/admin/lecture/end", { lectureSessionId: confirm.lecture.id }); toast.success("Lecture ended. Unmarked students were saved as absent."); }
      setConfirm(null); reload();
    } catch (e) { toast.error(getFriendlyError(e, "Could not end the lecture.")); }
    finally { setBusy(false); }
  };

  const columns = [
    { key: "topic", label: "Lecture", primary: true, render: (l) => <div className="flex items-center gap-3"><span className="relative flex h-2.5 w-2.5 shrink-0"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" /></span><div className="min-w-0"><p className="truncate font-medium text-slate-900 dark:text-slate-100">{l.topic}</p><p className="truncate text-xs text-slate-500">{l.subject} {l.subjectCode ? `(${l.subjectCode})` : ""}</p></div></div> },
    { key: "faculty", label: "Teacher", render: (l) => l.faculty || "—" },
    { key: "section", label: "Class", render: (l) => l.classLabel || l.section || "—" },
    { key: "started", label: "Started", render: (l) => <span title={formatDateTime(l.startTime)}>{timeAgo(l.startTime)}</span> },
    { key: "elapsed", label: "Running for", render: (l) => <Pill tone={l.elapsedMin > 90 ? "amber" : "green"}>{l.elapsedMin} min</Pill> },
    { key: "present", label: "Marked present", className: "text-center", render: (l) => <b className="tabular-nums">{l.presentCount || 0}</b> },
  ];

  return (
    <div className="space-y-4">
      <Header icon={Radio} title="Lectures running now" hint="Live attendance sessions across all teachers. Auto-refreshes every 20 seconds. Ending a lecture saves unmarked students as absent; deleting one (started by mistake) removes it and its marks completely.">
        <Button variant="outline" icon={RefreshCw} onClick={reload}>Refresh</Button>
        <Button variant="danger" icon={Square} disabled={!rows.length} onClick={() => setConfirm({ all: true })}>End all lectures</Button>
      </Header>
      <DataTable columns={columns} items={rows} loading={loading} rowKey={(l) => l.id}
        emptyTitle="No lecture is running" emptyDescription="When a teacher starts a QR attendance session it appears here instantly."
        renderActions={(l) => (
          <div className="flex flex-wrap justify-end gap-2">
            <Button size="sm" variant="outline" icon={Square} onClick={() => setConfirm({ lecture: l })}>End lecture</Button>
            <Button size="sm" variant="danger" icon={Trash2} onClick={() => setDeleting(l)} aria-label={`Delete lecture ${l.topic}`}>Delete</Button>
          </div>
        )} />
      <DeleteLectureDialog open={!!deleting} lectureId={deleting?.id} onClose={() => setDeleting(null)} onDeleted={() => reload()} />
      <ConfirmDialog open={!!confirm} loading={busy} onClose={() => setConfirm(null)} onConfirm={run}
        title={confirm?.all ? `End all ${rows.length} running lectures?` : `End “${confirm?.lecture?.topic}”?`}
        message={confirm?.all ? "Every live lecture will end now. Students who have not scanned yet will be saved as absent." : `${confirm?.lecture?.faculty || "The teacher"} will see the session as ended and students who have not scanned will be saved as absent.`}
        confirmLabel={confirm?.all ? "End all" : "End lecture"} />
    </div>
  );
}

/* ── Login approvals ───────────────────────────────────────────────── */
export function LoginApprovalsPage() {
  const { rows, loading, reload } = useLive("/api/device/admin/pending", 15000);
  const [busyId, setBusyId] = useState(null);

  const decide = async (l, decision) => {
    setBusyId(l.id + decision);
    try {
      const r = await api.post(`/api/device/${l.id}/decision`, { decision });
      toast.success(r.data?.message || (decision === "ACCEPT" ? "Login approved." : "Login rejected."));
      reload();
    } catch (e) { toast.error(getFriendlyError(e, "Could not record the decision.")); }
    finally { setBusyId(null); }
  };

  const columns = [
    { key: "student", label: "Student", primary: true, render: (l) => <div className="min-w-0"><p className="truncate font-medium text-slate-900 dark:text-slate-100">{l.student?.name || "Student"}</p><p className="truncate text-xs text-slate-500">{l.student?.rollNumber}{l.student?.section ? ` · Class ${l.student.section}` : ""}</p></div> },
    { key: "device", label: "Device", render: (l) => <span className="text-[13px]">{l.deviceLabel || "Unknown device"}</span> },
    { key: "mentor", label: "Mentor", render: (l) => l.mentor?.name || <Pill tone="amber">No mentor</Pill> },
    { key: "when", label: "Requested", render: (l) => <span title={formatDateTime(l.createdAt)}>{timeAgo(l.createdAt)}</span> },
    { key: "status", label: "Status", render: () => <Pill tone="amber" dot>Waiting</Pill> },
  ];

  return (
    <div className="space-y-4">
      <Header icon={Smartphone} title="Student login approvals" hint="A student's first login from a new device must be approved — normally by their mentor. Approve here when the mentor is unavailable. Auto-refreshes every 15 seconds.">
        <Button variant="outline" icon={RefreshCw} onClick={reload}>Refresh</Button>
      </Header>
      <DataTable columns={columns} items={rows} loading={loading} rowKey={(l) => l.id}
        emptyTitle="No login is waiting" emptyDescription="New-device login requests from students show up here."
        renderActions={(l) => (<>
          <Button size="sm" variant="success" icon={CheckCircle2} loading={busyId === l.id + "ACCEPT"} onClick={() => decide(l, "ACCEPT")}>Approve</Button>
          <Button size="sm" variant="danger" icon={XCircle} loading={busyId === l.id + "REJECT"} onClick={() => decide(l, "REJECT")}>Reject</Button>
        </>)} />
    </div>
  );
}
