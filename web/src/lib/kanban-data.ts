// Supabase reads and writes for the Kanban pages. Every call goes through the
// browser client with the signed-in user's session, so RLS (web/supabase/
// kanban.sql) decides what each role may see or change. Writes that RLS
// silently filters out (zero rows) are reported as errors so the UI can roll
// back its optimistic update.
import { supabase } from "./auth/supabase";
import type {
  BoardBackground,
  BoardVisibility,
  KanbanActivity,
  KanbanAttachment,
  KanbanBoard,
  KanbanCard,
  KanbanCardLabel,
  KanbanCardMember,
  KanbanChecklist,
  KanbanChecklistItem,
  KanbanComment,
  KanbanLabel,
  KanbanList,
  KanbanPerson,
  KanbanReaction,
  KanbanRole,
  LabelColor,
} from "./kanban";
import { STORAGE_BUCKET } from "./kanban";

// Counts shown on the front of a card.
export type CardBadge = { checkItems: number; checkDone: number; comments: number; attachments: number };

export type BoardSummary = KanbanBoard & {
  role: KanbanRole | null; // null: readable as a team board without membership
  starred: boolean;
};

export type BoardData = {
  board: KanbanBoard;
  role: KanbanRole;
  lists: KanbanList[];
  cards: KanbanCard[];
  labels: KanbanLabel[];
  cardLabels: KanbanCardLabel[];
  cardMembers: KanbanCardMember[];
  people: KanbanPerson[];
  badges: Record<string, CardBadge>;
};

export type CardDetail = {
  checklists: KanbanChecklist[];
  items: KanbanChecklistItem[];
  comments: KanbanComment[];
  activity: KanbanActivity[];
  attachments: KanbanAttachment[];
  /** null until kanban-card-extras.sql is installed. */
  reactions: KanbanReaction[] | null;
};

type Result<T> = { data: T; error: null } | { data: null; error: string };

function client() {
  if (!supabase) throw new Error("Kanban storage is not configured on this environment.");
  return supabase;
}

// Profiles without a name show as "Unnamed member". For the signed-in user
// we know the email from the session, so use its local part instead.
async function withOwnName(people: KanbanPerson[]): Promise<KanbanPerson[]> {
  const { data } = await client().auth.getSession();
  const me = data.session?.user;
  if (!me?.email) return people;
  return people.map((p) =>
    p.user_id === me.id && !p.full_name && !p.preferred_name ? { ...p, preferred_name: me.email!.split("@")[0] } : p,
  );
}

// Supabase's API returns at most 1000 rows per request, so board-wide reads
// page through with range(). `build` makes a fresh query each call and must
// order by a unique key so pages neither overlap nor skip rows.
const PAGE = 1000;
type Rangeable<T> = {
  range: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>;
};

async function selectAll<T>(build: () => Rangeable<T>): Promise<{ data: T[] | null; error: { message: string } | null }> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build().range(from, from + PAGE - 1);
    if (error) return { data: null, error };
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) return { data: rows, error: null };
  }
}

function fail<T>(message: string): Result<T> {
  return { data: null, error: message };
}

// A table or column from an optional migration that is not installed yet.
export function isMissingSchema(message: string | undefined | null): boolean {
  return !!message && /does not exist|could not find the (table|.*column)|schema cache/i.test(message);
}

export const STARTER_LISTS = ["To do", "In progress", "Done"];

export async function listBoards(userId: string): Promise<Result<BoardSummary[]>> {
  const { data, error } = await client()
    .from("kanban_boards")
    .select("*, kanban_board_members(user_id, role, starred)")
    .order("created_at", { ascending: false }); // archived boards included; the page lists them apart
  if (error) return fail(error.message);
  const rows = (data ?? []) as (KanbanBoard & {
    kanban_board_members: { user_id: string; role: KanbanRole; starred: boolean }[];
  })[];
  return {
    data: rows.map(({ kanban_board_members: members, ...board }) => {
      const mine = members.find((m) => m.user_id === userId);
      return { ...board, role: mine?.role ?? null, starred: mine?.starred ?? false };
    }),
    error: null,
  };
}

export async function createBoard(input: {
  name: string;
  visibility: BoardVisibility;
  background: BoardBackground;
  userId: string;
}): Promise<Result<KanbanBoard>> {
  const db = client();
  const { data, error } = await db
    .from("kanban_boards")
    .insert({
      name: input.name.trim(),
      visibility: input.visibility,
      background: input.background,
      created_by: input.userId,
    })
    .select()
    .single();
  if (error) return fail(error.message);
  const board = data as KanbanBoard;
  // Starter lists so a new board is ready to use; failure here is not fatal.
  await db
    .from("kanban_lists")
    .insert(STARTER_LISTS.map((name, i) => ({ board_id: board.id, name, pos: (i + 1) * 1024 })));
  return { data: board, error: null };
}

export async function setStarred(boardId: string, userId: string, starred: boolean): Promise<Result<true>> {
  const { data, error } = await client()
    .from("kanban_board_members")
    .update({ starred })
    .eq("board_id", boardId)
    .eq("user_id", userId)
    .select("board_id");
  if (error) return fail(error.message);
  if (!data?.length) return fail("Only board members can star a board.");
  return { data: true, error: null };
}

export async function loadBoard(slug: string): Promise<Result<BoardData>> {
  const db = client();
  const { data: board, error } = await db.from("kanban_boards").select("*").eq("slug", slug).maybeSingle();
  if (error) return fail(error.message);
  if (!board) return fail("not-found");
  const id = (board as KanbanBoard).id;

  const [role, lists, cards, labels, cardLabels, cardMembers, people, badges] = await Promise.all([
    db.rpc("kanban_role", { b: id }),
    selectAll(() => db.from("kanban_lists").select("*").eq("board_id", id).is("archived_at", null).order("pos").order("id")),
    selectAll(() => db.from("kanban_cards").select("*").eq("board_id", id).is("archived_at", null).order("pos").order("id")),
    selectAll(() => db.from("kanban_labels").select("*").eq("board_id", id).order("id")),
    selectAll(() => db.from("kanban_card_labels").select("*").eq("board_id", id).order("card_id").order("label_id")),
    selectAll(() => db.from("kanban_card_members").select("*").eq("board_id", id).order("card_id").order("user_id")),
    db.rpc("kanban_board_people", { b: id }),
    loadBadges(id),
  ]);
  const firstError = [role, lists, cards, labels, cardLabels, cardMembers, people].find((r) => r.error)?.error;
  if (firstError) return fail(firstError.message);
  if (badges.error !== null) return fail(badges.error);
  if (!role.data) return fail("not-found");

  return {
    data: {
      board: board as KanbanBoard,
      role: role.data as KanbanRole,
      lists: (lists.data ?? []) as KanbanList[],
      cards: (cards.data ?? []) as KanbanCard[],
      labels: (labels.data ?? []) as KanbanLabel[],
      cardLabels: (cardLabels.data ?? []) as KanbanCardLabel[],
      cardMembers: (cardMembers.data ?? []) as KanbanCardMember[],
      people: await withOwnName((people.data ?? []) as KanbanPerson[]),
      badges: badges.data,
    },
    error: null,
  };
}

// Counts for the card fronts. Just enough columns to count; full rows load
// when a card opens. Re-run after realtime events touch these tables.
export async function loadBadges(boardId: string): Promise<Result<Record<string, CardBadge>>> {
  const db = client();
  const [checklists, items, comments, attachments] = await Promise.all([
    selectAll(() => db.from("kanban_checklists").select("id, card_id").eq("board_id", boardId).order("id")),
    selectAll(() => db.from("kanban_checklist_items").select("checklist_id, done").eq("board_id", boardId).order("id")),
    selectAll(() => db.from("kanban_card_comments").select("card_id").eq("board_id", boardId).order("id")),
    selectAll(() => db.from("kanban_card_attachments").select("card_id").eq("board_id", boardId).order("id")),
  ]);
  const err = [checklists, items, comments, attachments].find((r) => r.error)?.error;
  if (err) return fail(err.message);

  const badges: Record<string, CardBadge> = {};
  const badge = (cardId: string) => (badges[cardId] ??= { checkItems: 0, checkDone: 0, comments: 0, attachments: 0 });
  const cardOfChecklist = new Map(
    ((checklists.data ?? []) as { id: string; card_id: string }[]).map((c) => [c.id, c.card_id]),
  );
  for (const item of (items.data ?? []) as { checklist_id: string; done: boolean }[]) {
    const cardId = cardOfChecklist.get(item.checklist_id);
    if (!cardId) continue;
    badge(cardId).checkItems += 1;
    if (item.done) badge(cardId).checkDone += 1;
  }
  for (const c of (comments.data ?? []) as { card_id: string }[]) badge(c.card_id).comments += 1;
  for (const a of (attachments.data ?? []) as { card_id: string }[]) badge(a.card_id).attachments += 1;
  return { data: badges, error: null };
}

// --- Board -------------------------------------------------------------------

export async function updateBoard(
  id: string,
  patch: Partial<Pick<KanbanBoard, "name" | "description" | "background" | "visibility" | "archived_at">>,
): Promise<Result<KanbanBoard>> {
  const { data, error } = await client().from("kanban_boards").update(patch).eq("id", id).select();
  if (error) return fail(error.message);
  if (!data?.length) return fail("Only a board owner can change the board.");
  return { data: data[0] as KanbanBoard, error: null };
}

// --- Lists -------------------------------------------------------------------

export async function createList(row: Pick<KanbanList, "id" | "board_id" | "name" | "pos">): Promise<Result<KanbanList>> {
  const { data, error } = await client().from("kanban_lists").insert(row).select().single();
  if (error) return fail(error.message);
  return { data: data as KanbanList, error: null };
}

export async function updateList(
  id: string,
  patch: Partial<Pick<KanbanList, "name" | "pos" | "archived_at">>,
): Promise<Result<KanbanList>> {
  const { data, error } = await client().from("kanban_lists").update(patch).eq("id", id).select();
  if (error) return fail(error.message);
  if (!data?.length) return fail("You do not have permission to change this list.");
  return { data: data[0] as KanbanList, error: null };
}

// --- Cards -------------------------------------------------------------------

export async function createCard(
  row: Pick<KanbanCard, "id" | "board_id" | "list_id" | "title" | "pos">,
): Promise<Result<KanbanCard>> {
  // number is assigned by the database trigger; 0 only satisfies the type.
  const { data, error } = await client()
    .from("kanban_cards")
    .insert({ ...row, number: 0 })
    .select()
    .single();
  if (error) return fail(error.message);
  return { data: data as KanbanCard, error: null };
}

export async function updateCard(
  id: string,
  patch: Partial<
    Pick<
      KanbanCard,
      | "title"
      | "list_id"
      | "pos"
      | "archived_at"
      | "description"
      | "start_at"
      | "due_at"
      | "due_complete"
      | "cover_attachment_id"
      | "cover_color"
    >
  >,
): Promise<Result<KanbanCard>> {
  const { data, error } = await client().from("kanban_cards").update(patch).eq("id", id).select();
  if (error) return fail(error.message);
  if (!data?.length) return fail("You do not have permission to change this card.");
  return { data: data[0] as KanbanCard, error: null };
}

// Renumber a list's cards (or a board's lists) and return the fresh positions.
export async function rebalanceCards(listId: string): Promise<Result<{ id: string; pos: number }[]>> {
  const db = client();
  const { error } = await db.rpc("kanban_rebalance_list", { target_list: listId });
  if (error) return fail(error.message);
  const { data, error: readError } = await selectAll(() => db.from("kanban_cards").select("id, pos").eq("list_id", listId).order("id"));
  if (readError) return fail(readError.message);
  return { data: (data ?? []) as { id: string; pos: number }[], error: null };
}

export async function rebalanceLists(boardId: string): Promise<Result<{ id: string; pos: number }[]>> {
  const db = client();
  const { error } = await db.rpc("kanban_rebalance_lists", { target_board: boardId });
  if (error) return fail(error.message);
  const { data, error: readError } = await selectAll(() => db.from("kanban_lists").select("id, pos").eq("board_id", boardId).order("id"));
  if (readError) return fail(readError.message);
  return { data: (data ?? []) as { id: string; pos: number }[], error: null };
}

// --- Card detail -----------------------------------------------------------------

export async function loadActivity(cardId: string, limit = 50): Promise<Result<KanbanActivity[]>> {
  const { data, error } = await client()
    .from("kanban_card_activity")
    .select("*")
    .eq("card_id", cardId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return fail(error.message);
  return { data: (data ?? []) as KanbanActivity[], error: null };
}

export async function loadCardDetail(cardId: string): Promise<Result<CardDetail>> {
  const db = client();
  const [checklists, comments, activity, attachments, reactions] = await Promise.all([
    db.from("kanban_checklists").select("*").eq("card_id", cardId).order("pos"),
    db.from("kanban_card_comments").select("*").eq("card_id", cardId).order("created_at", { ascending: false }),
    loadActivity(cardId),
    loadAttachments(cardId),
    db.from("kanban_comment_reactions").select("*").eq("card_id", cardId).order("created_at"),
  ]);
  if (checklists.error) return fail(checklists.error.message);
  if (comments.error) return fail(comments.error.message);
  if (activity.error !== null) return fail(activity.error);
  if (attachments.error !== null) return fail(attachments.error);
  const ids = ((checklists.data ?? []) as KanbanChecklist[]).map((c) => c.id);
  let items: KanbanChecklistItem[] = [];
  if (ids.length) {
    const res = await db.from("kanban_checklist_items").select("*").in("checklist_id", ids).order("pos");
    if (res.error) return fail(res.error.message);
    items = (res.data ?? []) as KanbanChecklistItem[];
  }
  return {
    data: {
      checklists: (checklists.data ?? []) as KanbanChecklist[],
      items,
      comments: (comments.data ?? []) as KanbanComment[],
      activity: activity.data,
      attachments: attachments.data,
      reactions: reactions.error ? null : ((reactions.data ?? []) as KanbanReaction[]),
    },
    error: null,
  };
}

// --- Watchers and reactions (kanban-card-extras.sql) ------------------------------

/** Card ids the user watches on a board; null when the table is not installed. */
export async function loadWatched(boardId: string, userId: string): Promise<Set<string> | null> {
  const { data, error } = await client()
    .from("kanban_card_watchers")
    .select("card_id")
    .eq("board_id", boardId)
    .eq("user_id", userId);
  if (error) return null;
  return new Set((data ?? []).map((r: { card_id: string }) => r.card_id));
}

export async function setWatching(
  card: Pick<KanbanCard, "id" | "board_id">,
  userId: string,
  on: boolean,
): Promise<Result<true>> {
  const db = client().from("kanban_card_watchers");
  const { error } = on
    ? await db.insert({ card_id: card.id, board_id: card.board_id, user_id: userId })
    : await db.delete().eq("card_id", card.id).eq("user_id", userId);
  if (error && !/duplicate key/i.test(error.message)) return fail(error.message);
  return { data: true, error: null };
}

export async function toggleReaction(
  r: Pick<KanbanReaction, "comment_id" | "emoji" | "card_id" | "board_id">,
  userId: string,
  on: boolean,
): Promise<Result<true>> {
  const db = client().from("kanban_comment_reactions");
  const { error } = on
    ? await db.insert({ ...r, user_id: userId })
    : await db.delete().eq("comment_id", r.comment_id).eq("user_id", userId).eq("emoji", r.emoji);
  if (error && !/duplicate key/i.test(error.message)) return fail(error.message);
  return { data: true, error: null };
}

// board_id on the rows below is filled by a database trigger from the parent;
// the value sent here only satisfies the column's not-null constraint.

export async function addCardLabel(cardId: string, labelId: string, boardId: string): Promise<Result<true>> {
  const { error } = await client()
    .from("kanban_card_labels")
    .insert({ card_id: cardId, label_id: labelId, board_id: boardId });
  return error ? fail(error.message) : { data: true, error: null };
}

export async function removeCardLabel(cardId: string, labelId: string): Promise<Result<true>> {
  const { data, error } = await client()
    .from("kanban_card_labels")
    .delete()
    .eq("card_id", cardId)
    .eq("label_id", labelId)
    .select("card_id");
  if (error) return fail(error.message);
  if (!data?.length) return fail("You do not have permission to change labels.");
  return { data: true, error: null };
}

export async function createLabel(boardId: string, name: string, color: LabelColor): Promise<Result<KanbanLabel>> {
  const { data, error } = await client()
    .from("kanban_labels")
    .insert({ board_id: boardId, name: name.trim(), color })
    .select()
    .single();
  if (error) return fail(error.message);
  return { data: data as KanbanLabel, error: null };
}

export async function addCardMember(cardId: string, userId: string, boardId: string): Promise<Result<true>> {
  const { error } = await client()
    .from("kanban_card_members")
    .insert({ card_id: cardId, user_id: userId, board_id: boardId });
  return error ? fail(error.message) : { data: true, error: null };
}

export async function removeCardMember(cardId: string, userId: string): Promise<Result<true>> {
  const { data, error } = await client()
    .from("kanban_card_members")
    .delete()
    .eq("card_id", cardId)
    .eq("user_id", userId)
    .select("card_id");
  if (error) return fail(error.message);
  if (!data?.length) return fail("You do not have permission to change members.");
  return { data: true, error: null };
}

export async function createChecklist(
  row: Pick<KanbanChecklist, "id" | "card_id" | "board_id" | "title" | "pos">,
): Promise<Result<KanbanChecklist>> {
  const { data, error } = await client().from("kanban_checklists").insert(row).select().single();
  if (error) return fail(error.message);
  return { data: data as KanbanChecklist, error: null };
}

export async function updateChecklist(id: string, patch: Partial<Pick<KanbanChecklist, "title" | "pos">>): Promise<Result<true>> {
  const { data, error } = await client().from("kanban_checklists").update(patch).eq("id", id).select("id");
  if (error) return fail(error.message);
  if (!data?.length) return fail("You do not have permission to change this checklist.");
  return { data: true, error: null };
}

export async function deleteChecklist(id: string): Promise<Result<true>> {
  const { data, error } = await client().from("kanban_checklists").delete().eq("id", id).select("id");
  if (error) return fail(error.message);
  if (!data?.length) return fail("You do not have permission to delete this checklist.");
  return { data: true, error: null };
}

export async function createItem(
  row: Pick<KanbanChecklistItem, "id" | "checklist_id" | "board_id" | "text" | "pos">,
): Promise<Result<KanbanChecklistItem>> {
  const { data, error } = await client().from("kanban_checklist_items").insert(row).select().single();
  if (error) return fail(error.message);
  return { data: data as KanbanChecklistItem, error: null };
}

export async function updateItem(
  id: string,
  patch: Partial<Pick<KanbanChecklistItem, "text" | "done" | "pos" | "due_at" | "assignee_id">>,
): Promise<Result<true>> {
  const { data, error } = await client().from("kanban_checklist_items").update(patch).eq("id", id).select("id");
  if (error) return fail(error.message);
  if (!data?.length) return fail("You do not have permission to change this item.");
  return { data: true, error: null };
}

export async function deleteItem(id: string): Promise<Result<true>> {
  const { data, error } = await client().from("kanban_checklist_items").delete().eq("id", id).select("id");
  if (error) return fail(error.message);
  if (!data?.length) return fail("You do not have permission to delete this item.");
  return { data: true, error: null };
}

export async function createComment(
  row: Pick<KanbanComment, "id" | "card_id" | "board_id" | "author_id" | "body">,
): Promise<Result<KanbanComment>> {
  const { data, error } = await client().from("kanban_card_comments").insert(row).select().single();
  if (error) return fail(error.message);
  return { data: data as KanbanComment, error: null };
}

export async function updateComment(id: string, body: string): Promise<Result<KanbanComment>> {
  const { data, error } = await client().from("kanban_card_comments").update({ body }).eq("id", id).select();
  if (error) return fail(error.message);
  if (!data?.length) return fail("Only the author can edit this comment.");
  return { data: data[0] as KanbanComment, error: null };
}

export async function deleteComment(id: string): Promise<Result<true>> {
  const { data, error } = await client().from("kanban_card_comments").delete().eq("id", id).select("id");
  if (error) return fail(error.message);
  if (!data?.length) return fail("Only the author or a board owner can delete this comment.");
  return { data: true, error: null };
}

// --- Board menu ---------------------------------------------------------------------

export async function updateLabel(id: string, patch: Partial<Pick<KanbanLabel, "name" | "color">>): Promise<Result<KanbanLabel>> {
  const { data, error } = await client().from("kanban_labels").update(patch).eq("id", id).select();
  if (error) return fail(error.message);
  if (!data?.length) return fail("You do not have permission to change labels.");
  return { data: data[0] as KanbanLabel, error: null };
}

export async function deleteLabel(id: string): Promise<Result<true>> {
  const { data, error } = await client().from("kanban_labels").delete().eq("id", id).select("id");
  if (error) return fail(error.message);
  if (!data?.length) return fail("You do not have permission to delete labels.");
  return { data: true, error: null };
}

export async function loadPeople(boardId: string): Promise<Result<KanbanPerson[]>> {
  const { data, error } = await client().rpc("kanban_board_people", { b: boardId });
  if (error) return fail(error.message);
  return { data: await withOwnName((data ?? []) as KanbanPerson[]), error: null };
}

// Owner only (checked in the database): adds an existing account by email.
export async function addMemberByEmail(boardId: string, email: string, role: KanbanRole): Promise<Result<true>> {
  const { error } = await client().rpc("kanban_add_member", { b: boardId, member_email: email, member_role: role });
  return error ? fail(error.message) : { data: true, error: null };
}

export async function setMemberRole(boardId: string, userId: string, role: KanbanRole): Promise<Result<true>> {
  const { data, error } = await client()
    .from("kanban_board_members")
    .update({ role })
    .eq("board_id", boardId)
    .eq("user_id", userId)
    .select("user_id");
  if (error) return fail(error.message);
  if (!data?.length) return fail("Only a board owner can change roles.");
  return { data: true, error: null };
}

export async function removeMember(boardId: string, userId: string): Promise<Result<true>> {
  const { data, error } = await client()
    .from("kanban_board_members")
    .delete()
    .eq("board_id", boardId)
    .eq("user_id", userId)
    .select("user_id");
  if (error) return fail(error.message);
  if (!data?.length) return fail("Only a board owner can remove members.");
  return { data: true, error: null };
}

export async function loadArchived(boardId: string): Promise<Result<{ cards: KanbanCard[]; lists: KanbanList[] }>> {
  const db = client();
  const [cards, lists] = await Promise.all([
    selectAll(() =>
      db.from("kanban_cards").select("*").eq("board_id", boardId).not("archived_at", "is", null).order("archived_at", { ascending: false }).order("id"),
    ),
    selectAll(() =>
      db.from("kanban_lists").select("*").eq("board_id", boardId).not("archived_at", "is", null).order("archived_at", { ascending: false }).order("id"),
    ),
  ]);
  if (cards.error) return fail(cards.error.message);
  if (lists.error) return fail(lists.error.message);
  return { data: { cards: (cards.data ?? []) as KanbanCard[], lists: (lists.data ?? []) as KanbanList[] }, error: null };
}

export async function deleteCardForever(id: string, boardId: string): Promise<Result<true>> {
  await removeCardFiles(boardId, id);
  const { data, error } = await client().from("kanban_cards").delete().eq("id", id).select("id");
  if (error) return fail(error.message);
  if (!data?.length) return fail("You do not have permission to delete this card.");
  return { data: true, error: null };
}

export const FEED_PAGE = 30;

export async function loadBoardActivity(boardId: string, offset: number): Promise<Result<KanbanActivity[]>> {
  const { data, error } = await client()
    .from("kanban_card_activity")
    .select("*")
    .eq("board_id", boardId)
    .order("created_at", { ascending: false })
    .range(offset, offset + FEED_PAGE - 1);
  if (error) return fail(error.message);
  return { data: (data ?? []) as KanbanActivity[], error: null };
}

export async function loadBoardComments(boardId: string, offset: number): Promise<Result<KanbanComment[]>> {
  const { data, error } = await client()
    .from("kanban_card_comments")
    .select("*")
    .eq("board_id", boardId)
    .order("created_at", { ascending: false })
    .range(offset, offset + FEED_PAGE - 1);
  if (error) return fail(error.message);
  return { data: (data ?? []) as KanbanComment[], error: null };
}

export async function deleteBoard(id: string): Promise<Result<true>> {
  // Best effort: clear the board's files (one folder per card) before the rows.
  const { data: folders } = await client().storage.from(STORAGE_BUCKET).list(id, { limit: 1000 });
  for (const f of folders ?? []) await removeCardFiles(id, f.name);
  const { data, error } = await client().from("kanban_boards").delete().eq("id", id).select("id");
  if (error) return fail(error.message);
  if (!data?.length) return fail("Only a board owner can delete the board.");
  return { data: true, error: null };
}

// --- Attachments ------------------------------------------------------------------
// Files live in the private 'kanban' bucket at {board_id}/{card_id}/{uuid}-{name};
// storage policies check the board from the first path segment. Files are
// shown through short-lived signed URLs, never public ones.

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

export async function loadAttachments(cardId: string): Promise<Result<KanbanAttachment[]>> {
  const { data, error } = await client()
    .from("kanban_card_attachments")
    .select("*")
    .eq("card_id", cardId)
    .order("created_at", { ascending: false });
  if (error) return fail(error.message);
  return { data: (data ?? []) as KanbanAttachment[], error: null };
}

export async function uploadAttachment(
  card: Pick<KanbanCard, "id" | "board_id">,
  file: File,
  userId: string,
): Promise<Result<KanbanAttachment>> {
  if (file.size > MAX_ATTACHMENT_BYTES) return fail(`${file.name} is larger than 10 MB.`);
  const db = client();
  const safe = file.name.replace(/[^\w.-]+/g, "_").slice(-80) || "file";
  const path = `${card.board_id}/${card.id}/${crypto.randomUUID()}-${safe}`;
  const up = await db.storage.from(STORAGE_BUCKET).upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (up.error) return fail(up.error.message);
  const { data, error } = await db
    .from("kanban_card_attachments")
    .insert({
      card_id: card.id,
      board_id: card.board_id,
      name: file.name,
      storage_path: path,
      mime_type: file.type || null,
      bytes: file.size,
      uploaded_by: userId,
    })
    .select()
    .single();
  if (error) {
    await db.storage.from(STORAGE_BUCKET).remove([path]); // keep storage and rows in step
    return fail(error.message);
  }
  return { data: data as KanbanAttachment, error: null };
}

export async function addLinkAttachment(
  card: Pick<KanbanCard, "id" | "board_id">,
  url: string,
  name: string,
  userId: string,
): Promise<Result<KanbanAttachment>> {
  let href: URL;
  try {
    href = new URL(url.trim());
  } catch {
    return fail("That does not look like a full link (https://...).");
  }
  if (href.protocol !== "https:" && href.protocol !== "http:") return fail("Only http and https links can be attached.");
  const { data, error } = await client()
    .from("kanban_card_attachments")
    .insert({ card_id: card.id, board_id: card.board_id, name: name.trim() || href.hostname, url: href.toString(), uploaded_by: userId })
    .select()
    .single();
  if (error) return fail(error.message);
  return { data: data as KanbanAttachment, error: null };
}

export async function updateAttachment(
  id: string,
  patch: Partial<Pick<KanbanAttachment, "name" | "url">>,
): Promise<Result<KanbanAttachment>> {
  if (patch.url !== undefined && patch.url !== null) {
    try {
      const href = new URL(patch.url.trim());
      if (href.protocol !== "https:" && href.protocol !== "http:") return fail("Only http and https links can be attached.");
      patch = { ...patch, url: href.toString() };
    } catch {
      return fail("That does not look like a full link (https://...).");
    }
  }
  const { data, error } = await client().from("kanban_card_attachments").update(patch).eq("id", id).select().single();
  if (error) return fail(error.message);
  return { data: data as KanbanAttachment, error: null };
}

export async function deleteAttachment(a: KanbanAttachment): Promise<Result<true>> {
  const db = client();
  const { data, error } = await db.from("kanban_card_attachments").delete().eq("id", a.id).select("id");
  if (error) return fail(error.message);
  if (!data?.length) return fail("Only the uploader or a board owner can delete this attachment.");
  if (a.storage_path) await db.storage.from(STORAGE_BUCKET).remove([a.storage_path]);
  return { data: true, error: null };
}

// Signed URLs for a set of storage paths, keyed by path (missing on failure).
export async function signedUrls(paths: string[], seconds = 6 * 60 * 60): Promise<Record<string, string>> {
  const unique = [...new Set(paths.filter(Boolean))];
  if (!unique.length) return {};
  const { data } = await client().storage.from(STORAGE_BUCKET).createSignedUrls(unique, seconds);
  const out: Record<string, string> = {};
  for (const row of data ?? []) if (row.path && row.signedUrl) out[row.path] = row.signedUrl;
  return out;
}

// Cover images for the card fronts: card id -> signed URL.
export async function loadCovers(cards: Pick<KanbanCard, "id" | "cover_attachment_id">[]): Promise<Record<string, string>> {
  const withCover = cards.filter((c) => c.cover_attachment_id);
  if (!withCover.length) return {};
  const { data } = await client()
    .from("kanban_card_attachments")
    .select("id, storage_path")
    .in(
      "id",
      withCover.map((c) => c.cover_attachment_id as string),
    );
  const pathOf = new Map(((data ?? []) as { id: string; storage_path: string | null }[]).map((r) => [r.id, r.storage_path]));
  const urls = await signedUrls([...pathOf.values()].filter((p): p is string => !!p));
  const out: Record<string, string> = {};
  for (const c of withCover) {
    const path = pathOf.get(c.cover_attachment_id as string);
    if (path && urls[path]) out[c.id] = urls[path];
  }
  return out;
}

// Storage objects are not removed by row deletes; clear a card's folder first.
async function removeCardFiles(boardId: string, cardId: string) {
  const db = client();
  const { data } = await db.storage.from(STORAGE_BUCKET).list(`${boardId}/${cardId}`, { limit: 1000 });
  const paths = (data ?? []).map((f) => `${boardId}/${cardId}/${f.name}`);
  if (paths.length) await db.storage.from(STORAGE_BUCKET).remove(paths);
}

// A short-lived link that downloads the file under its own name.
export async function downloadUrl(path: string, name: string): Promise<string | null> {
  const { data } = await client().storage.from(STORAGE_BUCKET).createSignedUrl(path, 60, { download: name });
  return data?.signedUrl ?? null;
}
