// Board menu: a drawer on the right with the board's settings and records.
// Views: about, settings (visibility, background), labels, members, activity,
// archived items, and the owner's archive / delete actions. Writes go straight
// to Supabase and then update the board page's state through updateData.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  Archive,
  ArrowLeft,
  Globe2,
  Info,
  Loader2,
  Lock,
  LogOut,
  Palette,
  RotateCcw,
  Tag,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { body, display } from "../../lib/fonts";
import {
  BOARD_BACKGROUNDS,
  LABEL_COLORS,
  LABEL_COLOR_KEYS,
  describeActivity,
  parseImportedComment,
  personName,
  timeAgo,
  type BoardBackground,
  type KanbanActivity,
  type KanbanCard,
  type KanbanComment,
  type KanbanLabel,
  type KanbanList,
  type KanbanRole,
  type LabelColor,
} from "../../lib/kanban";
import {
  FEED_PAGE,
  addMemberByEmail,
  createLabel,
  deleteBoard,
  deleteCardForever,
  deleteLabel,
  loadArchived,
  loadBoardActivity,
  loadBoardComments,
  loadPeople,
  removeMember,
  setMemberRole,
  updateBoard,
  updateCard,
  updateLabel,
  updateList,
} from "../../lib/kanban-data";
import { EASE } from "../NoteParts";
import { useBoard } from "./board-context";
import { Avatar } from "./parts";
import MarkdownEditor, { MarkdownView } from "./MarkdownEditor";

export type BoardMenuView = "main" | "about" | "settings" | "labels" | "members" | "activity" | "archived" | "danger";
type View = BoardMenuView;

const ROW =
  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-neutral-700 transition-colors hover:bg-[#F3F7F6]";
const FIELD =
  "w-full rounded-lg border border-[#0B6477]/15 bg-white px-3 text-sm text-neutral-800 outline-none placeholder:text-neutral-400 focus:border-[#14919B] focus:ring-2 focus:ring-[#14919B]/20";
const PRIMARY =
  "inline-flex h-9 items-center gap-2 rounded-lg bg-[#45DFB1] px-3.5 text-sm font-medium text-[#0B2A22] transition-colors hover:bg-[#80ED99] disabled:opacity-50";
const SECONDARY =
  "inline-flex h-9 items-center gap-2 rounded-lg bg-[#F3F7F6] px-3 text-sm text-neutral-700 transition-colors hover:bg-[#E6EFED] disabled:opacity-50";

const TITLES: Record<View, string> = {
  main: "Menu",
  about: "About this board",
  settings: "Visibility and background",
  labels: "Labels",
  members: "Members",
  activity: "Activity",
  archived: "Archived items",
  danger: "Archive or delete board",
};

export default function BoardMenu({
  open,
  onClose,
  initialView = "main",
}: {
  open: boolean;
  onClose: () => void;
  /** View shown when the drawer opens (the Members button opens "members"). */
  initialView?: View;
}) {
  const [view, setView] = useState<View>("main");
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  // Start from the requested view each time the drawer opens (not on every
  // render: onClose is a fresh function each time the board updates).
  useEffect(() => {
    if (!open) return;
    setView(initialView);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented) {
        e.preventDefault();
        closeRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, initialView]);

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          role="dialog"
          aria-label={TITLES[view]}
          initial={{ x: 40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 40, opacity: 0 }}
          transition={{ duration: 0.3, ease: EASE }}
          className="fixed bottom-0 right-0 top-14 z-40 flex w-full flex-col border-l border-[#0B6477]/10 bg-white shadow-2xl sm:w-[380px] sm:rounded-tl-[24px]"
          style={body}
        >
          <header className="flex items-center gap-2 border-b border-[#0B6477]/8 px-4 py-3">
            {view !== "main" && (
              <button
                type="button"
                onClick={() => setView("main")}
                aria-label="Back to menu"
                className="grid h-8 w-8 place-items-center rounded-lg text-neutral-500 hover:bg-neutral-900/5"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <h2 className="flex-1 text-base font-semibold tracking-[-0.02em] text-neutral-900" style={display}>
              {TITLES[view]}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close menu"
              className="grid h-8 w-8 place-items-center rounded-lg text-neutral-500 hover:bg-neutral-900/5"
            >
              <X className="h-4 w-4" />
            </button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {view === "main" && <MainView go={setView} />}
            {view === "about" && <AboutView />}
            {view === "settings" && <SettingsView />}
            {view === "labels" && <LabelsView />}
            {view === "members" && <MembersView />}
            {view === "activity" && <ActivityView onOpenCard={onClose} />}
            {view === "archived" && <ArchivedView />}
            {view === "danger" && <DangerView />}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

function MainView({ go }: { go: (v: View) => void }) {
  const { owner, data, userId } = useBoard();
  const rows: { view: View; label: string; icon: typeof Info; hint?: string; ownerOnly?: boolean }[] = [
    { view: "about", label: "About this board", icon: Info, hint: data.board.description ? undefined : "Add a description" },
    { view: "settings", label: "Visibility and background", icon: Palette, ownerOnly: true },
    { view: "labels", label: "Labels", icon: Tag },
    { view: "members", label: "Members", icon: Users, hint: `${data.people.length}` },
    { view: "activity", label: "Activity", icon: Activity },
    { view: "archived", label: "Archived items", icon: Archive },
  ];
  const isMember = data.people.some((p) => p.user_id === userId);
  return (
    <nav className="flex flex-col gap-1">
      {rows
        .filter((r) => !r.ownerOnly || owner)
        .map(({ view, label, icon: Icon, hint }) => (
          <button key={view} type="button" onClick={() => go(view)} className={ROW}>
            <Icon className="h-4 w-4 text-[#14919B]" />
            <span className="flex-1">{label}</span>
            {hint && <span className="text-xs text-neutral-400">{hint}</span>}
          </button>
        ))}
      {(owner || isMember) && <div className="my-2 h-px bg-[#0B6477]/8" />}
      {owner ? (
        <button type="button" onClick={() => go("danger")} className={ROW}>
          <Trash2 className="h-4 w-4 text-[#B42323]" />
          <span className="flex-1">Archive or delete board</span>
        </button>
      ) : (
        isMember && <LeaveBoard />
      )}
    </nav>
  );
}

function LeaveBoard() {
  const { data, userId, push, goToBoards } = useBoard();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        if (!userId || !window.confirm(`Leave "${data.board.name}"? You will lose access unless someone adds you again.`)) return;
        setBusy(true);
        const res = await removeMember(data.board.id, userId);
        setBusy(false);
        if (res.error !== null) push({ text: `Could not leave the board: ${res.error}`, tone: "error" });
        else goToBoards();
      }}
      className={ROW}
    >
      <LogOut className="h-4 w-4 text-[#B42323]" />
      <span className="flex-1">Leave board</span>
    </button>
  );
}

// --- About -------------------------------------------------------------------------

function AboutView() {
  const { data, owner, updateData, push } = useBoard();
  const [editing, setEditing] = useState(false);

  const creator = data.people.find((p) => p.user_id === data.board.created_by);

  const save = async (text: string) => {
    const res = await updateBoard(data.board.id, { description: text });
    if (res.error !== null) {
      push({ text: `Could not save the description: ${res.error}`, tone: "error" });
      return;
    }
    updateData((d) => ({ ...d, board: { ...d.board, description: res.data.description } }));
    setEditing(false);
  };

  return (
    <div>
      <p className="text-xs font-medium text-neutral-500">Created by</p>
      <div className="mt-2 flex items-center gap-2 text-sm text-neutral-800">
        <Avatar person={creator} size={28} />
        {creator ? personName(creator) : "Former member"}
      </div>
      <p className="mt-6 text-xs font-medium text-neutral-500">Description</p>
      {editing ? (
        <MarkdownEditor
          initial={data.board.description}
          placeholder="What is this board for?"
          minHeight={160}
          onCancel={() => setEditing(false)}
          onSave={(v) => void save(v)}
        />
      ) : data.board.description ? (
        <div className="mt-2">
          <MarkdownView>{data.board.description}</MarkdownView>
        </div>
      ) : (
        <p className="mt-2 text-sm text-neutral-400">No description yet.</p>
      )}
      {owner && !editing && (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className={`${SECONDARY} mt-3`}
        >
          {data.board.description ? "Edit" : "Add a description"}
        </button>
      )}
    </div>
  );
}

// --- Settings ------------------------------------------------------------------------

function SettingsView() {
  const { data, updateData, push } = useBoard();
  const board = data.board;
  const save = async (patch: { visibility?: "private" | "team"; background?: BoardBackground }) => {
    const before = board;
    updateData((d) => ({ ...d, board: { ...d.board, ...patch } }));
    const res = await updateBoard(board.id, patch);
    if (res.error !== null) {
      updateData((d) => ({ ...d, board: before }));
      push({ text: `Could not update the board: ${res.error}`, tone: "error" });
    }
  };
  return (
    <div>
      <p className="text-xs font-medium text-neutral-500">Visibility</p>
      <div className="mt-2 flex flex-col gap-2">
        {(
          [
            { key: "private", icon: Lock, title: "Private", text: "Only members you add can see this board." },
            { key: "team", icon: Globe2, title: "Team", text: "Everyone signed in can view it. Only members can edit." },
          ] as const
        ).map(({ key, icon: Icon, title, text }) => (
          <button
            key={key}
            type="button"
            onClick={() => save({ visibility: key })}
            aria-pressed={board.visibility === key}
            className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
              board.visibility === key ? "border-[#14919B] bg-[#14919B]/5" : "border-[#0B6477]/12 hover:bg-[#F3F7F6]"
            }`}
          >
            <Icon className="mt-0.5 h-4 w-4 text-[#14919B]" />
            <span>
              <span className="block text-sm font-medium text-neutral-900">{title}</span>
              <span className="block text-xs text-neutral-500">{text}</span>
            </span>
          </button>
        ))}
      </div>
      <p className="mt-6 text-xs font-medium text-neutral-500">Background</p>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {(Object.keys(BOARD_BACKGROUNDS) as BoardBackground[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => save({ background: k })}
            aria-label={BOARD_BACKGROUNDS[k].name}
            aria-pressed={board.background === k}
            className={`h-16 rounded-xl ring-offset-2 transition-shadow ${board.background === k ? "ring-2 ring-[#14919B]" : ""}`}
            style={{ background: `linear-gradient(135deg, ${BOARD_BACKGROUNDS[k].from}, ${BOARD_BACKGROUNDS[k].to})` }}
          />
        ))}
      </div>
    </div>
  );
}

// --- Labels ---------------------------------------------------------------------------

function LabelsView() {
  const { data, editable } = useBoard();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  return (
    <div>
      <p className="text-sm text-neutral-500">Labels belong to this board and can be put on any of its cards.</p>
      <ul className="mt-4 flex flex-col gap-2">
        {data.labels.map((l) =>
          editing === l.id ? (
            <li key={l.id}>
              <LabelForm label={l} onDone={() => setEditing(null)} />
            </li>
          ) : (
            <li key={l.id} className="flex items-center gap-2">
              <span
                className="flex h-9 flex-1 items-center rounded-lg px-3 text-sm font-medium"
                style={{ background: LABEL_COLORS[l.color].hex, color: LABEL_COLORS[l.color].ink }}
              >
                {l.name}
              </span>
              <span className="w-8 text-right text-xs tabular-nums text-neutral-400" title="Cards using this label">
                {data.cardLabels.filter((cl) => cl.label_id === l.id).length}
              </span>
              {editable && (
                <button type="button" onClick={() => setEditing(l.id)} className={SECONDARY}>
                  Edit
                </button>
              )}
            </li>
          ),
        )}
      </ul>
      {editable &&
        (editing === "new" ? (
          <div className="mt-4">
            <LabelForm onDone={() => setEditing(null)} />
          </div>
        ) : (
          <button type="button" onClick={() => setEditing("new")} className={`${PRIMARY} mt-4`}>
            Create a new label
          </button>
        ))}
    </div>
  );
}

function LabelForm({ label, onDone }: { label?: KanbanLabel; onDone: () => void }) {
  const { data, updateData, push } = useBoard();
  const [name, setName] = useState(label?.name ?? "");
  const [color, setColor] = useState<LabelColor>(label?.color ?? "teal");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    const res = label ? await updateLabel(label.id, { name: name.trim(), color }) : await createLabel(data.board.id, name, color);
    setBusy(false);
    if (res.error !== null) {
      push({ text: `Could not save the label: ${res.error}`, tone: "error" });
      return;
    }
    updateData((d) => ({
      ...d,
      labels: label ? d.labels.map((x) => (x.id === label.id ? res.data : x)) : [...d.labels, res.data],
    }));
    onDone();
  };

  const remove = async () => {
    if (!label) return;
    const used = data.cardLabels.filter((cl) => cl.label_id === label.id).length;
    if (!window.confirm(`Delete this label${used ? ` from ${used} card${used === 1 ? "" : "s"}` : ""}? This cannot be undone.`)) return;
    setBusy(true);
    const res = await deleteLabel(label.id);
    setBusy(false);
    if (res.error !== null) {
      push({ text: `Could not delete the label: ${res.error}`, tone: "error" });
      return;
    }
    updateData((d) => ({
      ...d,
      labels: d.labels.filter((x) => x.id !== label.id),
      cardLabels: d.cardLabels.filter((cl) => cl.label_id !== label.id),
    }));
    onDone();
  };

  return (
    <div className="rounded-xl border border-[#0B6477]/12 p-3">
      <span
        className="flex h-9 items-center rounded-lg px-3 text-sm font-medium"
        style={{ background: LABEL_COLORS[color].hex, color: LABEL_COLORS[color].ink }}
      >
        {name || LABEL_COLORS[color].name}
      </span>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") void save();
          if (e.key === "Escape") {
            e.preventDefault();
            onDone();
          }
        }}
        placeholder="Label name (optional)"
        aria-label="Label name"
        maxLength={40}
        className={`${FIELD} mt-3 h-9`}
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
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={save} disabled={busy} className={PRIMARY}>
          {label ? "Save" : "Create"}
        </button>
        <button type="button" onClick={onDone} className={SECONDARY}>
          Cancel
        </button>
        {label && (
          <button type="button" onClick={remove} disabled={busy} className={`${SECONDARY} ml-auto text-[#B42323]`}>
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

// --- Members ---------------------------------------------------------------------------

function MembersView() {
  const { data, owner, userId, updateData, push } = useBoard();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<KanbanRole>("member");
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    const res = await loadPeople(data.board.id);
    if (res.error === null) updateData((d) => ({ ...d, people: res.data }));
  };
  const fail = (what: string, msg: string) => push({ text: `${what}: ${msg}`, tone: "error" });

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    const res = await addMemberByEmail(data.board.id, email.trim(), role);
    setBusy(false);
    if (res.error !== null) return fail("Could not add the member", res.error);
    setEmail("");
    push({ text: "Member added." });
    await refresh();
  };

  return (
    <div>
      <ul className="flex flex-col gap-1">
        {data.people.map((p) => (
          <li key={p.user_id} className="flex items-center gap-3 rounded-xl px-2 py-2">
            <Avatar person={p} size={32} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm text-neutral-900">
                {personName(p)}
                {p.user_id === userId && <span className="text-neutral-400"> (you)</span>}
              </span>
              {!owner && <span className="block text-xs capitalize text-neutral-500">{p.role}</span>}
            </span>
            {owner && (
              <>
                <select
                  value={p.role}
                  aria-label={`Role of ${personName(p)}`}
                  onChange={async (e) => {
                    const res = await setMemberRole(data.board.id, p.user_id, e.target.value as KanbanRole);
                    if (res.error !== null) fail("Could not change the role", res.error);
                    await refresh();
                  }}
                  className="h-8 rounded-lg border border-[#0B6477]/15 bg-white px-1.5 text-xs outline-none focus:border-[#14919B]"
                >
                  <option value="owner">Owner</option>
                  <option value="member">Member</option>
                  <option value="viewer">Viewer</option>
                </select>
                {p.user_id !== userId && (
                  <button
                    type="button"
                    aria-label={`Remove ${personName(p)}`}
                    onClick={async () => {
                      if (!window.confirm(`Remove ${personName(p)} from this board?`)) return;
                      const res = await removeMember(data.board.id, p.user_id);
                      if (res.error !== null) fail("Could not remove the member", res.error);
                      await refresh();
                    }}
                    className="grid h-8 w-8 place-items-center rounded-lg text-neutral-400 hover:bg-neutral-900/5 hover:text-[#B42323]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </>
            )}
          </li>
        ))}
      </ul>
      {owner && (
        <form onSubmit={add} className="mt-5 rounded-xl border border-[#0B6477]/12 p-3">
          <p className="text-sm font-medium text-neutral-900">Add a member</p>
          <p className="mt-0.5 text-xs text-neutral-500">They need a smartagri account first.</p>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@ugm.ac.id"
            aria-label="Member email"
            className={`${FIELD} mt-3 h-9`}
          />
          <div className="mt-2 flex gap-2">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as KanbanRole)}
              aria-label="Role"
              className="h-9 rounded-lg border border-[#0B6477]/15 bg-white px-2 text-sm outline-none focus:border-[#14919B]"
            >
              <option value="member">Member</option>
              <option value="viewer">Viewer</option>
              <option value="owner">Owner</option>
            </select>
            <button type="submit" disabled={busy || !email.trim()} className={PRIMARY}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Add
            </button>
          </div>
        </form>
      )}
      <dl className="mt-5 grid gap-1 text-xs text-neutral-500">
        <div>
          <dt className="inline font-medium text-neutral-700">Owner</dt> manages members, settings and can delete the board.
        </div>
        <div>
          <dt className="inline font-medium text-neutral-700">Member</dt> edits lists, cards and comments.
        </div>
        <div>
          <dt className="inline font-medium text-neutral-700">Viewer</dt> can only look.
        </div>
      </dl>
    </div>
  );
}

// --- Activity ----------------------------------------------------------------------------

type FeedItem = { kind: "activity"; row: KanbanActivity } | { kind: "comment"; row: KanbanComment };

function ActivityView({ onOpenCard }: { onOpenCard: () => void }) {
  const { data, push } = useBoard();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"all" | "comments">("all");
  const [items, setItems] = useState<FeedItem[]>([]);
  const [more, setMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const offset = useRef(0);

  const nameOf = (id: string | null) => {
    const p = id ? data.people.find((x) => x.user_id === id) : undefined;
    return p ? personName(p) : "Former member";
  };
  const cardById = new Map(data.cards.map((c) => [c.id, c]));

  const load = async (reset: boolean) => {
    if (reset) offset.current = 0;
    setLoading(true);
    const res =
      tab === "all"
        ? await loadBoardActivity(data.board.id, offset.current)
        : await loadBoardComments(data.board.id, offset.current);
    setLoading(false);
    if (res.error !== null) {
      push({ text: `Could not load the activity: ${res.error}`, tone: "error" });
      return;
    }
    const rows: FeedItem[] =
      tab === "all"
        ? (res.data as KanbanActivity[]).map((row) => ({ kind: "activity", row }))
        : (res.data as KanbanComment[]).map((row) => ({ kind: "comment", row }));
    offset.current += rows.length;
    setMore(rows.length === FEED_PAGE);
    setItems((prev) => (reset ? rows : [...prev, ...rows]));
  };

  useEffect(() => {
    void load(true);
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const open = (card: KanbanCard | undefined) => {
    if (!card) return;
    onOpenCard();
    navigate({ to: "/kanban/$board/c/$card", params: { board: data.board.slug, card: String(card.number) } });
  };

  return (
    <div>
      <div role="tablist" className="flex gap-1 rounded-lg bg-[#F3F7F6] p-1">
        {(["all", "comments"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`h-8 flex-1 rounded-md text-sm transition-colors ${tab === t ? "bg-white font-medium text-neutral-900 shadow-sm" : "text-neutral-600"}`}
          >
            {t === "all" ? "All" : "Comments"}
          </button>
        ))}
      </div>
      <ol className="mt-4 flex flex-col gap-4">
        {items.map((item) => {
          const actor = item.kind === "activity" ? item.row.actor_id : item.row.author_id;
          const card = item.row.card_id ? cardById.get(item.row.card_id) : undefined;
          // Comments brought over from Trello show their original author.
          const imported = item.kind === "comment" ? parseImportedComment(item.row.body) : null;
          const person = imported
            ? { user_id: "trello", role: "viewer" as const, starred: false, full_name: imported.author, preferred_name: "", avatar_url: null }
            : actor
              ? data.people.find((p) => p.user_id === actor)
              : undefined;
          return (
            <li key={`${item.kind}-${item.row.id}`} className="flex min-w-0 gap-3 text-sm text-neutral-600">
              <Avatar person={person} size={28} />
              <div className="min-w-0 flex-1 leading-snug [overflow-wrap:anywhere]">
                <span className="font-medium text-neutral-900">{imported ? imported.author : nameOf(actor)}</span>{" "}
                {item.kind === "activity" ? describeActivity(item.row, nameOf) : "commented"}
                {card && (
                  <>
                    {" on "}
                    <button type="button" onClick={() => open(card)} className="font-medium text-[#0B6477] hover:underline">
                      {card.title}
                    </button>
                  </>
                )}
                {item.kind === "comment" && (
                  <div className="mt-1 rounded-xl border border-[#0B6477]/8 px-3 py-2">
                    <MarkdownView>{imported ? imported.text : item.row.body}</MarkdownView>
                  </div>
                )}
                <span className="mt-0.5 block text-xs text-neutral-400">{timeAgo(item.row.created_at)}</span>
              </div>
            </li>
          );
        })}
      </ol>
      {loading ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-neutral-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading...
        </p>
      ) : items.length === 0 ? (
        <p className="mt-4 text-sm text-neutral-500">Nothing here yet.</p>
      ) : (
        more && (
          <button type="button" onClick={() => load(false)} className={`${SECONDARY} mt-4 w-full justify-center`}>
            Load more
          </button>
        )
      )}
    </div>
  );
}

// --- Archived items -------------------------------------------------------------------------

function ArchivedView() {
  const { data, editable, updateData, push } = useBoard();
  const [tab, setTab] = useState<"cards" | "lists">("cards");
  const [archived, setArchived] = useState<{ cards: KanbanCard[]; lists: KanbanList[] } | null>(null);

  useEffect(() => {
    let active = true;
    loadArchived(data.board.id).then((res) => {
      if (!active) return;
      if (res.error !== null) push({ text: `Could not load archived items: ${res.error}`, tone: "error" });
      else setArchived(res.data);
    });
    return () => {
      active = false;
    };
  }, [data.board.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const listName = (id: string) => [...data.lists, ...(archived?.lists ?? [])].find((l) => l.id === id)?.name ?? "a list";

  const restoreCard = async (card: KanbanCard) => {
    const res = await updateCard(card.id, { archived_at: null });
    if (res.error !== null) return push({ text: `Could not restore the card: ${res.error}`, tone: "error" });
    setArchived((a) => (a ? { ...a, cards: a.cards.filter((c) => c.id !== card.id) } : a));
    updateData((d) => ({ ...d, cards: [...d.cards, res.data] }));
    push({ text: `Restored "${card.title}".` });
  };
  const deleteCard = async (card: KanbanCard) => {
    if (!window.confirm(`Delete "${card.title}" permanently? Its checklists, comments and attachments go with it.`)) return;
    const res = await deleteCardForever(card.id, card.board_id);
    if (res.error !== null) return push({ text: `Could not delete the card: ${res.error}`, tone: "error" });
    setArchived((a) => (a ? { ...a, cards: a.cards.filter((c) => c.id !== card.id) } : a));
  };
  const restoreList = async (list: KanbanList) => {
    const res = await updateList(list.id, { archived_at: null });
    if (res.error !== null) return push({ text: `Could not restore the list: ${res.error}`, tone: "error" });
    setArchived((a) => (a ? { ...a, lists: a.lists.filter((l) => l.id !== list.id) } : a));
    updateData((d) => ({ ...d, lists: [...d.lists, res.data] }));
    push({ text: `Restored list "${list.name}".` });
  };

  const rows = tab === "cards" ? archived?.cards : archived?.lists;
  return (
    <div>
      <div role="tablist" className="flex gap-1 rounded-lg bg-[#F3F7F6] p-1">
        {(["cards", "lists"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`h-8 flex-1 rounded-md text-sm transition-colors ${tab === t ? "bg-white font-medium text-neutral-900 shadow-sm" : "text-neutral-600"}`}
          >
            {t === "cards" ? "Cards" : "Lists"} {archived && <span className="text-neutral-400">{archived[t].length}</span>}
          </button>
        ))}
      </div>
      {!archived ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-neutral-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading...
        </p>
      ) : rows && rows.length === 0 ? (
        <p className="mt-4 text-sm text-neutral-500">No archived {tab}.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {tab === "cards"
            ? archived.cards.map((card) => (
                <li key={card.id} className="rounded-xl border border-[#0B6477]/10 p-3">
                  <p className="text-sm text-neutral-900">{card.title}</p>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    In {listName(card.list_id)} · archived {card.archived_at ? timeAgo(card.archived_at) : ""}
                  </p>
                  {editable && (
                    <div className="mt-2 flex gap-2">
                      <button type="button" onClick={() => restoreCard(card)} className={SECONDARY}>
                        <RotateCcw className="h-3.5 w-3.5" /> Restore
                      </button>
                      <button type="button" onClick={() => deleteCard(card)} className={`${SECONDARY} text-[#B42323]`}>
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    </div>
                  )}
                </li>
              ))
            : archived.lists.map((list) => (
                <li key={list.id} className="flex items-center gap-3 rounded-xl border border-[#0B6477]/10 p-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-neutral-900">{list.name}</span>
                    <span className="block text-xs text-neutral-500">
                      {data.cards.filter((c) => c.list_id === list.id).length} cards inside
                    </span>
                  </span>
                  {editable && (
                    <button type="button" onClick={() => restoreList(list)} className={SECONDARY}>
                      <RotateCcw className="h-3.5 w-3.5" /> Restore
                    </button>
                  )}
                </li>
              ))}
        </ul>
      )}
    </div>
  );
}

// --- Archive / delete board (owner) ------------------------------------------------------------

function DangerView() {
  const { data, push, goToBoards } = useBoard();
  const [confirmName, setConfirmName] = useState("");
  const [busy, setBusy] = useState(false);

  const archive = async () => {
    if (!window.confirm(`Archive "${data.board.name}"? It moves to Archived boards on the Kanban page, where you can reopen it.`)) return;
    setBusy(true);
    const res = await updateBoard(data.board.id, { archived_at: new Date().toISOString() });
    setBusy(false);
    if (res.error !== null) return push({ text: `Could not archive the board: ${res.error}`, tone: "error" });
    goToBoards();
  };
  const remove = async () => {
    setBusy(true);
    const res = await deleteBoard(data.board.id);
    setBusy(false);
    if (res.error !== null) return push({ text: `Could not delete the board: ${res.error}`, tone: "error" });
    goToBoards();
  };

  return (
    <div className="flex flex-col gap-6">
      <Section title="Archive board" text="Hides the board from the Kanban page. Nothing is deleted and you can reopen it later.">
        <button type="button" onClick={archive} disabled={busy} className={SECONDARY}>
          <Archive className="h-4 w-4" /> Archive board
        </button>
      </Section>
      <Section
        title="Delete board"
        text="Permanently deletes the board with all lists, cards, comments, checklists and activity. This cannot be undone."
      >
        <label className="block text-xs text-neutral-500">
          Type the board name to confirm
          <input
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            placeholder={data.board.name}
            className={`${FIELD} mt-1.5 h-9`}
          />
        </label>
        <button
          type="button"
          onClick={remove}
          disabled={busy || confirmName.trim() !== data.board.name}
          className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg bg-[#B42323] px-3.5 text-sm font-medium text-white transition-colors hover:bg-[#9B1C1C] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Trash2 className="h-4 w-4" /> Delete board permanently
        </button>
      </Section>
    </div>
  );
}

function Section({ title, text, children }: { title: string; text: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-[#0B6477]/12 p-4">
      <h3 className="text-sm font-semibold text-neutral-900" style={display}>
        {title}
      </h3>
      <p className="mt-1 text-xs leading-relaxed text-neutral-500">{text}</p>
      <div className="mt-3">{children}</div>
    </section>
  );
}
