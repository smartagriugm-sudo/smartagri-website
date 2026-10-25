import { describe, expect, it } from "vitest";
import { STANDARD_LABELS, commentHeader, planRestructure } from "./kanban-restructure-map.mjs";

const NOW = Date.parse("2026-10-23T00:00:00Z");
const RECENT = "2026-09-01T00:00:00Z";
const OLD = "2024-01-01T00:00:00Z";

// Synthetic board with made-up content, shaped like the kanban_* rows.
const src = {
  lists: [
    { id: "l1", name: "Draft Publication", pos: 2048 },
    { id: "l2", name: "GRADUATE STUDENTS", pos: 1024 },
    { id: "l3", name: "REFERENCES", pos: 3072 },
    { id: "l4", name: "ARSIP CONFERENCE", pos: 4096 },
    { id: "l5", name: "Ideas", pos: 5120 },
  ],
  cards: [
    { id: "c1", list_id: "l1", pos: 2, created_at: OLD, archived_at: null },
    { id: "c2", list_id: "l1", pos: 1, created_at: RECENT, archived_at: null },
    { id: "c3", list_id: "l2", pos: 1, created_at: OLD, archived_at: null },
    { id: "c4", list_id: "l2", pos: 2, created_at: OLD, archived_at: null },
    { id: "c5", list_id: "l3", pos: 1, created_at: OLD, archived_at: null },
    { id: "c6", list_id: "l4", pos: 1, created_at: RECENT, archived_at: null },
    { id: "c7", list_id: "l5", pos: 1, created_at: RECENT, archived_at: null },
    { id: "c8", list_id: "l1", pos: 3, created_at: RECENT, archived_at: "2026-02-01T00:00:00Z" },
  ],
  labels: [
    { id: "a", name: "FMS Project", color: "violet" },
    { id: "b", name: "Publication Paper", color: "slate" },
    { id: "c", name: "Publikasi", color: "lime" },
    { id: "d", name: "PROJECT", color: "green" },
    { id: "e", name: "YOLO Object Detection Model", color: "slate" },
  ],
  cardLabels: [
    { card_id: "c2", label_id: "a" },
    { card_id: "c2", label_id: "b" },
    { card_id: "c2", label_id: "c" },
    { card_id: "c2", label_id: "d" },
    { card_id: "c5", label_id: "e" },
  ],
};

const plan = planRestructure(src, { now: NOW, lastActivity: new Map([["c4", RECENT]]) });
const card = (id) => plan.cards.find((c) => c.srcId === id);

describe("planRestructure", () => {
  it("sends each list to its board and keeps the card order", () => {
    expect(card("c2")).toMatchObject({ board: "publikasi", list: "Draft", pos: 1024, archivedAt: null });
    expect(card("c1")).toMatchObject({ board: "publikasi", list: "Draft", pos: 2048 });
    expect(card("c5")).toMatchObject({ board: "library", list: "Referensi", archivedAt: null });
  });

  it("archives stale work, the old archive lists, and keeps earlier archive dates", () => {
    expect(card("c1").reason).toBe("stale");
    expect(card("c6")).toMatchObject({ board: "library", list: "Konferensi", reason: "archive-list" });
    expect(card("c8")).toMatchObject({ reason: "already", archivedAt: "2026-02-01T00:00:00Z" });
    expect(plan.newlyArchived).toEqual({ stale: 2, archiveList: 1 });
  });

  it("puts students in Riset Mahasiswa and uses the given last activity", () => {
    expect(card("c3")).toMatchObject({ board: "riset", list: "Mahasiswa", reason: "stale" });
    expect(card("c4")).toMatchObject({ board: "riset", list: "Mahasiswa", archivedAt: null });
  });

  it("creates the assistant board empty and gives Riset Mahasiswa the degree labels", () => {
    const assistant = plan.boards.find((b) => b.key === "assistant");
    expect(assistant).toMatchObject({ name: "SmartAgri Assistant", open: 0, archived: 0 });
    const riset = plan.boards.find((b) => b.key === "riset").labels.map((l) => l.name);
    expect(riset).toEqual(expect.arrayContaining(["S1", "S2", "S3"]));
  });

  it("reports lists without a target instead of guessing", () => {
    expect(card("c7")).toBeUndefined();
    expect(plan.unmapped).toEqual([{ name: "Ideas", count: 1 }]);
  });

  it("merges labels into the taxonomy and keeps topic labels where used", () => {
    expect(plan.cardLabels.filter((l) => l.srcCard === "c2").map((l) => l.label)).toEqual(["FMS", "Publikasi"]);
    expect(plan.droppedLabelUses).toBe(1);
    const lib = plan.boards.find((b) => b.key === "library").labels.map((l) => l.name);
    expect(lib).toContain("YOLO Object Detection Model");
    const pub = plan.boards.find((b) => b.key === "publikasi").labels;
    expect(pub).toHaveLength(STANDARD_LABELS.length);
  });
});

describe("commentHeader", () => {
  it("names the author and the day", () => {
    expect(commentHeader("Budi", "2026-03-04T10:00:00Z")).toBe("_From the original board, by **Budi** on 2026-03-04:_\n\n");
  });
});
