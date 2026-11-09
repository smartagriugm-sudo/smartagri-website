import { describe, expect, it } from "vitest";
import { matchScore, searchErp, type SearchSource } from "./erp-search";

const source: SearchSource = {
  pages: [
    { to: "/erp/batch", label: "Batch", group: "Growing" },
    { to: "/erp/alarms", label: "Alarm", group: "Monitoring" },
    { to: "/erp/stock", label: "Stock", group: "Inventory" },
  ],
  batches: [
    { id: "b1", code: "B-2026-014", crop: "Grand Rapids lettuce", stage: "In the plant factory" },
    { code: "B-2026-015", crop: "Pakcoy" },
  ],
  isHole: (c) => c === "R1-T1-G1-H01",
  isSlot: (c) => c === "CH1-S1-P1",
};

describe("matchScore", () => {
  it("misses when a word is absent and ranks the start of the title first", () => {
    expect(matchScore("kangkung", "Batch", "Growing")).toBe(0);
    expect(matchScore("sto", "Stock")).toBe(3);
    expect(matchScore("toc", "Stock")).toBe(2);
    expect(matchScore("monitoring", "Alarm", "Monitoring")).toBe(1);
  });
});

describe("searchErp", () => {
  it("returns nothing for a blank query", () => {
    expect(searchErp("   ", source)).toEqual([]);
  });

  it("finds a batch by its crop and links to its page when it has an id", () => {
    const [hit] = searchErp("lettuce", source);
    expect(hit).toMatchObject({ kind: "Batch", title: "B-2026-014", to: "/erp/batch/$id", params: { id: "b1" } });
  });

  it("sends a batch with no record to the batch list", () => {
    expect(searchErp("pakcoy", source)[0]).toMatchObject({ to: "/erp/batch" });
  });

  it("puts an exact hole or tray code first, in any case", () => {
    expect(searchErp("r1-t1-g1-h01", source)[0]).toMatchObject({ kind: "Hole", search: { hole: "R1-T1-G1-H01" } });
    expect(searchErp("ch1-s1-p1", source)[0]).toMatchObject({ kind: "Tray", search: { slot: "CH1-S1-P1" } });
  });

  it("honours the limit", () => {
    expect(searchErp("b", source, 2)).toHaveLength(2);
  });
});
