import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Link,
  Outlet,
  createFileRoute,
  useNavigate,
} from "@tanstack/react-router";
import { MotionConfig } from "framer-motion";
import {
  ArrowLeft,
  Filter,
  Globe2,
  Loader2,
  Lock,
  MoreHorizontal,
  Star,
  X,
} from "lucide-react";
import { body, display } from "../lib/fonts";
import AuthGate from "../components/AuthGate";
import BoardCanvas, { type Move } from "../components/kanban/BoardCanvas";
import {
  InlineEdit,
  Toasts,
  useToasts,
} from "../components/kanban/parts";
import {
  BoardContext,
  type BoardContextValue,
  type CardPatch,
} from "../components/kanban/board-context";
import FilterPanel from "../components/kanban/FilterPanel";
import BoardMenu, { type BoardMenuView } from "../components/kanban/BoardMenu";
import KanbanHeader, { BAR_BUTTON, MembersButton } from "../components/kanban/KanbanHeader";
import ShortcutsDialog, {
  isHelpKey,
  isTyping,
} from "../components/kanban/ShortcutsDialog";
import {
  useBoardRealtime,
  type RealtimeEvent,
} from "../components/kanban/useBoardRealtime";
import { useAuth } from "../lib/auth/auth";
import {
  BOARD_BACKGROUNDS,
  byPos,
  EMPTY_FILTER,
  canEdit,
  filterCards,
  filterCount,
  filterToSearch,
  isOwner,
  parseFilter,
  personName,
  positionBetween,
  type CardFilter,
  type KanbanBoard,
  type KanbanCard,
  type KanbanLabel,
  type KanbanList,
  type KanbanPerson,
  type LabelColor,
} from "../lib/kanban";
import {
  addCardLabel,
  addCardMember,
  createCard,
  createLabel as createLabelRow,
  createList,
  loadBadges,
  loadBoard,
  loadCovers,
  loadPeople,
  loadWatched,
  removeCardLabel,
  removeCardMember,
  rebalanceCards,
  rebalanceLists,
  setStarred,
  setWatching,
  updateBoard,
  updateCard,
  updateList,
  type BoardData,
  type CardBadge,
} from "../lib/kanban-data";

export const Route = createFileRoute("/kanban_/$board")({
  component: BoardPage,
  // Card filters are kept in the URL; unknown or empty values are dropped.
  validateSearch: (search: Record<string, unknown>) =>
    filterToSearch(parseFilter(search)),
  head: () => ({
    meta: [
      { title: "Board | smartagri" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

// One board: a slim bar (back, name, visibility, star, members) over the
// full-height canvas. Every change is applied locally first and rolled back,
// row by row, if Supabase rejects it.

function BoardPage() {
  return (
    <AuthGate>
      <MotionConfig reducedMotion="user">
        <main className="flex h-[100dvh] flex-col overflow-hidden bg-[#08313A]">
          <BoardContent />
        </main>
      </MotionConfig>
    </AuthGate>
  );
}

function BoardContent() {
  const { board: slug } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [filterOpen, setFilterOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuView, setMenuView] = useState<BoardMenuView>("main");
  const filter = useMemo(() => parseFilter(search), [search]);
  const { user } = useAuth();
  const { toasts, push, dismiss } = useToasts();
  const [data, setData] = useState<BoardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starred, setStarredState] = useState(false);
  const [watched, setWatched] = useState<Set<string> | null>(null);

  // Keyed on the user id, not the user object: Supabase hands out a new
  // session object on every token refresh (e.g. when the tab regains focus),
  // which must not reset the board and close an open card.
  const userId = user?.id ?? null;
  useEffect(() => {
    if (!userId) return;
    let active = true;
    setData(null);
    setError(null);
    loadBoard(slug)
      .then((res) => {
        if (!active) return;
        if (res.error !== null) {
          setError(res.error);
          return;
        }
        setData(res.data);
        setStarredState(
          res.data.people.find((p) => p.user_id === userId)?.starred ?? false,
        );
        void loadWatched(res.data.board.id, userId).then(
          (w) => active && setWatched(w),
        );
        document.title = `${res.data.board.name} | smartagri`;
      })
      .catch((e: Error) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, [slug, userId]);

  const setLists = useCallback(
    (fn: (lists: KanbanList[]) => KanbanList[]) =>
      setData((d) => (d ? { ...d, lists: fn(d.lists) } : d)),
    [],
  );
  const setCards = useCallback(
    (fn: (cards: KanbanCard[]) => KanbanCard[]) =>
      setData((d) => (d ? { ...d, cards: fn(d.cards) } : d)),
    [],
  );
  const replaceCard = (row: KanbanCard) =>
    setCards((cs) => cs.map((c) => (c.id === row.id ? row : c)));
  const replaceList = (row: KanbanList) =>
    setLists((ls) => ls.map((l) => (l.id === row.id ? row : l)));

  const labelsByCard = useMemo(() => {
    const m = new Map<string, KanbanLabel[]>();
    if (!data) return m;
    const byId = new Map(data.labels.map((l) => [l.id, l]));
    for (const cl of data.cardLabels) {
      const label = byId.get(cl.label_id);
      if (label) m.set(cl.card_id, [...(m.get(cl.card_id) ?? []), label]);
    }
    return m;
  }, [data]);

  const membersByCard = useMemo(() => {
    const m = new Map<string, KanbanPerson[]>();
    if (!data) return m;
    const byId = new Map(data.people.map((p) => [p.user_id, p]));
    for (const cm of data.cardMembers) {
      const person = byId.get(cm.user_id);
      if (person) m.set(cm.card_id, [...(m.get(cm.card_id) ?? []), person]);
    }
    return m;
  }, [data]);

  const visibleIds = useMemo(() => {
    if (!data || filterCount(filter) === 0) return null;
    const labelName = new Map(data.labels.map((l) => [l.id, l.name]));
    const people = new Map(data.people.map((p) => [p.user_id, personName(p)]));
    return filterCards(data.cards, filter, {
      labelIds: (id) =>
        data.cardLabels
          .filter((cl) => cl.card_id === id)
          .map((cl) => cl.label_id),
      memberIds: (id) =>
        data.cardMembers
          .filter((cm) => cm.card_id === id)
          .map((cm) => cm.user_id),
      labelName: (id) => labelName.get(id) ?? "",
      personName: (id) => people.get(id) ?? "",
      me: user?.id ?? null,
    });
  }, [data, filter, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Realtime ---------------------------------------------------------------
  // Rows from other people (and echoes of our own writes) are merged into the
  // board state; tables only shown inside a card bump detailVersion so an open
  // card re-reads them, and the card-front badges are recounted.
  const [detailVersion, setDetailVersion] = useState(0);
  const badgeTimer = useRef<number | undefined>(undefined);
  const boardId = data?.board.id ?? null;

  const refreshBadges = useCallback(() => {
    if (!boardId) return;
    window.clearTimeout(badgeTimer.current);
    badgeTimer.current = window.setTimeout(async () => {
      const res = await loadBadges(boardId);
      if (res.error === null)
        setData((d) => (d ? { ...d, badges: res.data } : d));
    }, 400);
  }, [boardId]);

  const reloadBoard = useCallback(async () => {
    const res = await loadBoard(slug);
    if (res.error === null) setData(res.data);
  }, [slug]);

  useBoardRealtime(boardId, {
    onReconnect: () => void reloadBoard(),
    onChange: (table, event, row, old) => {
      const id = String((event === "DELETE" ? old.id : row.id) ?? "");
      switch (table) {
        case "kanban_lists":
          setData((d) =>
            d
              ? { ...d, lists: mergeRow(d.lists, event, row as KanbanList, id) }
              : d,
          );
          break;
        case "kanban_cards":
          setData((d) =>
            d
              ? { ...d, cards: mergeRow(d.cards, event, row as KanbanCard, id) }
              : d,
          );
          break;
        case "kanban_labels":
          setData((d) =>
            d
              ? {
                  ...d,
                  labels: mergeRow(d.labels, event, row as KanbanLabel, id),
                }
              : d,
          );
          break;
        case "kanban_card_labels": {
          const r = (event === "DELETE" ? old : row) as {
            card_id: string;
            label_id: string;
            board_id: string;
          };
          const same = (x: { card_id: string; label_id: string }) =>
            x.card_id === r.card_id && x.label_id === r.label_id;
          setData((d) =>
            d
              ? {
                  ...d,
                  cardLabels:
                    event === "DELETE"
                      ? d.cardLabels.filter((x) => !same(x))
                      : d.cardLabels.some(same)
                        ? d.cardLabels
                        : [...d.cardLabels, r],
                }
              : d,
          );
          break;
        }
        case "kanban_card_members": {
          const r = (event === "DELETE" ? old : row) as {
            card_id: string;
            user_id: string;
            board_id: string;
          };
          const same = (x: { card_id: string; user_id: string }) =>
            x.card_id === r.card_id && x.user_id === r.user_id;
          setData((d) =>
            d
              ? {
                  ...d,
                  cardMembers:
                    event === "DELETE"
                      ? d.cardMembers.filter((x) => !same(x))
                      : d.cardMembers.some(same)
                        ? d.cardMembers
                        : [...d.cardMembers, r],
                }
              : d,
          );
          break;
        }
        case "kanban_board_members": {
          const r = (event === "DELETE" ? old : row) as {
            board_id?: string;
            user_id?: string;
          };
          if (r.board_id && r.board_id !== boardId) break;
          // A change to my own membership can change my role: reload everything.
          if (r.user_id && r.user_id === user?.id) void reloadBoard();
          else if (boardId)
            void loadPeople(boardId).then((res) => {
              if (res.error === null)
                setData((d) => (d ? { ...d, people: res.data } : d));
            });
          break;
        }
        case "kanban_boards":
          if (event === "DELETE") {
            if (old.id === boardId) {
              push({ text: "This board was deleted.", tone: "error" });
              navigate({ to: "/kanban" });
            }
          } else {
            setData((d) =>
              d
                ? {
                    ...d,
                    board: { ...d.board, ...(row as Partial<KanbanBoard>) },
                  }
                : d,
            );
          }
          break;
        case "kanban_card_activity":
          setDetailVersion((v) => v + 1);
          break;
        default:
          // checklists, items, comments, attachments
          refreshBadges();
          setDetailVersion((v) => v + 1);
      }
    },
  });

  // Cover images need signed URLs; reload them when a card's cover changes.
  const [covers, setCovers] = useState<Record<string, string>>({});
  const coverKey = (data?.cards ?? [])
    .filter((c) => c.cover_attachment_id)
    .map((c) => `${c.id}:${c.cover_attachment_id}`)
    .join();
  useEffect(() => {
    if (!data) return;
    let active = true;
    loadCovers(data.cards).then((urls) => active && setCovers(urls));
    return () => {
      active = false;
    };
  }, [coverKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Keyboard shortcuts (handler assigned below once data is loaded) --------
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const keysRef = useRef<((e: KeyboardEvent) => void) | null>(null);
  const hoverRef = useRef<string | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || isTyping(e)) return;
      // An open card or dialog handles its own keys; a keyboard drag owns the arrows.
      if (document.querySelector('[aria-modal="true"]')) return;
      if (document.querySelector('[aria-roledescription][aria-pressed="true"]'))
        return;
      keysRef.current?.(e);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (error) {
    const missing = error === "not-found";
    return (
      <>
        <KanbanHeader />
        <section className="flex flex-1 items-center justify-center bg-white px-6">
          <div className="max-w-md rounded-[24px] border border-[#0B6477]/10 bg-white p-8 text-center shadow-[0_14px_40px_-30px_rgba(8,49,58,0.35)]">
            <h1
              className="text-2xl font-semibold tracking-[-0.025em] text-neutral-900"
              style={display}
            >
              {missing ? "Board not found" : "Could not load this board"}
            </h1>
            <p
              className="mt-3 text-sm leading-relaxed text-neutral-600"
              style={body}
            >
              {missing
                ? "It does not exist, or you are not a member of it. Ask the board owner to add you."
                : error}
            </p>
            <Link
              to="/kanban"
              className="mt-6 inline-flex h-11 items-center gap-2 rounded-lg bg-[#45DFB1] px-5 text-sm font-medium text-[#0B2A22] hover:bg-[#80ED99]"
              style={body}
            >
              <ArrowLeft className="h-4 w-4" />
              All boards
            </Link>
          </div>
        </section>
      </>
    );
  }

  if (!data) {
    return (
      <>
        <KanbanHeader />
        <section
          className="flex flex-1 items-center justify-center bg-white text-neutral-500"
          style={body}
        >
          <Loader2 className="mr-3 h-5 w-5 animate-spin text-[#0B6477]" />
          Loading board...
        </section>
      </>
    );
  }

  const { board, role } = data;
  const editable = canEdit(role);
  const bg = BOARD_BACKGROUNDS[board.background] ?? BOARD_BACKGROUNDS.teal;
  const failed = (what: string, message: string) =>
    push({ text: `${what}: ${message}`, tone: "error" });

  // --- Mutations (optimistic, rolled back per row) -------------------------

  const moveCard = async (id: string, listId: string, move: Move) => {
    const before = data.cards.find((c) => c.id === id);
    if (!before) return;
    setCards((cs) =>
      cs.map((c) =>
        c.id === id ? { ...c, list_id: listId, pos: move.pos } : c,
      ),
    );
    const res = await updateCard(id, { list_id: listId, pos: move.pos });
    if (res.error !== null) {
      setCards((cs) => cs.map((c) => (c.id === id ? before : c)));
      failed("Could not move the card", res.error);
      return;
    }
    replaceCard(res.data);
    if (move.rebalance) {
      const fresh = await rebalanceCards(listId);
      if (fresh.data) {
        const pos = new Map(fresh.data.map((r) => [r.id, r.pos]));
        setCards((cs) =>
          cs.map((c) => (pos.has(c.id) ? { ...c, pos: pos.get(c.id)! } : c)),
        );
      }
    }
  };

  const moveList = async (id: string, move: Move) => {
    const before = data.lists.find((l) => l.id === id);
    if (!before) return;
    setLists((ls) =>
      ls.map((l) => (l.id === id ? { ...l, pos: move.pos } : l)),
    );
    const res = await updateList(id, { pos: move.pos });
    if (res.error !== null) {
      setLists((ls) => ls.map((l) => (l.id === id ? before : l)));
      failed("Could not move the list", res.error);
      return;
    }
    replaceList(res.data);
    if (move.rebalance) {
      const fresh = await rebalanceLists(board.id);
      if (fresh.data) {
        const pos = new Map(fresh.data.map((r) => [r.id, r.pos]));
        setLists((ls) =>
          ls.map((l) => (pos.has(l.id) ? { ...l, pos: pos.get(l.id)! } : l)),
        );
      }
    }
  };

  const addCard = async (listId: string, title: string) => {
    const last = data.cards
      .filter((c) => c.list_id === listId)
      .sort(byPos)
      .at(-1);
    const now = new Date().toISOString();
    const draft: KanbanCard = {
      id: crypto.randomUUID(),
      board_id: board.id,
      list_id: listId,
      number: 0,
      title,
      description: "",
      pos: positionBetween(last?.pos ?? null, null),
      start_at: null,
      due_at: null,
      due_complete: false,
      cover_attachment_id: null,
      cover_color: null,
      created_by: user?.id ?? null,
      created_at: now,
      updated_at: now,
      archived_at: null,
    };
    setCards((cs) => [...cs, draft]);
    const res = await createCard(draft);
    if (res.error !== null) {
      setCards((cs) => cs.filter((c) => c.id !== draft.id));
      failed("Could not add the card", res.error);
      return;
    }
    replaceCard(res.data);
  };

  const addList = async (name: string) => {
    const last = [...data.lists].sort(byPos).at(-1);
    const draft: KanbanList = {
      id: crypto.randomUUID(),
      board_id: board.id,
      name,
      pos: positionBetween(last?.pos ?? null, null),
      created_at: new Date().toISOString(),
      archived_at: null,
    };
    setLists((ls) => [...ls, draft]);
    const res = await createList(draft);
    if (res.error !== null) {
      setLists((ls) => ls.filter((l) => l.id !== draft.id));
      failed("Could not add the list", res.error);
      return;
    }
    replaceList(res.data);
  };

  const renameList = async (id: string, name: string) => {
    const before = data.lists.find((l) => l.id === id);
    if (!before) return;
    setLists((ls) => ls.map((l) => (l.id === id ? { ...l, name } : l)));
    const res = await updateList(id, { name });
    if (res.error !== null) {
      setLists((ls) => ls.map((l) => (l.id === id ? before : l)));
      failed("Could not rename the list", res.error);
    }
  };

  const archiveList = async (id: string) => {
    const before = data.lists.find((l) => l.id === id);
    if (!before) return;
    setLists((ls) => ls.filter((l) => l.id !== id));
    const res = await updateList(id, { archived_at: new Date().toISOString() });
    if (res.error !== null) {
      setLists((ls) => [...ls, before]);
      failed("Could not archive the list", res.error);
      return;
    }
    push({
      text: `Archived list "${before.name}".`,
      action: {
        label: "Undo",
        run: async () => {
          const back = await updateList(id, { archived_at: null });
          if (back.error !== null)
            failed("Could not restore the list", back.error);
          else setLists((ls) => [...ls.filter((l) => l.id !== id), back.data]);
        },
      },
    });
  };

  const archiveCard = async (id: string) => {
    const before = data.cards.find((c) => c.id === id);
    if (!before) return;
    setCards((cs) => cs.filter((c) => c.id !== id));
    const res = await updateCard(id, { archived_at: new Date().toISOString() });
    if (res.error !== null) {
      setCards((cs) => [...cs, before]);
      failed("Could not archive the card", res.error);
      return;
    }
    push({
      text: `Archived "${before.title}".`,
      action: {
        label: "Undo",
        run: async () => {
          const back = await updateCard(id, { archived_at: null });
          if (back.error !== null)
            failed("Could not restore the card", back.error);
          else setCards((cs) => [...cs.filter((c) => c.id !== id), back.data]);
        },
      },
    });
  };

  const renameBoard = async (name: string) => {
    const before = board;
    setData((d) => (d ? { ...d, board: { ...d.board, name } } : d));
    const res = await updateBoard(board.id, { name });
    if (res.error !== null) {
      setData((d) => (d ? { ...d, board: before } : d));
      failed("Could not rename the board", res.error);
    } else {
      document.title = `${name} | smartagri`;
    }
  };

  const toggleStar = async () => {
    if (!user) return;
    const next = !starred;
    setStarredState(next);
    const res = await setStarred(board.id, user.id, next);
    if (res.error !== null) {
      setStarredState(!next);
      failed("Could not update the star", res.error);
    }
  };

  // --- Card modal actions --------------------------------------------------

  const patchCard = async (id: string, patch: CardPatch) => {
    const before = data.cards.find((c) => c.id === id);
    if (!before) return false;
    setCards((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    const res = await updateCard(id, patch);
    if (res.error !== null) {
      setCards((cs) => cs.map((c) => (c.id === id ? before : c)));
      failed("Could not save the card", res.error);
      return false;
    }
    replaceCard(res.data);
    return true;
  };

  const setWatch = async (cardId: string, on: boolean) => {
    const card = data.cards.find((c) => c.id === cardId);
    if (!card || !user || !watched) return;
    const flip = (yes: boolean) =>
      setWatched((w) => {
        const next = new Set(w ?? []);
        if (yes) next.add(cardId);
        else next.delete(cardId);
        return next;
      });
    flip(on);
    const res = await setWatching(card, user.id, on);
    if (res.error !== null) {
      flip(!on);
      failed("Could not update watching", res.error);
    }
  };

  const moveCardToList = async (id: string, listId: string) => {
    const last = data.cards
      .filter((c) => c.list_id === listId && c.id !== id)
      .sort(byPos)
      .at(-1);
    await moveCard(id, listId, {
      pos: positionBetween(last?.pos ?? null, null),
      rebalance: false,
    });
  };

  const toggleLabel = async (cardId: string, labelId: string) => {
    const has = data.cardLabels.some(
      (cl) => cl.card_id === cardId && cl.label_id === labelId,
    );
    const row = { card_id: cardId, label_id: labelId, board_id: board.id };
    const without = (rows: BoardData["cardLabels"]) =>
      rows.filter((cl) => !(cl.card_id === cardId && cl.label_id === labelId));
    setData((d) =>
      d
        ? {
            ...d,
            cardLabels: has ? without(d.cardLabels) : [...d.cardLabels, row],
          }
        : d,
    );
    const res = has
      ? await removeCardLabel(cardId, labelId)
      : await addCardLabel(cardId, labelId, board.id);
    if (res.error !== null) {
      setData((d) =>
        d
          ? {
              ...d,
              cardLabels: has ? [...d.cardLabels, row] : without(d.cardLabels),
            }
          : d,
      );
      failed("Could not change the label", res.error);
    }
  };

  const createLabel = async (name: string, color: LabelColor) => {
    const res = await createLabelRow(board.id, name, color);
    if (res.error !== null) {
      failed("Could not create the label", res.error);
      return null;
    }
    setData((d) => (d ? { ...d, labels: [...d.labels, res.data] } : d));
    return res.data;
  };

  const toggleMember = async (cardId: string, userId: string) => {
    const has = data.cardMembers.some(
      (cm) => cm.card_id === cardId && cm.user_id === userId,
    );
    const row = { card_id: cardId, user_id: userId, board_id: board.id };
    const without = (rows: BoardData["cardMembers"]) =>
      rows.filter((cm) => !(cm.card_id === cardId && cm.user_id === userId));
    setData((d) =>
      d
        ? {
            ...d,
            cardMembers: has ? without(d.cardMembers) : [...d.cardMembers, row],
          }
        : d,
    );
    const res = has
      ? await removeCardMember(cardId, userId)
      : await addCardMember(cardId, userId, board.id);
    if (res.error !== null) {
      setData((d) =>
        d
          ? {
              ...d,
              cardMembers: has
                ? [...d.cardMembers, row]
                : without(d.cardMembers),
            }
          : d,
      );
      failed("Could not change the members", res.error);
    }
  };

  const setBadge = (cardId: string, patch: Partial<CardBadge>) =>
    setData((d) => {
      if (!d) return d;
      const current = d.badges[cardId] ?? {
        checkItems: 0,
        checkDone: 0,
        comments: 0,
        attachments: 0,
      };
      return {
        ...d,
        badges: { ...d.badges, [cardId]: { ...current, ...patch } },
      };
    });

  // Opening and closing a card keeps the active filter in the URL.
  const closeCard = () =>
    navigate({
      to: "/kanban/$board",
      params: { board: slug },
      search: (prev) => prev,
    });

  const openCard = (card: KanbanCard) => {
    if (!card.number) return; // still being saved
    navigate({
      to: "/kanban/$board/c/$card",
      params: { board: slug, card: String(card.number) },
      search: (prev) => prev,
    });
  };

  const setFilter = (next: CardFilter) =>
    navigate({
      to: "/kanban/$board",
      params: { board: slug },
      search: filterToSearch(next),
      replace: true,
    });

  const updateData = (fn: (d: BoardData) => BoardData) =>
    setData((d) => (d ? fn(d) : d));
  const goToBoards = () => navigate({ to: "/kanban" });

  const ctx: BoardContextValue = {
    data,
    editable,
    owner: isOwner(role),
    detailVersion,
    userId: user?.id ?? null,
    updateData,
    goToBoards,
    openCard,
    showShortcuts: () => setShortcutsOpen(true),
    push,
    patchCard,
    moveCardToList,
    archiveCard,
    toggleLabel,
    createLabel,
    toggleMember,
    setBadge,
    closeCard,
    watched,
    setWatch,
  };

  const member = data.people.some((p) => p.user_id === user?.id);

  const activeFilters = filterCount(filter);

  keysRef.current = (e: KeyboardEvent) => {
    const key = e.key;
    const handled = () => e.preventDefault();
    if (isHelpKey(e)) return (handled(), setShortcutsOpen(true));
    if (key === "f") return (handled(), setFilterOpen(true));
    if (key === "x") return void (activeFilters && setFilter(EMPTY_FILTER));
    if (key === "]") return setMenuOpen((o) => !o);
    if (key === "q") {
      const mine = filter.members.includes("me");
      return setFilter({
        ...filter,
        members: mine
          ? filter.members.filter((m) => m !== "me")
          : [...filter.members, "me"],
      });
    }
    const dir = (
      {
        ArrowDown: "down",
        j: "down",
        ArrowUp: "up",
        k: "up",
        ArrowLeft: "left",
        h: "left",
        ArrowRight: "right",
        l: "right",
      } as const
    )[key as "ArrowDown"];
    if (dir) return (handled(), focusCard(dir));

    const focused = (document.activeElement as HTMLElement | null)
      ?.closest("[data-card-id]")
      ?.getAttribute("data-card-id");
    const target = focused ?? hoverRef.current;
    if (!target || !editable) return;
    if (key === "c") return void archiveCard(target);
    if (key === "," || key === ".") {
      const card = data.cards.find((x) => x.id === target);
      const order = [...data.lists].sort(byPos);
      const next =
        order[
          order.findIndex((l) => l.id === card?.list_id) +
            (key === "," ? -1 : 1)
        ];
      if (card && next) void moveCardToList(card.id, next.id);
    }
  };

  return (
    <BoardContext.Provider value={ctx}>
      <div
        className="flex min-h-0 flex-1 flex-col"
        style={{ background: `linear-gradient(135deg, ${bg.from}, ${bg.to})` }}
      >
        <KanbanHeader
          title={
            <>
              <InlineEdit
                value={board.name}
                label="Board name"
                disabled={!isOwner(role)}
                onSave={renameBoard}
                className="max-w-[42vw] rounded-lg px-2 py-1 text-base font-semibold tracking-[-0.02em] text-white hover:bg-white/10 md:max-w-[420px]"
                inputClassName="h-9 w-[min(52vw,420px)] text-base font-semibold"
              />
              {member && (
                <button
                  type="button"
                  onClick={toggleStar}
                  aria-label={starred ? "Unstar board" : "Star board"}
                  aria-pressed={starred}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-white transition-colors hover:bg-white/10"
                >
                  <Star
                    className={`h-4 w-4 ${starred ? "fill-[#F2B84B] text-[#F2B84B]" : ""}`}
                  />
                </button>
              )}
              <span className="hidden h-7 shrink-0 items-center gap-1.5 rounded-md bg-white/10 px-2 text-xs text-white/80 lg:inline-flex">
                {board.visibility === "team" ? (
                  <Globe2 className="h-3.5 w-3.5" />
                ) : (
                  <Lock className="h-3.5 w-3.5" />
                )}
                {board.visibility === "team" ? "Team" : "Private"}
              </span>
              {!editable && (
                <span className="hidden h-7 shrink-0 items-center rounded-md bg-white/10 px-2 text-xs text-white/80 sm:inline-flex">
                  View only
                </span>
              )}
            </>
          }
        >
          {visibleIds && (
            <span className="hidden h-9 items-center gap-1 rounded-lg bg-white/10 pl-3 pr-1 text-sm text-white md:inline-flex">
              {visibleIds.size} of {data.cards.length} cards
              <button
                type="button"
                onClick={() => setFilter(parseFilter({}))}
                aria-label="Clear filters"
                className="grid h-7 w-7 place-items-center rounded-md hover:bg-white/15"
              >
                <X className="h-4 w-4" />
              </button>
            </span>
          )}
          <MembersButton
            people={data.people}
            canInvite={isOwner(role)}
            onOpen={() => {
              setMenuView("members");
              setMenuOpen(true);
            }}
          />
          <div className="relative">
            <button
              type="button"
              onClick={() => setFilterOpen((o) => !o)}
              aria-expanded={filterOpen}
              className={
                activeFilters
                  ? `${BAR_BUTTON} bg-white text-[#0B2A22] hover:bg-white/90`
                  : BAR_BUTTON
              }
            >
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">Filter</span>
              {activeFilters > 0 && (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[#45DFB1] px-1 text-xs font-medium text-[#0B2A22]">
                  {activeFilters}
                </span>
              )}
            </button>
            <FilterPanel
              open={filterOpen}
              onClose={() => setFilterOpen(false)}
              filter={filter}
              onChange={setFilter}
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setMenuView("main");
              setMenuOpen(true);
            }}
            aria-label="Show menu"
            className={`${BAR_BUTTON} w-9 justify-center px-0`}
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </KanbanHeader>

        <div
          className="min-h-0 flex-1"
          onMouseOver={(e) => {
            hoverRef.current =
              (e.target as HTMLElement)
                .closest("[data-card-id]")
                ?.getAttribute("data-card-id") ?? null;
          }}
          onMouseLeave={() => {
            hoverRef.current = null;
          }}
        >
          <BoardCanvas
            lists={data.lists}
            cards={data.cards}
            labelsByCard={labelsByCard}
            membersByCard={membersByCard}
            editable={editable}
            onMoveCard={moveCard}
            onMoveList={moveList}
            onCreateCard={addCard}
            onCreateList={addList}
            onRenameList={renameList}
            onArchiveList={archiveList}
            onArchiveCard={archiveCard}
            onOpenCard={openCard}
            badges={data.badges}
            visibleIds={visibleIds}
            covers={covers}
            watched={watched}
          />
        </div>
        <BoardMenu open={menuOpen} initialView={menuView} onClose={() => setMenuOpen(false)} />
        <ShortcutsDialog
          open={shortcutsOpen}
          onClose={() => setShortcutsOpen(false)}
        />
        <Outlet />
        <Toasts toasts={toasts} dismiss={dismiss} />
      </div>
    </BoardContext.Provider>
  );
}

// Merge one realtime row into a list of rows: archived rows leave the board,
// deletes drop by id, everything else is inserted or replaced.
function mergeRow<T extends { id: string; archived_at?: string | null }>(
  rows: T[],
  event: RealtimeEvent,
  row: T,
  id: string,
): T[] {
  if (event === "DELETE" || row.archived_at)
    return rows.filter((r) => r.id !== id);
  return rows.some((r) => r.id === row.id)
    ? rows.map((r) => (r.id === row.id ? { ...r, ...row } : r))
    : [...rows, row];
}

// Move keyboard focus between cards: up/down within a list, left/right to the
// nearest list that has cards (keeping roughly the same row).
function focusCard(dir: "up" | "down" | "left" | "right") {
  const lists = [
    ...document.querySelectorAll<HTMLElement>('section[aria-label^="List "]'),
  ]
    .map((s) => [...s.querySelectorAll<HTMLElement>("[data-card-id]")])
    .filter((cards) => cards.length > 0);
  if (lists.length === 0) return;
  const current = (
    document.activeElement as HTMLElement | null
  )?.closest<HTMLElement>("[data-card-id]");
  let li = lists.findIndex((cards) => current && cards.includes(current));
  if (li < 0) {
    lists[0][0].focus();
    return;
  }
  let ci = lists[li].indexOf(current!);
  if (dir === "down") ci = Math.min(ci + 1, lists[li].length - 1);
  if (dir === "up") ci = Math.max(ci - 1, 0);
  if (dir === "left" || dir === "right") {
    li = Math.max(
      0,
      Math.min(lists.length - 1, li + (dir === "left" ? -1 : 1)),
    );
    ci = Math.min(ci, lists[li].length - 1);
  }
  const el = lists[li][ci];
  el.focus();
  el.scrollIntoView({ block: "nearest", inline: "nearest" });
}
