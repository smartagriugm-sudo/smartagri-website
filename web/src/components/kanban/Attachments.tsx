// Card attachments (files in Supabase Storage or plain links): the list in the
// card modal, a full-screen viewer, the add-attachment and cover pickers.
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  FileText,
  HardDrive,
  Image as ImageIcon,
  Link2,
  Loader2,
  MessageSquare,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Presentation,
  Sheet,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { body, display } from "../../lib/fonts";
import { LABEL_COLORS, LABEL_COLOR_KEYS, type KanbanAttachment, type KanbanCard } from "../../lib/kanban";
import { MAX_ATTACHMENT_BYTES, downloadUrl, signedUrls, updateAttachment } from "../../lib/kanban-data";
import { useBoard } from "./board-context";
import { useDismiss } from "./parts";

const FIELD =
  "w-full rounded-lg border border-[#0B6477]/15 bg-white px-3 text-sm text-neutral-800 outline-none placeholder:text-neutral-400 focus:border-[#14919B] focus:ring-2 focus:ring-[#14919B]/20";
const PRIMARY =
  "inline-flex h-9 items-center gap-2 rounded-lg bg-[#45DFB1] px-3.5 text-sm font-medium text-[#0B2A22] transition-colors hover:bg-[#80ED99] disabled:opacity-50";

export function isImage(a: Pick<KanbanAttachment, "mime_type" | "storage_path">) {
  return !!a.storage_path && !!a.mime_type?.startsWith("image/");
}

export function formatBytes(n: number | null) {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

// Popover body: pick files or attach a link.
export function AttachmentPicker({
  onFiles,
  onLink,
}: {
  onFiles: (files: File[]) => void;
  onLink: (url: string, name: string) => Promise<boolean>;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div style={body}>
      <input
        ref={input}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = [...(e.target.files ?? [])];
          e.target.value = "";
          if (files.length) onFiles(files);
        }}
      />
      <button type="button" onClick={() => input.current?.click()} className={`${PRIMARY} w-full justify-center`}>
        <Upload className="h-4 w-4" /> Choose files
      </button>
      <p className="mt-1.5 text-xs text-neutral-500">
        Up to {MAX_ATTACHMENT_BYTES / 1024 / 1024} MB each. You can also drop files onto the card.
      </p>
      <form
        className="mt-3 border-t border-[#0B6477]/8 pt-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const ok = await onLink(url, name);
          setBusy(false);
          if (ok) {
            setUrl("");
            setName("");
          }
        }}
      >
        <p className="text-xs font-medium text-neutral-500">Attach a link</p>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://..."
          aria-label="Link"
          className={`${FIELD} mt-2 h-9`}
        />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Display text (optional)"
          aria-label="Link text"
          className={`${FIELD} mt-2 h-9`}
        />
        <button type="submit" disabled={busy || !url.trim()} className={`${PRIMARY} mt-2`}>
          Attach
        </button>
      </form>
    </div>
  );
}

export function attachmentDate(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// Trello-style list: links and files in their own groups, the first few of
// each shown, every row with an actions menu (edit, comment, download, cover,
// remove). Clicking a file opens the viewer.
export function AttachmentList({
  card,
  attachments,
  thumbs,
  uploading,
  onDelete,
  onAdd,
  onComment,
  onUpdated,
  onView,
}: {
  card: KanbanCard;
  attachments: KanbanAttachment[];
  thumbs: Record<string, string>;
  uploading: number;
  onDelete: (a: KanbanAttachment) => void;
  onAdd?: () => void;
  onComment: (a: KanbanAttachment) => void;
  onUpdated: (a: KanbanAttachment) => void;
  onView: (a: KanbanAttachment) => void;
}) {
  const { editable } = useBoard();
  const [all, setAll] = useState(false);
  if (!attachments.length && !uploading) return null;
  const links = attachments.filter((a) => !a.storage_path);
  const files = attachments.filter((a) => a.storage_path);
  const shownLinks = all ? links : links.slice(0, SHOWN);
  const shownFiles = all ? files : files.slice(0, SHOWN);
  const hidden = links.length - shownLinks.length + files.length - shownFiles.length;

  return (
    <section className="mt-8" style={body}>
      <div className="flex items-center gap-2">
        <h3 className="flex flex-1 items-center gap-2 text-sm font-semibold tracking-[-0.01em] text-neutral-900" style={display}>
          <Paperclip className="h-4 w-4 text-[#14919B]" /> Attachments
        </h3>
        {editable && onAdd && (
          <button type="button" onClick={onAdd} className={SMALL}>
            Add
          </button>
        )}
      </div>
      {uploading > 0 && (
        <p className="mt-3 flex items-center gap-2 rounded-xl border border-dashed border-[#14919B]/40 px-3 py-3 text-sm text-neutral-600">
          <Loader2 className="h-4 w-4 animate-spin text-[#14919B]" /> Uploading {uploading} file{uploading === 1 ? "" : "s"}...
        </p>
      )}
      {shownLinks.length > 0 && (
        <>
          <p className="mt-4 text-xs font-medium text-neutral-500">Links</p>
          <ul className="mt-1.5 overflow-hidden rounded-xl border border-[#0B6477]/8">
            {shownLinks.map((a) => (
              <li key={a.id} className="group flex items-center gap-2.5 border-b border-[#0B6477]/8 px-3 py-2 last:border-b-0 hover:bg-[#F7FAF9]">
                <LinkIcon url={a.url ?? ""} />
                <a
                  href={a.url ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="min-w-0 flex-1 truncate text-sm text-[#0B6477] underline-offset-2 hover:underline"
                  title={a.url ?? ""}
                >
                  {a.name}
                </a>
                <AttachmentMenu card={card} a={a} onDelete={onDelete} onComment={onComment} onUpdated={onUpdated} />
              </li>
            ))}
          </ul>
        </>
      )}
      {shownFiles.length > 0 && (
        <>
          <p className="mt-4 text-xs font-medium text-neutral-500">Files</p>
          <ul className="mt-1.5 flex flex-col gap-1">
            {shownFiles.map((a) => {
              const thumb = a.storage_path ? thumbs[a.storage_path] : undefined;
              const isCover = card.cover_attachment_id === a.id;
              return (
                <li key={a.id} className="group flex items-center gap-3 rounded-xl px-1 py-1 hover:bg-[#F3F7F6]">
                  <button
                    type="button"
                    onClick={() => onView(a)}
                    className="grid h-12 w-16 shrink-0 place-items-center overflow-hidden rounded-lg bg-[#E6EFED] text-[#0B6477]"
                    aria-label={`Preview ${a.name}`}
                  >
                    {thumb ? (
                      <img src={thumb} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex flex-col items-center text-[10px] font-medium uppercase">
                        <FileText className="h-4 w-4" />
                        {a.name.split(".").pop()?.slice(0, 5)}
                      </span>
                    )}
                  </button>
                  <button type="button" onClick={() => onView(a)} className="min-w-0 flex-1 text-left">
                    <span className="block truncate text-sm font-medium text-neutral-900">{a.name}</span>
                    <span className="block text-xs text-neutral-500">
                      Added {attachmentDate(a.created_at)}
                      {isCover && <span className="ml-1.5 rounded bg-[#45DFB1]/25 px-1.5 py-0.5 text-[#0B5E47]">Cover</span>}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void openAttachment(a)}
                    aria-label={`Open ${a.name} in a new tab`}
                    title="Open in a new tab"
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-neutral-500 hover:bg-white hover:text-neutral-900"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </button>
                  <AttachmentMenu card={card} a={a} onDelete={onDelete} onComment={onComment} onUpdated={onUpdated} />
                </li>
              );
            })}
          </ul>
        </>
      )}
      {(hidden > 0 || all) && links.length + files.length > SHOWN && (
        <button type="button" onClick={() => setAll((x) => !x)} className={`${SMALL} mt-3`}>
          {all ? "Show fewer attachments" : `View all attachments (${hidden} hidden)`}
        </button>
      )}
    </section>
  );
}

const SHOWN = 4;
const SMALL =
  "inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#F3F7F6] px-3 text-sm text-neutral-700 transition-colors hover:bg-[#E6EFED]";
const MENU_ITEM = "flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-sm text-neutral-700 hover:bg-[#F3F7F6]";

// Files open through a fresh signed URL; links open as they are.
export async function openAttachment(a: KanbanAttachment) {
  if (a.url) return void window.open(a.url, "_blank", "noopener,noreferrer");
  if (!a.storage_path) return;
  const urls = await signedUrls([a.storage_path], 60 * 10);
  const href = urls[a.storage_path];
  if (href) window.open(href, "_blank", "noopener,noreferrer");
}

export async function downloadAttachment(a: KanbanAttachment) {
  if (!a.storage_path) return;
  const href = await downloadUrl(a.storage_path, a.name);
  if (href) window.location.assign(href);
}

// Small icon by the link's site, drawn locally (no remote favicons).
function LinkIcon({ url }: { url: string }) {
  let host = "";
  try {
    host = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    // keep the generic icon
  }
  const kind = /docs\.google\.com\/(presentation|spreadsheets|document)/.exec(url)?.[1];
  const tone =
    kind === "presentation" ? "#F2B84B" : kind === "spreadsheets" ? "#3E9B5B" : kind === "document" ? "#4A7BD6" : host.includes("drive.google") ? "#14919B" : "#5B6B78";
  const Icon = kind === "presentation" ? Presentation : kind === "spreadsheets" ? Sheet : kind === "document" ? FileText : host.includes("drive.google") ? HardDrive : Link2;
  return <Icon className="h-4 w-4 shrink-0" style={{ color: tone }} aria-hidden="true" />;
}

function AttachmentMenu({
  card,
  a,
  onDelete,
  onComment,
  onUpdated,
}: {
  card: KanbanCard;
  a: KanbanAttachment;
  onDelete: (a: KanbanAttachment) => void;
  onComment: (a: KanbanAttachment) => void;
  onUpdated: (a: KanbanAttachment) => void;
}) {
  const { editable, patchCard, push } = useBoard();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(a.name);
  const [url, setUrl] = useState(a.url ?? "");
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = () => {
    setOpen(false);
    setEditing(false);
  };
  useDismiss(ref, open, close);
  const isCover = card.cover_attachment_id === a.id;

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => {
          setName(a.name);
          setUrl(a.url ?? "");
          setEditing(false);
          setOpen((o) => !o);
        }}
        aria-label={`Actions for ${a.name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        className="grid h-8 w-8 place-items-center rounded-lg text-neutral-500 hover:bg-white hover:text-neutral-900"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-40 mt-1 w-56 rounded-xl border border-[#0B6477]/10 bg-white p-1 shadow-xl">
          {editing ? (
            <form
              className="flex flex-col gap-2 p-2"
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                const res = await updateAttachment(a.id, a.url ? { name: name.trim() || a.name, url } : { name: name.trim() || a.name });
                setBusy(false);
                if (res.error !== null) return push({ text: res.error, tone: "error" });
                onUpdated(res.data);
                close();
              }}
            >
              <label className="text-xs font-medium text-neutral-500">
                {a.url ? "Display text" : "File name"}
                <input autoFocus value={name} onChange={(e) => setName(e.target.value)} className={`${FIELD} mt-1 h-9`} />
              </label>
              {a.url && (
                <label className="text-xs font-medium text-neutral-500">
                  Link
                  <input value={url} onChange={(e) => setUrl(e.target.value)} className={`${FIELD} mt-1 h-9`} />
                </label>
              )}
              <button type="submit" disabled={busy} className={PRIMARY}>
                Save
              </button>
            </form>
          ) : (
            <>
              {editable && (
                <button type="button" role="menuitem" className={MENU_ITEM} onClick={() => setEditing(true)}>
                  <Pencil className="h-4 w-4 text-neutral-500" /> Edit
                </button>
              )}
              {editable && (
                <button type="button" role="menuitem" className={MENU_ITEM} onClick={() => (close(), onComment(a))}>
                  <MessageSquare className="h-4 w-4 text-neutral-500" /> Comment
                </button>
              )}
              {a.storage_path && (
                <button type="button" role="menuitem" className={MENU_ITEM} onClick={() => (close(), void downloadAttachment(a))}>
                  <Download className="h-4 w-4 text-neutral-500" /> Download
                </button>
              )}
              {editable && isImage(a) && (
                <button
                  type="button"
                  role="menuitem"
                  className={MENU_ITEM}
                  onClick={() => {
                    close();
                    void patchCard(card.id, isCover ? { cover_attachment_id: null } : { cover_attachment_id: a.id, cover_color: null });
                  }}
                >
                  <ImageIcon className="h-4 w-4 text-neutral-500" /> {isCover ? "Remove cover" : "Make cover"}
                </button>
              )}
              {editable && (
                <button type="button" role="menuitem" className={`${MENU_ITEM} text-[#B42323]`} onClick={() => (close(), onDelete(a))}>
                  <Trash2 className="h-4 w-4" /> Remove
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Full-screen viewer: the picture large, its name and date below, and the
// same actions as the menu. Arrow keys or the side buttons step through all
// attachments of the card; Esc closes without closing the card.
export function AttachmentViewer({
  card,
  items,
  index,
  onIndex,
  onClose,
  onDelete,
}: {
  card: KanbanCard;
  items: KanbanAttachment[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
  onDelete: (a: KanbanAttachment) => void;
}) {
  const { editable, patchCard } = useBoard();
  const a = items[index];
  const [src, setSrc] = useState<string | null>(null);
  const path = a?.storage_path ?? null;
  useEffect(() => {
    setSrc(null);
    if (!path) return;
    let active = true;
    signedUrls([path], 60 * 30).then((u) => active && setSrc(u[path] ?? null));
    return () => {
      active = false;
    };
  }, [path]);
  const move = (d: number) => items.length > 1 && onIndex((index + d + items.length) % items.length);
  const keys = useRef<(e: KeyboardEvent) => void>(() => {});
  keys.current = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopImmediatePropagation();
      onClose();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      e.stopImmediatePropagation();
      move(-1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      e.stopImmediatePropagation();
      move(1);
    }
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => keys.current(e);
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);
  if (!a) return null;
  const isCover = card.cover_attachment_id === a.id;
  const action = "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-white/90 hover:bg-white/10 hover:text-white";

  // Portal: the card panel is transformed by its entrance animation, which
  // would turn "fixed" into "relative to the panel".
  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex flex-col bg-[#04161A]/90 backdrop-blur-sm"
      style={body}
      role="dialog"
      aria-modal="true"
      aria-label={a.name}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <button type="button" onClick={onClose} aria-label="Close preview" className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full text-white/80 hover:bg-white/10 hover:text-white">
        <X className="h-5 w-5" />
      </button>
      <div className="flex min-h-0 flex-1 items-center justify-center px-14 pt-16" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
        {isImage(a) ? (
          src ? (
            <img src={src} alt={a.name} className="max-h-full max-w-full rounded-lg object-contain shadow-2xl" />
          ) : (
            <Loader2 className="h-8 w-8 animate-spin text-white/70" />
          )
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-white/5 px-10 py-12 text-white/80">
            {a.url ? <Link2 className="h-10 w-10" /> : <FileText className="h-10 w-10" />}
            <p className="text-sm">There is no preview for this {a.url ? "link" : "file"}.</p>
          </div>
        )}
      </div>
      {items.length > 1 && (
        <>
          <button type="button" onClick={() => move(-1)} aria-label="Previous attachment" className="absolute left-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full text-white/80 hover:bg-white/10 hover:text-white">
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button type="button" onClick={() => move(1)} aria-label="Next attachment" className="absolute right-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full text-white/80 hover:bg-white/10 hover:text-white">
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}
      <div className="shrink-0 px-4 pb-5 pt-4 text-center text-white">
        <p className="truncate text-base font-semibold" style={display}>
          {a.name}
        </p>
        <p className="mt-0.5 text-xs text-white/60">
          Added {attachmentDate(a.created_at)}
          {a.bytes ? ` · ${formatBytes(a.bytes)}` : ""}
          {items.length > 1 && ` · ${index + 1} of ${items.length}`}
        </p>
        <div className="mt-3 flex flex-wrap justify-center gap-1">
          <button type="button" className={action} onClick={() => void openAttachment(a)}>
            <ExternalLink className="h-4 w-4" /> Open in new tab
          </button>
          {a.storage_path && (
            <button type="button" className={action} onClick={() => void downloadAttachment(a)}>
              <Download className="h-4 w-4" /> Download
            </button>
          )}
          {editable && isImage(a) && (
            <button
              type="button"
              className={action}
              onClick={() => void patchCard(card.id, isCover ? { cover_attachment_id: null } : { cover_attachment_id: a.id, cover_color: null })}
            >
              <ImageIcon className="h-4 w-4" /> {isCover ? "Remove cover" : "Make cover"}
            </button>
          )}
          {editable && (
            <button type="button" className={`${action} text-[#FFB4B4] hover:text-[#FFD0D0]`} onClick={() => onDelete(a)}>
              <Trash2 className="h-4 w-4" /> Delete
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

// Popover body: colour or image cover, or none.
export function CoverPicker({
  card,
  images,
  thumbs,
  onDone,
}: {
  card: KanbanCard;
  images: KanbanAttachment[];
  thumbs: Record<string, string>;
  onDone: () => void;
}) {
  const { patchCard } = useBoard();
  const set = (patch: Parameters<typeof patchCard>[1]) => {
    onDone();
    void patchCard(card.id, patch);
  };
  return (
    <div style={body}>
      <p className="text-xs font-medium text-neutral-500">Colour</p>
      <div className="mt-2 grid grid-cols-5 gap-1.5">
        {LABEL_COLOR_KEYS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => set({ cover_color: k, cover_attachment_id: null })}
            aria-label={`${LABEL_COLORS[k].name} cover`}
            aria-pressed={card.cover_color === k}
            className={`h-9 rounded-md ring-offset-1 ${card.cover_color === k ? "ring-2 ring-[#08313A]" : ""}`}
            style={{ background: LABEL_COLORS[k].hex }}
          />
        ))}
      </div>
      <p className="mt-4 text-xs font-medium text-neutral-500">Image from attachments</p>
      {images.length === 0 ? (
        <p className="mt-1.5 text-xs text-neutral-400">Attach an image to use it as a cover.</p>
      ) : (
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          {images.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => set({ cover_attachment_id: a.id, cover_color: null })}
              aria-label={`Use ${a.name} as cover`}
              aria-pressed={card.cover_attachment_id === a.id}
              className={`h-14 overflow-hidden rounded-md bg-[#F3F7F6] ring-offset-1 ${card.cover_attachment_id === a.id ? "ring-2 ring-[#08313A]" : ""}`}
            >
              {a.storage_path && thumbs[a.storage_path] && (
                <img src={thumbs[a.storage_path]} alt="" className="h-full w-full object-cover" />
              )}
            </button>
          ))}
        </div>
      )}
      {(card.cover_color || card.cover_attachment_id) && (
        <button
          type="button"
          onClick={() => set({ cover_color: null, cover_attachment_id: null })}
          className="mt-4 h-9 w-full rounded-lg bg-[#F3F7F6] text-sm text-neutral-700 hover:bg-[#E6EFED]"
        >
          Remove cover
        </button>
      )}
    </div>
  );
}
