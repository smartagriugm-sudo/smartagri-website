import { check, cropLabel, db, unwrap, type PfRecipe, type PfRecipePhase } from "./foundation";
import { DAYS_TO_TRANSPLANT, type SlotState } from "./chamber";
import { daysBetween, type HoleState } from "./facility";

// Growing records (supabase/pf-batch.sql): seed lots, batches, what sits where,
// and harvest lots. Every write is a database function that checks the caller's
// role and keeps slots, stock and the diary in step. A batch's stage is worked
// out here from where its plants are and the recipe's days, so it cannot drift.

/* ------------------------------------------------------------------- types */

export type BatchStatus = "direncanakan" | "berjalan" | "selesai" | "gagal";

export const BATCH_STATUS: Record<BatchStatus, { label: string; className: string }> = {
  direncanakan: { label: "Belum disemai", className: "bg-[#FFF6E5] text-[#8A5A07]" },
  berjalan: { label: "Berjalan", className: "bg-[#E3F7F0] text-[#0E7A5C]" },
  selesai: { label: "Selesai", className: "bg-[#EEF3F4] text-[#4F6B73]" },
  gagal: { label: "Gagal", className: "bg-[#FDECEA] text-[#B3362C]" },
};

export type BatchOverview = {
  id: string;
  code: string;
  status: BatchStatus;
  sown_at: string | null;
  notes: string;
  created_at: string;
  finished_at: string | null;
  recipe_id: string;
  recipe_code: string;
  recipe_version: number;
  crop_id: string;
  crop_name: string;
  crop_variety: string;
  seed_lot_id: string;
  seed_lot_no: string;
  seeds: number;
  germinated: number;
  trays_now: number;
  plants_now: number;
  transplanted_at: string | null;
  harvested_kg: number;
  cycle_days: number;
};

export type OpenSlot = {
  id: string;
  batch_id: string;
  batch_code: string;
  location_id: string;
  location_code: string;
  kind: "tray" | "hole";
  qty: number;
  germinated: number;
  moved: number;
  state: "disemai" | "berkecambah" | "siap_pindah" | "tumbuh" | "masalah";
  note: string;
  placed_at: string;
  source_code: string | null;
};

export type SeedLot = {
  id: string;
  lot_no: string;
  supplier: string;
  qty_on_hand: number;
  received_at: string;
  expiry_date: string | null;
  notes: string;
  unit: SeedUnit;
  crop_id: string;
  crop_name: string;
  crop_variety: string;
};

export type SeedUnit = "biji" | "gram";

export type HarvestGrade = "A" | "B" | "Afkir";
export const HARVEST_GRADES: HarvestGrade[] = ["A", "B", "Afkir"];

export type HarvestLot = {
  id: string;
  lot_code: string;
  harvested_at: string;
  fresh_kg: number;
  remaining_kg: number;
  grade: HarvestGrade;
  best_before: string | null;
  notes: string;
};

export type BatchEventType = "dibuat" | "semai" | "germinasi" | "nampan_ditutup" | "pindah_tanam" | "masalah" | "pulih" | "tanaman_dibuang" | "pengamatan" | "panen" | "koreksi_panen" | "selesai" | "gagal";

export type BatchEvent = {
  id: number;
  type: BatchEventType;
  at: string;
  qty: number | null;
  location_code: string | null;
  note: string;
  by_id: string | null;
};

export const EVENT_LABELS: Record<BatchEventType, string> = {
  dibuat: "Batch dibuat",
  semai: "Disemai",
  germinasi: "Perkecambahan dicatat",
  nampan_ditutup: "Nampan ditutup",
  pindah_tanam: "Pindah tanam",
  masalah: "Ditandai bermasalah",
  pulih: "Kembali normal",
  tanaman_dibuang: "Tanaman dibuang",
  pengamatan: "Pengamatan",
  panen: "Panen",
  koreksi_panen: "Koreksi panen",
  selesai: "Batch selesai",
  gagal: "Batch gagal",
};

/* --------------------------------------------------------------- reckoning */

/** Today in the lab's time zone, as the database's pf_today() sees it. */
export function jakartaToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(now);
}

/** The lab's calendar date of a stored moment. Its UTC date can be a day earlier. */
export const jakartaDate = (iso: string) => jakartaToday(new Date(iso));

export const batchLabel = (b: Pick<BatchOverview, "crop_name" | "crop_variety">) => cropLabel({ name: b.crop_name, variety: b.crop_variety });

export const ageOn = (sownAt: string | null, today: string) => (sownAt ? Math.max(0, daysBetween(sownAt, today)) : 0);

type PhaseDays = Pick<PfRecipePhase, "phase" | "duration_days">;

/** The recipe phase a batch of this age is in, or null once past the last one. */
export function phaseAt(age: number, phases: readonly PhaseDays[]) {
  let end = 0;
  for (const p of phases) {
    end += p.duration_days;
    if (age < end) return p.phase;
  }
  return null;
}

/** Day the recipe plans the move out of the chamber: when vegetative growth begins. */
export function transplantDay(phases: readonly PhaseDays[]) {
  const until = phases.findIndex((p) => p.phase === "vegetatif" || p.phase === "pra_panen");
  if (until <= 0) return DAYS_TO_TRANSPLANT;
  return phases.slice(0, until).reduce((n, p) => n + p.duration_days, 0);
}

/** What a healthy plant in a hole looks like at this age. */
export function holeStateOn(age: number, phases: readonly PhaseDays[]): HoleState {
  const phase = phaseAt(age, phases);
  if (phase === null || phase === "pra_panen") return "siap_panen";
  return phase === "vegetatif" ? "vegetatif" : "semai";
}

export const trayState = (s: OpenSlot["state"]): SlotState => (s === "tumbuh" ? "berkecambah" : s);

export const germinationRate = (b: Pick<BatchOverview, "seeds" | "germinated">) => (b.seeds ? b.germinated / b.seeds : 0);

export function batchStage(b: Pick<BatchOverview, "status" | "sown_at" | "cycle_days" | "plants_now" | "trays_now">, today: string) {
  if (b.status === "direncanakan") return "Menunggu semai";
  if (b.status === "selesai" || b.status === "gagal") return BATCH_STATUS[b.status].label;
  const day = `hari ${ageOn(b.sown_at, today)} dari ${b.cycle_days}`;
  if (b.plants_now > 0 && b.trays_now > 0) return `Sebagian di plant factory · ${day}`;
  if (b.plants_now > 0) return `Plant factory · ${day}`;
  if (b.trays_now > 0) return `Persemaian · ${day}`;
  return `Tidak ada tanaman · ${day}`;
}

export const BATCH_STEPS = ["Semai", "Berkecambah", "Pindah tanam", "Tumbuh", "Panen", "Selesai"] as const;

/** Which step of BATCH_STEPS the batch is on, so the page can lead with that work. */
export function batchStep(b: Pick<BatchOverview, "status" | "plants_now" | "harvested_kg">, readySeedlings: number, harvestReady: boolean) {
  if (b.status === "selesai" || b.status === "gagal") return 5;
  if (b.status === "direncanakan") return 0;
  if (readySeedlings > 0) return 2;
  if (b.plants_now > 0) return harvestReady || b.harvested_kg > 0 ? 4 : 3;
  return 1;
}

/** R1-T2 out of R1-T2-G3-H12. */
export const tierOfHole = (code: string) => code.split("-").slice(0, 2).join("-");

export function isLotUsable(l: Pick<SeedLot, "qty_on_hand" | "expiry_date">, today: string) {
  return l.qty_on_hand > 0 && (!l.expiry_date || l.expiry_date >= today);
}

/* ------------------------------------------------------------------- forms */

const parseNumber = (s: string) => (s.trim() === "" ? null : Number(s.trim().replace(",", ".")));

export type SeedLotForm = { cropId: string; unit: SeedUnit; lotNo: string; qty: string; receivedOn: string; expiryOn: string; supplier: string; notes: string };

export function parseSeedLotForm(f: SeedLotForm) {
  if (!f.cropId) return { error: "Pilih tanaman." } as const;
  if (!f.lotNo.trim()) return { error: "Nomor lot wajib diisi." } as const;
  const qty = parseNumber(f.qty);
  if (qty === null || !Number.isFinite(qty) || qty <= 0) return { error: "Jumlah harus lebih dari 0." } as const;
  if (f.unit === "biji" && !Number.isInteger(qty)) return { error: "Jumlah biji harus bilangan bulat." } as const;
  if (!f.receivedOn) return { error: "Tanggal diterima wajib diisi." } as const;
  if (f.expiryOn && f.expiryOn < f.receivedOn) return { error: "Tanggal kedaluwarsa sebelum tanggal diterima." } as const;
  return { error: null, qty } as const;
}

export function parseSowForm(positions: readonly string[], seeds: string, sownOn: string, today: string, unit: SeedUnit, used: string) {
  if (positions.length === 0) return { error: "Pilih minimal satu posisi nampan." } as const;
  const perTray = parseNumber(seeds);
  if (perTray === null || !Number.isInteger(perTray) || perTray <= 0) return { error: "Jumlah benih per nampan harus bilangan bulat di atas 0." } as const;
  if (!sownOn || sownOn > today) return { error: "Tanggal semai tidak boleh di masa depan." } as const;
  if (unit === "biji") return { error: null, perTray, seedUsed: null } as const;
  const seedUsed = parseNumber(used);
  if (seedUsed === null || !Number.isFinite(seedUsed) || seedUsed <= 0) return { error: "Isi berat benih yang terpakai." } as const;
  return { error: null, perTray, seedUsed } as const;
}

export function parseHarvestForm(kg: string, harvestedOn: string, bestBefore: string, sownAt: string | null, today: string) {
  const weight = parseNumber(kg);
  if (weight === null || !Number.isFinite(weight) || weight <= 0) return { error: "Berat panen harus lebih dari 0." } as const;
  if (!harvestedOn || harvestedOn > today || (sownAt && harvestedOn < sownAt)) return { error: "Tanggal panen harus antara tanggal semai dan hari ini." } as const;
  if (bestBefore && bestBefore < harvestedOn) return { error: "Batas simpan sebelum tanggal panen." } as const;
  return { error: null, weight } as const;
}

/** A count typed for a tray: whole, not negative, and no more than what is left of its seeds. */
export function parseGerminated(s: string, tray: Pick<OpenSlot, "qty" | "moved">) {
  const n = parseNumber(s);
  if (n === null || !Number.isInteger(n) || n < 0) return { error: "Jumlah berkecambah harus bilangan bulat." } as const;
  if (n + tray.moved > tray.qty) return { error: "Jumlah berkecambah melebihi jumlah benih." } as const;
  return { error: null, count: n } as const;
}

/* ------------------------------------------------------------- data access */

const BATCH_COLUMNS = "id,code,status,sown_at,notes,created_at,finished_at,recipe_id,recipe_code,recipe_version,crop_id,crop_name,crop_variety,seed_lot_id,seed_lot_no,seeds,germinated,trays_now,plants_now,transplanted_at,harvested_kg,cycle_days";
const SLOT_COLUMNS = "id,batch_id,batch_code,location_id,location_code,kind,qty,germinated,moved,state,note,placed_at,source_code";
const LOT_COLUMNS = "id,lot_no,supplier,qty_on_hand,received_at,expiry_date,notes,unit,crop_id,crop_name,crop_variety";

const numeric = <T extends object>(row: T, keys: (keyof T)[]): T => {
  const out = { ...row };
  for (const k of keys) (out as Record<keyof T, unknown>)[k] = row[k] === null ? null : Number(row[k]);
  return out;
};

export async function fetchBatches(): Promise<BatchOverview[]> {
  const rows = unwrap(await db().from("pf_batch_overview").select(BATCH_COLUMNS).order("created_at", { ascending: false }).limit(500)) as BatchOverview[];
  return rows.map((b) => numeric(b, ["harvested_kg"]));
}

export async function fetchBatch(id: string): Promise<BatchOverview> {
  return numeric(unwrap(await db().from("pf_batch_overview").select(BATCH_COLUMNS).eq("id", id).single()) as BatchOverview, ["harvested_kg"]);
}

export async function fetchBatchSlots(batchId: string): Promise<OpenSlot[]> {
  return unwrap(await db().from("pf_slot_open").select(SLOT_COLUMNS).eq("batch_id", batchId).order("location_code").limit(1000)) as OpenSlot[];
}

export async function fetchBatchEvents(batchId: string): Promise<BatchEvent[]> {
  const rows = unwrap(await db().from("pf_batch_event").select("id,type,at,qty,location_code,note,by_id").eq("batch_id", batchId).order("id", { ascending: false }).limit(200)) as BatchEvent[];
  return rows.map((e) => numeric(e, ["qty"]));
}

export async function fetchHarvestLots(batchId: string): Promise<HarvestLot[]> {
  const rows = unwrap(await db().from("pf_harvest_lot").select("id,lot_code,harvested_at,fresh_kg,remaining_kg,grade,best_before,notes").eq("batch_id", batchId).order("lot_code")) as HarvestLot[];
  return rows.map((l) => numeric(l, ["fresh_kg", "remaining_kg"]));
}

export async function fetchSeedLots(): Promise<SeedLot[]> {
  const rows = unwrap(await db().from("pf_seed_lot_overview").select(LOT_COLUMNS).order("received_at", { ascending: false }).limit(500)) as SeedLot[];
  return rows.map((l) => numeric(l, ["qty_on_hand"]));
}

export async function fetchSeedLot(id: string): Promise<SeedLot> {
  return numeric(unwrap(await db().from("pf_seed_lot_overview").select(LOT_COLUMNS).eq("id", id).single()) as SeedLot, ["qty_on_hand"]);
}

export type ActiveRecipe = Pick<PfRecipe, "id" | "crop_id" | "code" | "version">;

export async function fetchActiveRecipes(): Promise<ActiveRecipe[]> {
  return unwrap(await db().from("pf_recipe").select("id,crop_id,code,version").eq("status", "active").order("code")) as ActiveRecipe[];
}

export async function addSeedLot(f: SeedLotForm, qty: number) {
  check(await db().rpc("pf_seed_lot_add", { crop: f.cropId, unit: f.unit, lot_no: f.lotNo.trim(), qty, received_on: f.receivedOn, expiry_on: f.expiryOn || null, supplier: f.supplier, notes: f.notes }));
}

export async function adjustSeedLot(lot: string, newQty: number, why: string) {
  check(await db().rpc("pf_seed_lot_adjust", { lot, new_qty: newQty, why }));
}

export async function createBatch(recipe: string, seedLot: string, notes: string): Promise<string> {
  return unwrap(await db().rpc("pf_batch_create", { recipe, seed_lot: seedLot, notes })) as string;
}

export async function sowBatch(batch: string, trays: { location_id: string; seeds: number }[], sownOn: string, seedUsed: number | null) {
  check(await db().rpc("pf_batch_sow", { batch, trays, sown_on: sownOn, seed_used: seedUsed }));
}

export async function updateTray(slot: string, state: string, germinated: number, note: string) {
  check(await db().rpc("pf_tray_update", { slot, new_state: state, new_germinated: germinated, new_note: note }));
}

export async function closeTray(slot: string, why: string) {
  check(await db().rpc("pf_tray_close", { slot, why }));
}

export type TransplantResult = { count: number; left: number; first_hole: string; tier: string };

export async function transplantBatch(batch: string, tier: string): Promise<TransplantResult> {
  return unwrap(await db().rpc("pf_batch_transplant", { batch, tier })) as TransplantResult;
}

export async function updateHole(slot: string, state: "tumbuh" | "masalah", note: string) {
  check(await db().rpc("pf_hole_update", { slot, new_state: state, new_note: note }));
}

export async function closeHole(slot: string, why: string) {
  check(await db().rpc("pf_hole_close", { slot, why }));
}

export async function addBatchNote(batch: string, note: string) {
  check(await db().rpc("pf_batch_note", { batch, note }));
}

export async function addHarvest(batch: string, kg: number, grade: HarvestGrade, harvestedOn: string, bestBefore: string, notes: string): Promise<string> {
  return unwrap(await db().rpc("pf_harvest_add", { batch, kg, grade, harvested_on: harvestedOn, best_before: bestBefore || null, notes })) as string;
}

export async function correctHarvest(lot: string, kg: number, grade: HarvestGrade, why: string) {
  check(await db().rpc("pf_harvest_correct", { lot, kg, new_grade: grade, why }));
}

export async function finishBatch(batch: string, outcome: "selesai" | "gagal", why: string) {
  check(await db().rpc("pf_batch_finish", { batch, outcome, why }));
}

export async function tierSanitized(tier: string) {
  check(await db().rpc("pf_tier_sanitized", { tier }));
}

/* ------------------------------------------------- what the 3D screens read */

export type SnapshotLocation = { id: string; code: string; level: string; slot_status: string | null };

export type ErpSnapshot = {
  today: string;
  batches: BatchOverview[];
  slots: OpenSlot[];
  phases: Pick<PfRecipePhase, "recipe_id" | "phase" | "seq" | "duration_days">[];
  locations: SnapshotLocation[];
};

export async function fetchErpSnapshot(): Promise<ErpSnapshot> {
  const client = db();
  const [batches, slots, phases, locations] = await Promise.all([
    client.from("pf_batch_overview").select(BATCH_COLUMNS).eq("status", "berjalan").limit(500),
    client.from("pf_slot_open").select(SLOT_COLUMNS).limit(1000),
    client.from("pf_recipe_phase").select("recipe_id,phase,seq,duration_days").order("seq").limit(1000),
    client.from("pf_location").select("id,code,level,slot_status").in("level", ["hole", "tray_position", "tier"]).limit(1000),
  ]);
  return {
    today: jakartaToday(),
    batches: unwrap(batches) as BatchOverview[],
    slots: unwrap(slots) as OpenSlot[],
    phases: unwrap(phases) as ErpSnapshot["phases"],
    locations: unwrap(locations) as SnapshotLocation[],
  };
}
