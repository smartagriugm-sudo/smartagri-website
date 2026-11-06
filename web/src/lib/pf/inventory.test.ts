import { describe, expect, it } from "vitest";
import { formatQty, parseCountRows, parseItemForm, parseMaterialRows, parsePoForm, parseQtyInput, parseReceive, poFormTotal, poStage, type ItemForm } from "./inventory";

describe("a purchase order's stage", () => {
  it("follows what has arrived", () => {
    const p = { status: "dipesan" as const, open_lines: 2, received_lines: 0 };
    expect(poStage({ ...p, status: "draf" })).toBe("draf");
    expect(poStage(p)).toBe("menunggu");
    expect(poStage({ ...p, received_lines: 1 })).toBe("sebagian");
    expect(poStage({ ...p, open_lines: 0, received_lines: 2 })).toBe("diterima");
    expect(poStage({ ...p, status: "batal" })).toBe("batal");
  });
});

describe("forms", () => {
  const item: ItemForm = { name: "Rockwool", category: "media", unit: "pcs", reorder: "100", expires: false, notes: "", active: true };

  it("checks an item", () => {
    expect(parseItemForm(item)).toEqual({ error: null, reorder: 100 });
    expect(parseItemForm({ ...item, reorder: "" })).toEqual({ error: null, reorder: null });
    expect(parseItemForm({ ...item, name: " " }).error).toMatch(/Nama/);
    expect(parseItemForm({ ...item, reorder: "-1" }).error).toMatch(/minimum/);
  });

  it("reads a decimal comma", () => {
    expect(parseQtyInput("2,5")).toEqual({ error: null, qty: 2.5 });
    expect(parseQtyInput("0").error).toMatch(/lebih dari 0/);
    expect(parseQtyInput("").error).toMatch(/lebih dari 0/);
  });

  it("checks what arrives", () => {
    const today = "2026-11-06";
    const f = { lotNo: "L1", qty: "5", receivedOn: today, expiryOn: "" };
    expect(parseReceive(f, today, false)).toEqual({ error: null, qty: 5 });
    expect(parseReceive({ ...f, lotNo: "" }, today, false).error).toMatch(/lot/);
    expect(parseReceive(f, today, true).error).toMatch(/kedaluwarsa wajib/);
    expect(parseReceive({ ...f, expiryOn: "2026-11-01" }, today, false).error).toMatch(/sebelum/);
    expect(parseReceive({ ...f, receivedOn: "2026-11-07" }, today, false).error).toMatch(/masa depan/);
    expect(parseReceive(f, today, false, 4).error).toMatch(/Melebihi/);
    expect(parseReceive(f, today, false, 5).error).toBeNull();
  });

  it("names the row that is wrong on a purchase order", () => {
    const row = { itemId: "i", qty: "10", unitPrice: "1.500" };
    expect(parsePoForm("s", "2026-11-06", "", [row])).toEqual({ error: null, lines: [{ item_id: "i", qty: 10, unit_price: 1500 }] });
    expect(parsePoForm("", "2026-11-06", "", [row]).error).toMatch(/pemasok/);
    expect(parsePoForm("s", "2026-11-06", "2026-11-01", [row]).error).toMatch(/sebelum/);
    expect(parsePoForm("s", "2026-11-06", "", []).error).toMatch(/minimal/);
    expect(parsePoForm("s", "2026-11-06", "", [row, { ...row, qty: "0" }]).error).toMatch(/^Baris 2/);
    expect(parsePoForm("s", "2026-11-06", "", [{ ...row, unitPrice: "x" }]).error).toMatch(/harga/);
    expect(poFormTotal([row, { ...row, qty: "1" }])).toBe(16500);
  });

  it("treats an empty count as not counted, and zero as counted", () => {
    expect(parseCountRows([{ lotId: "a", counted: "" }, { lotId: "b", counted: "0" }, { lotId: "c", counted: "2,5" }])).toEqual({ error: null, rows: [{ lot_id: "b", counted: 0 }, { lot_id: "c", counted: 2.5 }] });
    expect(parseCountRows([{ lotId: "a", counted: "" }]).error).toMatch(/minimal/);
    expect(parseCountRows([{ lotId: "a", counted: "-1" }]).error).toMatch(/negatif/);
  });

  it("refuses the same material twice on one basis", () => {
    const row = { itemId: "i", basis: "per_tanaman" as const, qty: "1" };
    expect(parseMaterialRows([row, { ...row, basis: "per_benih" }]).error).toBeNull();
    expect(parseMaterialRows([row, row]).error).toMatch(/sudah ada/);
    expect(parseMaterialRows([{ ...row, itemId: "" }]).error).toMatch(/pilih barang/);
    expect(parseMaterialRows([{ ...row, qty: "0" }]).error).toMatch(/lebih dari 0/);
  });

  it("writes a quantity with its unit", () => {
    expect(formatQty(1234.5, "liter")).toBe("1.234,5 liter");
  });
});
