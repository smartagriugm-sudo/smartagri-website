import { describe, expect, it } from "vitest";
import { formTotal, formatKg, formatRupiah, lotsForLine, orderStageLabel, orderStep, parseAllocation, parseOrderForm, parsePayment, payState, type AvailableLot, type LineForm, type StageNumbers } from "./sales";

const base: StageNumbers = { status: "dikonfirmasi", ordered_kg: 10, allocated_kg: 10, delivered_kg: 10, invoiced_kg: 10, invoiced_amount: 100, paid_amount: 100 };

describe("an order's stage follows its numbers", () => {
  it("walks the steps in order", () => {
    expect(orderStep({ ...base, status: "draf" })).toBe(0);
    expect(orderStep({ ...base, allocated_kg: 4, delivered_kg: 0, invoiced_kg: 0, invoiced_amount: 0, paid_amount: 0 })).toBe(1);
    expect(orderStep({ ...base, delivered_kg: 6, invoiced_kg: 0, invoiced_amount: 0, paid_amount: 0 })).toBe(2);
    expect(orderStep({ ...base, invoiced_kg: 6, invoiced_amount: 60, paid_amount: 60 })).toBe(3);
    expect(orderStep({ ...base, paid_amount: 40 })).toBe(4);
    expect(orderStep(base)).toBe(5);
    expect(orderStep({ ...base, status: "batal" })).toBeNull();
  });

  it("puts it in words", () => {
    expect(orderStageLabel({ ...base, status: "batal" })).toBe("Dibatalkan");
    expect(orderStageLabel({ ...base, paid_amount: 0 })).toBe("Menunggu pembayaran");
    expect(orderStageLabel(base)).toBe("Selesai");
  });
});

describe("what an invoice's state says", () => {
  const today = "2026-11-06";
  const i = { status: "terbit" as const, balance: 100, paid: 0, due_on: "2026-11-30" };
  it("reads the balance and the date", () => {
    expect(payState(i, today)).toBe("belum");
    expect(payState({ ...i, paid: 50, balance: 50 }, today)).toBe("sebagian");
    expect(payState({ ...i, paid: 100, balance: 0 }, today)).toBe("lunas");
    expect(payState({ ...i, due_on: "2026-11-05" }, today)).toBe("lewat");
    expect(payState({ ...i, due_on: today }, today)).toBe("belum");
    expect(payState({ ...i, paid: 100, balance: 0, due_on: "2026-01-01" }, today)).toBe("lunas");
    expect(payState({ ...i, status: "batal" }, today)).toBe("batal");
  });
});

describe("choosing lots", () => {
  const lot = (over: Partial<AvailableLot>): AvailableLot => ({ id: "x", lot_code: "H-1", grade: "A", remaining_kg: 5, fresh_kg: 5, harvested_at: "2026-11-01", best_before: null, batch_id: "b", batch_code: "B-1", crop_id: "c", crop_name: "Pakcoy", crop_variety: "", ...over });
  it("offers the same crop and grade, in date, oldest first", () => {
    const lots = [
      lot({ lot_code: "H-3", harvested_at: "2026-11-03" }),
      lot({ lot_code: "H-1", harvested_at: "2026-11-01" }),
      lot({ lot_code: "H-X", crop_id: "other" }),
      lot({ lot_code: "H-B", grade: "B" }),
      lot({ lot_code: "H-OLD", best_before: "2026-11-05" }),
      lot({ lot_code: "H-TODAY", best_before: "2026-11-06", harvested_at: "2026-11-02" }),
    ];
    expect(lotsForLine(lots, { crop_id: "c", grade: "A" }, "2026-11-06").map((l) => l.lot_code)).toEqual(["H-1", "H-TODAY", "H-3"]);
  });

  it("checks a weight against the lot and the line", () => {
    const line = { qty_kg: 10, allocated_kg: 7 };
    const the = { remaining_kg: 5, lot_code: "H-1" };
    expect(parseAllocation("2,5", line, the)).toEqual({ error: null, kg: 2.5 });
    expect(parseAllocation("3", line, the)).toEqual({ error: null, kg: 3 });
    expect(parseAllocation("3,1", line, the).error).toMatch(/Melebihi/);
    expect(parseAllocation("6", { qty_kg: 10, allocated_kg: 0 }, the).error).toMatch(/tersisa/);
    expect(parseAllocation("0", line, the).error).toMatch(/lebih dari 0/);
    expect(parseAllocation("1", line, undefined).error).toMatch(/Pilih lot/);
  });

  it("does not trip on the tenths of a kilogram", () => {
    expect(parseAllocation("0,1", { qty_kg: 0.3, allocated_kg: 0.2 }, { remaining_kg: 1, lot_code: "H" }).error).toBeNull();
  });
});

describe("forms", () => {
  const row: LineForm = { cropId: "c", grade: "A", qtyKg: "2,5", pricePerKg: "40.000" };
  it("reads Indonesian numbers in an order", () => {
    expect(parseOrderForm("p", "2026-11-06", "", [row])).toEqual({ error: null, lines: [{ crop_id: "c", grade: "A", qty_kg: 2.5, price_per_kg: 40000 }] });
    expect(formTotal([row, { ...row, qtyKg: "1" }])).toBe(140000);
    expect(formTotal([{ ...row, qtyKg: "" }])).toBe(0);
  });

  it("names the row that is wrong", () => {
    expect(parseOrderForm("", "2026-11-06", "", [row]).error).toMatch(/pelanggan/);
    expect(parseOrderForm("p", "2026-11-06", "2026-11-01", [row]).error).toMatch(/sebelum/);
    expect(parseOrderForm("p", "2026-11-06", "", []).error).toMatch(/minimal/);
    expect(parseOrderForm("p", "2026-11-06", "", [row, { ...row, qtyKg: "0" }]).error).toMatch(/^Baris 2/);
    expect(parseOrderForm("p", "2026-11-06", "", [{ ...row, pricePerKg: "abc" }]).error).toMatch(/^Baris 1: harga/);
    expect(parseOrderForm("p", "2026-11-06", "", [{ ...row, cropId: "" }]).error).toMatch(/tanaman/);
  });

  it("checks a payment against the balance", () => {
    const today = "2026-11-06";
    expect(parsePayment("100.000", today, 100000, today)).toEqual({ error: null, amount: 100000 });
    expect(parsePayment("100.001", today, 100000, today).error).toMatch(/sisa/);
    expect(parsePayment("0", today, 100000, today).error).toMatch(/lebih dari 0/);
    expect(parsePayment("1", "2026-11-07", 100000, today).error).toMatch(/masa depan/);
  });

  it("writes money and weight the Indonesian way", () => {
    expect(formatRupiah(1234567)).toBe("Rp 1.234.567");
    expect(formatKg(2.5)).toBe("2,5 kg");
    expect(formatKg(12)).toBe("12 kg");
  });
});
