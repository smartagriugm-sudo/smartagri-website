import { check, db, parseAmount, unwrap } from "./foundation";

// Inventory (supabase/pf-inventory.sql): every kind of stock, purchasing, what a
// recipe uses up by itself, and stock takes. Stock changes only through
// pf_stock_move, and every write is a database function that checks the role.

/* -------------------------------------------------------------------- types */

export const ITEM_CATEGORIES = [
  { key: "benih", label: "Seed" },
  { key: "nutrisi", label: "Nutrients" },
  { key: "media", label: "Growing media" },
  { key: "kemasan", label: "Packaging" },
  { key: "suku_cadang", label: "Spare parts" },
  { key: "lainnya", label: "Other" },
] as const;

export type ItemCategory = (typeof ITEM_CATEGORIES)[number]["key"];

export const categoryLabel = (key: string) => ITEM_CATEGORIES.find((c) => c.key === key)?.label ?? key;

export const ITEM_UNITS = ["pcs", "kg", "gram", "liter", "ml", "meter", "biji"] as const;

export type Item = {
  id: string;
  sku: string;
  name: string;
  category: ItemCategory;
  unit: string;
  crop_id: string | null;
  reorder_point: number | null;
  track_expiry: boolean;
  active: boolean;
  notes: string;
  usable_qty: number;
  expired_qty: number;
  lots: number;
  next_expiry: string | null;
  below_reorder: boolean;
  last_counted_on: string | null;
  /** Null until pf-profile-media.sql has run or a photo is added. */
  photo_path?: string | null;
};

export type StockLotRow = {
  id: string;
  item_id: string;
  lot_no: string;
  supplier: string;
  qty_on_hand: number;
  received_at: string;
  expiry_date: string | null;
  notes: string;
  sku: string;
  item_name: string;
  category: ItemCategory;
  unit: string;
};

export type MoveType = "masuk" | "pakai_semai" | "pakai_batch" | "pakai_lain" | "koreksi" | "opname";

export const MOVE_LABELS: Record<MoveType, string> = {
  masuk: "In",
  pakai_semai: "Used for sowing",
  pakai_batch: "Used on a batch",
  pakai_lain: "Used",
  koreksi: "Correct",
  opname: "Stock count",
};

export type StockMove = { id: number; lot_id: string; type: MoveType; qty: number; batch_id: string | null; reason: string; at: string; lot_no: string; item_id: string; item_name: string; unit: string; batch_code: string | null };

export type Shortage = { id: string; item_id: string; batch_id: string; qty_short: number; at: string; resolved_at: string | null; note: string; item_name: string; unit: string; batch_code: string };

export type PoStatus = "draf" | "dipesan" | "batal";

export type PurchaseOrder = {
  id: string;
  po_no: string;
  supplier_id: string;
  supplier_name: string;
  ordered_on: string;
  expected_on: string | null;
  status: PoStatus;
  notes: string;
  cancel_note: string;
  total: number;
  lines: number;
  open_lines: number;
  received_lines: number;
};

export type PoLine = { id: string; po_id: string; item_id: string; qty: number; unit_price: number; received_qty: number; amount: number; sku: string; item_name: string; unit: string; track_expiry: boolean };

export type MaterialBasis = "per_benih" | "per_tanaman" | "per_kg_panen";

export const MATERIAL_BASES: { key: MaterialBasis; label: string; when: string }[] = [
  { key: "per_benih", label: "Per seed", when: "at sowing" },
  { key: "per_tanaman", label: "Per plant", when: "at transplant" },
  { key: "per_kg_panen", label: "Per kg harvested", when: "at harvest" },
];

export type RecipeMaterial = { id: string; recipe_id: string; item_id: string; basis: MaterialBasis; qty: number; sku: string; item_name: string; unit: string };

export type StockCount = { id: string; counted_on: string; notes: string; lots: number; changed: number };

export type Supplier = { id: string; name: string; kind: string; contact_name: string; phone: string; email: string; address: string; tax_id: string; notes: string; active: boolean };

/* -------------------------------------------------------------------- rules */

const parseQty = (s: string) => (s.trim() === "" ? null : Number(s.trim().replace(",", ".")));
const parseMoney = parseAmount;

/** Units are stored in the database's own words. */
export const unitLabel = (unit: string) => (unit === "biji" ? "seeds" : unit);

export const formatQty = (qty: number, unit: string) => `${qty.toLocaleString("en-GB", { maximumFractionDigits: 2 })} ${unitLabel(unit)}`;

export type PoStage = "draf" | "menunggu" | "sebagian" | "diterima" | "batal";

export const PO_STAGE: Record<PoStage, { label: string; className: string }> = {
  draf: { label: "Draft", className: "bg-[#EEF3F4] text-[#4F6B73]" },
  menunggu: { label: "Waiting for goods", className: "bg-[#E3F4F4] text-[#0B6477]" },
  sebagian: { label: "Partly received", className: "bg-[#FFF6E5] text-[#8A5A07]" },
  diterima: { label: "Received", className: "bg-[#E3F7F0] text-[#0E7A5C]" },
  batal: { label: "Cancelled", className: "bg-[#EEF3F4] text-[#4F6B73]" },
};

export function poStage(p: Pick<PurchaseOrder, "status" | "open_lines" | "received_lines">): PoStage {
  if (p.status === "batal") return "batal";
  if (p.status === "draf") return "draf";
  if (p.open_lines === 0) return "diterima";
  return p.received_lines > 0 ? "sebagian" : "menunggu";
}

export type ItemForm = { name: string; category: ItemCategory; unit: string; reorder: string; expires: boolean; notes: string; active: boolean };

export function parseItemForm(f: ItemForm) {
  if (!f.name.trim()) return { error: "An item name is required." } as const;
  const reorder = parseQty(f.reorder);
  if (reorder !== null && (!Number.isFinite(reorder) || reorder < 0)) return { error: "The minimum level must be a number, not negative." } as const;
  return { error: null, reorder } as const;
}

export function parseQtyInput(s: string) {
  const qty = parseQty(s);
  if (qty === null || !Number.isFinite(qty) || qty <= 0) return { error: "Quantity must be above 0." } as const;
  return { error: null, qty } as const;
}

export type ReceiveForm = { lotNo: string; qty: string; receivedOn: string; expiryOn: string };

export function parseReceive(f: ReceiveForm, today: string, needsExpiry: boolean, left?: number) {
  if (!f.lotNo.trim()) return { error: "A lot number is required." } as const;
  const parsed = parseQtyInput(f.qty);
  if (parsed.error !== null) return parsed;
  if (left !== undefined && parsed.qty > left) return { error: `More than ordered: still short by ${left.toLocaleString("en-GB")}.` } as const;
  if (!f.receivedOn || f.receivedOn > today) return { error: "The received date cannot be in the future." } as const;
  if (needsExpiry && !f.expiryOn) return { error: "An expiry date is required for this item." } as const;
  if (f.expiryOn && f.expiryOn < f.receivedOn) return { error: "The expiry date is before the received date." } as const;
  return { error: null, qty: parsed.qty } as const;
}

export type PoLineForm = { itemId: string; qty: string; unitPrice: string };

export function parsePoForm(supplierId: string, orderedOn: string, expectedOn: string, rows: readonly PoLineForm[]) {
  if (!supplierId) return { error: "Choose a supplier." } as const;
  if (!orderedOn) return { error: "An order date is required." } as const;
  if (expectedOn && expectedOn < orderedOn) return { error: "The expected arrival is before the order date." } as const;
  if (rows.length === 0) return { error: "Add at least one line." } as const;
  const lines = [];
  for (const [i, r] of rows.entries()) {
    if (!r.itemId) return { error: `Line ${i + 1}: choose an item.` } as const;
    const qty = parseQty(r.qty);
    if (qty === null || !Number.isFinite(qty) || qty <= 0) return { error: `Line ${i + 1}: quantity must be above 0.` } as const;
    const price = parseMoney(r.unitPrice);
    if (price === null || !Number.isFinite(price) || price < 0) return { error: `Line ${i + 1}: price must be a number.` } as const;
    lines.push({ item_id: r.itemId, qty, unit_price: price });
  }
  return { error: null, lines } as const;
}

export const poFormTotal = (rows: readonly PoLineForm[]) =>
  rows.reduce((sum, r) => {
    const qty = parseQty(r.qty);
    const price = parseMoney(r.unitPrice);
    return qty && price && Number.isFinite(qty) && Number.isFinite(price) ? sum + Math.round(qty * price) : sum;
  }, 0);

/** Only what was actually counted goes in: an empty box means that lot was not counted, not that it is empty. */
export function parseCountRows(rows: readonly { lotId: string; counted: string }[]) {
  const out: { lot_id: string; counted: number }[] = [];
  for (const r of rows) {
    const value = parseQty(r.counted);
    if (value === null) continue;
    if (!Number.isFinite(value) || value < 0) return { error: "The count must be a number, not negative." } as const;
    out.push({ lot_id: r.lotId, counted: value });
  }
  if (out.length === 0) return { error: "Enter a count for at least one lot." } as const;
  return { error: null, rows: out } as const;
}

export function parseMaterialRows(rows: readonly { itemId: string; basis: MaterialBasis; qty: string }[]) {
  const out: { item_id: string; basis: MaterialBasis; qty: number }[] = [];
  const seen = new Set<string>();
  for (const [i, r] of rows.entries()) {
    if (!r.itemId) return { error: `Line ${i + 1}: choose an item.` } as const;
    const qty = parseQty(r.qty);
    if (qty === null || !Number.isFinite(qty) || qty <= 0) return { error: `Line ${i + 1}: quantity must be above 0.` } as const;
    const key = `${r.itemId}:${r.basis}`;
    if (seen.has(key)) return { error: `Line ${i + 1}: this item and basis are already listed.` } as const;
    seen.add(key);
    out.push({ item_id: r.itemId, basis: r.basis, qty });
  }
  return { error: null, rows: out } as const;
}

/* ------------------------------------------------------------- data access */

const numbers = <T extends object>(row: T, keys: (keyof T)[]): T => {
  const copy = { ...row };
  for (const k of keys) if (copy[k] !== null && copy[k] !== undefined) (copy[k] as unknown) = Number(copy[k]);
  return copy;
};

export async function fetchItems(): Promise<Item[]> {
  const rows = unwrap(await db().from("pf_item_overview").select("*").order("name").limit(500)) as Item[];
  return rows.map((i) => numbers(i, ["reorder_point", "usable_qty", "expired_qty"]));
}

export async function fetchStockLots(): Promise<StockLotRow[]> {
  const rows = unwrap(await db().from("pf_lot_overview").select("*").order("received_at", { ascending: false }).limit(1000)) as StockLotRow[];
  return rows.map((l) => numbers(l, ["qty_on_hand"]));
}

export async function fetchItemMoves(item: string): Promise<StockMove[]> {
  const rows = unwrap(await db().from("pf_stock_move_overview").select("*").eq("item_id", item).order("at", { ascending: false }).limit(30)) as StockMove[];
  return rows.map((m) => numbers(m, ["qty"]));
}

export async function fetchBatchMoves(batch: string): Promise<StockMove[]> {
  const rows = unwrap(await db().from("pf_stock_move_overview").select("*").eq("batch_id", batch).order("at", { ascending: false }).limit(100)) as StockMove[];
  return rows.map((m) => numbers(m, ["qty"]));
}

export async function fetchOpenShortages(): Promise<Shortage[]> {
  const rows = unwrap(await db().from("pf_stock_shortage_overview").select("*").order("at", { ascending: false }).limit(200)) as Shortage[];
  return rows.filter((s) => !s.resolved_at).map((s) => numbers(s, ["qty_short"]));
}

export async function fetchCounts(): Promise<StockCount[]> {
  return unwrap(await db().from("pf_stock_count").select("id,counted_on,notes,lots,changed").order("created_at", { ascending: false }).limit(20)) as StockCount[];
}

export async function fetchPurchaseOrders(): Promise<PurchaseOrder[]> {
  const rows = unwrap(await db().from("pf_po_overview").select("*").order("created_at", { ascending: false }).limit(500)) as PurchaseOrder[];
  return rows.map((p) => numbers(p, ["total"]));
}

export async function fetchPurchaseOrder(id: string): Promise<PurchaseOrder> {
  return numbers(unwrap(await db().from("pf_po_overview").select("*").eq("id", id).single()) as PurchaseOrder, ["total"]);
}

export async function fetchPoLines(po: string): Promise<PoLine[]> {
  const rows = unwrap(await db().from("pf_po_line_overview").select("*").eq("po_id", po)) as PoLine[];
  return rows.map((l) => numbers(l, ["qty", "unit_price", "received_qty", "amount"]));
}

export async function fetchSuppliers(): Promise<Supplier[]> {
  const rows = unwrap(await db().from("pf_partner").select("id,name,kind,contact_name,phone,email,address,tax_id,notes,active").order("name").limit(500)) as Supplier[];
  return rows.filter((p) => p.kind === "pemasok" || p.kind === "keduanya");
}

export async function fetchRecipeMaterials(recipe: string): Promise<RecipeMaterial[]> {
  const rows = unwrap(await db().from("pf_recipe_material_overview").select("*").eq("recipe_id", recipe)) as RecipeMaterial[];
  return rows.map((m) => numbers(m, ["qty"]));
}

export async function saveItem(id: string | null, f: ItemForm, reorder: number | null): Promise<string> {
  return unwrap(await db().rpc("pf_item_save", { target: id, new_name: f.name, new_category: f.category, new_unit: f.unit, reorder, expires: f.expires, new_notes: f.notes, is_active: f.active })) as string;
}

export async function receiveStock(item: string, lotNo: string, qty: number, receivedOn: string, expiryOn: string, supplier: string) {
  check(await db().rpc("pf_stock_receive", { item, new_lot_no: lotNo, qty, received_on: receivedOn, expiry_on: expiryOn || null, new_supplier: supplier, new_notes: "" }));
}

export async function adjustStock(lot: string, newQty: number, why: string) {
  check(await db().rpc("pf_stock_adjust", { lot, new_qty: newQty, why }));
}

export async function useStock(item: string, qty: number, batch: string | null, why: string) {
  check(await db().rpc("pf_stock_use", { item, qty, batch, why }));
}

export async function applyCount(countedOn: string, notes: string, rows: readonly { lot_id: string; counted: number }[]) {
  check(await db().rpc("pf_stock_count_apply", { counted: countedOn, new_notes: notes, rows_in: rows }));
}

export async function saveSupplier(id: string | null, f: Pick<Supplier, "name" | "contact_name" | "phone" | "email" | "address" | "tax_id" | "notes" | "active">): Promise<string> {
  return unwrap(await db().rpc("pf_supplier_save", { partner: id, new_name: f.name, new_contact: f.contact_name, new_phone: f.phone, new_email: f.email, new_address: f.address, new_tax_id: f.tax_id, new_notes: f.notes, is_active: f.active })) as string;
}

export async function savePurchaseOrder(id: string | null, supplier: string, orderedOn: string, expectedOn: string, notes: string, lines: readonly object[]): Promise<string> {
  return unwrap(await db().rpc("pf_po_save", { target: id, supplier, ordered: orderedOn, expected: expectedOn || null, new_notes: notes, lines })) as string;
}

export async function placePurchaseOrder(id: string) {
  check(await db().rpc("pf_po_place", { target: id }));
}

export async function cancelPurchaseOrder(id: string, why: string) {
  check(await db().rpc("pf_po_cancel", { target: id, why }));
}

export async function receivePoLine(line: string, qty: number, lotNo: string, receivedOn: string, expiryOn: string) {
  check(await db().rpc("pf_po_receive", { line, qty, new_lot_no: lotNo, received_on: receivedOn, expiry_on: expiryOn || null }));
}

export async function saveRecipeMaterials(recipe: string, materials: readonly object[]) {
  check(await db().rpc("pf_recipe_materials_save", { recipe, materials }));
}

export async function resolveShortage(shortage: string, why: string) {
  check(await db().rpc("pf_shortage_resolve", { shortage, why }));
}

const MEDIA_BUCKET = "pf-media";
const PHOTO_LINK_SECONDS = 3600;

/** Signed links for the photos on a page, in one request. A failure leaves the placeholders in place. */
export async function itemPhotoLinks(paths: readonly string[]): Promise<Map<string, string>> {
  if (paths.length === 0) return new Map();
  const { data, error } = await db().storage.from(MEDIA_BUCKET).createSignedUrls([...paths], PHOTO_LINK_SECONDS);
  if (error || !data) return new Map();
  return new Map(data.flatMap((d) => (d.path && d.signedUrl ? [[d.path, d.signedUrl] as [string, string]] : [])));
}

/** WebP at a sensible size, so a phone photo of a sack of fertilizer does not cost a megabyte on every list. */
export async function compressProductPhoto(file: Blob, maxSide = 900): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("The photo could not be processed."))), "image/webp", 0.82));
}

export async function setItemPhoto(item: string, file: Blob | null, previous: string | null | undefined) {
  let path: string | null = null;
  if (file) {
    path = `items/${item}/${crypto.randomUUID()}.webp`;
    const { error } = await db().storage.from(MEDIA_BUCKET).upload(path, file, { contentType: "image/webp", upsert: false });
    if (error) throw new Error(`The photo could not be uploaded: ${error.message}. Has pf-profile-media.sql been run?`);
  }
  check(await db().rpc("pf_item_photo_set", { item, path }));
  if (previous) await db().storage.from(MEDIA_BUCKET).remove([previous]);
}
