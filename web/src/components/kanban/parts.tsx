// Small building blocks shared by the Kanban pages: inline title editing, the
// quick-add composer, member avatars and a toast with an optional undo.
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { body } from "../../lib/fonts";
import { EASE } from "../NoteParts";
import { initials, personName, type KanbanPerson } from "../../lib/kanban";

// Text that turns into an input on click. Enter or blur saves, Esc cancels.
export function InlineEdit({
  value,
  onSave,
  disabled = false,
  className = "",
  inputClassName = "",
  label,
  render,
}: {
  value: string;
  onSave: (next: string) => void;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  label: string;
  /** How the value shows when not editing (e.g. inline markdown); defaults to the text. */
  render?: (value: string) => ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  useEffect(() => {
    if (editing) ref.current?.select();
  }, [editing]);

  const commit = () => {
    setEditing(false);
    const next = draft.trim();
    if (next && next !== value) onSave(next);
    else setDraft(value);
  };

  if (!editing || disabled) {
    return (
      <button
        type="button"
        onClick={() => !disabled && setEditing(true)}
        className={`min-w-0 truncate text-left ${disabled ? "cursor-default" : "cursor-text"} ${className}`}
        style={body}
        aria-label={disabled ? label : `${label}: ${value}. Click to rename`}
      >
        {render ? render(value) : value}
      </button>
    );
  }
  return (
    <input
      ref={ref}
      value={draft}
      aria-label={label}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      // Keep typing and text selection from reaching a drag handle around it.
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter") commit();
        if (e.key === "Escape") {
          e.preventDefault();
          setDraft(value);
          setEditing(false);
        }
      }}
      className={`min-w-0 rounded-md bg-white px-2 text-neutral-900 outline-none ring-2 ring-[#14919B] ${inputClassName}`}
      style={body}
    />
  );
}

// Quick add: Enter saves and keeps the composer open for the next entry,
// Esc or the close button dismisses it.
export function Composer({
  open,
  onOpenChange,
  onSubmit,
  placeholder,
  submitLabel,
  trigger,
  multiline = false,
  className = "",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (text: string) => void;
  placeholder: string;
  submitLabel: string;
  trigger: ReactNode;
  multiline?: boolean;
  className?: string;
}) {
  const [text, setText] = useState("");
  const ref = useRef<HTMLTextAreaElement & HTMLInputElement>(null);

  useEffect(() => {
    if (open) ref.current?.focus();
  }, [open]);

  if (!open) return <>{trigger}</>;

  const submit = () => {
    const t = text.trim();
    if (!t) return;
    onSubmit(t);
    setText("");
    ref.current?.focus();
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
    if (e.key === "Escape") {
      // Handled here: keep an enclosing modal from also closing on this Esc.
      e.preventDefault();
      onOpenChange(false);
    }
  };
  const field =
    "w-full rounded-lg border border-[#0B6477]/15 bg-white px-3 py-2 text-sm text-neutral-800 shadow-sm outline-none placeholder:text-neutral-400 focus:border-[#14919B] focus:ring-2 focus:ring-[#14919B]/20";

  return (
    <div className={className}>
      {multiline ? (
        <textarea
          ref={ref}
          rows={2}
          value={text}
          placeholder={placeholder}
          aria-label={placeholder}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          className={`${field} resize-none leading-snug`}
          style={body}
        />
      ) : (
        <input
          ref={ref}
          value={text}
          placeholder={placeholder}
          aria-label={placeholder}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          className={`${field} h-10`}
          style={body}
        />
      )}
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={submit}
          className="h-9 rounded-lg bg-[#45DFB1] px-3.5 text-sm font-medium text-[#0B2A22] transition-colors hover:bg-[#80ED99]"
          style={body}
        >
          {submitLabel}
        </button>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="grid h-9 w-9 place-items-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-900/5 hover:text-neutral-800"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// Long links, file names and code wrap inside their box instead of pushing
// the modal wider; wide tables scroll on their own.
export const PROSE =
  "prose prose-sm max-w-none min-w-0 break-words [overflow-wrap:anywhere] text-neutral-700 prose-headings:font-semibold prose-headings:tracking-[-0.02em] prose-a:text-[#0B6477] prose-code:before:content-none prose-code:after:content-none prose-pre:whitespace-pre-wrap prose-pre:break-words prose-img:max-w-full prose-img:rounded-lg prose-table:block prose-table:overflow-x-auto";

export function Avatar({ person, size = 24 }: { person: KanbanPerson | undefined; size?: number }) {
  const name = personName(person);
  return person?.avatar_url ? (
    <img
      src={person.avatar_url}
      alt={name}
      title={name}
      width={size}
      height={size}
      // shrink-0 keeps the circle round next to long text in a flex row.
      className="aspect-square shrink-0 rounded-full object-cover ring-2 ring-white"
      style={{ width: size, height: size }}
    />
  ) : (
    <span
      title={name}
      className="grid aspect-square shrink-0 place-items-center rounded-full bg-[#0B6477] font-semibold leading-none text-white ring-2 ring-white"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38), ...body }}
    >
      {initials(name)}
    </span>
  );
}

export type ToastMessage = { id: number; text: string; tone?: "error" | "info"; action?: { label: string; run: () => void } };

export function useToasts() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const next = useRef(1);
  const dismiss = (id: number) => setToasts((t) => t.filter((x) => x.id !== id));
  const push = (msg: Omit<ToastMessage, "id">) => {
    const id = next.current++;
    setToasts((t) => [...t.slice(-2), { ...msg, id }]);
    window.setTimeout(() => dismiss(id), msg.action ? 7000 : 4500);
  };
  return { toasts, push, dismiss };
}

export function Toasts({ toasts, dismiss }: { toasts: ToastMessage[]; dismiss: (id: number) => void }) {
  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:items-end">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            role="status"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="pointer-events-auto flex max-w-sm items-center gap-3 rounded-xl bg-[#08313A] px-4 py-3 text-sm text-white shadow-xl"
            style={body}
          >
            {t.tone === "error" && <span className="h-2 w-2 shrink-0 rounded-full bg-[#E25555]" aria-hidden="true" />}
            <span className="min-w-0 flex-1">{t.text}</span>
            {t.action && (
              <button
                type="button"
                onClick={() => {
                  t.action?.run();
                  dismiss(t.id);
                }}
                className="font-medium text-[#45DFB1] hover:text-[#80ED99]"
              >
                {t.action.label}
              </button>
            )}
            <button type="button" onClick={() => dismiss(t.id)} aria-label="Dismiss" className="text-white/50 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// Close a panel on a click outside `ref` or on Esc. Esc is marked handled so an
// enclosing modal does not close with it.
export function useDismiss(ref: RefObject<HTMLElement | null>, open: boolean, onClose: () => void) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) closeRef.current();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeRef.current();
      }
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [ref, open]);
}
