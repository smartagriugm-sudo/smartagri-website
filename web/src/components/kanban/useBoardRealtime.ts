// Live updates for one board through Supabase Realtime (postgres_changes).
// Inserts and updates are filtered on board_id and pass RLS, so only rows this
// user may read arrive. Deletes cannot be filtered and carry only the primary
// key; the caller drops matching rows it holds. After a dropped connection the
// caller reloads the board, since missed events are not replayed.
import { useEffect, useRef } from "react";
import { supabase } from "../../lib/auth/supabase";

export const REALTIME_TABLES = [
  "kanban_lists",
  "kanban_cards",
  "kanban_labels",
  "kanban_card_labels",
  "kanban_card_members",
  "kanban_board_members",
  "kanban_checklists",
  "kanban_checklist_items",
  "kanban_card_comments",
  "kanban_card_attachments",
  "kanban_card_activity",
] as const;

export type RealtimeTable = (typeof REALTIME_TABLES)[number] | "kanban_boards";
export type RealtimeEvent = "INSERT" | "UPDATE" | "DELETE";
export type RealtimeRow = Record<string, unknown>;

export type RealtimeHandlers = {
  onChange: (table: RealtimeTable, event: RealtimeEvent, row: RealtimeRow, old: RealtimeRow) => void;
  onReconnect: () => void;
};

export function useBoardRealtime(boardId: string | null, handlers: RealtimeHandlers) {
  const ref = useRef(handlers);
  ref.current = handlers;

  useEffect(() => {
    if (!boardId || !supabase) return;
    const db = supabase;
    let connected = false;
    const emit =
      (table: RealtimeTable) =>
      (payload: { eventType: RealtimeEvent; new: RealtimeRow; old: RealtimeRow }) =>
        ref.current.onChange(table, payload.eventType, payload.new ?? {}, payload.old ?? {});

    let channel = db.channel(`kanban:${boardId}`);
    for (const table of REALTIME_TABLES) {
      const filter = `board_id=eq.${boardId}`;
      channel = channel
        .on("postgres_changes", { event: "INSERT", schema: "public", table, filter }, emit(table))
        .on("postgres_changes", { event: "UPDATE", schema: "public", table, filter }, emit(table))
        .on("postgres_changes", { event: "DELETE", schema: "public", table }, emit(table));
    }
    channel = channel
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "kanban_boards", filter: `id=eq.${boardId}` }, emit("kanban_boards"))
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "kanban_boards" }, emit("kanban_boards"));

    channel.subscribe((status) => {
      if (status !== "SUBSCRIBED") return;
      if (connected) ref.current.onReconnect();
      connected = true;
    });

    return () => {
      void db.removeChannel(channel);
    };
  }, [boardId]);
}
