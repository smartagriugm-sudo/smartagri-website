import { describe, expect, it } from "vitest";
import { mapBackground, mapLabelColor, mapTrelloBoard, trelloIdDate } from "./trello-map.mjs";

// Synthetic export: same shape as Trello's JSON, made-up content.
const exportJson = {
  name: "Lab plan",
  desc: "Board for the lab",
  prefs: { background: "green" },
  labels: [
    { id: "L1", name: "Lab", color: "blue" },
    { id: "L2", name: "", color: "yellow_dark" },
  ],
  members: [
    { id: "M1", username: "andi", fullName: "Andi Saputra" },
    { id: "M2", username: "budi", fullName: "Budi" },
  ],
  lists: [
    { id: "B", name: "Doing", pos: 140000, closed: false },
    { id: "A", name: "To do", pos: 65535, closed: false },
    { id: "Z", name: "Old", pos: 999999, closed: true },
  ],
  cards: [
    {
      id: "5b7a539ac730f43f5ed61f16",
      idShort: 2,
      idList: "A",
      name: "Second",
      desc: "",
      pos: 32768,
      closed: false,
      idLabels: ["L1", "L2", "LX"],
      idMembers: ["M1", "M2"],
      due: "2026-10-30T07:00:00.000Z",
      dueComplete: true,
      cover: { color: "sky" },
      attachments: [
        { name: "Spec", url: "https://example.org/spec.pdf", bytes: 10 },
        { name: "photo.png", url: "https://trello.com/1/cards/x/attachments/y/download/photo.png", isUpload: true },
      ],
    },
    { id: "c1", idShort: 1, idList: "A", name: "First", desc: "x", pos: 16384, closed: false, idLabels: [], idMembers: [] },
    { id: "c3", idShort: 3, idList: "B", name: "Archived", pos: 1, closed: true, dateLastActivity: "2025-01-01T00:00:00.000Z" },
    { id: "c4", idShort: 4, idList: "GONE", name: "Orphan", pos: 1 },
  ],
  checklists: [
    {
      id: "K1",
      idCard: "c1",
      name: "Steps",
      pos: 5,
      checkItems: [
        { id: "i2", name: "Weigh", pos: 20, state: "incomplete" },
        { id: "i1", name: "Clean", pos: 10, state: "complete" },
        { id: "i3", name: "  ", pos: 30, state: "incomplete" },
      ],
    },
  ],
  actions: [
    { type: "commentCard", date: "2024-05-03T06:09:00.000Z", data: { card: { id: "c1" }, text: "Later" }, memberCreator: { fullName: "Budi" } },
    { type: "commentCard", date: "2024-05-02T06:09:00.000Z", data: { card: { id: "c1" }, text: "Earlier" }, memberCreator: { fullName: "Andi" } },
    { type: "updateCard", data: { card: { id: "c1" } } },
  ],
};

let n = 0;
const result = mapTrelloBoard(exportJson, { memberMap: { andi: "Andi@UGM.ac.id" }, newId: () => `id-${++n}` });

describe("trello mapping", () => {
  it("maps colours and backgrounds onto the smartagri palette", () => {
    expect(mapLabelColor("yellow_dark")).toBe("amber");
    expect(mapLabelColor(null)).toBe("slate");
    expect(mapBackground("green")).toBe("mint");
    expect(result.board).toEqual({ name: "Lab plan", description: "Board for the lab", background: "mint" });
  });

  it("orders lists by Trello position and keeps closed ones archived", () => {
    const byPos = [...result.lists].sort((a, b) => a.pos - b.pos);
    expect(byPos.map((l) => l.name)).toEqual(["To do", "Doing", "Old"]);
    expect(byPos.map((l) => l.pos)).toEqual([1024, 2048, 3072]);
    expect(result.lists.find((l) => l.name === "Old")?.archived_at).toBeTruthy();
  });

  it("keeps Trello card order and numbering, skips cards without a list", () => {
    expect(result.cards.map((c) => c.title)).toEqual(["First", "Second", "Archived"]);
    const todo = result.cards.filter((c) => c.title !== "Archived").sort((a, b) => a.pos - b.pos);
    expect(todo.map((c) => c.title)).toEqual(["First", "Second"]);
    expect(result.cards.find((c) => c.title === "Archived")?.archived_at).toBe("2025-01-01T00:00:00.000Z");
    expect(result.warnings.some((w) => w.includes("1 card(s) skipped"))).toBe(true);
  });

  it("maps card fields, labels, cover colour and mapped members only", () => {
    const second = result.cards.find((c) => c.title === "Second");
    expect(second).toMatchObject({ due_complete: true, cover_color: "cyan", due_at: "2026-10-30T07:00:00.000Z" });
    expect(second?.created_at).toBe(trelloIdDate("5b7a539ac730f43f5ed61f16"));
    expect(result.cardLabels.filter((cl) => cl.card_id === second?.id)).toHaveLength(2);
    expect(result.cardMembers).toEqual([{ card_id: second?.id, email: "andi@ugm.ac.id" }]);
    expect(result.emails).toEqual(["andi@ugm.ac.id"]);
    expect(result.warnings.some((w) => w.includes("Budi"))).toBe(true);
  });

  it("imports checklists in order and drops empty items", () => {
    expect(result.checklists).toHaveLength(1);
    const items = [...result.items].sort((a, b) => a.pos - b.pos);
    expect(items.map((i) => [i.text, i.done])).toEqual([
      ["Clean", true],
      ["Weigh", false],
    ]);
  });

  it("turns comment actions into attributed comments, oldest first", () => {
    expect(result.comments.map((c) => c.created_at)).toEqual(["2024-05-02T06:09:00.000Z", "2024-05-03T06:09:00.000Z"]);
    expect(result.comments[0].body).toContain("**Andi** on 2024-05-02");
    expect(result.comments[0].body).toContain("Earlier");
  });

  it("keeps outside links and leaves Trello-hosted files out unless asked", () => {
    expect(result.attachments).toEqual([
      expect.objectContaining({ name: "Spec", url: "https://example.org/spec.pdf", bytes: 10 }),
    ]);
    expect(result.warnings.some((w) => w.includes("1 file(s) uploaded to Trello"))).toBe(true);
    const withFiles = mapTrelloBoard(exportJson, { includeTrelloFiles: true, newId: () => "x" });
    expect(withFiles.attachments).toHaveLength(2);
  });

  it("lists image covers for the API, or reports them when there is no API", () => {
    const withCover = {
      ...exportJson,
      actions: [],
      cards: [
        {
          id: "cc",
          idShort: 9,
          idList: "A",
          name: "With cover",
          pos: 1,
          cover: { idAttachment: "AT1" },
          attachments: [
            {
              id: "AT1",
              name: "photo.jpg",
              url: "https://trello.com/1/cards/cc/attachments/AT1/download/photo.jpg",
              isUpload: true,
              mimeType: "image/jpeg",
              previews: [{ url: "https://trello.com/p/600.jpg", width: 600, height: 400 }],
            },
          ],
        },
      ],
    };
    const offline = mapTrelloBoard(withCover, { newId: () => "x" });
    expect(offline.covers).toEqual([]);
    expect(offline.warnings.some((w) => w.includes("1 image cover(s) not imported"))).toBe(true);

    const online = mapTrelloBoard(withCover, { newId: () => "x", coversFromApi: true, includeTrelloFiles: true });
    expect(online.covers).toEqual([
      expect.objectContaining({
        card_id: "x",
        attachment: expect.objectContaining({ id: "AT1", name: "photo.jpg", previews: [expect.objectContaining({ width: 600 })] }),
      }),
    ]);
    // The cover image is stored by the API step, not also kept as a link.
    expect(online.attachments).toEqual([]);
    expect(online.warnings.some((w) => w.includes("image cover"))).toBe(false);
  });

  it("drops the 1000-action note once comments come from the API", () => {
    const many = { ...exportJson, actions: Array.from({ length: 1000 }, () => ({ type: "updateCard" })) };
    expect(mapTrelloBoard(many).warnings.some((w) => w.includes("1000 actions"))).toBe(true);
    expect(mapTrelloBoard(many, { completeComments: true }).warnings.some((w) => w.includes("1000 actions"))).toBe(false);
  });

  it("rejects files that are not a board export", () => {
    expect(() => mapTrelloBoard({ name: "x" })).toThrow(/Trello board export/);
  });
});
