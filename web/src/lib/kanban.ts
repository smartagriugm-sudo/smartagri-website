// Types and pure helpers for the team Kanban boards (/kanban). Data lives in
// Supabase (see web/supabase/kanban.sql); behaviour notes and the design are in
// docs/kanban/. Every row type mirrors its table one to one.

export type KanbanRole = "owner" | "member" | "viewer";
export type BoardVisibility = "private" | "team";

export type LabelColor =
  | "teal"
  | "cyan"
  | "mint"
  | "green"
  | "lime"
  | "amber"
  | "orange"
  | "red"
  | "violet"
  | "slate";

export type BoardBackground = "teal" | "deep" | "cyan" | "mint" | "slate";

export type KanbanBoard = {
  id: string;
  slug: string;
  name: string;
  description: string;
  background: BoardBackground;
  visibility: BoardVisibility;
  card_seq: number;
  created_by: string;
  created_at: string;
  archived_at: string | null;
};

export type KanbanBoardMember = {
  board_id: string;
  user_id: string;
  role: KanbanRole;
  starred: boolean;
  added_at: string;
};

// Row of the kanban_board_people(board) RPC: a member joined with profiles.
export type KanbanPerson = {
  user_id: string;
  role: KanbanRole;
  starred: boolean;
  full_name: string;
  preferred_name: string;
  avatar_url: string | null;
};

export type KanbanList = {
  id: string;
  board_id: string;
  name: string;
  pos: number;
  created_at: string;
  archived_at: string | null;
};

export type KanbanLabel = {
  id: string;
  board_id: string;
  name: string; // may be empty: colour-only label
  color: LabelColor;
};

export type KanbanCard = {
  id: string;
  board_id: string;
  list_id: string;
  number: number; // per-board sequence, used in the card URL
  title: string;
  description: string; // markdown
  pos: number;
  start_at: string | null;
  due_at: string | null;
  due_complete: boolean;
  cover_attachment_id: string | null;
  cover_color: LabelColor | null;
  /** Present once supabase/kanban-card-extras.sql is installed. */
  status?: CardStatus | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

export type CardStatus = "todo" | "in_progress" | "review" | "blocked" | "done";

// Card status field (kanban-card-extras.sql), shown under the title.
export const CARD_STATUSES: { value: CardStatus; label: string; dot: string; bg: string; ink: string }[] = [
  { value: "todo", label: "To do", dot: "#5B6B78", bg: "#EEF2F4", ink: "#33414B" },
  { value: "in_progress", label: "In progress", dot: "#14919B", bg: "#14919B1F", ink: "#0B6477" },
  { value: "review", label: "In review", dot: "#7C6BD6", bg: "#7C6BD61F", ink: "#4B3DA6" },
  { value: "blocked", label: "Blocked", dot: "#E25555", bg: "#E255551A", ink: "#B42323" },
  { value: "done", label: "Done", dot: "#3E9B5B", bg: "#45DFB140", ink: "#0B5E47" },
];

export function statusInfo(value: string | null | undefined) {
  return CARD_STATUSES.find((s) => s.value === value) ?? null;
}

export type KanbanReaction = { comment_id: string; user_id: string; emoji: string; card_id: string; board_id: string };

// Quick reactions offered on comments.
export const REACTION_EMOJI = ["👍", "🎉", "❤️", "👀", "🙏", "✅"];

export type KanbanCardLabel = { card_id: string; label_id: string; board_id: string };
export type KanbanCardMember = { card_id: string; user_id: string; board_id: string };

export type KanbanChecklist = {
  id: string;
  card_id: string;
  board_id: string;
  title: string;
  pos: number;
};

export type KanbanChecklistItem = {
  id: string;
  checklist_id: string;
  board_id: string;
  text: string;
  pos: number;
  done: boolean;
  due_at: string | null;
  assignee_id: string | null;
};

export type KanbanComment = {
  id: string;
  card_id: string;
  board_id: string;
  author_id: string;
  body: string; // markdown
  created_at: string;
  edited_at: string | null;
};

export type KanbanAttachment = {
  id: string;
  card_id: string;
  board_id: string;
  name: string;
  storage_path: string | null; // object in the 'kanban' bucket; null for a link
  url: string | null;
  mime_type: string | null;
  bytes: number | null;
  uploaded_by: string | null;
  created_at: string;
};

// Written only by database triggers; `data` keeps names and previous values
// as they were when the event happened.
export type KanbanActivityType =
  | "card.created"
  | "card.deleted"
  | "card.moved"
  | "card.archived"
  | "card.restored"
  | "card.renamed"
  | "card.status_changed"
  | "card.description_changed"
  | "card.dates_changed"
  | "card.completed"
  | "card.reopened"
  | "list.created"
  | "list.renamed"
  | "list.archived"
  | "list.restored"
  | "label.added"
  | "label.removed"
  | "member.added"
  | "member.removed"
  | "checklist.added"
  | "checklist.removed"
  | "item.completed"
  | "item.reopened"
  | "attachment.added"
  | "attachment.removed";

export type KanbanActivity = {
  id: number;
  board_id: string;
  card_id: string | null;
  actor_id: string | null;
  type: KanbanActivityType;
  data: Record<string, unknown>;
  created_at: string;
};

export const STORAGE_BUCKET = "kanban";

// Label palette, built around the brand teals. `ink` is the text colour that
// reads on top of the swatch.
export const LABEL_COLORS: Record<LabelColor, { name: string; hex: string; ink: string }> = {
  teal: { name: "Teal", hex: "#0B6477", ink: "#FFFFFF" },
  cyan: { name: "Cyan", hex: "#0AD1C8", ink: "#08313A" },
  mint: { name: "Mint", hex: "#45DFB1", ink: "#0B2A22" },
  green: { name: "Green", hex: "#3E9B5B", ink: "#FFFFFF" },
  lime: { name: "Lime", hex: "#80ED99", ink: "#0B2A22" },
  amber: { name: "Amber", hex: "#F2B84B", ink: "#3A2A05" },
  orange: { name: "Orange", hex: "#EE8A4A", ink: "#3A1A05" },
  red: { name: "Red", hex: "#E25555", ink: "#FFFFFF" },
  violet: { name: "Violet", hex: "#7C6BD6", ink: "#FFFFFF" },
  slate: { name: "Slate", hex: "#5B6B78", ink: "#FFFFFF" },
};

export const LABEL_COLOR_KEYS = Object.keys(LABEL_COLORS) as LabelColor[];

export const BOARD_BACKGROUNDS: Record<BoardBackground, { name: string; from: string; to: string }> = {
  teal: { name: "Teal", from: "#0B6477", to: "#14919B" },
  deep: { name: "Deep", from: "#08313A", to: "#0B6477" },
  cyan: { name: "Cyan", from: "#14919B", to: "#0AD1C8" },
  mint: { name: "Mint", from: "#45DFB1", to: "#80ED99" },
  slate: { name: "Slate", from: "#33414B", to: "#5B6B78" },
};

// --- Roles -------------------------------------------------------------------

export function canEdit(role: KanbanRole | null | undefined): boolean {
  return role === "owner" || role === "member";
}

export function isOwner(role: KanbanRole | null | undefined): boolean {
  return role === "owner";
}

// --- Fractional positions --------------------------------------------------------
// Lists and cards are ordered by a float `pos`; a move rewrites only the moved
// row. New items go POS_GAP below the last one, inserts take the midpoint of
// their neighbours, and a list is renumbered (kanban_rebalance_list) once two
// neighbours get closer than MIN_POS_GAP.

export const POS_GAP = 1024;
export const MIN_POS_GAP = 1e-6;

export function byPos<T extends { pos: number }>(a: T, b: T): number {
  return a.pos - b.pos;
}

// Position for an item placed between `before` and `after` (either may be
// missing: top of the list, bottom of the list, or an empty list).
export function positionBetween(before: number | null, after: number | null): number {
  if (before === null && after === null) return POS_GAP;
  if (before === null) return (after as number) / 2;
  if (after === null) return before + POS_GAP;
  return (before + after) / 2;
}

// Position for moving an item to `index` among `siblings` (sorted by pos, not
// including the moved item). `rebalance` is true when the new value is too
// close to a neighbour and the list should be renumbered afterwards.
export function positionAt(
  siblings: { pos: number }[],
  index: number,
): { pos: number; rebalance: boolean } {
  const i = Math.max(0, Math.min(index, siblings.length));
  const before = i > 0 ? siblings[i - 1].pos : null;
  const after = i < siblings.length ? siblings[i].pos : null;
  const pos = positionBetween(before, after);
  const gap = Math.min(
    before === null ? Infinity : pos - before,
    after === null ? Infinity : after - pos,
  );
  return { pos, rebalance: gap < MIN_POS_GAP };
}

// --- Display helpers --------------------------------------------------------------

export function boardPath(slug: string): string {
  return `/kanban/${slug}`;
}

export function cardPath(slug: string, number: number): string {
  return `/kanban/${slug}/c/${number}`;
}

export function checklistProgress(items: Pick<KanbanChecklistItem, "done">[]): {
  done: number;
  total: number;
  percent: number;
} {
  const total = items.length;
  const done = items.filter((i) => i.done).length;
  return { done, total, percent: total === 0 ? 0 : Math.round((done / total) * 100) };
}

export type DueState = "complete" | "overdue" | "soon" | "later";

// Badge state for a due date; "soon" means within the next 24 hours.
export function dueState(
  card: Pick<KanbanCard, "due_at" | "due_complete">,
  now: Date = new Date(),
): DueState | null {
  if (!card.due_at) return null;
  if (card.due_complete) return "complete";
  const ms = new Date(card.due_at).getTime() - now.getTime();
  if (ms < 0) return "overdue";
  if (ms <= 24 * 60 * 60 * 1000) return "soon";
  return "later";
}

export function personName(p: Pick<KanbanPerson, "preferred_name" | "full_name"> | undefined): string {
  if (!p) return "Unknown member";
  return p.preferred_name || p.full_name || "Unnamed member";
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

// --- Activity -----------------------------------------------------------------------

function str(data: Record<string, unknown>, key: string): string {
  const v = data[key];
  return typeof v === "string" ? v : "";
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

// One line describing an activity row, written to follow the actor's name
// ("Athala moved this card from To do to Done").
export function describeActivity(
  a: Pick<KanbanActivity, "type" | "data">,
  nameOf: (userId: string) => string = () => "a member",
): string {
  const d = a.data ?? {};
  const label = str(d, "label") || (str(d, "color") ? `${str(d, "color")} label` : "a label");
  switch (a.type) {
    case "card.created":
      return str(d, "list") ? `added this card to ${str(d, "list")}` : "added this card";
    case "card.deleted":
      return `deleted card ${str(d, "title")}`.trim();
    case "card.moved":
      return d.from_board
        ? `moved this card from another board to ${str(d, "to_list")}`
        : `moved this card from ${str(d, "from_list")} to ${str(d, "to_list")}`;
    case "card.archived":
      return "archived this card";
    case "card.restored":
      return "restored this card";
    case "card.renamed":
      return `renamed this card (was "${str(d, "old_title")}")`;
    case "card.description_changed":
      return "changed the description";
    case "card.dates_changed":
      if (str(d, "due_at")) return `set the due date to ${shortDate(str(d, "due_at"))}`;
      if (str(d, "start_at")) return `set the start date to ${shortDate(str(d, "start_at"))}`;
      return "removed the dates";
    case "card.completed":
      return "marked this card complete";
    case "card.reopened":
      return "marked this card incomplete";
    case "card.status_changed":
      return str(d, "status")
        ? `set the status to ${statusInfo(str(d, "status"))?.label ?? str(d, "status")}`
        : "cleared the status";
    case "list.created":
      return `added list ${str(d, "list")}`;
    case "list.renamed":
      return `renamed list ${str(d, "old_list")} to ${str(d, "list")}`;
    case "list.archived":
      return `archived list ${str(d, "list")}`;
    case "list.restored":
      return `restored list ${str(d, "list")}`;
    case "label.added":
      return `added ${label}`;
    case "label.removed":
      return `removed ${label}`;
    case "member.added":
      return `added ${nameOf(str(d, "user_id"))} to this card`;
    case "member.removed":
      return `removed ${nameOf(str(d, "user_id"))} from this card`;
    case "checklist.added":
      return `added checklist ${str(d, "checklist")}`;
    case "checklist.removed":
      return `removed checklist ${str(d, "checklist")}`;
    case "item.completed":
      return `completed ${str(d, "item")}`;
    case "item.reopened":
      return `marked ${str(d, "item")} incomplete`;
    case "attachment.added":
      return `attached ${str(d, "attachment")}`;
    case "attachment.removed":
      return `removed attachment ${str(d, "attachment")}`;
    default:
      return "updated this card";
  }
}

// "just now", "5 minutes ago", "3 hours ago", then a date.
export function timeAgo(iso: string, now: Date = new Date()): string {
  const s = Math.round((now.getTime() - new Date(iso).getTime()) / 1000);
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} minute${m === 1 ? "" : "s"} ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const days = Math.round(h / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return shortDate(iso);
}

// --- Filters -------------------------------------------------------------------------
// Board filters live in the URL (?q=&labels=&members=&due=&status=&activity=&mode=)
// so a filtered view can be shared and survives a reload. The keyword always
// has to match; the other criteria combine as "any" (default) or "all".

export type DueFilter = "none" | "overdue" | "day" | "week" | "month";
export type ActivityFilter = "1w" | "2w" | "4w" | "stale";

export type CardFilter = {
  q: string;
  members: string[]; // user ids, plus "none" and "me"
  labels: string[]; // label ids, plus "none"
  due: DueFilter[];
  status: "" | "complete" | "incomplete";
  activity: "" | ActivityFilter;
  mode: "any" | "all";
};

export const EMPTY_FILTER: CardFilter = {
  q: "",
  members: [],
  labels: [],
  due: [],
  status: "",
  activity: "",
  mode: "any",
};

export type FilterSearch = Partial<Record<"q" | "members" | "labels" | "due" | "status" | "activity" | "mode", string>>;

const DUE_VALUES: DueFilter[] = ["none", "overdue", "day", "week", "month"];
const ACTIVITY_VALUES: ActivityFilter[] = ["1w", "2w", "4w", "stale"];

function csv(v: unknown): string[] {
  return typeof v === "string" && v ? v.split(",").filter(Boolean) : [];
}

export function parseFilter(search: Record<string, unknown>): CardFilter {
  const status = search.status === "complete" || search.status === "incomplete" ? search.status : "";
  const activity = ACTIVITY_VALUES.includes(search.activity as ActivityFilter) ? (search.activity as ActivityFilter) : "";
  return {
    q: typeof search.q === "string" ? search.q : "",
    members: csv(search.members),
    labels: csv(search.labels),
    due: csv(search.due).filter((d): d is DueFilter => DUE_VALUES.includes(d as DueFilter)),
    status,
    activity,
    mode: search.mode === "all" ? "all" : "any",
  };
}

// Only non-empty keys, so a cleared filter leaves a clean URL.
export function filterToSearch(f: CardFilter): FilterSearch {
  const out: FilterSearch = {};
  if (f.q.trim()) out.q = f.q;
  if (f.members.length) out.members = f.members.join(",");
  if (f.labels.length) out.labels = f.labels.join(",");
  if (f.due.length) out.due = f.due.join(",");
  if (f.status) out.status = f.status;
  if (f.activity) out.activity = f.activity;
  if (f.mode === "all") out.mode = "all";
  return out;
}

export function filterCount(f: CardFilter): number {
  return (
    (f.q.trim() ? 1 : 0) + f.members.length + f.labels.length + f.due.length + (f.status ? 1 : 0) + (f.activity ? 1 : 0)
  );
}

export type FilterContext = {
  labelIds: (cardId: string) => string[];
  memberIds: (cardId: string) => string[];
  labelName: (labelId: string) => string;
  personName: (userId: string) => string;
  me: string | null;
  now?: Date;
};

const DAY = 24 * 60 * 60 * 1000;
const ACTIVITY_DAYS: Record<Exclude<ActivityFilter, "stale">, number> = { "1w": 7, "2w": 14, "4w": 28 };

// Ids of the cards that pass the filter.
export function filterCards(
  cards: Pick<KanbanCard, "id" | "title" | "description" | "due_at" | "due_complete" | "updated_at">[],
  f: CardFilter,
  ctx: FilterContext,
): Set<string> {
  const now = (ctx.now ?? new Date()).getTime();
  const q = f.q.trim().toLowerCase();

  return new Set(
    cards
      .filter((card) => {
        const labels = ctx.labelIds(card.id);
        const members = ctx.memberIds(card.id);
        if (q) {
          const hay = [card.title, card.description, ...labels.map(ctx.labelName), ...members.map(ctx.personName)]
            .join(" ")
            .toLowerCase();
          if (!hay.includes(q)) return false;
        }

        const due = card.due_at ? new Date(card.due_at).getTime() - now : null;
        const age = now - new Date(card.updated_at).getTime();
        const checks: boolean[] = [
          ...f.members.map((m) =>
            m === "none" ? members.length === 0 : m === "me" ? !!ctx.me && members.includes(ctx.me) : members.includes(m),
          ),
          ...f.labels.map((l) => (l === "none" ? labels.length === 0 : labels.includes(l))),
          ...f.due.map((d) => {
            if (d === "none") return due === null;
            if (due === null || card.due_complete) return false;
            if (d === "overdue") return due < 0;
            const span = d === "day" ? DAY : d === "week" ? 7 * DAY : 30 * DAY;
            return due >= 0 && due <= span;
          }),
          ...(f.status ? [f.status === "complete" ? card.due_complete : !card.due_complete] : []),
          ...(f.activity ? [f.activity === "stale" ? age > 28 * DAY : age <= ACTIVITY_DAYS[f.activity] * DAY] : []),
        ];
        if (checks.length === 0) return true;
        return f.mode === "all" ? checks.every(Boolean) : checks.some(Boolean);
      })
      .map((c) => c.id),
  );
}

// --- Imported comments -------------------------------------------------------------
// scripts/import-trello.mjs posts Trello comments as the importer, opening
// each with "_From Trello, by **Name** on YYYY-MM-DD:_". The UI shows that
// name as the author and the rest as the body.

const IMPORTED = /^_From (?:Trello|the original board), by \*\*(.+?)\*\*(?: on (\d{4}-\d{2}-\d{2}))?:_\s*\n+/;

export function parseImportedComment(body: string): { author: string; date: string | null; text: string } | null {
  const m = IMPORTED.exec(body);
  if (!m) return null;
  return { author: m[1], date: m[2] ?? null, text: body.slice(m[0].length) };
}
