// Card detail, opened as a modal at /kanban/{board}/c/{number} over the board.
// Card fields, labels and members live in the board page (useBoard) so the
// card front updates with them; checklists, comments, reactions and activity
// load here when the card opens. Every write is optimistic and rolled back on
// failure. Layout and features follow docs/kanban/card-trello-findings.md.
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Archive,
  CalendarClock,
  Check,
  CheckSquare,
  ChevronDown,
  Circle,
  CircleCheck,
  CircleDot,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Link as LinkIcon,
  Loader2,
  MoreHorizontal,
  Paperclip,
  Plus,
  Reply,
  Search,
  SmilePlus,
  Tag,
  TextQuote,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { body, display } from "../../lib/fonts";
import {
  CARD_STATUSES,
  LABEL_COLORS,
  LABEL_COLOR_KEYS,
  REACTION_EMOJI,
  byPos,
  checklistProgress,
  describeActivity,
  dueState,
  parseImportedComment,
  personName,
  positionBetween,
  statusInfo,
  timeAgo,
  type CardStatus,
  type KanbanActivity,
  type KanbanAttachment,
  type KanbanCard,
  type KanbanChecklist,
  type KanbanChecklistItem,
  type KanbanComment,
  type KanbanPerson,
  type LabelColor,
} from "../../lib/kanban";
import {
  addLinkAttachment,
  createChecklist,
  createComment,
  createItem,
  deleteAttachment,
  deleteCardForever,
  deleteChecklist,
  deleteComment,
  deleteItem,
  loadActivity,
  loadCardDetail,
  signedUrls,
  toggleReaction,
  updateChecklist,
  updateComment,
  updateItem,
  uploadAttachment,
  type CardDetail,
} from "../../lib/kanban-data";
import { AttachmentList, AttachmentPicker, AttachmentViewer, CoverPicker, isImage } from "./Attachments";
import { EASE } from "../NoteParts";
import { useBoard } from "./board-context";
import { isHelpKey, isTyping } from "./ShortcutsDialog";
import MarkdownEditor, { AttachmentLinkContext, InlineMarkdown, MarkdownView, attachmentHref } from "./MarkdownEditor";
import { Avatar, Composer, InlineEdit, useDismiss } from "./parts";

const SECTION_TITLE = "flex items-center gap-2 text-sm font-semibold tracking-[-0.01em] text-neutral-900";
const BUTTON =
  "inline-flex h-9 items-center gap-2 rounded-lg bg-[#F3F7F6] px-3 text-sm text-neutral-700 transition-colors hover:bg-[#E6EFED] disabled:opacity-50";
const SMALL =
  "inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#F3F7F6] px-3 text-sm text-neutral-700 transition-colors hover:bg-[#E6EFED]";
const FIELD =
  "w-full rounded-lg border border-[#0B6477]/15 bg-white px-3 py-2 text-sm text-neutral-800 outline-none placeholder:text-neutral-400 focus:border-[#14919B] focus:ring-2 focus:ring-[#14919B]/20";
const PRIMARY =
  "inline-flex h-9 items-center rounded-lg bg-[#45DFB1] px-3.5 text-sm font-medium text-[#0B2A22] transition-colors hover:bg-[#80ED99] disabled:opacity-50";
const MENU_ITEM = "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm text-neutral-700 hover:bg-[#F3F7F6]";
const OVER_COVER = "bg-white/85 text-neutral-800 shadow-sm backdrop-blur hover:bg-white";

// Anchored panel that closes on outside click or Esc (without closing the modal).
function Popover({
  open,
  onClose,
  title,
  children,
  align = "left",
  width = "w-72",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  align?: "left" | "right";
  width?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={title}
      className={`absolute ${align === "right" ? "right-0" : "left-0"} top-full z-40 mt-2 ${width} max-w-[calc(100vw-2rem)] rounded-xl border border-[#0B6477]/10 bg-white p-3 text-neutral-800 shadow-xl`}
      style={body}
    >
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold text-neutral-800" style={display}>
          {title}
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="grid h-7 w-7 place-items-center rounded-md text-neutral-500 hover:bg-neutral-900/5"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {children}
    </div>
  );
}

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const DUE_TONE = {
  complete: "bg-[#45DFB1]/25 text-[#0B5E47]",
  overdue: "bg-[#E25555]/12 text-[#B42323]",
  soon: "bg-[#F2B84B]/25 text-[#7A5200]",
  later: "bg-[#F3F7F6] text-neutral-700",
} as const;

export default function CardModal({ number }: { number: number }) {
  const { data, closeCard } = useBoard();
  const card = data.cards.find((c) => c.number === number);
  const panelRef = useRef<HTMLDivElement>(null);

  // Esc closes the modal unless an editor, popover or viewer consumed it first.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented) closeCard();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeCard]);

  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  const title = card?.title;
  useEffect(() => {
    if (!title) return;
    const previous = document.title;
    document.title = `${title} | ${data.board.name}`;
    return () => {
      document.title = previous;
    };
  }, [title, data.board.name]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#08313A]/55 backdrop-blur-[2px] sm:px-6 sm:py-10"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) closeCard();
      }}
    >
      <motion.div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="card-modal-title"
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: EASE }}
        // Desktop: a fixed-height panel; the cover and its controls stay put
        // while the details and the comments scroll on their own.
        className="relative min-h-full w-full max-w-[1160px] bg-white outline-none sm:min-h-0 sm:rounded-[24px] sm:shadow-[0_30px_80px_-30px_rgba(8,49,58,0.6)] md:flex md:h-[calc(100dvh-5rem)] md:flex-col md:overflow-hidden"
      >
        {card ? (
          <CardBody key={card.id} card={card} />
        ) : (
          <div className="p-8">
            <div className="flex items-start justify-between gap-4">
              <h2 id="card-modal-title" className="text-xl font-semibold tracking-[-0.025em]" style={display}>
                Card not found
              </h2>
              <CloseButton />
            </div>
            <p className="mt-3 text-sm text-neutral-600" style={body}>
              This card may have been archived or moved to another board.
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}

function CloseButton({ onCover = false }: { onCover?: boolean }) {
  const { closeCard } = useBoard();
  return (
    <button
      type="button"
      onClick={closeCard}
      aria-label="Close card"
      className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg transition-colors ${
        onCover ? OVER_COVER : "text-neutral-500 hover:bg-neutral-900/5 hover:text-neutral-900"
      }`}
    >
      <X className="h-5 w-5" />
    </button>
  );
}

type PopoverKey = "add" | "labels" | "members" | "dates" | "checklist" | "attachment" | "cover" | "status" | "list" | "actions";
// Where a popover is anchored: the action row, a field under the title, the
// header over the cover, or the attachments section.
type Anchor = "row" | "members" | "labels" | "status" | "dates" | "header-list" | "header-cover" | "header-actions" | "attachments" | "sticky";
type PopoverState = { key: PopoverKey; at: Anchor } | null;

type SetDetail = (fn: (d: CardDetail | null) => CardDetail | null) => void;

function usePeople() {
  const { data } = useBoard();
  return useMemo(() => {
    const byId = new Map(data.people.map((p) => [p.user_id, p]));
    const nameOf = (id: string | null) => (id && byId.get(id) ? personName(byId.get(id)) : "Former member");
    return { byId, nameOf };
  }, [data.people]);
}

const POPOVER_TITLE: Record<PopoverKey, string> = {
  add: "Add to card",
  labels: "Labels",
  members: "Members",
  dates: "Dates",
  checklist: "Add checklist",
  attachment: "Attach",
  cover: "Cover",
  status: "Status",
  list: "Move to list",
  actions: "Card actions",
};

function CardBody({ card: c }: { card: KanbanCard }) {
  const ctx = useBoard();
  const { data, editable, closeCard } = ctx;
  const { byId: peopleById } = usePeople();
  const listsSorted = useMemo(() => [...data.lists].sort(byPos), [data.lists]);
  const cardLabels = data.labels.filter((l) => data.cardLabels.some((cl) => cl.card_id === c.id && cl.label_id === l.id));
  const cardMembers = data.cardMembers
    .filter((cm) => cm.card_id === c.id)
    .map((cm) => peopleById.get(cm.user_id))
    .filter(Boolean) as KanbanPerson[];
  const hasStatus = "status" in c;
  const watching = ctx.watched ? ctx.watched.has(c.id) : null;

  const [detail, setDetail] = useState<CardDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [popover, setPopover] = useState<PopoverState>(null);
  // Like Trello: comments first, the activity log only on request.
  const [showDetails, setShowDetails] = useState(false);
  const [bump, setBump] = useState(0);
  const touched = () => setBump((n) => n + 1);
  const closePopover = useMemo(() => () => setPopover(null), []);
  const open = (key: PopoverKey, at: Anchor) => setPopover((p) => (p?.key === key && p.at === at ? null : { key, at }));
  // Text pushed into the comment composer (Reply, comment on an attachment).
  const [composerSeed, setComposerSeed] = useState<{ text: string; nonce: number } | null>(null);
  const seedComment = (text: string) => setComposerSeed((s) => ({ text, nonce: (s?.nonce ?? 0) + 1 }));
  const [viewer, setViewer] = useState<number | null>(null);

  // Card shortcuts. A popover or editor that is open handles its own keys.
  const keys = useRef<(e: KeyboardEvent) => void>(() => {});
  keys.current = (e: KeyboardEvent) => {
    const k = e.key;
    if (isHelpKey(e)) return e.preventDefault(), ctx.showShortcuts();
    if (k === "ArrowLeft" || k === "ArrowRight") {
      const siblings = data.cards.filter((x) => x.list_id === c.list_id).sort(byPos);
      const next = siblings[siblings.findIndex((x) => x.id === c.id) + (k === "ArrowLeft" ? -1 : 1)];
      if (next) {
        e.preventDefault();
        ctx.openCard(next);
      }
      return;
    }
    if (k === "s" && watching !== null) {
      e.preventDefault();
      void ctx.setWatch(c.id, !watching);
      return;
    }
    if (!editable) return;
    const pop = ({ l: "labels", m: "members", d: "dates", "-": "checklist", a: "attachment" } as const)[k as "l"];
    if (pop) return e.preventDefault(), setPopover({ key: pop, at: "row" });
    if (k === "t") {
      e.preventDefault();
      document.getElementById("card-modal-title")?.focus();
    } else if (k === " " && ctx.userId) {
      e.preventDefault();
      void ctx.toggleMember(c.id, ctx.userId);
    } else if (k === "c") {
      e.preventDefault();
      closeCard();
      void ctx.archiveCard(c.id);
    }
  };
  const popoverRef = useRef(popover);
  popoverRef.current = popover;
  const viewerRef = useRef(viewer);
  viewerRef.current = viewer;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || isTyping(e) || popoverRef.current || viewerRef.current !== null) return;
      if (document.querySelector('[aria-label="Keyboard shortcuts"]')) return;
      keys.current(e);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    let active = true;
    loadCardDetail(c.id).then((res) => {
      if (!active) return;
      if (res.error !== null) setLoadError(res.error);
      else setDetail(res.data);
    });
    return () => {
      active = false;
    };
  }, [c.id]);

  // A link to one comment (#comment-<id>) scrolls to it once comments load.
  const scrolled = useRef(false);
  useEffect(() => {
    if (!detail || scrolled.current) return;
    scrolled.current = true;
    const hash = window.location.hash;
    if (hash.startsWith("#comment-")) window.setTimeout(() => highlightComment(hash.slice(9)), 150);
  }, [detail]);

  // Someone else changed checklists, comments or attachments on this board:
  // re-read this card's details (not on mount, the load above covers that).
  const version = useRef(ctx.detailVersion);
  useEffect(() => {
    if (ctx.detailVersion === version.current) return;
    version.current = ctx.detailVersion;
    const t = window.setTimeout(() => {
      loadCardDetail(c.id).then((res) => {
        if (res.error === null) setDetail(res.data);
      });
    }, 300);
    return () => window.clearTimeout(t);
  }, [ctx.detailVersion, c.id]);

  // Activity rows come from database triggers: re-read them shortly after
  // anything on this card changes.
  const labelKey = cardLabels.map((l) => l.id).join();
  const memberKey = cardMembers.map((m) => m.user_id).join();
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const t = window.setTimeout(() => {
      loadActivity(c.id).then((res) => {
        if (res.error === null) setDetail((d) => (d ? { ...d, activity: res.data } : d));
      });
    }, 500);
    return () => window.clearTimeout(t);
  }, [c.updated_at, c.list_id, labelKey, memberKey, bump, c.id]);

  // Keep the card-front badges in step with this card's checklists/comments.
  const { setBadge } = ctx;
  useEffect(() => {
    if (!detail) return;
    const ids = new Set(detail.checklists.map((cl) => cl.id));
    const items = detail.items.filter((i) => ids.has(i.checklist_id));
    setBadge(c.id, {
      checkItems: items.length,
      checkDone: items.filter((i) => i.done).length,
      comments: detail.comments.length,
      attachments: detail.attachments.length,
    });
  }, [detail, c.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const addChecklist = async (title: string) => {
    if (!detail) return;
    const last = [...detail.checklists].sort(byPos).at(-1);
    const row: KanbanChecklist = {
      id: crypto.randomUUID(),
      card_id: c.id,
      board_id: c.board_id,
      title,
      pos: positionBetween(last?.pos ?? null, null),
    };
    setDetail((d) => (d ? { ...d, checklists: [...d.checklists, row] } : d));
    const res = await createChecklist(row);
    if (res.error !== null) {
      setDetail((d) => (d ? { ...d, checklists: d.checklists.filter((x) => x.id !== row.id) } : d));
      ctx.push({ text: `Could not add the checklist: ${res.error}`, tone: "error" });
    } else touched();
  };

  const addComment = async (text: string) => {
    if (!ctx.userId) return;
    const row: KanbanComment = {
      id: crypto.randomUUID(),
      card_id: c.id,
      board_id: c.board_id,
      author_id: ctx.userId,
      body: text,
      created_at: new Date().toISOString(),
      edited_at: null,
    };
    setDetail((d) => (d ? { ...d, comments: [row, ...d.comments] } : d));
    const res = await createComment(row);
    if (res.error !== null) {
      setDetail((d) => (d ? { ...d, comments: d.comments.filter((x) => x.id !== row.id) } : d));
      ctx.push({ text: `Could not post the comment: ${res.error}`, tone: "error" });
    } else {
      setDetail((d) => (d ? { ...d, comments: d.comments.map((x) => (x.id === row.id ? res.data : x)) } : d));
    }
  };

  const due = dueState(c);
  const list = data.lists.find((l) => l.id === c.list_id);
  const status = hasStatus ? statusInfo(c.status) : null;

  // --- Attachments ------------------------------------------------------------
  const [uploading, setUploading] = useState(0);
  const [dropping, setDropping] = useState(false);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const attachments = detail?.attachments ?? [];
  const images = attachments.filter(isImage);
  const imageKey = images.map((a) => a.storage_path).join();
  useEffect(() => {
    if (!imageKey) return;
    let active = true;
    signedUrls(images.map((a) => a.storage_path as string)).then((urls) => active && setThumbs((t) => ({ ...t, ...urls })));
    return () => {
      active = false;
    };
  }, [imageKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const coverAttachment = attachments.find((a) => a.id === c.cover_attachment_id);
  const coverThumb = coverAttachment?.storage_path ? thumbs[coverAttachment.storage_path] : undefined;
  const hasCover = !!(coverThumb || c.cover_color || c.cover_attachment_id);

  const addAttachment = (a: KanbanAttachment) =>
    setDetail((d) => (d ? { ...d, attachments: [a, ...d.attachments.filter((x) => x.id !== a.id)] } : d));

  const uploadOne = async (file: File): Promise<KanbanAttachment | null> => {
    if (!ctx.userId || !editable) return null;
    setUploading((n) => n + 1);
    const res = await uploadAttachment(c, file, ctx.userId);
    setUploading((n) => n - 1);
    if (res.error !== null) {
      ctx.push({ text: `Could not upload ${file.name}: ${res.error}`, tone: "error" });
      return null;
    }
    addAttachment(res.data);
    touched();
    return res.data;
  };

  const uploadFiles = async (files: File[]) => {
    setPopover(null);
    let coverSet = !!(c.cover_attachment_id || c.cover_color);
    for (const file of files) {
      const a = await uploadOne(file);
      // First image on a card without a cover becomes its cover.
      if (a && !coverSet && isImage(a)) {
        coverSet = true;
        void ctx.patchCard(c.id, { cover_attachment_id: a.id, cover_color: null });
      }
    }
  };

  // Editors attach a file to the card and insert a link to it.
  const attachForEditor = async (file: File) => {
    const a = await uploadOne(file);
    return a ? `[${a.name.replace(/[[\]]/g, "")}](${attachmentHref(a.id)})` : null;
  };

  const attachLink = async (url: string, name: string) => {
    if (!ctx.userId) return false;
    const res = await addLinkAttachment(c, url, name, ctx.userId);
    if (res.error !== null) {
      ctx.push({ text: res.error, tone: "error" });
      return false;
    }
    setPopover(null);
    addAttachment(res.data);
    touched();
    return true;
  };

  const removeAttachment = async (a: KanbanAttachment) => {
    if (!window.confirm(`Delete ${a.name}? This cannot be undone.`)) return;
    setViewer(null);
    setDetail((d) => (d ? { ...d, attachments: d.attachments.filter((x) => x.id !== a.id) } : d));
    const res = await deleteAttachment(a);
    if (res.error !== null) {
      addAttachment(a);
      ctx.push({ text: `Could not delete the attachment: ${res.error}`, tone: "error" });
      return;
    }
    if (c.cover_attachment_id === a.id) void ctx.patchCard(c.id, { cover_attachment_id: null });
    touched();
  };

  const commentOnAttachment = (a: KanbanAttachment) =>
    seedComment(`[${a.name.replace(/[[\]]/g, "")}](${a.url ?? attachmentHref(a.id)}) `);

  const viewAttachment = (id: string) => {
    const i = attachments.findIndex((a) => a.id === id);
    if (i >= 0) setViewer(i);
    else ctx.push({ text: "That attachment is no longer on this card.", tone: "info" });
  };

  // --- Card actions ---------------------------------------------------------------
  const copyLink = async () => {
    setPopover(null);
    const url = `${window.location.origin}${window.location.pathname}`;
    try {
      await navigator.clipboard.writeText(url);
      ctx.push({ text: "Link to this card copied." });
    } catch {
      ctx.push({ text: url });
    }
  };
  const deleteForever = async () => {
    setPopover(null);
    if (!window.confirm(`Delete "${c.title}" permanently? Its checklists, comments and files are removed too. This cannot be undone.`)) return;
    const res = await deleteCardForever(c.id, c.board_id);
    if (res.error !== null) return ctx.push({ text: `Could not delete the card: ${res.error}`, tone: "error" });
    closeCard();
    ctx.updateData((d) => ({ ...d, cards: d.cards.filter((x) => x.id !== c.id) }));
  };

  // --- Sticky title once the real one scrolls away ------------------------------------
  const titleRef = useRef<HTMLDivElement>(null);
  const columnRef = useRef<HTMLDivElement>(null);
  const [titleHidden, setTitleHidden] = useState(false);
  useEffect(() => {
    const el = titleRef.current;
    const column = columnRef.current;
    if (!el || !column) return;
    // Desktop scrolls the column, mobile scrolls the whole overlay.
    const root = getComputedStyle(column).overflowY === "auto" ? column : null;
    // Only when it left through the top (scrolled past), not while it loads in.
    const io = new IntersectionObserver(
      ([entry]) => setTitleHidden(!entry.isIntersecting && entry.boundingClientRect.bottom <= (entry.rootBounds?.top ?? 0) + 1),
      { root, threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const popoverBody = (key: PopoverKey) => {
    switch (key) {
      case "add":
        return (
          <AddMenu
            hasStatus={hasStatus}
            onPick={(k) => setPopover({ key: k, at: popover?.at ?? "row" })}
          />
        );
      case "labels":
        return <LabelPicker cardId={c.id} />;
      case "members":
        return <MemberPicker cardId={c.id} />;
      case "dates":
        return <DatesEditor card={c} onDone={closePopover} />;
      case "checklist":
        return (
          <NewChecklist
            onCreate={(t) => {
              closePopover();
              void addChecklist(t);
            }}
          />
        );
      case "attachment":
        return <AttachmentPicker onFiles={uploadFiles} onLink={attachLink} />;
      case "cover":
        return <CoverPicker card={c} images={images} thumbs={thumbs} onDone={closePopover} />;
      case "status":
        return (
          <StatusPicker
            value={c.status ?? null}
            onPick={(s) => {
              closePopover();
              void ctx.patchCard(c.id, { status: s });
            }}
          />
        );
      case "list":
        return (
          <ul className="flex max-h-72 flex-col gap-0.5 overflow-y-auto">
            {listsSorted.map((l) => (
              <li key={l.id}>
                <button
                  type="button"
                  className={MENU_ITEM}
                  onClick={() => {
                    closePopover();
                    if (l.id !== c.list_id) void ctx.moveCardToList(c.id, l.id);
                  }}
                >
                  <span className="min-w-0 flex-1 truncate">{l.name}</span>
                  {l.id === c.list_id && <Check className="h-4 w-4 text-[#14919B]" />}
                </button>
              </li>
            ))}
          </ul>
        );
      case "actions":
        return (
          <div className="flex flex-col">
            {editable && (
              <>
                <button type="button" className={MENU_ITEM} onClick={() => setPopover({ key: "add", at: "header-actions" })}>
                  <Plus className="h-4 w-4 text-neutral-500" /> Add to card
                </button>
                <button type="button" className={MENU_ITEM} onClick={() => setPopover({ key: "list", at: "header-actions" })}>
                  <CircleDot className="h-4 w-4 text-neutral-500" /> Move to list
                </button>
                <button type="button" className={MENU_ITEM} onClick={() => setPopover({ key: "cover", at: "header-actions" })}>
                  <ImageIcon className="h-4 w-4 text-neutral-500" /> Cover
                </button>
              </>
            )}
            {watching !== null && (
              <button
                type="button"
                className={MENU_ITEM}
                onClick={() => {
                  closePopover();
                  void ctx.setWatch(c.id, !watching);
                }}
              >
                {watching ? <EyeOff className="h-4 w-4 text-neutral-500" /> : <Eye className="h-4 w-4 text-neutral-500" />}
                {watching ? "Stop watching" : "Watch"}
              </button>
            )}
            <button type="button" className={MENU_ITEM} onClick={() => void copyLink()}>
              <LinkIcon className="h-4 w-4 text-neutral-500" /> Copy link
            </button>
            {editable && (
              <>
                <div className="my-1 h-px bg-[#0B6477]/8" />
                <button
                  type="button"
                  className={MENU_ITEM}
                  onClick={async () => {
                    closePopover();
                    closeCard();
                    await ctx.archiveCard(c.id);
                  }}
                >
                  <Archive className="h-4 w-4 text-neutral-500" /> Archive
                </button>
              </>
            )}
            {ctx.owner && (
              <button type="button" className={`${MENU_ITEM} text-[#B42323]`} onClick={() => void deleteForever()}>
                <Trash2 className="h-4 w-4" /> Delete permanently
              </button>
            )}
          </div>
        );
    }
  };

  const anchored = (at: Anchor, align: "left" | "right" = "left") =>
    popover && popover.at === at ? (
      <Popover open onClose={closePopover} title={POPOVER_TITLE[popover.key]} align={align} width={popover.key === "actions" || popover.key === "add" ? "w-64" : "w-72"}>
        {popoverBody(popover.key)}
      </Popover>
    ) : null;

  return (
    <AttachmentLinkContext.Provider value={viewAttachment}>
      {/* Header over the cover (or a plain bar without one): list, cover, watch, actions, close. */}
      <header
        className={`relative shrink-0 ${
          coverThumb ? "bg-[#E6EFED]" : c.cover_color ? "" : "border-b border-[#0B6477]/8"
        }`}
        style={!coverThumb && c.cover_color ? { background: (LABEL_COLORS[c.cover_color] ?? LABEL_COLORS.slate).hex } : undefined}
      >
        {coverThumb && (
          <img src={coverThumb} alt="" className="mx-auto block max-h-48 w-full object-contain md:max-h-44" />
        )}
        {!coverThumb && c.cover_attachment_id && <div className="h-32 animate-pulse" aria-hidden="true" />}
        {!coverThumb && !c.cover_attachment_id && c.cover_color && <div className="h-20" aria-hidden="true" />}
        <div
          className={`${hasCover ? "absolute inset-x-0 top-0" : ""} flex items-center gap-2 px-3 py-3 sm:px-5`}
          style={body}
        >
          <div className="relative min-w-0">
            <button
              type="button"
              disabled={!editable}
              onClick={() => open("list", "header-list")}
              aria-label={`Change list for this card, currently in ${list?.name ?? "no list"}`}
              className={`inline-flex h-8 max-w-[52vw] items-center gap-1 rounded-lg px-2.5 text-xs font-semibold uppercase tracking-[0.04em] transition-colors disabled:cursor-default ${
                hasCover ? OVER_COVER : "bg-[#F3F7F6] text-neutral-700 hover:bg-[#E6EFED]"
              }`}
            >
              <span className="truncate">{list?.name}</span>
              {editable && <ChevronDown className="h-3.5 w-3.5 shrink-0" />}
            </button>
            {anchored("header-list")}
          </div>
          <span className={`hidden text-xs tabular-nums sm:inline ${hasCover ? "rounded-md bg-white/70 px-1.5 py-0.5 text-neutral-600" : "text-neutral-400"}`}>
            #{c.number}
          </span>
          <div className="ml-auto flex items-center gap-1.5">
            {editable && (
              <div className="relative">
                <HeaderButton onCover={hasCover} label="Cover" onClick={() => open("cover", "header-cover")}>
                  <ImageIcon className="h-4 w-4" />
                </HeaderButton>
                {anchored("header-cover", "right")}
              </div>
            )}
            {watching !== null && (
              <HeaderButton
                onCover={hasCover}
                label={watching ? "Watching (S to stop)" : "Watch (S)"}
                pressed={watching}
                onClick={() => void ctx.setWatch(c.id, !watching)}
              >
                {watching ? <Eye className="h-4 w-4 text-[#14919B]" /> : <Eye className="h-4 w-4" />}
              </HeaderButton>
            )}
            <div className="relative">
              <HeaderButton onCover={hasCover} label="Actions" onClick={() => open("actions", "header-actions")}>
                <MoreHorizontal className="h-4 w-4" />
              </HeaderButton>
              {anchored("header-actions", "right")}
            </div>
            <CloseButton onCover={hasCover} />
          </div>
        </div>
      </header>

      <div
        className="relative grid md:min-h-0 md:flex-1 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]"
        onDragOver={(e) => {
          if (!editable || !e.dataTransfer.types.includes("Files")) return;
          e.preventDefault();
          setDropping(true);
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropping(false);
        }}
        onDrop={(e) => {
          if (!editable) return;
          e.preventDefault();
          setDropping(false);
          const files = [...e.dataTransfer.files];
          if (files.length) void uploadFiles(files);
        }}
      >
        {dropping && (
          <div className="pointer-events-none absolute inset-3 z-20 grid place-items-center rounded-[18px] border-2 border-dashed border-[#14919B] bg-[#14919B]/10 text-sm font-medium text-[#0B6477]" style={body}>
            Drop files to attach them to this card
          </div>
        )}
        <div ref={columnRef} className="kanban-scroll relative min-w-0 px-5 pb-8 sm:px-8 md:overflow-y-auto">
          {/* Compact title bar while the real title is scrolled away. */}
          <AnimatePresence>
            {titleHidden && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                className="sticky top-0 z-20 -mx-5 flex items-center gap-2.5 border-b border-[#0B6477]/8 bg-white/95 px-5 py-2.5 backdrop-blur sm:-mx-8 sm:px-8"
                style={body}
              >
                {c.due_complete ? <CircleCheck className="h-5 w-5 shrink-0 fill-[#45DFB1] text-[#0B5E47]" /> : <Circle className="h-5 w-5 shrink-0 text-neutral-400" />}
                <p className="min-w-0 flex-1 truncate text-[15px] font-semibold text-neutral-900">{c.title}</p>
                {editable && (
                  <div className="relative">
                    <button type="button" onClick={() => open("add", "sticky")} className={SMALL}>
                      <Plus className="h-4 w-4" /> Add
                    </button>
                    {anchored("sticky", "right")}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={titleRef} className="flex items-start gap-3 pt-6">
            <button
              type="button"
              disabled={!editable}
              onClick={() => ctx.patchCard(c.id, { due_complete: !c.due_complete })}
              aria-label={c.due_complete ? "Mark this card incomplete" : "Mark this card complete"}
              aria-pressed={c.due_complete}
              className="mt-1.5 shrink-0 text-neutral-400 transition-colors hover:text-[#14919B] disabled:cursor-default"
            >
              {c.due_complete ? <CircleCheck className="h-6 w-6 fill-[#45DFB1] text-[#0B5E47]" /> : <Circle className="h-6 w-6" />}
            </button>
            <TitleEditor value={c.title} editable={editable} onSave={(title) => ctx.patchCard(c.id, { title })} />
          </div>

          {editable && (
            <div className="relative mt-5 flex flex-wrap gap-2" style={body}>
              <button type="button" onClick={() => open("add", "row")} aria-expanded={popover?.at === "row" && popover.key === "add"} className={BUTTON}>
                <Plus className="h-4 w-4" /> Add
              </button>
              <button type="button" onClick={() => open("dates", "row")} className={BUTTON}>
                <CalendarClock className="h-4 w-4" /> Dates
              </button>
              <button type="button" onClick={() => open("checklist", "row")} className={BUTTON}>
                <CheckSquare className="h-4 w-4" /> Checklist
              </button>
              <button type="button" onClick={() => open("attachment", "row")} className={BUTTON}>
                <Paperclip className="h-4 w-4" /> Attachment
              </button>
              {anchored("row")}
            </div>
          )}

          {/* Fields: members, labels, status and dates, each with its own picker. */}
          <div className="mt-6 flex flex-wrap gap-x-8 gap-y-4" style={body}>
            {(cardMembers.length > 0 || editable) && (
              <Meta title="Members">
                <div className="relative flex flex-wrap items-center gap-1.5">
                  {cardMembers.map((m) => (
                    <button key={m.user_id} type="button" disabled={!editable} onClick={() => open("members", "members")} title={personName(m)} className="rounded-full">
                      <Avatar person={m} size={32} />
                    </button>
                  ))}
                  {editable && (
                    <button
                      type="button"
                      onClick={() => open("members", "members")}
                      aria-label="Add members to card"
                      className="grid h-8 w-8 place-items-center rounded-full bg-[#F3F7F6] text-neutral-600 hover:bg-[#E6EFED]"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  )}
                  {anchored("members")}
                </div>
              </Meta>
            )}
            {(cardLabels.length > 0 || editable) && (
              <Meta title="Labels">
                <div className="relative flex flex-wrap gap-1.5">
                  {cardLabels.map((l) => {
                    const col = LABEL_COLORS[l.color] ?? LABEL_COLORS.slate;
                    return (
                      <button
                        key={l.id}
                        type="button"
                        disabled={!editable}
                        onClick={() => open("labels", "labels")}
                        className="inline-flex h-8 min-w-12 items-center rounded-lg px-3 text-sm font-medium disabled:cursor-default"
                        style={{ background: col.hex, color: col.ink }}
                      >
                        {l.name}
                      </button>
                    );
                  })}
                  {editable && (
                    <button
                      type="button"
                      onClick={() => open("labels", "labels")}
                      aria-label="Add a label"
                      className="grid h-8 w-8 place-items-center rounded-lg bg-[#F3F7F6] text-neutral-600 hover:bg-[#E6EFED]"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  )}
                  {anchored("labels")}
                </div>
              </Meta>
            )}
            {hasStatus && (status || editable) && (
              <Meta title="Status">
                <div className="relative">
                  <button
                    type="button"
                    disabled={!editable}
                    onClick={() => open("status", "status")}
                    className="inline-flex h-8 items-center gap-2 rounded-lg px-3 text-sm font-medium disabled:cursor-default"
                    style={status ? { background: status.bg, color: status.ink } : { background: "#F3F7F6", color: "#525252" }}
                  >
                    {status && <span className="h-2 w-2 rounded-full" style={{ background: status.dot }} />}
                    {status ? status.label : "No status"}
                    {editable && <ChevronDown className="h-3.5 w-3.5" />}
                  </button>
                  {anchored("status")}
                </div>
              </Meta>
            )}
            {(c.due_at || c.start_at) && (
              <Meta title={c.due_at ? "Due date" : "Start date"}>
                <div className="relative flex items-center gap-1.5">
                  {c.due_at && (
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={c.due_complete}
                      aria-label="Due date complete"
                      disabled={!editable}
                      onClick={() => ctx.patchCard(c.id, { due_complete: !c.due_complete })}
                      className={`grid h-[18px] w-[18px] place-items-center rounded border ${c.due_complete ? "border-[#14919B] bg-[#14919B] text-white" : "border-neutral-300 bg-white"}`}
                    >
                      {c.due_complete && <Check className="h-3 w-3" />}
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={!editable}
                    onClick={() => open("dates", "dates")}
                    className={`inline-flex h-8 items-center gap-2 rounded-lg px-3 text-sm disabled:cursor-default ${due ? DUE_TONE[due] : DUE_TONE.later}`}
                  >
                    {c.start_at && c.due_at && (
                      <span>{new Date(c.start_at).toLocaleDateString("en-US", { day: "numeric", month: "short" })} to</span>
                    )}
                    {formatDateTime((c.due_at ?? c.start_at)!)}
                    {due === "overdue" && <span className="font-medium">Overdue</span>}
                    {due === "complete" && <span className="font-medium">Complete</span>}
                    {editable && <ChevronDown className="h-3.5 w-3.5" />}
                  </button>
                  {anchored("dates")}
                </div>
              </Meta>
            )}
          </div>

          <DescriptionSection
            value={c.description}
            editable={editable}
            onSave={(description) => ctx.patchCard(c.id, { description })}
            onAttach={editable ? attachForEditor : undefined}
          />

          {detail && (
            <div className="relative">
              <AttachmentList
                card={c}
                attachments={attachments}
                thumbs={thumbs}
                uploading={uploading}
                onDelete={removeAttachment}
                onAdd={() => open("attachment", "attachments")}
                onComment={commentOnAttachment}
                onUpdated={addAttachment}
                onView={(a) => setViewer(attachments.findIndex((x) => x.id === a.id))}
              />
              {anchored("attachments", "right")}
            </div>
          )}

          {loadError ? (
            <p className="mt-8 text-sm text-[#B42323]" style={body}>
              {loadError}
            </p>
          ) : !detail ? (
            <p className="mt-8 flex items-center gap-2 text-sm text-neutral-500" style={body}>
              <Loader2 className="h-4 w-4 animate-spin" /> Loading checklists and comments...
            </p>
          ) : (
            [...detail.checklists]
              .sort(byPos)
              .map((cl) => (
                <ChecklistBlock
                  key={cl.id}
                  checklist={cl}
                  items={detail.items.filter((i) => i.checklist_id === cl.id).sort(byPos)}
                  setDetail={setDetail}
                  touched={touched}
                />
              ))
          )}
        </div>

        <aside className="kanban-scroll min-w-0 border-t border-[#0B6477]/8 bg-[#F7FAF9] px-5 pb-8 pt-6 sm:px-8 md:overflow-y-auto md:border-l md:border-t-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className={SECTION_TITLE} style={display}>
              Comments and activity
            </h3>
            <button
              type="button"
              onClick={() => setShowDetails((s) => !s)}
              className="rounded-md px-2 py-1 text-xs text-neutral-500 hover:bg-neutral-900/5"
              style={body}
            >
              {showDetails ? "Hide details" : "Show details"}
            </button>
          </div>
          {editable && ctx.userId && <CommentComposer onSubmit={addComment} seed={composerSeed} onAttach={attachForEditor} />}
          {detail && (
            <Feed
              detail={detail}
              showDetails={showDetails}
              setDetail={setDetail}
              onReply={(name) => seedComment(`@${name.replace(/\s+/g, "")} `)}
              onAddLinks={async (urls) => {
                for (const u of urls) await attachLink(u, "");
              }}
            />
          )}
        </aside>
      </div>

      {viewer !== null && attachments[viewer] && (
        <AttachmentViewer
          card={c}
          items={attachments}
          index={viewer}
          onIndex={setViewer}
          onClose={() => setViewer(null)}
          onDelete={removeAttachment}
        />
      )}
    </AttachmentLinkContext.Provider>
  );
}

function HeaderButton({
  label,
  onClick,
  onCover,
  pressed,
  children,
}: {
  label: string;
  onClick: () => void;
  onCover: boolean;
  pressed?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={pressed}
      className={`grid h-9 w-9 place-items-center rounded-lg transition-colors ${
        onCover ? OVER_COVER : "text-neutral-600 hover:bg-neutral-900/5 hover:text-neutral-900"
      }`}
    >
      {children}
    </button>
  );
}

function highlightComment(id: string) {
  const el = document.getElementById(`comment-${id}`);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.classList.add("ring-2", "ring-[#45DFB1]", "rounded-xl");
  window.setTimeout(() => el.classList.remove("ring-2", "ring-[#45DFB1]", "rounded-xl"), 2200);
}

// "+ Add" menu: everything that can be put on a card.
function AddMenu({ hasStatus, onPick }: { hasStatus: boolean; onPick: (key: PopoverKey) => void }) {
  const rows: { key: PopoverKey; icon: typeof Tag; label: string; hint: string }[] = [
    { key: "labels", icon: Tag, label: "Labels", hint: "Organize, categorize and prioritize" },
    { key: "dates", icon: CalendarClock, label: "Dates", hint: "Start dates, due dates and reminders" },
    { key: "checklist", icon: CheckSquare, label: "Checklist", hint: "Add subtasks" },
    { key: "members", icon: Users, label: "Members", hint: "Assign people" },
    { key: "attachment", icon: Paperclip, label: "Attachment", hint: "Add links, pages, files and more" },
    { key: "cover", icon: ImageIcon, label: "Cover", hint: "A colour or picture on the card" },
  ];
  if (hasStatus) rows.splice(4, 0, { key: "status", icon: CircleDot, label: "Status", hint: "Where the work stands" });
  return (
    <ul className="flex flex-col">
      {rows.map(({ key, icon: Icon, label, hint }) => (
        <li key={key}>
          <button type="button" onClick={() => onPick(key)} className="flex w-full items-start gap-3 rounded-lg px-2.5 py-2 text-left hover:bg-[#F3F7F6]">
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#14919B]" />
            <span>
              <span className="block text-sm font-medium text-neutral-800">{label}</span>
              <span className="block text-xs text-neutral-500">{hint}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function StatusPicker({ value, onPick }: { value: CardStatus | null; onPick: (s: CardStatus | null) => void }) {
  return (
    <ul className="flex flex-col gap-0.5">
      <li>
        <button type="button" className={MENU_ITEM} onClick={() => onPick(null)}>
          <span className="h-2.5 w-2.5 rounded-full border border-neutral-300" />
          <span className="flex-1">No status</span>
          {!value && <Check className="h-4 w-4 text-[#14919B]" />}
        </button>
      </li>
      {CARD_STATUSES.map((s) => (
        <li key={s.value}>
          <button type="button" className={MENU_ITEM} onClick={() => onPick(s.value)}>
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.dot }} />
            <span className="flex-1">{s.label}</span>
            {value === s.value && <Check className="h-4 w-4 text-[#14919B]" />}
          </button>
        </li>
      ))}
    </ul>
  );
}

// --- Description ------------------------------------------------------------------------

const COLLAPSED = 320; // px of description shown before "Show more"

function DescriptionSection({
  value,
  editable,
  onSave,
  onAttach,
}: {
  value: string;
  editable: boolean;
  onSave: (v: string) => void;
  onAttach?: (file: File) => Promise<string | null>;
}) {
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [tall, setTall] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setTall(el.scrollHeight > COLLAPSED + 40));
    ro.observe(el);
    return () => ro.disconnect();
  }, [value, editing]);

  return (
    <section className="mt-8" style={body}>
      <div className="flex items-center gap-2">
        <h3 className={`${SECTION_TITLE} flex-1`} style={display}>
          <TextQuote className="h-4 w-4 text-[#14919B]" /> Description
        </h3>
        {editable && value && !editing && (
          <button type="button" onClick={() => setEditing(true)} className={SMALL}>
            Edit
          </button>
        )}
      </div>
      {editing ? (
        <MarkdownEditor
          initial={value}
          placeholder="Add a more detailed description..."
          minHeight={180}
          onAttach={onAttach}
          onCancel={() => setEditing(false)}
          onSave={(v) => {
            setEditing(false);
            if (v !== value) onSave(v);
          }}
        />
      ) : !value ? (
        editable ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="mt-2 flex min-h-[64px] w-full items-start rounded-xl bg-[#F3F7F6] px-3 py-2.5 text-left text-sm text-neutral-500 transition-colors hover:bg-[#E6EFED]"
          >
            Add a more detailed description...
          </button>
        ) : (
          <p className="mt-2 text-sm text-neutral-400">No description.</p>
        )
      ) : (
        <>
          <div
            ref={boxRef}
            className={`relative mt-2 ${tall && !expanded ? "overflow-hidden" : ""}`}
            style={tall && !expanded ? { maxHeight: COLLAPSED } : undefined}
            // Like Trello: double-click the text to edit it.
            onDoubleClick={() => editable && setEditing(true)}
          >
            <MarkdownView>{value}</MarkdownView>
            {tall && !expanded && (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent" aria-hidden="true" />
            )}
          </div>
          {tall && (
            <button
              type="button"
              onClick={() => setExpanded((x) => !x)}
              className="mt-2 flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-[#F3F7F6] text-sm text-neutral-700 hover:bg-[#E6EFED]"
            >
              <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
              {expanded ? "Show less" : "Show more"}
            </button>
          )}
        </>
      )}
    </section>
  );
}

// --- Checklists ---------------------------------------------------------------------

function ChecklistBlock({
  checklist,
  items,
  setDetail,
  touched,
}: {
  checklist: KanbanChecklist;
  items: KanbanChecklistItem[];
  setDetail: SetDetail;
  touched: () => void;
}) {
  const { editable, push } = useBoard();
  const progress = checklistProgress(items);
  const [adding, setAdding] = useState(false);
  const [hideChecked, setHideChecked] = useState(false);
  const fail = (what: string, msg: string) => push({ text: `${what}: ${msg}`, tone: "error" });
  const setItems = (fn: (all: KanbanChecklistItem[]) => KanbanChecklistItem[]) =>
    setDetail((d) => (d ? { ...d, items: fn(d.items) } : d));
  const setChecklist = (row: KanbanChecklist) =>
    setDetail((d) => (d ? { ...d, checklists: d.checklists.map((x) => (x.id === row.id ? row : x)) } : d));

  const rename = async (title: string) => {
    setChecklist({ ...checklist, title });
    const res = await updateChecklist(checklist.id, { title });
    if (res.error !== null) {
      setChecklist(checklist);
      fail("Could not rename the checklist", res.error);
    }
  };
  const remove = async () => {
    if (!window.confirm(`Delete checklist "${checklist.title}"? This cannot be undone.`)) return;
    const restore = (d: CardDetail | null) => (d ? { ...d, checklists: [...d.checklists, checklist], items: [...d.items, ...items] } : d);
    setDetail((d) =>
      d
        ? {
            ...d,
            checklists: d.checklists.filter((x) => x.id !== checklist.id),
            items: d.items.filter((i) => i.checklist_id !== checklist.id),
          }
        : d,
    );
    const res = await deleteChecklist(checklist.id);
    if (res.error !== null) {
      setDetail(restore);
      fail("Could not delete the checklist", res.error);
    } else touched();
  };
  const addItem = async (text: string) => {
    const row: KanbanChecklistItem = {
      id: crypto.randomUUID(),
      checklist_id: checklist.id,
      board_id: checklist.board_id,
      text,
      pos: positionBetween(items.at(-1)?.pos ?? null, null),
      done: false,
      due_at: null,
      assignee_id: null,
    };
    setItems((all) => [...all, row]);
    const res = await createItem(row);
    if (res.error !== null) {
      setItems((all) => all.filter((i) => i.id !== row.id));
      fail("Could not add the item", res.error);
    }
  };
  const patchItem = async (item: KanbanChecklistItem, patch: Partial<KanbanChecklistItem>) => {
    setItems((all) => all.map((i) => (i.id === item.id ? { ...i, ...patch } : i)));
    const res = await updateItem(item.id, patch);
    if (res.error !== null) {
      setItems((all) => all.map((i) => (i.id === item.id ? item : i)));
      fail("Could not update the item", res.error);
    } else if ("done" in patch) touched();
  };
  const removeItem = async (item: KanbanChecklistItem) => {
    setItems((all) => all.filter((i) => i.id !== item.id));
    const res = await deleteItem(item.id);
    if (res.error !== null) {
      setItems((all) => [...all, item]);
      fail("Could not delete the item", res.error);
    }
  };

  const doneCount = items.filter((i) => i.done).length;
  const shown = hideChecked ? items.filter((i) => !i.done) : items;

  return (
    <section className="mt-8" style={body}>
      <div className="flex flex-wrap items-center gap-2">
        <CheckSquare className="h-4 w-4 shrink-0 text-[#14919B]" />
        <InlineEdit
          value={checklist.title}
          label="Checklist title"
          disabled={!editable}
          onSave={rename}
          className="min-w-0 flex-1 whitespace-normal text-sm font-semibold tracking-[-0.01em] text-neutral-900"
          inputClassName="h-8 flex-1 text-sm font-semibold"
        />
        {doneCount > 0 && (
          <button type="button" onClick={() => setHideChecked((h) => !h)} className={SMALL}>
            {hideChecked ? `Show checked items (${doneCount})` : "Hide checked items"}
          </button>
        )}
        {editable && (
          <button type="button" onClick={remove} className={SMALL}>
            Delete
          </button>
        )}
      </div>
      <div className="mt-3 flex items-center gap-3">
        <span className="w-9 text-right text-xs tabular-nums text-neutral-500">{progress.percent}%</span>
        <div
          className="h-2 flex-1 overflow-hidden rounded-full bg-[#F3F7F6]"
          role="progressbar"
          aria-valuenow={progress.percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${checklist.title} progress`}
        >
          <motion.div
            className={`h-full rounded-full ${progress.percent === 100 ? "bg-[#45DFB1]" : "bg-[#14919B]"}`}
            initial={false}
            animate={{ width: `${progress.percent}%` }}
            transition={{ duration: 0.4, ease: EASE }}
          />
        </div>
      </div>
      {hideChecked && shown.length === 0 && items.length > 0 && (
        <p className="ml-12 mt-2 text-sm text-neutral-500">Everything in this checklist is complete.</p>
      )}
      <ul className="mt-2 flex flex-col">
        {shown.map((item) => (
          <li key={item.id} className="group flex items-start gap-3 rounded-lg px-1 py-1.5 hover:bg-[#F3F7F6]">
            <button
              type="button"
              role="checkbox"
              aria-checked={item.done}
              aria-label={item.text}
              disabled={!editable}
              onClick={() => patchItem(item, { done: !item.done })}
              className={`mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded border transition-colors ${
                item.done ? "border-[#14919B] bg-[#14919B] text-white" : "border-neutral-300 bg-white"
              }`}
            >
              {item.done && <Check className="h-3 w-3" />}
            </button>
            <InlineEdit
              value={item.text}
              label="Checklist item"
              disabled={!editable}
              onSave={(text) => patchItem(item, { text })}
              render={(v) => <InlineMarkdown>{v}</InlineMarkdown>}
              className={`flex-1 whitespace-normal text-sm [overflow-wrap:anywhere] ${item.done ? "text-neutral-400 line-through" : "text-neutral-800"}`}
              inputClassName="h-8 flex-1 text-sm"
            />
            {editable && (
              <button
                type="button"
                onClick={() => removeItem(item)}
                aria-label={`Delete ${item.text}`}
                className="grid h-6 w-6 place-items-center rounded text-neutral-400 opacity-0 transition-opacity hover:text-[#B42323] focus-visible:opacity-100 group-hover:opacity-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </li>
        ))}
      </ul>
      {editable && (
        <div className="ml-8 mt-2">
          <Composer
            open={adding}
            onOpenChange={setAdding}
            onSubmit={addItem}
            placeholder="Add an item (markdown works: **bold**, `code`, [link](https://...))"
            submitLabel="Add"
            trigger={
              <button type="button" onClick={() => setAdding(true)} className={SMALL}>
                <Plus className="h-4 w-4" /> Add an item
              </button>
            }
          />
        </div>
      )}
    </section>
  );
}

// --- Comments and activity ------------------------------------------------------------

function Feed({
  detail,
  showDetails,
  setDetail,
  onReply,
  onAddLinks,
}: {
  detail: CardDetail;
  showDetails: boolean;
  setDetail: SetDetail;
  onReply: (name: string) => void;
  onAddLinks: (urls: string[]) => Promise<void>;
}) {
  const { byId, nameOf } = usePeople();
  type Entry = { kind: "comment"; at: string; c: KanbanComment } | { kind: "activity"; at: string; a: KanbanActivity };
  const entries: Entry[] = [
    ...detail.comments.map((x) => ({ kind: "comment" as const, at: x.created_at, c: x })),
    ...(showDetails ? detail.activity.map((x) => ({ kind: "activity" as const, at: x.created_at, a: x })) : []),
  ].sort((a, b) => b.at.localeCompare(a.at));

  if (entries.length === 0) {
    return (
      <p className="mt-6 text-sm text-neutral-500" style={body}>
        No comments yet.
      </p>
    );
  }
  return (
    <ol className="mt-6 flex flex-col gap-6">
      {entries.map((e) =>
        e.kind === "comment" ? (
          <CommentItem key={`c-${e.c.id}`} comment={e.c} detail={detail} setDetail={setDetail} onReply={onReply} onAddLinks={onAddLinks} />
        ) : (
          <li key={`a-${e.a.id}`} className="flex gap-3 text-sm text-neutral-600" style={body}>
            <Avatar person={e.a.actor_id ? byId.get(e.a.actor_id) : undefined} size={28} />
            <p className="min-w-0 pt-1 leading-snug [overflow-wrap:anywhere]">
              <span className="font-medium text-neutral-900">{nameOf(e.a.actor_id)}</span> {describeActivity(e.a, nameOf)}
              <span className="mt-0.5 block text-xs text-neutral-400">{timeAgo(e.a.created_at)}</span>
            </p>
          </li>
        ),
      )}
    </ol>
  );
}

const LINK_RE = /\]\((https?:\/\/[^)\s]+)\)|(?<![(\w])(https?:\/\/[^\s)<>\]]+)/g;

function linksIn(text: string): string[] {
  const out = new Set<string>();
  for (const m of text.matchAll(LINK_RE)) out.add(m[1] ?? m[2]);
  return [...out];
}

function CommentItem({
  comment,
  detail,
  setDetail,
  onReply,
  onAddLinks,
}: {
  comment: KanbanComment;
  detail: CardDetail;
  setDetail: SetDetail;
  onReply: (name: string) => void;
  onAddLinks: (urls: string[]) => Promise<void>;
}) {
  const { data, editable, userId, push } = useBoard();
  const { byId, nameOf } = usePeople();
  const [editing, setEditing] = useState(false);
  const [picking, setPicking] = useState(false);
  const pickRef = useRef<HTMLDivElement>(null);
  useDismiss(pickRef, picking, () => setPicking(false));
  const mine = comment.author_id === userId;
  const canDelete = mine || data.role === "owner";
  const setComment = (row: KanbanComment) =>
    setDetail((d) => (d ? { ...d, comments: d.comments.map((x) => (x.id === row.id ? row : x)) } : d));

  const save = async (text: string) => {
    setEditing(false);
    if (!text || text === comment.body) return;
    setComment({ ...comment, body: text });
    const res = await updateComment(comment.id, text);
    if (res.error !== null) {
      setComment(comment);
      push({ text: `Could not save the comment: ${res.error}`, tone: "error" });
    } else setComment(res.data);
  };
  const remove = async () => {
    if (!window.confirm("Delete this comment? This cannot be undone.")) return;
    setDetail((d) => (d ? { ...d, comments: d.comments.filter((x) => x.id !== comment.id) } : d));
    const res = await deleteComment(comment.id);
    if (res.error !== null) {
      setDetail((d) => (d ? { ...d, comments: [comment, ...d.comments] } : d));
      push({ text: `Could not delete the comment: ${res.error}`, tone: "error" });
    }
  };

  // Reactions: grouped by emoji, mine highlighted; toggled optimistically.
  const reactions = detail.reactions?.filter((r) => r.comment_id === comment.id) ?? [];
  const groups = REACTION_EMOJI.concat(reactions.map((r) => r.emoji).filter((e) => !REACTION_EMOJI.includes(e)))
    .map((emoji) => ({ emoji, rows: reactions.filter((r) => r.emoji === emoji) }))
    .filter((g) => g.rows.length > 0);
  const react = async (emoji: string) => {
    if (!userId || !detail.reactions) return;
    setPicking(false);
    const on = !reactions.some((r) => r.emoji === emoji && r.user_id === userId);
    const row = { comment_id: comment.id, emoji, card_id: comment.card_id, board_id: comment.board_id, user_id: userId };
    const apply = (yes: boolean) =>
      setDetail((d) =>
        d && d.reactions
          ? {
              ...d,
              reactions: yes
                ? [...d.reactions, row]
                : d.reactions.filter((r) => !(r.comment_id === comment.id && r.user_id === userId && r.emoji === emoji)),
            }
          : d,
      );
    apply(on);
    const res = await toggleReaction(row, userId, on);
    if (res.error !== null) {
      apply(!on);
      push({ text: `Could not react: ${res.error}`, tone: "error" });
    }
  };

  // Comments brought over from Trello or another board show their original author.
  const imported = parseImportedComment(comment.body);
  const author = imported
    ? { user_id: "imported", role: "viewer" as const, starred: false, full_name: imported.author, preferred_name: "", avatar_url: null }
    : byId.get(comment.author_id);
  const authorName = imported ? imported.author : nameOf(comment.author_id);
  const text = imported ? imported.text : comment.body;
  const links = mine && editable ? linksIn(text) : [];
  const action = "hover:text-neutral-900 hover:underline";

  const permalink = async (e: React.MouseEvent) => {
    e.preventDefault();
    const url = `${window.location.origin}${window.location.pathname}#comment-${comment.id}`;
    window.history.replaceState(window.history.state, "", `#comment-${comment.id}`);
    highlightComment(comment.id);
    try {
      await navigator.clipboard.writeText(url);
      push({ text: "Link to this comment copied." });
    } catch {
      // the address bar shows the link
    }
  };

  return (
    <li className="flex min-w-0 gap-3 transition-shadow" id={`comment-${comment.id}`} style={body}>
      <Avatar person={author} size={32} />
      <div className="min-w-0 flex-1">
        <p className="text-sm">
          <span className="font-medium text-neutral-900">{authorName}</span>{" "}
          <a href={`#comment-${comment.id}`} onClick={permalink} className="text-xs text-neutral-400 hover:text-[#0B6477] hover:underline" title={formatDateTime(comment.created_at)}>
            {timeAgo(comment.created_at)}
          </a>
          <span className="text-xs text-neutral-400">
            {imported && " · imported"}
            {comment.edited_at && " (edited)"}
          </span>
        </p>
        {editing ? (
          <MarkdownEditor initial={comment.body} onSave={save} onCancel={() => setEditing(false)} large />
        ) : (
          <div className="mt-1.5 rounded-xl border border-[#0B6477]/8 bg-white px-4 py-3 shadow-[0_1px_2px_rgba(8,49,58,0.08)]">
            <MarkdownView large>{text}</MarkdownView>
          </div>
        )}
        {!editing && (
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-neutral-500">
            {groups.map((g) => {
              const minePressed = g.rows.some((r) => r.user_id === userId);
              return (
                <button
                  key={g.emoji}
                  type="button"
                  onClick={() => void react(g.emoji)}
                  aria-pressed={minePressed}
                  title={g.rows.map((r) => nameOf(r.user_id)).join(", ")}
                  className={`-mx-1 inline-flex h-6 items-center gap-1 rounded-full border px-2 text-xs ${
                    minePressed ? "border-[#14919B]/40 bg-[#14919B]/10 text-[#0B6477]" : "border-[#0B6477]/12 bg-white text-neutral-600"
                  }`}
                >
                  <span>{g.emoji}</span>
                  <span className="tabular-nums">{g.rows.length}</span>
                </button>
              );
            })}
            {detail.reactions && userId && (
              <div ref={pickRef} className="relative">
                <button type="button" onClick={() => setPicking((p) => !p)} aria-label="Add reaction" className="grid h-6 w-6 place-items-center rounded-full hover:bg-neutral-900/5 hover:text-neutral-900">
                  <SmilePlus className="h-4 w-4" />
                </button>
                {picking && (
                  <div className="absolute left-0 top-full z-30 mt-1 flex gap-0.5 rounded-xl border border-[#0B6477]/10 bg-white p-1 shadow-xl">
                    {REACTION_EMOJI.map((e) => (
                      <button key={e} type="button" onClick={() => void react(e)} className="grid h-8 w-8 place-items-center rounded-lg text-lg hover:bg-[#F3F7F6]" aria-label={`React with ${e}`}>
                        {e}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {editable && !mine && (
              <button type="button" onClick={() => onReply(authorName)} className={`inline-flex items-center gap-1 ${action}`}>
                <Reply className="h-3.5 w-3.5" /> Reply
              </button>
            )}
            {mine && editable && (
              <button type="button" onClick={() => setEditing(true)} className={action}>
                Edit
              </button>
            )}
            {links.length > 0 && (
              <button type="button" onClick={() => void onAddLinks(links)} className={action}>
                Add link{links.length > 1 ? "s" : ""} as attachment
              </button>
            )}
            {canDelete && (
              <button type="button" onClick={remove} className="hover:text-[#B42323] hover:underline">
                Delete
              </button>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

// --- Pickers ------------------------------------------------------------------------------

function LabelPicker({ cardId }: { cardId: string }) {
  const { data, toggleLabel, createLabel } = useBoard();
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [color, setColor] = useState<LabelColor>("teal");
  const [busy, setBusy] = useState(false);
  const active = new Set(data.cardLabels.filter((cl) => cl.card_id === cardId).map((cl) => cl.label_id));
  const q = query.trim().toLowerCase();
  const labels = q ? data.labels.filter((l) => l.name.toLowerCase().includes(q)) : data.labels;
  return (
    <div>
      <SearchField value={query} onChange={setQuery} placeholder="Search labels..." />
      <ul className="mt-2 flex max-h-64 flex-col gap-1.5 overflow-y-auto">
        {labels.map((l) => {
          const col = LABEL_COLORS[l.color] ?? LABEL_COLORS.slate;
          const on = active.has(l.id);
          return (
            <li key={l.id}>
              <button
                type="button"
                role="checkbox"
                aria-checked={on}
                aria-label={l.name || `${col.name} label`}
                onClick={() => toggleLabel(cardId, l.id)}
                className="flex w-full items-center gap-2"
              >
                <span
                  className={`grid h-4 w-4 shrink-0 place-items-center rounded border ${on ? "border-[#14919B] bg-[#14919B] text-white" : "border-neutral-300"}`}
                >
                  {on && <Check className="h-3 w-3" />}
                </span>
                <span className="flex h-8 flex-1 items-center rounded-md px-3 text-left text-sm font-medium" style={{ background: col.hex, color: col.ink }}>
                  {l.name}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <form
        className="mt-3 border-t border-[#0B6477]/8 pt-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const label = await createLabel(name, color);
          setBusy(false);
          if (label) {
            setName("");
            await toggleLabel(cardId, label.id);
          }
        }}
      >
        <p className="text-xs font-medium text-neutral-500">Create a label</p>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Label name (optional)"
          aria-label="New label name"
          maxLength={40}
          className={`${FIELD} mt-2 h-9`}
        />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {LABEL_COLOR_KEYS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setColor(k)}
              aria-label={LABEL_COLORS[k].name}
              aria-pressed={color === k}
              className={`h-7 w-9 rounded-md ring-offset-1 ${color === k ? "ring-2 ring-[#08313A]" : ""}`}
              style={{ background: LABEL_COLORS[k].hex }}
            />
          ))}
        </div>
        <button type="submit" disabled={busy} className={`${PRIMARY} mt-3`}>
          Create
        </button>
      </form>
    </div>
  );
}

function SearchField({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="relative block">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
      <input autoFocus value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} className={`${FIELD} h-9 pl-8`} />
    </label>
  );
}

// Card members first (with remove), then the rest of the board to add.
function MemberPicker({ cardId }: { cardId: string }) {
  const { data, userId, toggleMember } = useBoard();
  const [query, setQuery] = useState("");
  const active = new Set(data.cardMembers.filter((cm) => cm.card_id === cardId).map((cm) => cm.user_id));
  const q = query.trim().toLowerCase();
  const match = (p: KanbanPerson) => !q || personName(p).toLowerCase().includes(q) || p.full_name.toLowerCase().includes(q);
  const onCard = data.people.filter((p) => active.has(p.user_id) && match(p));
  const others = data.people.filter((p) => !active.has(p.user_id) && match(p));
  const row = (p: KanbanPerson, on: boolean) => (
    <li key={p.user_id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[#F3F7F6]">
      <button type="button" onClick={() => toggleMember(cardId, p.user_id)} className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm text-neutral-800">
        <Avatar person={p} size={26} />
        <span className="min-w-0 flex-1 truncate">
          {personName(p)}
          {p.user_id === userId && <span className="text-neutral-400"> (you)</span>}
        </span>
      </button>
      {on && (
        <button type="button" onClick={() => toggleMember(cardId, p.user_id)} aria-label={`Remove ${personName(p)} from card`} className="grid h-6 w-6 place-items-center rounded text-neutral-400 hover:text-[#B42323]">
          <X className="h-4 w-4" />
        </button>
      )}
    </li>
  );
  return (
    <div>
      <SearchField value={query} onChange={setQuery} placeholder="Search members" />
      <div className="mt-2 max-h-72 overflow-y-auto">
        {onCard.length > 0 && (
          <>
            <p className="px-2 pb-1 pt-1 text-xs font-medium text-neutral-500">Card members</p>
            <ul className="flex flex-col">{onCard.map((p) => row(p, true))}</ul>
          </>
        )}
        {others.length > 0 && (
          <>
            <p className="px-2 pb-1 pt-2 text-xs font-medium text-neutral-500">Board members</p>
            <ul className="flex flex-col">{others.map((p) => row(p, false))}</ul>
          </>
        )}
        {onCard.length + others.length === 0 && <p className="px-2 py-2 text-sm text-neutral-500">No members match.</p>}
      </div>
    </div>
  );
}

function DatesEditor({ card, onDone }: { card: KanbanCard; onDone: () => void }) {
  const { patchCard } = useBoard();
  const [start, setStart] = useState(toLocalInput(card.start_at));
  const [dueAt, setDueAt] = useState(toLocalInput(card.due_at));
  const toIso = (v: string) => (v ? new Date(v).toISOString() : null);
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        onDone();
        await patchCard(card.id, { start_at: toIso(start), due_at: toIso(dueAt) });
      }}
    >
      <label className="flex flex-col gap-1 text-xs font-medium text-neutral-500">
        Start date
        <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} className={`${FIELD} h-9`} />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-neutral-500">
        Due date
        <input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} className={`${FIELD} h-9`} />
      </label>
      <div className="flex gap-2">
        <button type="submit" className={PRIMARY}>
          Save
        </button>
        <button
          type="button"
          className={BUTTON}
          onClick={async () => {
            onDone();
            await patchCard(card.id, { start_at: null, due_at: null, due_complete: false });
          }}
        >
          Remove
        </button>
      </div>
    </form>
  );
}

function Meta({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-neutral-500">{title}</p>
      {children}
    </div>
  );
}

function TitleEditor({ value, editable, onSave }: { value: string; editable: boolean; onSave: (v: string) => void }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const commit = () => {
    const next = draft.replace(/\s+/g, " ").trim();
    if (next && next !== value) onSave(next);
    else setDraft(value);
  };
  if (!editable) {
    return (
      <h2 id="card-modal-title" className="text-2xl font-semibold leading-tight tracking-[-0.025em] text-neutral-900" style={display}>
        {value}
      </h2>
    );
  }
  return (
    <textarea
      id="card-modal-title"
      value={draft}
      rows={1}
      aria-label="Card title"
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          (e.target as HTMLTextAreaElement).blur();
        }
        if (e.key === "Escape") {
          e.preventDefault();
          setDraft(value);
          (e.target as HTMLTextAreaElement).blur();
        }
      }}
      className="field-sizing-content w-full resize-none rounded-lg bg-transparent px-1 py-0.5 text-2xl font-semibold leading-tight tracking-[-0.025em] text-neutral-900 outline-none focus:bg-white focus:ring-2 focus:ring-[#14919B]"
      style={display}
    />
  );
}

function NewChecklist({ onCreate }: { onCreate: (title: string) => void }) {
  const [title, setTitle] = useState("Checklist");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (title.trim()) onCreate(title.trim());
      }}
    >
      <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Checklist title" className={`${FIELD} h-9`} />
      <button type="submit" className={`${PRIMARY} mt-2`}>
        Add
      </button>
    </form>
  );
}

function CommentComposer({
  onSubmit,
  seed,
  onAttach,
}: {
  onSubmit: (text: string) => void;
  seed: { text: string; nonce: number } | null;
  onAttach: (file: File) => Promise<string | null>;
}) {
  const [open, setOpen] = useState(false);
  // Reply or "Comment" on an attachment opens the composer with text in it.
  useEffect(() => {
    if (seed) setOpen(true);
  }, [seed]);
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 w-full rounded-xl border border-[#0B6477]/12 bg-white px-3 py-2.5 text-left text-sm text-neutral-400 shadow-[0_1px_2px_rgba(8,49,58,0.06)] hover:border-[#14919B]/40"
        style={body}
      >
        Write a comment...
      </button>
    );
  }
  return (
    <MarkdownEditor
      initial=""
      insert={seed}
      placeholder="Write a comment... (markdown supported)"
      large
      onAttach={onAttach}
      onCancel={() => setOpen(false)}
      onSave={(v) => {
        if (!v) return;
        onSubmit(v);
        setOpen(false);
      }}
    />
  );
}
