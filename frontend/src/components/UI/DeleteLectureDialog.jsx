import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Trash2, X, Loader2, ShieldAlert, Info } from "lucide-react";
import api, { clearApiCache } from "../../utils/api.js";
import toast from "../../utils/notify.js";
import getFriendlyError from "../../utils/friendlyError.js";

/**
 * DeleteLectureDialog - the one place a lecture can be deleted from (faculty
 * live session, faculty history, admin "Lectures" and "Lectures running now").
 *
 * Deleting a lecture removes attendance marks, so the dialog never guesses:
 * it asks the server what exactly would happen (GET /lecture/:id/delete-preview),
 * shows those numbers, states that it cannot be undone, and only enables the
 * red button after the user ticks the acknowledgement. If the caller is not
 * allowed (a teacher whose finished lecture already has presence), the reason
 * is shown and the button stays disabled.
 */
const fmtWhen = (d) => {
  if (!d) return "-";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export default function DeleteLectureDialog({ open, lectureId, onClose, onDeleted }) {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open || !lectureId) return;
    let alive = true;
    setPreview(null);
    setLoadError("");
    setAgree(false);
    setLoading(true);
    clearApiCache(`get:/lecture/${lectureId}/delete-preview`);
    api
      .get(`/lecture/${lectureId}/delete-preview`)
      .then((r) => {
        if (alive) setPreview(r.data?.data || null);
      })
      .catch((e) => {
        if (alive) setLoadError(getFriendlyError(e, "Could not load this lecture."));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [open, lectureId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape" && !busy) onClose?.();
    };
    document.addEventListener("keydown", onKey);
    const t = setTimeout(() => panelRef.current?.focus(), 30);
    return () => {
      document.removeEventListener("keydown", onKey);
      clearTimeout(t);
    };
  }, [open, busy, onClose]);

  if (!open || typeof document === "undefined") return null;

  const run = async () => {
    if (!agree || !preview?.allowed || busy) return;
    setBusy(true);
    try {
      const r = await api.delete(`/lecture/${lectureId}`);
      toast.success(r.data?.message || "Lecture deleted.");
      onDeleted?.(r.data?.data || null);
      onClose?.();
    } catch (e) {
      toast.error(getFriendlyError(e, "The lecture could not be deleted."));
      if (e?.response?.status === 404) {
        onDeleted?.(null); // it is already gone - let the caller refresh
        onClose?.();
      }
    } finally {
      setBusy(false);
    }
  };

  const l = preview?.lecture;
  const marks = preview?.marks;
  const running = l?.status === "ACTIVE";
  const consequences = preview
    ? [
        marks?.total
          ? { tone: "danger", text: `${plural(marks.total, "attendance mark")} will be removed: ${marks.present} present, ${marks.notPresent} absent/leave.` }
          : { tone: "ok", text: running ? "Nobody has been marked present yet, so no attendance record changes." : "This lecture has no attendance marks, so no attendance record changes." },
        running ? { tone: "info", text: "Students who scan this lecture's QR from now on will see “lecture not found”. Point them to the correct session." } : null,
        preview.leaveApplications ? { tone: "info", text: `${plural(preview.leaveApplications, "leave application")} will stop referring to this lecture (the leave itself is kept).` } : null,
        preview.notifications ? { tone: "info", text: `${plural(preview.notifications, "parent notification record")} about this lecture will be removed.` } : null,
        { tone: "info", text: "Every attendance percentage, report and history updates immediately, as if this lecture had never been started." },
        { tone: "danger", text: "This cannot be undone. The deletion is written to the audit log with your name and these numbers." },
      ].filter(Boolean)
    : [];

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-[2px] sm:items-center sm:p-4" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose?.(); }}>
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-lecture-title"
        className="w-full max-w-lg rounded-t-2xl border border-slate-200 bg-white shadow-2xl outline-none dark:border-slate-700 dark:bg-slate-900 sm:rounded-2xl"
      >
        <div className="flex items-start gap-3 border-b border-slate-200 p-5 dark:border-slate-700">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400">
            <Trash2 size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="delete-lecture-title" className="text-lg font-semibold text-slate-900 dark:text-slate-50">
              Delete this lecture?
            </h2>
            {l ? (
              <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">
                <span className="font-medium text-slate-900 dark:text-slate-100">{l.topic}</span>
                {l.subjectCode ? ` · ${l.subjectCode}` : l.subject ? ` · ${l.subject}` : ""}
                {l.classLabel ? ` · ${l.classLabel}` : ""}
              </p>
            ) : null}
            {l ? (
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {l.faculty ? `Teacher ${l.faculty} · ` : ""}
                {running ? "Running now" : "Finished"} · started {fmtWhen(l.startTime)}
              </p>
            ) : null}
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Close" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 p-5">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 size={16} className="animate-spin" /> Checking what this would change…
            </div>
          )}
          {loadError && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">{loadError}</p>}

          {preview && !preview.allowed && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
              <ShieldAlert size={16} className="mt-0.5 shrink-0" />
              <span>{preview.reason}</span>
            </div>
          )}

          {preview && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">What will happen</p>
              <ul className="space-y-1.5">
                {consequences.map((c, i) => (
                  <li key={i} className={`flex items-start gap-2 text-sm ${c.tone === "danger" ? "text-rose-700 dark:text-rose-300" : c.tone === "ok" ? "text-emerald-700 dark:text-emerald-300" : "text-slate-700 dark:text-slate-300"}`}>
                    <Info size={14} className="mt-[3px] shrink-0 opacity-70" />
                    <span>{c.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {preview?.allowed && (
            <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 h-4 w-4 accent-rose-600" />
              <span>
                I understand that {marks?.total ? `${plural(marks.total, "attendance mark")} will be permanently removed` : "this lecture will be permanently removed"} and this cannot be undone.
              </span>
            </label>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 p-4 dark:border-slate-700 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={busy} className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
            Cancel
          </button>
          <button
            type="button"
            onClick={run}
            disabled={!agree || !preview?.allowed || busy}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            {busy ? "Deleting…" : marks?.total ? `Delete lecture and ${plural(marks.total, "mark")}` : "Delete lecture"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
