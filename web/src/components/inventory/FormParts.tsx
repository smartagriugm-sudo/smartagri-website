import { useEffect, useId, useRef, type ReactNode } from "react";
import { AlertCircle, Loader2, X } from "lucide-react";
import { body, display } from "../../lib/fonts";
import { META } from "../NoteParts";

// Form building blocks shared by the inventory pages: labelled fields with
// hints and errors linked for screen readers, radio groups for 2–4 choices,
// and a native <dialog> for the instrument form.

export const inputClass =
  "h-11 w-full rounded-xl border border-[#0B6477]/15 bg-white px-3.5 text-sm text-neutral-800 outline-none transition-[border-color,box-shadow] placeholder:text-neutral-400 focus:border-[#14919B] focus:shadow-[0_0_0_4px_rgba(69,223,177,0.18)] disabled:bg-neutral-50 disabled:text-neutral-400 aria-[invalid=true]:border-[#E5484D]";

export function Field({
  label,
  hint,
  error,
  required,
  full,
  children,
}: {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  required?: boolean;
  full?: boolean;
  children: (ids: { id: string; describedBy: string | undefined; invalid: boolean }) => ReactNode;
}) {
  const id = useId();
  const hintId = hint && !error ? `${id}-hint` : "";
  const errId = error ? `${id}-err` : "";
  const describedBy = [hintId, errId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={`flex flex-col gap-1.5 ${full ? "sm:col-span-2" : ""}`}>
      <label htmlFor={id} className={`text-neutral-600 ${META}`} style={body}>
        {label}
        {required && (
          <span className="text-[#B42318]" aria-hidden="true">
            {" "}
            *
          </span>
        )}
      </label>
      {children({ id, describedBy, invalid: !!error })}
      {hint && !error && (
        <span id={hintId} className="text-xs leading-snug text-neutral-500" style={body}>
          {hint}
        </span>
      )}
      {error && (
        <span id={errId} className="flex items-start gap-1.5 text-xs leading-snug text-[#B42318]" style={body}>
          <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-label="Error" />
          {error}
        </span>
      )}
    </div>
  );
}

// Visible choice for 2–4 exclusive options (forms guide: radios, not a select).
export function Choice<T extends string>({
  legend,
  name,
  value,
  onChange,
  options,
  full,
}: {
  legend: string;
  name: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; note?: string; disabled?: boolean }[];
  full?: boolean;
}) {
  return (
    <fieldset className={`flex min-w-0 flex-col gap-1.5 ${full ? "sm:col-span-2" : ""}`}>
      <legend className={`mb-1.5 text-neutral-600 ${META}`} style={body}>
        {legend}
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = o.value === value;
          return (
            <label
              key={o.value}
              className={`relative flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border px-3.5 py-2 text-sm transition-colors has-[:focus-visible]:shadow-[0_0_0_4px_rgba(69,223,177,0.25)] ${
                o.disabled
                  ? "cursor-not-allowed border-[#0B6477]/10 text-neutral-400"
                  : on
                    ? "border-[#14919B] bg-[#14919B]/[0.07] text-neutral-900"
                    : "border-[#0B6477]/15 bg-white text-neutral-700 hover:border-[#0B6477]/40"
              }`}
              style={body}
            >
              <input
                type="radio"
                name={name}
                value={o.value}
                checked={on}
                disabled={o.disabled}
                onChange={() => onChange(o.value)}
                className="h-4 w-4 accent-[#14919B]"
              />
              <span className="flex flex-col leading-tight">
                <span className="font-medium">{o.label}</span>
                {o.note && <span className="text-xs text-neutral-500">{o.note}</span>}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function PrimaryButton({
  children,
  busy,
  type = "submit",
  onClick,
  disabled,
  tone = "mint",
}: {
  children: ReactNode;
  busy?: boolean;
  type?: "submit" | "button";
  onClick?: () => void;
  disabled?: boolean;
  tone?: "mint" | "dark";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={busy || disabled}
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-lg px-6 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
        tone === "mint"
          ? "bg-[#45DFB1] text-[#0B2A22] hover:bg-[#80ED99]"
          : "bg-[#08313A] text-white hover:bg-[#0B6477]"
      }`}
      style={body}
    >
      {busy && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  onClick,
  disabled,
  danger,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-lg border px-5 text-sm font-medium transition-colors disabled:opacity-50 ${
        danger
          ? "border-[#E5484D]/30 text-[#B42318] hover:bg-[#E5484D]/[0.06]"
          : "border-[#0B6477]/20 text-[#0B6477] hover:border-[#0B6477]/45 hover:bg-[#F3F7F6]"
      }`}
      style={body}
    >
      {children}
    </button>
  );
}

export function FormError({ message }: { message: string | null }) {
  return (
    <p role="alert" aria-live="assertive" className="min-h-0 text-sm text-[#B42318] empty:hidden" style={body}>
      {message && (
        <span className="flex items-start gap-2 rounded-xl bg-[#E5484D]/[0.07] px-3.5 py-2.5">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-label="Error" />
          {message}
        </span>
      )}
    </p>
  );
}

// Native modal dialog: the browser gives focus containment, Esc and the
// inert page. Open/close follows `open`; Esc or the close button call onClose.
export function Dialog({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      // Start in the first field rather than on the close button.
      d.querySelector<HTMLElement>("input:not([type=file]), select, textarea")?.focus();
    }
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className="m-auto max-h-[min(92dvh,900px)] w-[min(760px,calc(100vw-24px))] overflow-y-auto overscroll-contain rounded-[24px] border border-[#0B6477]/12 bg-white p-0 text-neutral-900 shadow-[0_40px_120px_-40px_rgba(8,49,58,0.6)] backdrop:bg-[#08313A]/45 [&::backdrop]:overflow-hidden"
    >
      {open && (
        <div className="flex flex-col">
          <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-[#0B6477]/10 bg-white px-6 py-4 md:px-8">
            <h2 id={titleId} className="text-xl font-medium tracking-[-0.02em]" style={display}>
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="grid h-9 w-9 place-items-center rounded-lg text-neutral-500 transition-colors hover:bg-[#F3F7F6] hover:text-neutral-900"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="px-6 py-6 md:px-8">{children}</div>
        </div>
      )}
    </dialog>
  );
}
