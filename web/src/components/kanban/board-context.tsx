// Board state and actions shared with the card modal (a child route rendered
// through the board page's <Outlet />) and the board menu. The board page owns
// the data and the optimistic updates; the others call these.
import { createContext, useContext } from "react";
import type { KanbanCard, KanbanLabel, LabelColor } from "../../lib/kanban";
import type { BoardData, CardBadge } from "../../lib/kanban-data";
import type { ToastMessage } from "./parts";

export type CardPatch = Partial<
  Pick<
    KanbanCard,
    "title" | "description" | "start_at" | "due_at" | "due_complete" | "cover_attachment_id" | "cover_color" | "status"
  >
>;

export type BoardContextValue = {
  data: BoardData;
  editable: boolean;
  owner: boolean;
  // Bumped when another session changes checklists, comments, attachments or
  // activity; an open card re-reads its details.
  detailVersion: number;
  userId: string | null;
  // Direct state update for the board menu after its own Supabase calls.
  updateData: (fn: (d: BoardData) => BoardData) => void;
  goToBoards: () => void;
  openCard: (card: KanbanCard) => void;
  showShortcuts: () => void;
  push: (msg: Omit<ToastMessage, "id">) => void;
  patchCard: (id: string, patch: CardPatch) => Promise<boolean>;
  moveCardToList: (id: string, listId: string) => Promise<void>;
  archiveCard: (id: string) => Promise<void>;
  toggleLabel: (cardId: string, labelId: string) => Promise<void>;
  createLabel: (name: string, color: LabelColor) => Promise<KanbanLabel | null>;
  toggleMember: (cardId: string, userId: string) => Promise<void>;
  setBadge: (cardId: string, patch: Partial<CardBadge>) => void;
  closeCard: () => void;
  // Cards the signed-in user watches; null until kanban-card-extras.sql is installed.
  watched: Set<string> | null;
  setWatch: (cardId: string, on: boolean) => Promise<void>;
};

export const BoardContext = createContext<BoardContextValue | null>(null);

export function useBoard(): BoardContextValue {
  const ctx = useContext(BoardContext);
  if (!ctx) throw new Error("useBoard must be used inside the board page");
  return ctx;
}
