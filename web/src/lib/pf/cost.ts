import { addDays } from "./facility";
import { check, db, unwrap, parseAmount } from "./foundation";

// Costs (supabase/pf-cost.sql): what a batch cost, per kg, bills, and maintenance. The
// sums run in the database and come back with their parts, so every figure on a page can
// be redone by hand. Anything without a price is reported, never counted as zero silently.

/* -------------------------------------------------------------------- types */

export const COST_CATEGORIES = [
  { key: "listrik", label: "Power" },
  { key: "air", label: "Water" },
  { key: "sewa", label: "Rent" },
  { key: "penyusutan", label: "Depreciation" },
  { key: "perawatan", label: "Maintenance" },
  { key: "bahan_lain", label: "Other materials" },
  { key: "tenaga_lain", label: "Other labour" },
  { key: "lainnya", label: "Other" },
] as const;
export type CostCategory = (typeof COST_CATEGORIES)[number]["key"];
export const costCategoryLabel = (key: string) => COST_CATEGORIES.find((c) => c.key === key)?.label ?? key;

export const COST_AREAS = [
  { key: "persemaian", label: "Seedlings" },
  { key: "plant_factory", label: "Plant factory" },
] as const;
export type CostArea = (typeof COST_AREAS)[number]["key"];
export const costAreaLabel = (key: string | null) => COST_AREAS.find((a) => a.key === key)?.label ?? "";
/** What a room's bill is shared by. */
export const areaBasis = (key: string) => (key === "persemaian" ? "nampan-hari" : "lubang-hari");

export type BatchCost = {
  id: string;
  code: string;
  status: string;
  crop_name: string;
  crop_variety: string;
  sown_at: string | null;
  finished_at: string | null;
  harvested_kg: number;
  sellable_kg: number;
  material: number;
  unpriced_lots: number;
  labor: number;
  minutes: number;
  unrated_minutes: number;
  direct: number;
  shared: number;
  revenue: number;
  sold_kg: number;
};

export type MaterialLine = { item_name: string; unit: string; lot_id: string; lot_no: string; qty: number; unit_cost: number | null; from_po: boolean; amount: number | null };
export type LaborLine = { person_type: string; minutes: number; hourly_idr: number | null; amount: number | null };
export type DirectLine = { id: string; category: string; description: string; amount: number; spent_on: string };
export type SharedLine = { entry_id: string; category: string; description: string; area: string; period_start: string; period_end: string; total: number; batch_days: number; all_days: number; amount: number };
export type BatchCostDetail = { materials: MaterialLine[]; labor: LaborLine[]; direct: DirectLine[]; shared: SharedLine[] };

export type CostEntry = { id: string; category: string; description: string; amount: number; batch_id: string | null; batch_code: string | null; area: string | null; period_start: string; period_end: string; voided_at: string | null; void_note: string; all_days: number | null };
export type CostLot = { id: string; lot_no: string; received_at: string | null; item_name: string; unit: string; unit_cost: number | null; from_po: boolean; used_in_batches: number };
export type LaborRate = { id: string; person_type: string; valid_from: string; hourly_idr: number };
export type MonthlyRow = { month: string; category: string; amount: number };

export type MaintenancePlan = { id: string; title: string; asset_id: string | null; asset_code: string | null; asset_name: string | null; every_days: number; last_done: string | null; next_due: string; notes: string; active: boolean; open_order_id: string | null };
export type WorkOrder = { id: string; wo_no: string; plan_id: string | null; asset_id: string | null; asset_code: string | null; asset_name: string | null; title: string; kind: "terjadwal" | "perbaikan"; due_on: string; status: "terbuka" | "selesai" | "batal"; done_on: string | null; done_note: string; cost_idr: number };

/* -------------------------------------------------------------------- rules */

export const batchTotal = (b: Pick<BatchCost, "material" | "labor" | "direct" | "shared">) => b.material + b.labor + b.direct + b.shared;

/** Null when there is no harvest to divide by, which is not the same as free. */
export const perKg = (amount: number, kg: number) => (kg > 0 ? amount / kg : null);

/** What the total leaves out, in words. Empty when it is complete. */
export function costGaps(b: Pick<BatchCost, "unpriced_lots" | "unrated_minutes">) {
  const gaps: string[] = [];
  if (b.unpriced_lots > 0) gaps.push(`${b.unpriced_lots} lots without a price`);
  if (b.unrated_minutes > 0) gaps.push(`${formatHours(b.unrated_minutes)} without a rate`);
  return gaps;
}

export const formatHours = (minutes: number) => {
  const hours = minutes / 60;
  return `${Number.isInteger(hours) ? hours : hours.toLocaleString("en-GB", { maximumFractionDigits: 1 })} hours`;
};

export const formatQty = (qty: number) => qty.toLocaleString("en-GB", { maximumFractionDigits: 3 });

export const MONTH_SIMPLE = ["bahan", "tenaga", "listrik", "air"] as const;

export type MonthRow = { month: string; bahan: number; tenaga: number; listrik: number; air: number; other: number; cost: number; revenue: number };

/** Long rows from the database to one row per month, newest first. */
export function monthlyTable(rows: readonly MonthlyRow[]): MonthRow[] {
  const months = new Map<string, MonthRow>();
  for (const r of rows) {
    const m = months.get(r.month) ?? { month: r.month, bahan: 0, tenaga: 0, listrik: 0, air: 0, other: 0, cost: 0, revenue: 0 };
    if (r.category === "pendapatan") m.revenue += r.amount;
    else {
      m.cost += r.amount;
      if ((MONTH_SIMPLE as readonly string[]).includes(r.category)) m[r.category as (typeof MONTH_SIMPLE)[number]] += r.amount;
      else m.other += r.amount;
    }
    months.set(r.month, m);
  }
  return [...months.values()].sort((a, b) => b.month.localeCompare(a.month));
}

export function parseRupiah(text: string) {
  const value = parseAmount(text);
  if (value === null || !Number.isFinite(value) || value < 0) return null;
  return value;
}

export function parseEntryForm(f: { amount: string; scope: "batch" | "ruang"; batch: string; area: string; start: string; end: string }) {
  const amount = parseRupiah(f.amount);
  if (amount === null || amount === 0) return { error: "Quantity must be above zero." } as const;
  if (f.scope === "batch" && !f.batch) return { error: "Choose a batch." } as const;
  if (f.scope === "ruang" && !f.area) return { error: "Choose a room." } as const;
  if (!f.start) return { error: "A date is required." } as const;
  const end = f.scope === "batch" ? f.start : f.end;
  if (!end || end < f.start) return { error: "The period ends before it starts." } as const;
  return { error: null, amount, end } as const;
}

/** First and last day of a date's month. */
export function monthRange(date: string) {
  const start = `${date.slice(0, 7)}-01`;
  const next = new Date(`${start}T00:00:00Z`);
  next.setUTCMonth(next.getUTCMonth() + 1);
  return { start, end: addDays(next.toISOString().slice(0, 10), -1) };
}

export type PlanState = "lewat" | "segera" | "aman";
export const planState = (nextDue: string, today: string): PlanState => (nextDue < today ? "lewat" : nextDue <= addDays(today, 7) ? "segera" : "aman");

const csvCell = (value: string | number | null) => {
  const text = value === null ? "" : String(value);
  return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/** Semicolons, which spreadsheets in an Indonesian locale split on. Whole rupiah, no thousands marks. */
export function batchCostsCsv(rows: readonly BatchCost[]) {
  const head = ["Batch", "Crop", "Status", "Materials", "Labour", "Direct", "Shared", "Total", "Harvest (kg)", "Sellable (kg)", "Cost per kg", "Cost per sellable kg", "Revenue", "Sold (kg)", "Incomplete"];
  const lines = rows.map((b) => {
    const total = batchTotal(b);
    const whole = perKg(total, b.harvested_kg);
    const sellable = perKg(total, b.sellable_kg);
    return [b.code, `${b.crop_name} ${b.crop_variety}`.trim(), b.status, Math.round(b.material), Math.round(b.labor), Math.round(b.direct), Math.round(b.shared), Math.round(total), b.harvested_kg, b.sellable_kg, whole === null ? null : Math.round(whole), sellable === null ? null : Math.round(sellable), Math.round(b.revenue), b.sold_kg, costGaps(b).join(", ")];
  });
  return [head, ...lines].map((line) => line.map(csvCell).join(";")).join("\r\n");
}

/* ------------------------------------------------------------- data access */

export async function fetchBatchCosts(): Promise<BatchCost[]> {
  return unwrap(await db().rpc("pf_batch_costs")) as BatchCost[];
}

export async function fetchBatchCostDetail(target: string): Promise<BatchCostDetail> {
  return unwrap(await db().rpc("pf_batch_cost_detail", { target })) as BatchCostDetail;
}

export async function fetchCostEntries(): Promise<CostEntry[]> {
  return unwrap(await db().rpc("pf_cost_entries")) as CostEntry[];
}

export async function fetchCostLots(): Promise<CostLot[]> {
  return unwrap(await db().rpc("pf_cost_lots")) as CostLot[];
}

export async function fetchMonthly(months = 12): Promise<MonthlyRow[]> {
  return unwrap(await db().rpc("pf_cost_monthly", { months })) as MonthlyRow[];
}

export async function fetchLaborRates(): Promise<LaborRate[]> {
  const rows = unwrap(await db().from("pf_labor_rate").select("id,person_type,valid_from,hourly_idr").order("valid_from", { ascending: false }).limit(200)) as LaborRate[];
  return rows.map((r) => ({ ...r, hourly_idr: Number(r.hourly_idr) }));
}

export async function setLotPrice(lot: string, price: number) {
  check(await db().rpc("pf_lot_price_set", { lot, price, new_note: "" }));
}

export async function setLaborRate(type: string, starts: string, hourly: number) {
  check(await db().rpc("pf_labor_rate_set", { new_type: type, starts, hourly }));
}

export async function addCostEntry(f: { category: string; description: string; amount: number; batch: string | null; area: string | null; start: string; end: string }) {
  check(await db().rpc("pf_cost_entry_add", { new_category: f.category, what: f.description, new_amount: f.amount, batch: f.batch, new_area: f.area, starts: f.start, ends: f.end }));
}

export async function voidCostEntry(entry: string, why: string) {
  check(await db().rpc("pf_cost_entry_void", { entry, why }));
}

export async function fetchPlans(): Promise<MaintenancePlan[]> {
  return unwrap(await db().from("pf_maintenance_plan_overview").select("*").order("next_due").limit(200)) as MaintenancePlan[];
}

export async function fetchWorkOrders(): Promise<WorkOrder[]> {
  const rows = unwrap(await db().from("pf_work_order_overview").select("*").order("created_at", { ascending: false }).limit(200)) as WorkOrder[];
  return rows.map((w) => ({ ...w, cost_idr: Number(w.cost_idr) }));
}

export async function savePlan(id: string | null, f: { title: string; asset: string; every: number; last: string; notes: string; active: boolean }) {
  check(await db().rpc("pf_plan_save", { target: id, new_title: f.title, asset: f.asset || null, every: f.every, last_day: f.last || null, new_notes: f.notes, is_active: f.active }));
}

export async function createWorkOrder(plan: string | null, asset: string | null, title: string | null, due: string | null) {
  check(await db().rpc("pf_wo_create", { plan, asset, new_title: title, due }));
}

export async function finishWorkOrder(workOrder: string, done: string, note: string, cost: number, room: string | null) {
  check(await db().rpc("pf_wo_finish", { work_order: workOrder, done, note, cost, room }));
}

export async function cancelWorkOrder(workOrder: string, why: string) {
  check(await db().rpc("pf_wo_cancel", { work_order: workOrder, why }));
}
