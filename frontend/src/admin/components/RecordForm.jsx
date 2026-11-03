import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { AlertCircle } from "lucide-react";
import { Drawer, Button, Field, inputCls, selectCls, textareaCls } from "./ui.jsx";

/**
 * RecordForm - a slide-over form generated from an entity's field config.
 *
 * field: { key, label, type, required, placeholder, help, options, min, max,
 *          pattern, createOnly, editOnly, readOnlyOnEdit, span, validate, step }
 * mode:  "create" | "edit"
 */
export default function RecordForm({ open, mode = "create", title, subtitle, fields, initial, onSubmit, onClose, submitLabel }) {
  const visible = useMemo(() => (fields || []).filter((f) => !(mode === "create" && f.editOnly) && !(mode === "edit" && f.createOnly)), [fields, mode]);
  const defaults = useMemo(() => {
    const d = {};
    visible.forEach((f) => { d[f.key] = initial?.[f.key] ?? (f.type === "toggle" ? true : f.default ?? ""); });
    return d;
  }, [visible, initial]);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({ defaultValues: defaults });
  const [serverError, setServerError] = useState("");
  useEffect(() => { if (open) { reset(defaults); setServerError(""); } }, [open, defaults, reset]);

  const submit = async (values) => {
    setServerError("");
    try { await onSubmit(values); }
    catch (e) { setServerError(typeof e === "string" ? e : e?.friendly || e?.message || "Could not save. Please check the details and try again."); }
  };

  const rules = (f) => ({
    required: f.required ? `${f.label} is required` : false,
    ...(f.min !== undefined ? { min: { value: f.min, message: `${f.label} must be at least ${f.min}` } } : {}),
    ...(f.max !== undefined ? { max: { value: f.max, message: `${f.label} must be at most ${f.max}` } } : {}),
    ...(f.minLength ? { minLength: { value: f.minLength, message: `${f.label} must be at least ${f.minLength} characters` } } : {}),
    ...(f.pattern ? { pattern: f.pattern } : {}),
    ...(f.validate ? { validate: f.validate } : {}),
    ...(f.type === "number" ? { valueAsNumber: false } : {}),
  });

  const formId = "record-form";
  return (
    <Drawer open={open} onClose={onClose} title={title} subtitle={subtitle}
      footer={<>
        <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
        <Button variant="primary" type="submit" form={formId} loading={isSubmitting}>{submitLabel || (mode === "create" ? "Create" : "Save changes")}</Button>
      </>}>
      <form id={formId} onSubmit={handleSubmit(submit)} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {serverError && (
          <div className="sm:col-span-2 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300" role="alert">
            <AlertCircle size={16} className="mt-0.5 shrink-0" /> {serverError}
          </div>
        )}
        {visible.map((f) => {
          const id = `f-${f.key}`;
          const err = errors[f.key]?.message;
          const readOnly = mode === "edit" && f.readOnlyOnEdit;
          const span = f.span === 2 || f.type === "textarea" ? "sm:col-span-2" : "";
          const opts = typeof f.options === "function" ? f.options() : f.options || [];
          return (
            <Field key={f.key} label={f.label} required={f.required} help={readOnly ? "Cannot be changed after creation." : f.help} error={err} htmlFor={id} className={span}>
              {f.type === "select" ? (
                <select id={id} disabled={readOnly} className={selectCls} {...register(f.key, rules(f))}>
                  <option value="">{f.placeholder || "Select…"}</option>
                  {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : f.type === "textarea" ? (
                <textarea id={id} rows={3} disabled={readOnly} placeholder={f.placeholder} className={textareaCls} {...register(f.key, rules(f))} />
              ) : f.type === "toggle" ? (
                <label className="flex h-10 cursor-pointer items-center gap-3 rounded-md border border-slate-300 px-3 text-sm dark:border-slate-700">
                  <input id={id} type="checkbox" className="h-4 w-4 accent-blue-600" {...register(f.key)} />
                  <span className="text-slate-700 dark:text-slate-200">{f.toggleLabel || "Active"}</span>
                </label>
              ) : (
                <input id={id} type={f.type || "text"} step={f.step} min={f.min} max={f.max} disabled={readOnly} placeholder={f.placeholder} autoComplete={f.type === "password" ? "new-password" : "off"} className={inputCls} {...register(f.key, rules(f))} />
              )}
            </Field>
          );
        })}
      </form>
    </Drawer>
  );
}
