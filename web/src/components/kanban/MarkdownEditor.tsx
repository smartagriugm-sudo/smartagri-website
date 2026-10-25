// Markdown editing for every rich text field on the board (card description,
// comments, board description): a plain textarea, so markdown is exactly what
// gets saved, with a formatting toolbar, keyboard shortcuts, list continuation,
// a preview, and optional file attach/paste that inserts a link. MarkdownView
// renders the same markdown everywhere it is shown.
import { Fragment, createContext, useContext, useEffect, useRef, useState, type AnchorHTMLAttributes, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Bold,
  ChevronDown,
  Code,
  Eye,
  HelpCircle,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  Loader2,
  Minus,
  Paperclip,
  Pencil,
  Plus,
  Quote,
  SquareCode,
  Strikethrough,
  Table,
  Type,
} from "lucide-react";
import { body } from "../../lib/fonts";
import { continueList, insertBlock, link, prefixLines, wrap, type Edit } from "../../lib/markdown-edit";
import { PROSE, useDismiss } from "./parts";

// Task lists ("- [ ] item") show their checkbox instead of a bullet.
const TASKS = "[&_.contains-task-list]:list-none [&_.contains-task-list]:pl-1 [&_.task-list-item_input]:mr-1.5 [&_.task-list-item_input]:accent-[#14919B]";

// Long comments read at 15px with headings scaled down.
const LARGE =
  "sm:text-[15px] sm:leading-relaxed prose-h1:text-[1.45em] prose-h1:mb-3 prose-h2:text-[1.25em] prose-h3:text-[1.1em] prose-p:my-2.5 prose-li:my-1";

// Links written as [name](#attachment-<id>) point at a file on the card (its
// storage URL expires, so the id is what gets saved); the card modal opens them.
export const AttachmentLinkContext = createContext<((id: string) => void) | null>(null);
export const attachmentHref = (id: string) => `#attachment-${id}`;

function MdLink({ href, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  const openAttachment = useContext(AttachmentLinkContext);
  const id = href?.startsWith("#attachment-") ? href.slice("#attachment-".length) : null;
  if (id) {
    return (
      <a
        {...props}
        href={href}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          openAttachment?.(id);
        }}
      />
    );
  }
  return <a {...props} href={href} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} />;
}

export function MarkdownView({ children, large = false }: { children: string; large?: boolean }) {
  return (
    <div className={`${large ? `${PROSE} ${LARGE}` : PROSE} ${TASKS}`} style={body}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: MdLink }}>
        {children}
      </ReactMarkdown>
    </div>
  );
}

// One line of markdown (checklist items): bold, italic, code, links, no blocks.
export function InlineMarkdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      allowedElements={["p", "strong", "em", "del", "code", "a"]}
      unwrapDisallowed
      components={{
        p: ({ children: c }) => <Fragment>{c}</Fragment>,
        a: (props) => <MdLink {...props} className="text-[#0B6477] underline" />,
        code: ({ children: c }) => <code className="rounded bg-[#E6EFED] px-1 py-0.5 text-[0.9em]">{c}</code>,
      }}
    >
      {children}
    </ReactMarkdown>
  );
}

const TOOL =
  "grid h-8 min-w-8 place-items-center rounded-md px-1.5 text-neutral-600 transition-colors hover:bg-[#E6EFED] hover:text-neutral-900 aria-pressed:bg-[#E6EFED] aria-pressed:text-[#0B6477]";
const ITEM = "flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-sm text-neutral-700 hover:bg-[#F3F7F6]";
const PRIMARY =
  "inline-flex h-9 items-center gap-2 rounded-lg bg-[#45DFB1] px-3.5 text-sm font-medium text-[#0B2A22] transition-colors hover:bg-[#80ED99] disabled:opacity-50";
const BUTTON =
  "inline-flex h-9 items-center gap-2 rounded-lg bg-[#F3F7F6] px-3 text-sm text-neutral-700 transition-colors hover:bg-[#E6EFED]";

function ToolMenu({ label, icon, children }: { label: string; icon: ReactNode; children: (close: () => void) => ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(ref, open, () => setOpen(false));
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        title={label}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-8 items-center gap-0.5 rounded-md px-1.5 text-neutral-600 transition-colors hover:bg-[#E6EFED] hover:text-neutral-900 aria-expanded:bg-[#E6EFED]"
      >
        {icon}
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <div role="menu" className="absolute left-0 top-full z-40 mt-1 w-48 rounded-xl border border-[#0B6477]/10 bg-white p-1 shadow-xl">
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

const HELP: [string, string][] = [
  ["**bold**", "Ctrl+B"],
  ["_italic_", "Ctrl+I"],
  ["~~strikethrough~~", "Ctrl+Shift+X"],
  ["`code`", "Ctrl+E"],
  ["[link](https://...)", "Ctrl+K"],
  ["# Heading 1 / ## Heading 2", ""],
  ["- item, 1. item, - [ ] task", "Enter continues"],
  ["> quote", ""],
  ["```  code block  ```", ""],
  ["| a | b | table", ""],
  ["---  divider", ""],
];

export default function MarkdownEditor({
  initial,
  onSave,
  onCancel,
  saveLabel = "Save",
  placeholder,
  minHeight = 140,
  onAttach,
  insert,
  large = false,
}: {
  initial: string;
  onSave: (text: string) => void;
  onCancel: () => void;
  saveLabel?: string;
  placeholder?: string;
  minHeight?: number;
  /** Upload a file and return markdown to insert (a link or image), or null. */
  onAttach?: (file: File) => Promise<string | null>;
  /** Text pushed in from outside (Reply, comment on an attachment): appended at the end. */
  insert?: { text: string; nonce: number } | null;
  large?: boolean;
}) {
  const [text, setText] = useState(initial);
  const [preview, setPreview] = useState(false);
  const [help, setHelp] = useState(false);
  const [busy, setBusy] = useState(0);
  const area = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const pending = useRef<{ start: number; end: number } | null>(null);

  // Restore the selection after React re-renders the new text.
  useEffect(() => {
    const sel = pending.current;
    const el = area.current;
    if (!sel || !el) return;
    pending.current = null;
    el.focus();
    el.setSelectionRange(sel.start, sel.end);
  }, [text]);

  const nonce = insert?.nonce;
  useEffect(() => {
    if (!insert) return;
    setPreview(false);
    setText((t) => {
      const next = t && !t.endsWith("\n") && !t.endsWith(" ") ? `${t} ${insert.text}` : t + insert.text;
      pending.current = { start: next.length, end: next.length };
      return next;
    });
    // Only a new nonce means new text.
  }, [nonce]); // eslint-disable-line react-hooks/exhaustive-deps

  const apply = (fn: (t: string, s: number, e: number) => Edit) => {
    const el = area.current;
    if (!el) return;
    setPreview(false);
    const r = fn(el.value, el.selectionStart, el.selectionEnd);
    pending.current = { start: r.start, end: r.end };
    setText(r.text);
  };

  const attach = async (files: File[]) => {
    if (!onAttach || !files.length) return;
    setBusy((n) => n + files.length);
    for (const f of files) {
      const md = await onAttach(f);
      setBusy((n) => n - 1);
      if (md) apply((t, s, e) => ({ text: t.slice(0, s) + md + t.slice(e), start: s + md.length, end: s + md.length }));
    }
  };

  const save = () => onSave(text.trim());

  return (
    <div className="mt-2 overflow-visible rounded-xl border border-[#0B6477]/15 bg-white focus-within:border-[#14919B] focus-within:ring-2 focus-within:ring-[#14919B]/20" style={body}>
      <div role="toolbar" aria-label="Formatting" className="flex flex-wrap items-center gap-0.5 border-b border-[#0B6477]/8 px-1.5 py-1">
        <ToolMenu label="Text styles" icon={<Type className="h-4 w-4" />}>
          {(close) =>
            (
              [
                ["Normal text", ""],
                ["Heading 1", "# "],
                ["Heading 2", "## "],
                ["Heading 3", "### "],
              ] as const
            ).map(([label, p]) => (
              <button
                key={label}
                type="button"
                role="menuitem"
                className={ITEM}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  close();
                  apply((t, s, e) => (p ? prefixLines(t, s, e, p) : stripHeading(t, s, e)));
                }}
              >
                <span className={p === "# " ? "text-base font-semibold" : p ? "font-semibold" : ""}>{label}</span>
              </button>
            ))
          }
        </ToolMenu>
        <span className="mx-0.5 h-5 w-px bg-[#0B6477]/10" aria-hidden="true" />
        <Tool label="Bold (Ctrl+B)" onClick={() => apply((t, s, e) => wrap(t, s, e, "**"))}>
          <Bold className="h-4 w-4" />
        </Tool>
        <Tool label="Italic (Ctrl+I)" onClick={() => apply((t, s, e) => wrap(t, s, e, "_"))}>
          <Italic className="h-4 w-4" />
        </Tool>
        <Tool label="Strikethrough (Ctrl+Shift+X)" onClick={() => apply((t, s, e) => wrap(t, s, e, "~~"))}>
          <Strikethrough className="h-4 w-4" />
        </Tool>
        <Tool label="Inline code (Ctrl+E)" onClick={() => apply((t, s, e) => wrap(t, s, e, "`", "`", "code"))}>
          <Code className="h-4 w-4" />
        </Tool>
        <ToolMenu label="Lists" icon={<List className="h-4 w-4" />}>
          {(close) => (
            <>
              <MenuItem icon={<List className="h-4 w-4" />} label="Bulleted list" onClick={() => (close(), apply((t, s, e) => prefixLines(t, s, e, "- ")))} />
              <MenuItem icon={<ListOrdered className="h-4 w-4" />} label="Numbered list" onClick={() => (close(), apply((t, s, e) => prefixLines(t, s, e, "1. ")))} />
              <MenuItem icon={<ListChecks className="h-4 w-4" />} label="Task list" onClick={() => (close(), apply((t, s, e) => prefixLines(t, s, e, "- [ ] ")))} />
            </>
          )}
        </ToolMenu>
        <Tool label="Link (Ctrl+K)" onClick={() => apply((t, s, e) => link(t, s, e))}>
          <Link2 className="h-4 w-4" />
        </Tool>
        <Tool label="Image" onClick={() => apply((t, s, e) => link(t, s, e, "https://", true))}>
          <ImageIcon className="h-4 w-4" />
        </Tool>
        <ToolMenu label="Insert elements" icon={<Plus className="h-4 w-4" />}>
          {(close) => (
            <>
              <MenuItem icon={<Quote className="h-4 w-4" />} label="Quote" onClick={() => (close(), apply((t, s, e) => prefixLines(t, s, e, "> ")))} />
              <MenuItem
                icon={<SquareCode className="h-4 w-4" />}
                label="Code block"
                onClick={() => (close(), apply((t, s, e) => insertBlock(t, s, e, "```\n" + (t.slice(s, e) || "code") + "\n```", 4, (t.slice(s, e) || "code").length)))}
              />
              <MenuItem
                icon={<Table className="h-4 w-4" />}
                label="Table"
                onClick={() => (close(), apply((t, s, e) => insertBlock(t, s, e, "| Column | Column |\n| --- | --- |\n| Cell | Cell |", 2, 6)))}
              />
              <MenuItem icon={<Minus className="h-4 w-4" />} label="Divider" onClick={() => (close(), apply((t, s, e) => insertBlock(t, s, e, "---", 3)))} />
            </>
          )}
        </ToolMenu>
        <span className="ml-auto" />
        {onAttach && (
          <>
            <input
              ref={fileInput}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = [...(e.target.files ?? [])];
                e.target.value = "";
                void attach(files);
              }}
            />
            <Tool label="Attach a file and insert its link" onClick={() => fileInput.current?.click()}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
            </Tool>
          </>
        )}
        <Tool label={preview ? "Back to editing" : "Preview"} pressed={preview} onClick={() => setPreview((p) => !p)}>
          {preview ? <Pencil className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Tool>
        <Tool label="Formatting help" pressed={help} onClick={() => setHelp((h) => !h)}>
          <HelpCircle className="h-4 w-4" />
        </Tool>
      </div>

      {preview ? (
        <div className="kanban-scroll overflow-y-auto px-3 py-2.5" style={{ minHeight, maxHeight: "60vh" }}>
          {text.trim() ? <MarkdownView large={large}>{text}</MarkdownView> : <p className="text-sm text-neutral-400">Nothing to preview.</p>}
        </div>
      ) : (
        <textarea
          ref={area}
          autoFocus
          // Start with the caret after the existing text, ready to continue it.
          onFocus={(e) => {
            if (pending.current) return;
            const n = e.currentTarget.value.length;
            if (e.currentTarget.selectionStart === 0 && e.currentTarget.selectionEnd === 0) e.currentTarget.setSelectionRange(n, n);
          }}
          value={text}
          placeholder={placeholder}
          onChange={(e) => setText(e.target.value)}
          onPaste={(e) => {
            const files = [...e.clipboardData.files];
            if (onAttach && files.length) {
              e.preventDefault();
              void attach(files);
            }
          }}
          onDrop={(e) => {
            const files = [...e.dataTransfer.files];
            if (onAttach && files.length) {
              e.preventDefault();
              e.stopPropagation();
              void attach(files);
            }
          }}
          onKeyDown={(e) => {
            const mod = e.ctrlKey || e.metaKey;
            const k = e.key.toLowerCase();
            if (e.key === "Enter" && mod) {
              e.preventDefault();
              save();
            } else if (e.key === "Escape") {
              e.preventDefault();
              onCancel();
            } else if (mod && !e.shiftKey && k === "b") {
              e.preventDefault();
              apply((t, s, en) => wrap(t, s, en, "**"));
            } else if (mod && !e.shiftKey && k === "i") {
              e.preventDefault();
              apply((t, s, en) => wrap(t, s, en, "_"));
            } else if (mod && e.shiftKey && k === "x") {
              e.preventDefault();
              apply((t, s, en) => wrap(t, s, en, "~~"));
            } else if (mod && k === "e") {
              e.preventDefault();
              apply((t, s, en) => wrap(t, s, en, "`", "`", "code"));
            } else if (mod && k === "k") {
              e.preventDefault();
              apply((t, s, en) => link(t, s, en));
            } else if (e.key === "Enter" && !e.shiftKey && e.currentTarget.selectionStart === e.currentTarget.selectionEnd) {
              const r = continueList(e.currentTarget.value, e.currentTarget.selectionStart);
              if (r) {
                e.preventDefault();
                pending.current = { start: r.start, end: r.end };
                setText(r.text);
              }
            }
          }}
          className="field-sizing-content block w-full resize-y bg-transparent px-3 py-2.5 text-sm leading-relaxed text-neutral-800 outline-none placeholder:text-neutral-400"
          style={{ minHeight, maxHeight: "60vh" }}
        />
      )}

      {help && (
        <div className="border-t border-[#0B6477]/8 bg-[#F7FAF9] px-3 py-2.5 text-xs text-neutral-600">
          <p className="mb-1.5 font-medium text-neutral-800">Markdown formatting</p>
          <ul className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
            {HELP.map(([md, key]) => (
              <li key={md} className="flex justify-between gap-3">
                <code className="text-[#0B6477]">{md}</code>
                <span className="shrink-0 text-neutral-400">{key}</span>
              </li>
            ))}
          </ul>
          {onAttach && <p className="mt-1.5 text-neutral-500">Paste or drop a file to attach it and insert its link.</p>}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-[#0B6477]/8 px-2 py-2">
        <button type="button" onClick={save} disabled={busy > 0} className={PRIMARY}>
          {saveLabel}
        </button>
        <button type="button" onClick={onCancel} className={BUTTON}>
          Cancel
        </button>
        <span className="ml-auto hidden text-xs text-neutral-400 sm:inline">Markdown · Ctrl+Enter to save</span>
      </div>
    </div>
  );
}

function stripHeading(t: string, s: number, e: number): Edit {
  const from = t.lastIndexOf("\n", s - 1) + 1;
  const nl = t.indexOf("\n", e);
  const to = nl === -1 ? t.length : nl;
  const block = t
    .slice(from, to)
    .split("\n")
    .map((l) => l.replace(/^#{1,6} /, ""))
    .join("\n");
  return { text: t.slice(0, from) + block + t.slice(to), start: from, end: from + block.length };
}

function Tool({ label, onClick, pressed, children }: { label: string; onClick: () => void; pressed?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={pressed}
      // Keep the textarea's selection while clicking the toolbar.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={TOOL}
    >
      {children}
    </button>
  );
}

function MenuItem({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button type="button" role="menuitem" className={ITEM} onMouseDown={(e) => e.preventDefault()} onClick={onClick}>
      <span className="text-neutral-500">{icon}</span>
      {label}
    </button>
  );
}
