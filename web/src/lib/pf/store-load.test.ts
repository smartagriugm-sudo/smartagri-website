import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchErpSnapshot, type ErpSnapshot } from "./batch";
import { ErpDataError } from "./foundation";
import { ErpStore } from "./store";

vi.mock("./batch", async (importOriginal) => ({ ...(await importOriginal<typeof import("./batch")>()), fetchErpSnapshot: vi.fn() }));

const fetchSnapshot = vi.mocked(fetchErpSnapshot);
const empty: ErpSnapshot = { today: "2026-11-06", batches: [], slots: [], phases: [], locations: [] };

describe("what a load leaves behind", () => {
  beforeEach(() => {
    fetchSnapshot.mockReset();
  });

  it("has no data to count before the first load answers", () => {
    const s = new ErpStore();
    expect(s.mode).toBe("loading");
    expect(s.hasData).toBe(false);
  });

  it("reports a failed first load without claiming data", async () => {
    fetchSnapshot.mockRejectedValue(new TypeError("Failed to fetch"));
    const s = new ErpStore();
    await s.load();
    expect(s.mode).toBe("error");
    expect(s.hasData).toBe(false);
    expect(s.loadError).toMatch(/^Tidak bisa terhubung/);
  });

  it("keeps what it had when a later load fails, and recovers", async () => {
    const s = new ErpStore();
    fetchSnapshot.mockResolvedValue(empty);
    await s.load();
    expect(s.mode).toBe("live");

    fetchSnapshot.mockRejectedValue(new Error("Failed to fetch"));
    await s.load();
    expect(s.mode).toBe("error");
    expect(s.hasData).toBe(true);

    fetchSnapshot.mockResolvedValue(empty);
    await s.load();
    expect(s.mode).toBe("live");
    expect(s.loadError).toBeNull();
  });

  it("falls back to the sample data only where the tables are missing", async () => {
    fetchSnapshot.mockRejectedValue(new ErpDataError("no table", true));
    const s = new ErpStore();
    await s.load();
    expect(s.mode).toBe("sample");
    expect(s.hasData).toBe(true);
    expect(s.loadError).toBeNull();
  });
});
