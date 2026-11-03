import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, Pencil, Power, Trash2, Eye, GraduationCap } from "lucide-react";
import api, { clearApiCache } from "../../utils/api.js";
import toast from "../../utils/notify.js";
import getFriendlyError from "../../utils/friendlyError.js";
import DataTable from "../components/DataTable.jsx";
import FilterBar from "../components/FilterBar.jsx";
import Pagination from "../components/Pagination.jsx";
import RecordForm from "../components/RecordForm.jsx";
import RecordDetail from "../components/RecordDetail.jsx";
import { Button, ConfirmDialog, Drawer, Field, MenuButton, selectCls, inputCls } from "../components/ui.jsx";
import { LIFECYCLE } from "../adminFormat.js";

const DEFAULT_LIMIT = 50;

/**
 * ResourcePage - the generic "manage a list of records" page used by
 * Departments, Subjects, Classes, Faculty, Students and Who-teaches-what.
 * Everything specific comes from the entity config (entities.jsx).
 */
export default function ResourcePage({ entity, ctx, refreshCtx, autoCreate = false, onAutoCreateHandled, initialSearch = "", initialFilters = {} }) {
  const initialFiltersKey = JSON.stringify(initialFilters);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(initialSearch);
  const [debounced, setDebounced] = useState(initialSearch);
  const [filters, setFilters] = useState(initialFilters);
  const [showInactive, setShowInactive] = useState(false);
  const [sort, setSort] = useState({ field: entity.sort?.[0]?.field || "createdAt", order: entity.key === "faculty" || entity.key === "teaching" || entity.key === "classes" ? "desc" : "asc" });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [form, setForm] = useState({ open: false, mode: "create", item: null });
  const [detail, setDetail] = useState(null);
  const [confirm, setConfirm] = useState(null); // { kind: "toggle" | "delete", item, error? }
  const [busy, setBusy] = useState(false);
  const [lifecycle, setLifecycle] = useState(null); // { item, status, note }
  const [refreshKey, setRefreshKey] = useState(0);
  const timer = useRef(null);

  // Reset when switching between entity pages
  useEffect(() => {
    setRows([]); setTotal(0); setSearch(initialSearch); setDebounced(initialSearch); setFilters(JSON.parse(initialFiltersKey)); setShowInactive(false); setPage(1);
    setSort({ field: entity.sort?.[0]?.field || "createdAt", order: entity.key === "faculty" || entity.key === "teaching" || entity.key === "classes" ? "desc" : "asc" });
    setDetail(null); setForm({ open: false, mode: "create", item: null });
  }, [entity.key, initialSearch, initialFiltersKey]);

  useEffect(() => { if (autoCreate) { setForm({ open: true, mode: "create", item: null }); onAutoCreateHandled?.(); } }, [autoCreate, onAutoCreateHandled]);

  useEffect(() => { clearTimeout(timer.current); timer.current = setTimeout(() => setDebounced(search.trim()), 300); return () => clearTimeout(timer.current); }, [search]);
  useEffect(() => { setPage(1); }, [debounced, filters, showInactive, limit, entity.key]);

  const load = useCallback(async (fresh = false) => {
    setLoading(true);
    try {
      if (fresh) clearApiCache();
      const q = new URLSearchParams();
      Object.entries(entity.listParams || {}).forEach(([k, v]) => q.set(k, String(v)));
      Object.entries(filters).forEach(([k, v]) => { if (v) q.set(k, v); });
      if (showInactive) q.set("showInactive", "true");
      if (sort.field) { q.set("sortBy", sort.field); q.set("order", sort.order); }
      if (entity.serverSearch) {
        if (debounced) q.set("search", debounced);
        q.set("page", String(page)); q.set("limit", String(limit));
      } else {
        q.set("limit", "500");
      }
      const r = await api.get(`${entity.api.list}?${q.toString()}`);
      const data = r.data?.data || [];
      setRows(data);
      setTotal(entity.serverSearch ? (r.data?.total ?? data.length) : data.length);
    } catch (e) {
      toast.error(getFriendlyError(e, `Could not load ${entity.plural.toLowerCase()}.`));
    } finally { setLoading(false); }
  }, [entity, filters, showInactive, sort, debounced, page, limit]);

  useEffect(() => { load(); }, [load, refreshKey]);

  // Client-side search + pagination for the small academic lists
  const visible = useMemo(() => {
    if (entity.serverSearch) return rows;
    let list = rows;
    if (debounced && entity.searchKeys) {
      const n = debounced.toLowerCase();
      list = rows.filter((i) => entity.searchKeys(i).some((v) => v && String(v).toLowerCase().includes(n)));
    }
    return list;
  }, [rows, debounced, entity]);
  const clientTotal = entity.serverSearch ? total : visible.length;
  const pages = Math.max(1, Math.ceil(clientTotal / limit));
  const pageRows = entity.serverSearch ? visible : visible.slice((page - 1) * limit, page * limit);

  const afterChange = () => { clearApiCache(); setRefreshKey((k) => k + 1); refreshCtx?.(); };
  const friendly = (e, fallback) => getFriendlyError(e, fallback);

  /* ── actions ─────────────────────────────────────────────────────── */
  const submitForm = async (values) => {
    const payload = entity.toPayload(values, form.mode);
    try {
      if (form.mode === "create") {
        await api.post(entity.api.create, payload);
        toast.success(`${entity.singular} added.`);
      } else {
        await api.put(entity.api.update(form.item._id), payload);
        toast.success(`${entity.singular} updated.`);
      }
      setForm({ open: false, mode: "create", item: null });
      afterChange();
    } catch (e) { throw friendly(e, "Could not save. Please check the details."); }
  };

  const runConfirm = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      const { kind, item } = confirm;
      if (kind === "toggle") {
        if (item.isActive === false) { await api.put(entity.api.update(item._id), { isActive: true }); toast.success(`${entity.singular} reactivated.`); }
        else { await api.delete(entity.api.deactivate(item._id)); toast.success(`${entity.singular} deactivated.`); }
      } else if (kind === "delete") {
        await api.delete(entity.api.permanent(item._id));
        toast.success(`${entity.singular} permanently deleted.`);
        setDetail(null);
      }
      setConfirm(null); afterChange();
    } catch (e) {
      setConfirm((c) => (c ? { ...c, error: friendly(e, "That could not be completed.") } : c));
    } finally { setBusy(false); }
  };

  const saveLifecycle = async () => {
    if (!lifecycle) return;
    setBusy(true);
    try {
      const r = await api.post(entity.api.lifecycle(lifecycle.item._id), { status: lifecycle.status, note: lifecycle.note });
      toast.success(r.data?.message || "Student status updated.");
      setLifecycle(null); afterChange();
    } catch (e) { toast.error(friendly(e, "Could not update the student status.")); }
    finally { setBusy(false); }
  };

  const openCreate = () => setForm({ open: true, mode: "create", item: null });
  const openEdit = (item) => setForm({ open: true, mode: "edit", item });
  const openLifecycle = (item) => setLifecycle({ item, status: item.lifecycleStatus && item.lifecycleStatus !== "STUDYING" ? item.lifecycleStatus : "LEFT", note: item.leavingNote || "" });

  // Edit + Delete are always visible, full-size and labelled; the rest sit
  // behind "More" so the row stays readable on a 13" laptop.
  const actions = (item) => (
    <>
      <Button size="sm" variant="outline" icon={Pencil} onClick={() => openEdit(item)}>Edit</Button>
      <Button size="sm" variant="danger" icon={Trash2} onClick={() => setConfirm({ kind: "delete", item })}>Delete</Button>
      <MenuButton label={`More actions for ${entity.titleOf(item)}`} items={[
        { label: "View details", icon: Eye, onClick: () => setDetail(item) },
        entity.key === "students" && { label: "Student status", icon: GraduationCap, hint: "Completed, left or transferred", onClick: () => openLifecycle(item) },
        item.isActive === false
          ? { label: "Reactivate", icon: Power, hint: "Shows in lists and dropdowns again", onClick: () => setConfirm({ kind: "toggle", item }) }
          : { label: "Deactivate", icon: Power, hint: "Hide it and keep everything. Reversible.", onClick: () => setConfirm({ kind: "toggle", item }) },
      ]} />
    </>
  );

  const filterDefs = (entity.filters ? entity.filters(ctx) : []).map((f) => ({ ...f, value: filters[f.key] || "", onChange: (v) => setFilters((s) => ({ ...s, [f.key]: v })) }));
  const fields = entity.fields(ctx);
  const Icon = entity.icon;
  const noun = clientTotal === 1 ? entity.singular.toLowerCase() : (entity.pluralNoun || entity.plural).toLowerCase();
  const resultText = loading ? "" : `${clientTotal} ${noun}${showInactive ? " (including inactive)" : ""}`;

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white sm:flex"><Icon size={20} /></span>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">{entity.plural}</h1>
            <p className="mt-0.5 max-w-2xl text-[13px] leading-relaxed text-slate-500">{entity.description}</p>
          </div>
        </div>
        <Button variant="primary" icon={Plus} onClick={openCreate}>Add {entity.singular.toLowerCase()}</Button>
      </div>

      <FilterBar search={search} onSearch={setSearch} searchPlaceholder={entity.searchPlaceholder} filters={filterDefs}
        showInactive={showInactive} onShowInactive={setShowInactive} onRefresh={() => load(true)} refreshing={loading} resultText={resultText}
        onClear={() => { setSearch(""); setFilters({}); setShowInactive(false); }} />

      <DataTable columns={entity.columns} items={pageRows} loading={loading} sort={sort}
        onSort={(field) => setSort((s) => ({ field, order: s.field === field && s.order === "asc" ? "desc" : "asc" }))}
        onRowClick={(item) => setDetail(item)} renderActions={actions}
        rowClassName={(i) => (i.isActive === false ? "opacity-70" : "")}
        emptyTitle={debounced || Object.values(filters).some(Boolean) ? `No ${(entity.pluralNoun || entity.plural).toLowerCase()} match` : `No ${(entity.pluralNoun || entity.plural).toLowerCase()} yet`}
        emptyDescription={debounced || Object.values(filters).some(Boolean) ? "Try a different search or clear the filters." : `Click “Add ${entity.singular.toLowerCase()}” to create the first one.`}
        emptyAction={!debounced && <Button variant="primary" icon={Plus} onClick={openCreate}>Add {entity.singular.toLowerCase()}</Button>}
        footer={<Pagination page={page} pages={pages} total={clientTotal} limit={limit} onPage={setPage} onLimit={setLimit} />} />

      <RecordForm open={form.open} mode={form.mode} fields={fields}
        title={form.mode === "create" ? `Add ${entity.singular.toLowerCase()}` : `Edit ${entity.singular.toLowerCase()}`}
        subtitle={form.mode === "edit" && form.item ? entity.titleOf(form.item) : entity.description}
        initial={form.mode === "edit" && form.item ? entity.toForm(form.item) : null}
        onSubmit={submitForm} onClose={() => setForm((f) => ({ ...f, open: false }))}
        submitLabel={form.mode === "create" ? `Add ${entity.singular.toLowerCase()}` : "Save changes"} />

      <RecordDetail open={!!detail} entity={entity} item={detail} refreshKey={refreshKey} onClose={() => setDetail(null)}
        onEdit={(item) => { openEdit(item); }} onToggleActive={(item) => setConfirm({ kind: "toggle", item })}
        onDelete={(item) => setConfirm({ kind: "delete", item })} onLifecycle={entity.key === "students" ? openLifecycle : undefined} />

      <ConfirmDialog open={!!confirm} loading={busy} onClose={() => setConfirm(null)} onConfirm={runConfirm}
        tone={confirm?.kind === "delete" || (confirm?.kind === "toggle" && confirm.item.isActive !== false) ? "danger" : "info"}
        title={confirm?.kind === "delete" ? `Permanently delete this ${entity.singular.toLowerCase()}?` : confirm?.item?.isActive === false ? `Reactivate this ${entity.singular.toLowerCase()}?` : `Deactivate this ${entity.singular.toLowerCase()}?`}
        confirmLabel={confirm?.kind === "delete" ? "Delete forever" : confirm?.item?.isActive === false ? "Reactivate" : "Deactivate"}
        message={confirm?.kind === "delete"
          ? `“${confirm && entity.titleOf(confirm.item)}” will be removed from the database. This cannot be undone. If it has any history (students, lectures, attendance) the system will refuse and you should deactivate instead.`
          : confirm?.item?.isActive === false ? `“${confirm && entity.titleOf(confirm.item)}” will be active again and appear in all lists and dropdowns.`
          : `“${confirm && entity.titleOf(confirm.item)}” will be hidden from dropdowns and can no longer be used${entity.key === "faculty" || entity.key === "students" ? " to log in" : ""}. Nothing is deleted. You can reactivate it any time.`}>
        {confirm?.error && <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300" role="alert">{confirm.error}</p>}
      </ConfirmDialog>

      {/* Student lifecycle - completed / left / transferred / suspended */}
      <Drawer open={!!lifecycle} onClose={() => setLifecycle(null)} title="Student status" subtitle={lifecycle ? `${entity.titleOf(lifecycle.item)} · ${lifecycle.item.rollNumber}` : ""} width="max-w-md"
        footer={<><Button variant="outline" onClick={() => setLifecycle(null)} disabled={busy}>Cancel</Button><Button variant="primary" onClick={saveLifecycle} loading={busy}>Save status</Button></>}>
        {lifecycle && (
          <div className="space-y-4">
            <p className="rounded-md bg-blue-50 px-3 py-2.5 text-[13px] leading-relaxed text-blue-900 dark:bg-blue-500/10 dark:text-blue-200">Use this when a student finishes the course or leaves. <b>Nothing is deleted</b>: attendance, leave history and the mentor connection stay saved, and the mentor still finds them under “Former students”.</p>
            <Field label="New status" required htmlFor="lifecycle-status">
              <select id="lifecycle-status" value={lifecycle.status} onChange={(e) => setLifecycle((l) => ({ ...l, status: e.target.value }))} className={selectCls}>
                {Object.entries(LIFECYCLE).map(([k, v]) => <option key={k} value={k}>{v.label}{k === "STUDYING" ? " (currently enrolled)" : ""}</option>)}
              </select>
            </Field>
            <Field label="Note" help="Optional, for example “Joined another college, June 2026”." htmlFor="lifecycle-note">
              <input id="lifecycle-note" value={lifecycle.note} onChange={(e) => setLifecycle((l) => ({ ...l, note: e.target.value }))} className={inputCls} maxLength={300} placeholder="Why / where" />
            </Field>
          </div>
        )}
      </Drawer>
    </div>
  );
}
