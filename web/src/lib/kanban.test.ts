import { describe, expect, it } from "vitest";
import {
  EMPTY_FILTER,
  MIN_POS_GAP,
  POS_GAP,
  byPos,
  canEdit,
  cardPath,
  checklistProgress,
  describeActivity,
  dueState,
  filterCards,
  filterCount,
  filterToSearch,
  initials,
  parseFilter,
  parseImportedComment,
  positionAt,
  positionBetween,
  timeAgo,
  type CardFilter,
} from "./kanban";

describe("positionBetween", () => {
  it("starts an empty list at POS_GAP", () => {
    expect(positionBetween(null, null)).toBe(POS_GAP);
  });
  it("appends below the last item", () => {
    expect(positionBetween(2048, null)).toBe(2048 + POS_GAP);
  });
  it("prepends at half of the first item", () => {
    expect(positionBetween(null, 1024)).toBe(512);
  });
  it("takes the midpoint between neighbours", () => {
    expect(positionBetween(4096, 4608)).toBe(4352);
  });
});

describe("positionAt", () => {
  const siblings = [{ pos: 1024 }, { pos: 2048 }, { pos: 3072 }];

  it("places at the top, middle and bottom", () => {
    expect(positionAt(siblings, 0).pos).toBe(512);
    expect(positionAt(siblings, 1).pos).toBe(1536);
    expect(positionAt(siblings, 3).pos).toBe(3072 + POS_GAP);
  });
  it("clamps an out-of-range index", () => {
    expect(positionAt(siblings, 99).pos).toBe(3072 + POS_GAP);
    expect(positionAt(siblings, -5).pos).toBe(512);
  });
  it("keeps order after many inserts at the same spot", () => {
    const items = [{ pos: 1024 }, { pos: 2048 }];
    for (let n = 0; n < 30; n++) {
      items.splice(1, 0, { pos: positionAt(items, 1).pos });
    }
    const sorted = [...items].sort(byPos);
    expect(sorted).toEqual(items.sort(byPos));
    expect(new Set(items.map((i) => i.pos)).size).toBe(items.length);
  });
  it("asks for a rebalance once neighbours are too close", () => {
    const tight = [{ pos: 1 }, { pos: 1 + MIN_POS_GAP }];
    expect(positionAt(tight, 1).rebalance).toBe(true);
    expect(positionAt(siblings, 1).rebalance).toBe(false);
  });
});

describe("helpers", () => {
  it("lets only owners and members edit", () => {
    expect(canEdit("owner")).toBe(true);
    expect(canEdit("member")).toBe(true);
    expect(canEdit("viewer")).toBe(false);
    expect(canEdit(null)).toBe(false);
  });
  it("builds card URLs", () => {
    expect(cardPath("ab12cd34", 7)).toBe("/kanban/ab12cd34/c/7");
  });
  it("computes checklist progress", () => {
    expect(checklistProgress([])).toEqual({ done: 0, total: 0, percent: 0 });
    expect(checklistProgress([{ done: true }, { done: false }, { done: true }])).toEqual({
      done: 2,
      total: 3,
      percent: 67,
    });
  });
  it("classifies due dates", () => {
    const now = new Date("2026-10-23T12:00:00Z");
    expect(dueState({ due_at: null, due_complete: false }, now)).toBeNull();
    expect(dueState({ due_at: "2026-10-22T12:00:00Z", due_complete: true }, now)).toBe("complete");
    expect(dueState({ due_at: "2026-10-22T12:00:00Z", due_complete: false }, now)).toBe("overdue");
    expect(dueState({ due_at: "2026-10-23T20:00:00Z", due_complete: false }, now)).toBe("soon");
    expect(dueState({ due_at: "2026-11-01T00:00:00Z", due_complete: false }, now)).toBe("later");
  });
  it("derives initials", () => {
    expect(initials("Athala Fawwaz")).toBe("AF");
    expect(initials("Andi")).toBe("A");
    expect(initials("  ")).toBe("?");
  });
});

describe("describeActivity", () => {
  it("describes moves, labels, members and items", () => {
    expect(describeActivity({ type: "card.moved", data: { from_list: "To do", to_list: "Done" } })).toBe(
      "moved this card from To do to Done",
    );
    expect(describeActivity({ type: "label.added", data: { label: "Lab", color: "teal" } })).toBe("added Lab");
    expect(describeActivity({ type: "label.added", data: { label: "", color: "amber" } })).toBe("added amber label");
    expect(describeActivity({ type: "member.added", data: { user_id: "u1" } }, () => "Athala")).toBe(
      "added Athala to this card",
    );
    expect(describeActivity({ type: "item.completed", data: { item: "Weigh samples" } })).toBe("completed Weigh samples");
    expect(describeActivity({ type: "card.dates_changed", data: { due_at: null, start_at: null } })).toBe(
      "removed the dates",
    );
  });
});

describe("timeAgo", () => {
  const now = new Date("2026-10-23T12:00:00Z");
  it("uses relative wording, then a date", () => {
    expect(timeAgo("2026-10-23T11:59:50Z", now)).toBe("just now");
    expect(timeAgo("2026-10-23T11:55:00Z", now)).toBe("5 minutes ago");
    expect(timeAgo("2026-10-23T09:00:00Z", now)).toBe("3 hours ago");
    expect(timeAgo("2026-10-21T12:00:00Z", now)).toBe("2 days ago");
    expect(timeAgo("2026-09-01T12:00:00Z", now)).toBe("Sep 1, 2026");
  });
});

describe("filters", () => {
  const now = new Date("2026-10-23T12:00:00Z");
  const base = { description: "", due_at: null as string | null, due_complete: false, updated_at: "2026-10-22T12:00:00Z" };
  const cards = [
    { ...base, id: "a", title: "Calibrate SPAD", due_at: "2026-10-22T12:00:00Z" }, // overdue
    { ...base, id: "b", title: "Draft methods", due_at: "2026-10-23T20:00:00Z" }, // due within a day
    { ...base, id: "c", title: "Old idea", updated_at: "2026-08-01T00:00:00Z" }, // stale, no due
    { ...base, id: "d", title: "Report", due_at: "2026-10-20T00:00:00Z", due_complete: true },
  ];
  const labels: Record<string, string[]> = { a: ["lab"], b: ["lab", "pub"], c: [], d: ["pub"] };
  const members: Record<string, string[]> = { a: ["u1"], b: [], c: ["u2"], d: ["u1"] };
  const names: Record<string, string> = { lab: "Lab", pub: "Publication", u1: "Athala", u2: "Andi" };
  const ctx = {
    labelIds: (id: string) => labels[id],
    memberIds: (id: string) => members[id],
    labelName: (id: string) => names[id] ?? "",
    personName: (id: string) => names[id] ?? "",
    me: "u1",
    now,
  };
  const run = (f: Partial<CardFilter>) => [...filterCards(cards, { ...EMPTY_FILTER, ...f }, ctx)].sort().join("");

  it("passes everything without criteria", () => {
    expect(run({})).toBe("abcd");
  });
  it("matches the keyword against title, labels and member names", () => {
    expect(run({ q: "draft" })).toBe("b");
    expect(run({ q: "publication" })).toBe("bd");
    expect(run({ q: "andi" })).toBe("c");
  });
  it("filters members, me and no members", () => {
    expect(run({ members: ["me"] })).toBe("ad");
    expect(run({ members: ["none"] })).toBe("b");
  });
  it("filters labels and due windows", () => {
    expect(run({ labels: ["none"] })).toBe("c");
    expect(run({ due: ["overdue"] })).toBe("a");
    expect(run({ due: ["day"] })).toBe("b");
    expect(run({ due: ["none"] })).toBe("c");
  });
  it("filters status and activity", () => {
    expect(run({ status: "complete" })).toBe("d");
    expect(run({ activity: "stale" })).toBe("c");
  });
  it("combines criteria as any or all, keyword always required", () => {
    expect(run({ labels: ["lab"], members: ["me"] })).toBe("abd");
    expect(run({ labels: ["lab"], members: ["me"], mode: "all" })).toBe("a");
    expect(run({ q: "report", labels: ["lab"], members: ["me"] })).toBe("d");
  });
  it("round-trips through URL search params", () => {
    const f: CardFilter = { ...EMPTY_FILTER, q: "spad", labels: ["lab", "none"], due: ["week"], mode: "all" };
    expect(parseFilter(filterToSearch(f))).toEqual(f);
    expect(filterToSearch(EMPTY_FILTER)).toEqual({});
    expect(filterCount(f)).toBe(4);
  });
});

describe("parseImportedComment", () => {
  it("reads the original author and keeps the rest as the body", () => {
    expect(parseImportedComment("_From Trello, by **Ardan Wiratmoko** on 2026-09-28:_\n\nTemplate PPT")).toEqual({
      author: "Ardan Wiratmoko",
      date: "2026-09-28",
      text: "Template PPT",
    });
    expect(parseImportedComment("_From Trello, by **SMC A**:_\n\nHi")).toEqual({ author: "SMC A", date: null, text: "Hi" });
  });
  it("leaves ordinary comments alone", () => {
    expect(parseImportedComment("_From the original board, by **Budi** on 2026-03-04:_\n\nOk")).toEqual({
      author: "Budi",
      date: "2026-03-04",
      text: "Ok",
    });
    expect(parseImportedComment("Sensor sudah dibersihkan")).toBeNull();
    expect(parseImportedComment("From Trello, by **X** on 2026-01-01: not the import header")).toBeNull();
  });
});
