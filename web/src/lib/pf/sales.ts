import { check, cropLabel, db, unwrap } from "./foundation";

// Sales (supabase/pf-sales.sql): customers, orders, which harvest lot filled what,
// delivery, invoices and payments. Every write is a database function that checks
// the caller's role and keeps the lots' remaining kg in step. An order's stage is
// worked out here from its numbers, so it cannot drift from them.

/* -------------------------------------------------------------------- types */

export type PartnerKind = "pelanggan" | "pemasok" | "keduanya";

export type Partner = {
  id: string;
  name: string;
  kind: PartnerKind;
  contact_name: string;
  phone: string;
  email: string;
  address: string;
  tax_id: string;
  notes: string;
  active: boolean;
};

export type TaxRate = { id: string; name: string; percent: number; valid_from: string; active: boolean };

export type OrderOverview = {
  id: string;
  so_no: string;
  partner_id: string;
  partner_name: string;
  ordered_on: string;
  requested_on: string | null;
  status: "draf" | "dikonfirmasi" | "batal";
  notes: string;
  cancel_note: string;
  ordered_kg: number;
  allocated_kg: number;
  delivered_kg: number;
  invoiced_kg: number;
  amount: number;
  invoiced_amount: number;
  paid_amount: number;
};

export type OrderLine = {
  id: string;
  sales_order_id: string;
  crop_id: string;
  crop_name: string;
  crop_variety: string;
  grade: string;
  qty_kg: number;
  price_per_kg: number;
  amount: number;
  allocated_kg: number;
  delivered_kg: number;
  invoiced_kg: number;
};

export type Allocation = {
  id: string;
  so_line_id: string;
  sales_order_id: string;
  harvest_lot_id: string;
  qty_kg: number;
  delivery_id: string | null;
  lot_code: string;
  grade: string;
  harvested_at: string;
  best_before: string | null;
  batch_code: string;
  batch_id: string;
  delivery_no: string | null;
  delivered_on: string | null;
};

export type AvailableLot = {
  id: string;
  lot_code: string;
  grade: string;
  remaining_kg: number;
  fresh_kg: number;
  harvested_at: string;
  best_before: string | null;
  batch_id: string;
  batch_code: string;
  crop_id: string;
  crop_name: string;
  crop_variety: string;
};

export type Delivery = { id: string; delivery_no: string; sales_order_id: string; delivered_on: string; recipient: string; notes: string; cancelled_at: string | null; cancel_note: string };

export type InvoiceOverview = {
  id: string;
  invoice_no: string;
  sales_order_id: string;
  so_no: string;
  partner_id: string;
  partner_name: string;
  partner_address: string;
  partner_tax_id: string;
  issued_on: string;
  due_on: string;
  subtotal: number;
  tax_name: string;
  tax_percent: number;
  tax_amount: number;
  total: number;
  notes: string;
  status: "terbit" | "batal";
  void_note: string;
  paid: number;
  balance: number;
};

export type InvoiceLine = { id: string; description: string; qty_kg: number; price_per_kg: number; amount: number };

export type PaymentMethod = "transfer" | "tunai" | "lainnya";
export const PAYMENT_METHODS: { key: PaymentMethod; label: string }[] = [
  { key: "transfer", label: "Bank transfer" },
  { key: "tunai", label: "Cash" },
  { key: "lainnya", label: "Other" },
];

export type Payment = { id: string; invoice_id: string; paid_on: string; amount: number; method: PaymentMethod; reference: string; voided_at: string | null; void_note: string };

export type TraceRow = {
  order_id: string | null;
  so_no: string | null;
  partner_name: string | null;
  allocated_kg: number | null;
  delivery_no: string | null;
  delivered_on: string | null;
  lot_code: string;
  grade: string;
  harvested_at: string;
  fresh_kg: number;
  best_before: string | null;
  batch_id: string;
  batch_code: string;
  batch_status: string;
  sown_at: string | null;
  transplanted_at: string | null;
  recipe_code: string;
  recipe_version: number;
  crop_name: string;
  crop_variety: string;
  seed_lot_no: string;
  seed_supplier: string;
};

/* -------------------------------------------------------------------- rules */

export const formatRupiah = (value: number) => `Rp ${Math.round(value).toLocaleString("en-GB")}`;
export const formatKg = (value: number) => `${value.toLocaleString("en-GB", { maximumFractionDigits: 3 })} kg`;

export const lineLabel = (l: Pick<OrderLine, "crop_name" | "crop_variety" | "grade">) => `${cropLabel({ name: l.crop_name, variety: l.crop_variety })}, grade ${l.grade}`;

export const ORDER_STEPS = ["Draft", "Choose lots", "Send", "Invoice", "Receive payment", "Done"] as const;

export type StageNumbers = Pick<OrderOverview, "status" | "ordered_kg" | "allocated_kg" | "delivered_kg" | "invoiced_kg" | "invoiced_amount" | "paid_amount">;

/** Which step of ORDER_STEPS an order is on. Null once cancelled. Earlier work left undone comes first. */
export function orderStep(o: StageNumbers) {
  if (o.status === "batal") return null;
  if (o.status === "draf") return 0;
  if (o.allocated_kg < o.ordered_kg) return 1;
  if (o.delivered_kg < o.allocated_kg) return 2;
  if (o.invoiced_kg < o.delivered_kg) return 3;
  if (o.paid_amount < o.invoiced_amount) return 4;
  return 5;
}

export function orderStageLabel(o: StageNumbers) {
  const step = orderStep(o);
  if (step === null) return "Cancelled";
  return ["Draft", "Lots to choose", "Ready to send", "To invoice", "Waiting for payment", "Done"][step];
}

export type PayState = "lunas" | "sebagian" | "belum" | "lewat" | "batal";

export const PAY_STATE: Record<PayState, { label: string; className: string }> = {
  lunas: { label: "Paid", className: "bg-[#E3F7F0] text-[#0E7A5C]" },
  sebagian: { label: "Partly paid", className: "bg-[#FFF6E5] text-[#8A5A07]" },
  belum: { label: "Unpaid", className: "bg-[#EEF3F4] text-[#4F6B73]" },
  lewat: { label: "Past due", className: "bg-[#FDECEA] text-[#B3362C]" },
  batal: { label: "Cancelled", className: "bg-[#EEF3F4] text-[#4F6B73]" },
};

export function payState(i: Pick<InvoiceOverview, "status" | "balance" | "paid" | "due_on">, today: string): PayState {
  if (i.status === "batal") return "batal";
  if (i.balance <= 0) return "lunas";
  if (i.due_on < today) return "lewat";
  return i.paid > 0 ? "sebagian" : "belum";
}

/** Lots that may fill this line: same crop and grade, still in date, oldest first so the first harvested goes first. */
export function lotsForLine(lots: readonly AvailableLot[], line: Pick<OrderLine, "crop_id" | "grade">, today: string) {
  return lots
    .filter((l) => l.crop_id === line.crop_id && l.grade === line.grade && (!l.best_before || l.best_before >= today))
    .sort((a, b) => a.harvested_at.localeCompare(b.harvested_at) || a.lot_code.localeCompare(b.lot_code));
}

export const roundKg = (kg: number) => Math.round(kg * 1000) / 1000;

const parseNumber = (s: string) => (s.trim() === "" ? null : Number(s.trim().replace(/\./g, "").replace(",", ".")));
const parseKgText = (s: string) => (s.trim() === "" ? null : Number(s.trim().replace(",", ".")));

export type LineForm = { cropId: string; grade: string; qtyKg: string; pricePerKg: string };

export function parseOrderForm(partnerId: string, orderedOn: string, requestedOn: string, rows: readonly LineForm[]) {
  if (!partnerId) return { error: "Choose a customer." } as const;
  if (!orderedOn) return { error: "An order date is required." } as const;
  if (requestedOn && requestedOn < orderedOn) return { error: "The requested date is before the order date." } as const;
  if (rows.length === 0) return { error: "Add at least one line." } as const;
  const lines = [];
  for (const [i, r] of rows.entries()) {
    const label = `Line ${i + 1}`;
    if (!r.cropId) return { error: `${label}: choose a crop.` } as const;
    const qty = parseKgText(r.qtyKg);
    if (qty === null || !Number.isFinite(qty) || qty <= 0) return { error: `${label}: weight must be above 0.` } as const;
    const price = parseNumber(r.pricePerKg);
    if (price === null || !Number.isFinite(price) || price < 0) return { error: `${label}: price must be a number.` } as const;
    lines.push({ crop_id: r.cropId, grade: r.grade, qty_kg: qty, price_per_kg: price });
  }
  return { error: null, lines } as const;
}

export function parseAllocation(kg: string, line: Pick<OrderLine, "qty_kg" | "allocated_kg">, lot: Pick<AvailableLot, "remaining_kg" | "lot_code"> | undefined) {
  if (!lot) return { error: "Choose a harvest lot." } as const;
  const value = parseKgText(kg);
  if (value === null || !Number.isFinite(value) || value <= 0) return { error: "Weight must be above 0." } as const;
  if (value > lot.remaining_kg) return { error: `Lot ${lot.lot_code} only has ${formatKg(lot.remaining_kg)}.` } as const;
  if (roundKg(line.allocated_kg + value) > line.qty_kg) return { error: `More than ordered: still needs ${formatKg(roundKg(line.qty_kg - line.allocated_kg))}.` } as const;
  return { error: null, kg: value } as const;
}

export function parsePayment(amount: string, paidOn: string, balance: number, today: string) {
  const value = parseNumber(amount);
  if (value === null || !Number.isFinite(value) || value <= 0) return { error: "The payment must be above 0." } as const;
  if (value > balance) return { error: `More than the balance of ${formatRupiah(balance)}.` } as const;
  if (!paidOn || paidOn > today) return { error: "The payment date cannot be in the future." } as const;
  return { error: null, amount: value } as const;
}

/** A plain-text total of what the rows on screen add up to, before they are saved. */
export function formTotal(rows: readonly LineForm[]) {
  return rows.reduce((sum, r) => {
    const qty = parseKgText(r.qtyKg);
    const price = parseNumber(r.pricePerKg);
    return qty && price && Number.isFinite(qty) && Number.isFinite(price) ? sum + Math.round(qty * price) : sum;
  }, 0);
}

/* ------------------------------------------------------------- data access */

const numbers = <T extends object>(row: T, keys: (keyof T)[]): T => {
  const copy = { ...row };
  for (const k of keys) if (copy[k] !== null && copy[k] !== undefined) (copy[k] as unknown) = Number(copy[k]);
  return copy;
};

const ORDER_NUMBERS: (keyof OrderOverview)[] = ["ordered_kg", "allocated_kg", "delivered_kg", "invoiced_kg", "amount", "invoiced_amount", "paid_amount"];
const INVOICE_NUMBERS: (keyof InvoiceOverview)[] = ["subtotal", "tax_percent", "tax_amount", "total", "paid", "balance"];
const LINE_NUMBERS: (keyof OrderLine)[] = ["qty_kg", "price_per_kg", "amount", "allocated_kg", "delivered_kg", "invoiced_kg"];

export async function fetchPartners(): Promise<Partner[]> {
  return unwrap(await db().from("pf_partner").select("id,name,kind,contact_name,phone,email,address,tax_id,notes,active").order("name").limit(500)) as Partner[];
}

export async function savePartner(id: string | null, f: Omit<Partner, "id">): Promise<string> {
  return unwrap(await db().rpc("pf_partner_save", { partner: id, new_name: f.name, new_kind: f.kind, new_contact: f.contact_name, new_phone: f.phone, new_email: f.email, new_address: f.address, new_tax_id: f.tax_id, new_notes: f.notes, is_active: f.active })) as string;
}

export async function fetchTaxRates(): Promise<TaxRate[]> {
  const rows = unwrap(await db().from("pf_tax_rate").select("id,name,percent,valid_from,active").order("valid_from", { ascending: false }).limit(100)) as TaxRate[];
  return rows.map((r) => numbers(r, ["percent"]));
}

export async function saveTaxRate(id: string | null, name: string, percent: number, startsOn: string, active: boolean) {
  check(await db().rpc("pf_tax_rate_save", { rate: id, new_name: name, new_percent: percent, starts_on: startsOn, is_active: active }));
}

export async function fetchOrders(): Promise<OrderOverview[]> {
  const rows = unwrap(await db().from("pf_order_overview").select("*").order("created_at", { ascending: false }).limit(500)) as OrderOverview[];
  return rows.map((o) => numbers(o, ORDER_NUMBERS));
}

export async function fetchOrder(id: string): Promise<OrderOverview> {
  const row = unwrap(await db().from("pf_order_overview").select("*").eq("id", id).single()) as OrderOverview;
  return numbers(row, ORDER_NUMBERS);
}

export async function fetchOrderLines(order: string): Promise<OrderLine[]> {
  const rows = unwrap(await db().from("pf_order_line_overview").select("*").eq("sales_order_id", order)) as OrderLine[];
  return rows.map((l) => numbers(l, LINE_NUMBERS));
}

export async function fetchAllocations(order: string): Promise<Allocation[]> {
  const rows = unwrap(await db().from("pf_allocation_overview").select("*").eq("sales_order_id", order)) as Allocation[];
  return rows.map((a) => numbers(a, ["qty_kg"]));
}

export async function fetchAvailableLots(): Promise<AvailableLot[]> {
  const rows = unwrap(await db().from("pf_lot_available").select("*").order("harvested_at").limit(500)) as AvailableLot[];
  return rows.map((l) => numbers(l, ["remaining_kg", "fresh_kg"]));
}

export async function fetchDeliveries(order: string): Promise<Delivery[]> {
  return unwrap(await db().from("pf_delivery").select("id,delivery_no,sales_order_id,delivered_on,recipient,notes,cancelled_at,cancel_note").eq("sales_order_id", order).order("delivery_no")) as Delivery[];
}

export async function fetchDelivery(id: string): Promise<Delivery> {
  return unwrap(await db().from("pf_delivery").select("id,delivery_no,sales_order_id,delivered_on,recipient,notes,cancelled_at,cancel_note").eq("id", id).single()) as Delivery;
}

export async function fetchInvoices(): Promise<InvoiceOverview[]> {
  const rows = unwrap(await db().from("pf_invoice_overview").select("*").order("issued_on", { ascending: false }).limit(500)) as InvoiceOverview[];
  return rows.map((i) => numbers(i, INVOICE_NUMBERS));
}

export async function fetchOrderInvoices(order: string): Promise<InvoiceOverview[]> {
  const rows = unwrap(await db().from("pf_invoice_overview").select("*").eq("sales_order_id", order)) as InvoiceOverview[];
  return rows.map((i) => numbers(i, INVOICE_NUMBERS));
}

export async function fetchInvoice(id: string): Promise<InvoiceOverview> {
  const row = unwrap(await db().from("pf_invoice_overview").select("*").eq("id", id).single()) as InvoiceOverview;
  return numbers(row, INVOICE_NUMBERS);
}

export async function fetchInvoiceLines(invoice: string): Promise<InvoiceLine[]> {
  const rows = unwrap(await db().from("pf_invoice_line").select("id,description,qty_kg,price_per_kg,amount").eq("invoice_id", invoice)) as InvoiceLine[];
  return rows.map((l) => numbers(l, ["qty_kg", "price_per_kg", "amount"]));
}

export async function fetchPayments(invoice: string): Promise<Payment[]> {
  const rows = unwrap(await db().from("pf_payment").select("id,invoice_id,paid_on,amount,method,reference,voided_at,void_note").eq("invoice_id", invoice).order("paid_on")) as Payment[];
  return rows.map((p) => numbers(p, ["amount"]));
}

export async function saveOrder(id: string | null, partner: string, orderedOn: string, requestedOn: string, notes: string, lines: readonly object[]): Promise<string> {
  return unwrap(await db().rpc("pf_order_save", { target: id, partner, ordered: orderedOn, requested: requestedOn || null, new_notes: notes, lines })) as string;
}

export async function confirmOrder(id: string) {
  check(await db().rpc("pf_order_confirm", { target: id }));
}

export async function cancelOrder(id: string, why: string) {
  check(await db().rpc("pf_order_cancel", { target: id, why }));
}

export async function allocate(line: string, lot: string, kg: number) {
  check(await db().rpc("pf_allocate", { line, lot, kg }));
}

export async function releaseAllocation(allocation: string) {
  check(await db().rpc("pf_allocation_release", { allocation }));
}

export async function createDelivery(order: string, allocations: readonly string[], deliveredOn: string, recipient: string, notes: string): Promise<string> {
  return unwrap(await db().rpc("pf_delivery_create", { target: order, allocations, delivered: deliveredOn, new_recipient: recipient, new_notes: notes })) as string;
}

export async function cancelDelivery(delivery: string, why: string) {
  check(await db().rpc("pf_delivery_cancel", { delivery, why }));
}

export async function issueInvoice(order: string, issuedOn: string, dueOn: string, rate: string | null, notes: string): Promise<string> {
  return unwrap(await db().rpc("pf_invoice_issue", { target: order, issued: issuedOn, due: dueOn, rate, new_notes: notes })) as string;
}

export async function voidInvoice(invoice: string, why: string) {
  check(await db().rpc("pf_invoice_void", { invoice, why }));
}

export async function addPayment(invoice: string, paidOn: string, amount: number, method: PaymentMethod, reference: string) {
  check(await db().rpc("pf_payment_add", { invoice, paid: paidOn, new_amount: amount, new_method: method, new_reference: reference }));
}

export async function voidPayment(payment: string, why: string) {
  check(await db().rpc("pf_payment_void", { payment, why }));
}

export async function traceCode(code: string): Promise<TraceRow[]> {
  const rows = unwrap(await db().rpc("pf_trace", { code })) as TraceRow[];
  return rows.map((r) => numbers(r, ["allocated_kg", "fresh_kg"]));
}
