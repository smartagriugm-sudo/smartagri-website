import { supabase } from "../auth/supabase";
import { RACK_SPEC, holeId } from "./facility";
import { SHELVES, slotId } from "./chamber";

// The ERP's master data (supabase/pf-foundation.sql): places, crops, versioned
// recipes, roles and the audit log. RLS decides who may do what; the checks here
// only keep people from being offered something that would be refused.

/* ------------------------------------------------------------------ roles */

export const ERP_ROLES = [
  { key: "pimpinan", label: "Leadership", note: "Sees all data and the audit log" },
  { key: "admin", label: "System admin", note: "Manages roles and locations" },
  { key: "manajer_produksi", label: "Production manager", note: "Manages crops, recipes, seed lots and batches" },
  { key: "staf_penjualan", label: "Sales staff", note: "Manages customers, orders, invoices and payments" },
  { key: "staf_sdm", label: "HR staff", note: "Manages people, contracts, schedules and attendance" },
  { key: "teknisi", label: "Technician", note: "Manages devices, calibration and tokens" },
  { key: "operator", label: "Operator", note: "Records sowing, transplanting and harvest" },
  { key: "peneliti", label: "Researchers and students", note: "Reading data" },
] as const;

export type ErpRole = (typeof ERP_ROLES)[number]["key"];

export type ErpAccess = { canAdmin: boolean; canManageProduction: boolean; canOperate: boolean; canMaintain: boolean; canReadAudit: boolean; canSell: boolean; canReadSales: boolean; canReadPurchase: boolean; canManagePeople: boolean; canSchedule: boolean; canReadPeople: boolean; canReadPrivate: boolean; canWriteContracts: boolean; canSweepPhotos: boolean; canReadCost: boolean; canReadMaintenance: boolean };

/** Mirrors pf_is_admin(), pf_can_manage_production(), pf_can_operate() and pf_can_read_audit(). */
export function accessOf(roles: readonly string[], isLabAdmin: boolean): ErpAccess {
  const canAdmin = isLabAdmin || roles.includes("admin");
  const canManageProduction = canAdmin || roles.includes("manajer_produksi");
  const canSell = canAdmin || roles.includes("staf_penjualan");
  const canManagePeople = canAdmin || roles.includes("staf_sdm");
  const canSchedule = canManagePeople || roles.includes("manajer_produksi");
  const canMaintain = canAdmin || roles.includes("teknisi");
  const canReadCost = canManageProduction || roles.includes("pimpinan");
  return {
    canAdmin,
    canManageProduction,
    canOperate: canManageProduction || roles.includes("operator"),
    canMaintain,
    canReadAudit: canAdmin || roles.includes("pimpinan"),
    canSell,
    canReadSales: canSell || roles.includes("pimpinan") || roles.includes("manajer_produksi"),
    canReadPurchase: canManageProduction || roles.includes("pimpinan"),
    canManagePeople,
    canSchedule,
    canReadPeople: canSchedule || roles.includes("pimpinan"),
    // Contracts and photos: deliberately not ERP admins.
    canReadPrivate: roles.includes("staf_sdm") || roles.includes("pimpinan"),
    canWriteContracts: roles.includes("staf_sdm"),
    canSweepPhotos: roles.includes("staf_sdm"),
    canReadCost,
    canReadMaintenance: canMaintain || canReadCost,
  };
}

/* -------------------------------------------------------------- locations */

export type LocationLevel = "site" | "room" | "rack" | "tier" | "gully" | "hole" | "chamber" | "chamber_shelf" | "tray_position";
export type SlotStatus = "available" | "maintenance" | "retired" | "sanitasi";

export const SLOT_STATUSES: { key: SlotStatus; label: string; color: string }[] = [
  { key: "available", label: "Ready to use", color: "#2F9E57" },
  { key: "maintenance", label: "Maintenance", color: "#E0A526" },
  { key: "retired", label: "Not in use", color: "#8D9398" },
  { key: "sanitasi", label: "Sanitation", color: "#7FB7E8" },
];

export const LEVEL_LABELS: Record<LocationLevel, string> = {
  site: "Site",
  room: "Room",
  rack: "Rack",
  tier: "Tier",
  gully: "Gully",
  hole: "Hole",
  chamber: "Chamber",
  chamber_shelf: "Chamber shelf",
  tray_position: "Tray position",
};

export type PfLocation = {
  id: string;
  parent_id: string | null;
  level: LocationLevel;
  code: string;
  name: string;
  capacity: number | null;
  slot_status: SlotStatus | null;
};

export type LocationNode = PfLocation & { children: LocationNode[] };

const naturalOrder = new Intl.Collator("en", { numeric: true });

export const isSlot = (l: Pick<PfLocation, "level">) => l.level === "hole" || l.level === "tray_position";

/** Rows into a tree, children in natural order. A row whose parent is not in the list becomes a root. */
export function buildLocationTree(rows: readonly PfLocation[]): LocationNode[] {
  const nodes = new Map<string, LocationNode>(rows.map((r) => [r.id, { ...r, children: [] }]));
  const roots: LocationNode[] = [];
  for (const node of nodes.values()) {
    const parent = node.parent_id ? nodes.get(node.parent_id) : undefined;
    (parent ? parent.children : roots).push(node);
  }
  const sort = (list: LocationNode[]) => {
    list.sort((a, b) => naturalOrder.compare(a.code, b.code));
    list.forEach((n) => sort(n.children));
  };
  sort(roots);
  return roots;
}

/** The slots under a node, or the node itself when it is one. */
export function slotsUnder(node: LocationNode): LocationNode[] {
  return isSlot(node) ? [node] : node.children.flatMap(slotsUnder);
}

/** Every hole and tray position the 3D models know; the finish line of Tahap 1. */
export function expectedSlotCodes(): string[] {
  const codes: string[] = [];
  for (let rack = 1; rack <= RACK_SPEC.count; rack++)
    for (let tier = 1; tier <= RACK_SPEC.tiers; tier++)
      for (let gully = 1; gully <= RACK_SPEC.gullies; gully++)
        for (let hole = 1; hole <= RACK_SPEC.holes; hole++) codes.push(holeId(rack, tier, gully, hole));
  for (const { shelf, positions } of SHELVES)
    for (let position = 1; position <= positions; position++) codes.push(slotId(shelf, position));
  return codes;
}

export type SlotCoverage = { expected: number; present: number; missing: string[] };

export function slotCoverage(rows: readonly Pick<PfLocation, "code">[]): SlotCoverage {
  const have = new Set(rows.map((r) => r.code));
  const expected = expectedSlotCodes();
  const missing = expected.filter((c) => !have.has(c));
  return { expected: expected.length, present: expected.length - missing.length, missing };
}

/* ------------------------------------------------------------------ crops */

export type PfCrop = {
  id: string;
  name: string;
  variety: string;
  cycle_days: number | null;
  germ_rate: number | null;
  notes: string;
  active: boolean;
};

export type CropForm = { name: string; variety: string; cycleDays: string; germRate: string; notes: string; active: boolean };
export type CropFields = Omit<PfCrop, "id">;

export const emptyCropForm: CropForm = { name: "", variety: "", cycleDays: "", germRate: "", notes: "", active: true };

export function cropToForm(c: PfCrop): CropForm {
  return {
    name: c.name,
    variety: c.variety,
    cycleDays: c.cycle_days?.toString() ?? "",
    germRate: c.germ_rate?.toString() ?? "",
    notes: c.notes,
    active: c.active,
  };
}

const parseNumber = (s: string) => (s.trim() === "" ? null : Number(s.trim().replace(",", ".")));

export function parseCropForm(f: CropForm): { fields: CropFields; error: null } | { fields: null; error: string } {
  const name = f.name.trim();
  if (!name) return { fields: null, error: "A crop name is required." };
  const cycle = parseNumber(f.cycleDays);
  if (cycle !== null && (!Number.isInteger(cycle) || cycle <= 0)) return { fields: null, error: "The cycle must be a whole number above 0." };
  const germ = parseNumber(f.germRate);
  if (germ !== null && (!Number.isFinite(germ) || germ < 0 || germ > 100)) return { fields: null, error: "Germination must be 0–100%." };
  return {
    fields: { name, variety: f.variety.trim(), cycle_days: cycle, germ_rate: germ, notes: f.notes.trim(), active: f.active },
    error: null,
  };
}

export const cropLabel = (c: Pick<PfCrop, "name" | "variety">) => (c.variety ? `${c.name} ${c.variety}` : c.name);

/* ---------------------------------------------------------------- recipes */

export type RecipeStatus = "draft" | "active" | "retired";

export const RECIPE_STATUS: Record<RecipeStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-[#FFF6E5] text-[#8A5A07]" },
  active: { label: "Active", className: "bg-[#E3F7F0] text-[#0E7A5C]" },
  retired: { label: "Done", className: "bg-[#EEF3F4] text-[#4F6B73]" },
};

export const RECIPE_PHASES = [
  { key: "semai", label: "Sow" },
  { key: "germinasi", label: "Germination" },
  { key: "bibit", label: "Seedlings" },
  { key: "vegetatif", label: "Vegetative" },
  { key: "pra_panen", label: "Pre-harvest" },
] as const;

export type RecipePhaseKey = (typeof RECIPE_PHASES)[number]["key"];

export const phaseLabel = (k: string) => RECIPE_PHASES.find((p) => p.key === k)?.label ?? k;

export type PfRecipe = {
  id: string;
  crop_id: string;
  code: string;
  version: number;
  parent_version_id: string | null;
  status: RecipeStatus;
  notes: string;
  created_at: string;
  activated_at: string | null;
};

export type PfRecipePhase = {
  id: string;
  recipe_id: string;
  phase: RecipePhaseKey;
  seq: number;
  duration_days: number;
  photoperiod_h: number | null;
  ppfd_umol: number | null;
};

export type RecipeGroup = { code: string; cropId: string; versions: PfRecipe[]; current: PfRecipe };

/** Versions per recipe code, newest first. `current` is what a batch would use: the active one, else the newest. */
export function groupRecipes(recipes: readonly PfRecipe[]): RecipeGroup[] {
  const byCode = new Map<string, PfRecipe[]>();
  for (const r of recipes) byCode.set(r.code, [...(byCode.get(r.code) ?? []), r]);
  return [...byCode.entries()]
    .map(([code, list]) => {
      const versions = [...list].sort((a, b) => b.version - a.version);
      return { code, cropId: versions[0].crop_id, versions, current: versions.find((v) => v.status === "active") ?? versions[0] };
    })
    .sort((a, b) => naturalOrder.compare(a.code, b.code));
}

export const RECIPE_CODE = /^[A-Z0-9][A-Z0-9-]*$/;

export function normalizeRecipeCode(s: string) {
  return s.trim().toUpperCase().replace(/\s+/g, "-");
}

export type PhaseForm = { phase: RecipePhaseKey; durationDays: string; photoperiodH: string; ppfdUmol: string };
export type PhaseFields = Pick<PfRecipePhase, "phase" | "seq" | "duration_days" | "photoperiod_h" | "ppfd_umol">;

export function phaseToForm(p: PfRecipePhase): PhaseForm {
  return {
    phase: p.phase,
    durationDays: p.duration_days.toString(),
    photoperiodH: p.photoperiod_h?.toString() ?? "",
    ppfdUmol: p.ppfd_umol?.toString() ?? "",
  };
}

/** Rows in screen order become seq 1, 2, 3... */
export function parsePhaseForms(forms: readonly PhaseForm[]): { fields: PhaseFields[]; error: null } | { fields: null; error: string } {
  if (forms.length === 0) return { fields: null, error: "A recipe needs at least one phase." };
  const fields: PhaseFields[] = [];
  for (const [i, f] of forms.entries()) {
    const where = `Phase ${i + 1} (${phaseLabel(f.phase)})`;
    const days = parseNumber(f.durationDays);
    if (days === null || !Number.isInteger(days) || days <= 0) return { fields: null, error: `${where}: phase length must be a whole number above 0.` };
    const photo = parseNumber(f.photoperiodH);
    if (photo !== null && (!Number.isFinite(photo) || photo < 0 || photo > 24)) return { fields: null, error: `${where}: photoperiod must be 0–24 hours.` };
    const ppfd = parseNumber(f.ppfdUmol);
    if (ppfd !== null && (!Number.isFinite(ppfd) || ppfd < 0)) return { fields: null, error: `${where}: PPFD cannot be negative.` };
    fields.push({ phase: f.phase, seq: i + 1, duration_days: days, photoperiod_h: photo, ppfd_umol: ppfd });
  }
  return { fields, error: null };
}

export const totalDays = (phases: readonly { duration_days: number }[]) => phases.reduce((n, p) => n + p.duration_days, 0);

/* -------------------------------------------------------------- audit log */

export type AuditEntry = {
  id: number;
  at: string;
  actor_id: string | null;
  table_name: string;
  row_id: string;
  action: "INSERT" | "UPDATE" | "DELETE";
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
};

export const AUDIT_TABLES: { key: string; label: string }[] = [
  { key: "pf_location", label: "Location" },
  { key: "pf_crop", label: "Crops" },
  { key: "pf_recipe", label: "Recipes" },
  { key: "pf_recipe_phase", label: "Recipe phase" },
  { key: "pf_user_role", label: "Roles" },
  { key: "pf_batch", label: "Batch" },
  { key: "pf_harvest_lot", label: "Harvest lots" },
  { key: "pf_stock_lot", label: "Seed lots" },
  { key: "pf_item", label: "Item" },
  { key: "pf_cost_entry", label: "Bills" },
  { key: "pf_labor_rate", label: "Labour rate" },
  { key: "pf_lot_price", label: "Lot price" },
  { key: "pf_maintenance_plan", label: "Maintenance plan" },
  { key: "pf_work_order", label: "Work order" },
  { key: "pf_person", label: "People" },
  { key: "pf_shift", label: "Schedule" },
  { key: "pf_leave", label: "Leave" },
  { key: "pf_work_area", label: "Work area" },
  { key: "pf_labor_log", label: "Work hours" },
  { key: "pf_purchase_order", label: "Purchasing" },
  { key: "pf_po_line", label: "Purchase line" },
  { key: "pf_recipe_material", label: "Recipe materials" },
  { key: "pf_stock_count", label: "Stock count" },
  { key: "pf_stock_shortage", label: "Stock shortage" },
  { key: "pf_partner", label: "Customers" },
  { key: "pf_sales_order", label: "Orders" },
  { key: "pf_so_allocation", label: "Lot allocation" },
  { key: "pf_delivery", label: "Delivery" },
  { key: "pf_invoice", label: "Invoice" },
  { key: "pf_payment", label: "Payment" },
  { key: "pf_tax_rate", label: "Tax rate" },
  { key: "pf_asset", label: "Devices" },
  { key: "pf_calibration", label: "Calibration" },
  { key: "pf_alarm_rule", label: "Alarm rule" },
  { key: "pf_recipe_target", label: "Recipe reference" },
];

export const AUDIT_ACTIONS: Record<AuditEntry["action"], string> = { INSERT: "Created", UPDATE: "Changed", DELETE: "Removed" };

export type AuditChange = { field: string; from: unknown; to: unknown };

export function auditChanges(e: Pick<AuditEntry, "old_data" | "new_data">): AuditChange[] {
  const before = e.old_data ?? {};
  const after = e.new_data ?? {};
  return [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .filter((field) => JSON.stringify(before[field]) !== JSON.stringify(after[field]))
    .map((field) => ({ field, from: before[field] ?? null, to: after[field] ?? null }));
}

/** A readable name for what an entry is about. */
export type AuditGroup = { key: number; entries: AuditEntry[] };

/** Rows from one saved operation (same person, kind of data, action and second) read as one line. */
export function groupAudit(entries: readonly AuditEntry[]): AuditGroup[] {
  const groups: AuditGroup[] = [];
  const stamp = (e: AuditEntry) => `${e.actor_id}|${e.table_name}|${e.action}|${e.at.slice(0, 19)}`;
  for (const e of entries) {
    const last = groups[groups.length - 1];
    if (last && stamp(last.entries[0]) === stamp(e)) last.entries.push(e);
    else groups.push({ key: e.id, entries: [e] });
  }
  return groups;
}

export function auditSubject(e: Pick<AuditEntry, "old_data" | "new_data" | "row_id">): string {
  const d = e.new_data ?? e.old_data ?? {};
  const pick = (k: string) => (typeof d[k] === "string" && d[k] ? (d[k] as string) : "");
  if (pick("role")) return ERP_ROLES.find((r) => r.key === pick("role"))?.label ?? pick("role");
  if (pick("code")) return typeof d.version === "number" ? `${pick("code")} v${d.version}` : pick("code");
  if (pick("name")) return cropLabel({ name: pick("name"), variety: pick("variety") });
  if (pick("phase")) return phaseLabel(pick("phase"));
  for (const k of ["wo_no", "po_no", "lot_code", "lot_no", "full_name", "title", "description", "sku"]) if (pick(k)) return pick(k);
  const day = pick("work_date") || pick("start_date") || pick("valid_from");
  if (day) return `for ${day}`;
  // An id means nothing to a reader; what changed is under Details.
  return "";
}

/** "1 work order", "33 work orders": the kind of data counted in plain words. */
const AUDIT_NOUNS: Record<string, [string, string]> = {
  pf_location: ["location", "locations"],
  pf_crop: ["crop", "crops"],
  pf_recipe: ["recipe", "recipes"],
  pf_recipe_phase: ["recipe phase", "recipe phases"],
  pf_user_role: ["role", "roles"],
  pf_batch: ["batch", "batches"],
  pf_harvest_lot: ["harvest lot", "harvest lots"],
  pf_stock_lot: ["stock lot", "stock lots"],
  pf_item: ["item", "items"],
  pf_cost_entry: ["bill", "bills"],
  pf_labor_rate: ["labour rate", "labour rates"],
  pf_lot_price: ["lot price", "lot prices"],
  pf_maintenance_plan: ["maintenance plan", "maintenance plans"],
  pf_work_order: ["work order", "work orders"],
  pf_person: ["person", "people"],
  pf_shift: ["shift", "shifts"],
  pf_leave: ["leave request", "leave requests"],
  pf_work_area: ["work area", "work areas"],
  pf_labor_log: ["work hours entry", "work hours entries"],
  pf_purchase_order: ["purchase order", "purchase orders"],
  pf_po_line: ["purchase line", "purchase lines"],
  pf_recipe_material: ["recipe material", "recipe materials"],
  pf_stock_count: ["stock count", "stock counts"],
  pf_stock_shortage: ["stock shortage", "stock shortages"],
  pf_partner: ["customer", "customers"],
  pf_sales_order: ["order", "orders"],
  pf_so_allocation: ["lot allocation", "lot allocations"],
  pf_delivery: ["delivery", "deliveries"],
  pf_invoice: ["invoice", "invoices"],
  pf_payment: ["payment", "payments"],
  pf_tax_rate: ["tax rate", "tax rates"],
  pf_asset: ["device", "devices"],
  pf_calibration: ["calibration", "calibrations"],
  pf_alarm_rule: ["alarm rule", "alarm rules"],
  pf_recipe_target: ["recipe reference", "recipe references"],
};

export function auditNoun(table: string, count: number): string {
  const n = AUDIT_NOUNS[table];
  if (!n) return table.replace(/^pf_/, "").replace(/_/g, " ");
  return count === 1 ? n[0] : n[1];
}

/* ------------------------------------------------------------- data access */

export class ErpDataError extends Error {
  constructor(message: string, readonly notInstalled = false) {
    super(message);
  }
}

type PostgrestLikeError = { code?: string; message: string };

/** PGRST205 and 42P01: the table is not there, so pf-foundation.sql has not been run. */
export function toDataError(e: PostgrestLikeError): ErpDataError {
  const missing = e.code === "PGRST205" || e.code === "PGRST202" || e.code === "42P01";
  return new ErpDataError(friendlyMessage(e), missing);
}

const NETWORK_FAILURE = /failed to fetch|networkerror|load failed|fetch failed/i;

function friendlyMessage(e: PostgrestLikeError) {
  if (NETWORK_FAILURE.test(e.message)) return "Cannot reach the server. Check your internet connection, then try again.";
  if (e.code === "23505") return "Something with that name or code already exists.";
  if (e.code === "42501") return "Your account does not have permission for this.";
  return e.message;
}

/** Any failure, as an error whose message can be shown to the person using the page. */
export function toErpError(e: unknown): ErpDataError {
  if (e instanceof ErpDataError) return e;
  return toDataError({ message: e instanceof Error ? e.message : "Something went wrong" });
}

export function db() {
  if (!supabase) throw new ErpDataError("Supabase is not configured in this environment.", true);
  return supabase;
}

export function unwrap<T>({ data, error }: { data: T | null; error: PostgrestLikeError | null }): T {
  if (error) throw toDataError(error);
  return data as T;
}

export function check({ error }: { error: PostgrestLikeError | null }) {
  if (error) throw toDataError(error);
}

const LOCATION_COLUMNS = "id,parent_id,level,code,name,capacity,slot_status";

export async function fetchLocations(): Promise<PfLocation[]> {
  return unwrap(await db().from("pf_location").select(LOCATION_COLUMNS).order("code").limit(5000)) as PfLocation[];
}

export async function updateSlotStatus(ids: readonly string[], status: SlotStatus) {
  check(await db().from("pf_location").update({ slot_status: status }).in("id", [...ids]));
}

export async function fetchCrops(): Promise<PfCrop[]> {
  return unwrap(await db().from("pf_crop").select("id,name,variety,cycle_days,germ_rate,notes,active").order("name").order("variety")) as PfCrop[];
}

export async function saveCrop(id: string | null, fields: CropFields) {
  check(id ? await db().from("pf_crop").update(fields).eq("id", id) : await db().from("pf_crop").insert(fields));
}

export async function fetchRecipes(): Promise<PfRecipe[]> {
  return unwrap(await db().from("pf_recipe").select("id,crop_id,code,version,parent_version_id,status,notes,created_at,activated_at").order("code").order("version")) as PfRecipe[];
}

export async function fetchRecipePhases(recipeId: string): Promise<PfRecipePhase[]> {
  return unwrap(await db().from("pf_recipe_phase").select("id,recipe_id,phase,seq,duration_days,photoperiod_h,ppfd_umol").eq("recipe_id", recipeId).order("seq")) as PfRecipePhase[];
}

export async function createRecipe(cropId: string, code: string, notes: string): Promise<string> {
  const row = unwrap(await db().from("pf_recipe").insert({ crop_id: cropId, code, notes }).select("id").single()) as { id: string };
  return row.id;
}

export async function updateRecipeNotes(id: string, notes: string) {
  check(await db().from("pf_recipe").update({ notes }).eq("id", id));
}

/** A draft's phases are replaced whole, since seq is unique and rows may swap places. */
export async function savePhases(recipeId: string, phases: readonly PhaseFields[]) {
  check(await db().from("pf_recipe_phase").delete().eq("recipe_id", recipeId));
  check(await db().from("pf_recipe_phase").insert(phases.map((p) => ({ ...p, recipe_id: recipeId }))));
}

export async function activateRecipe(id: string) {
  check(await db().rpc("pf_recipe_activate", { recipe: id }));
}

export async function retireRecipe(id: string) {
  check(await db().from("pf_recipe").update({ status: "retired" }).eq("id", id));
}

export async function newRecipeVersion(id: string): Promise<string> {
  return unwrap(await db().rpc("pf_recipe_new_version", { recipe: id })) as string;
}

export async function deleteRecipeDraft(id: string) {
  check(await db().from("pf_recipe").delete().eq("id", id));
}

export type LabMember = { id: string; full_name: string; preferred_name: string | null; lab_role: string; avatar_url?: string | null };

export async function fetchMembers(): Promise<LabMember[]> {
  return unwrap(await db().rpc("lab_directory")) as LabMember[];
}

export const memberName = (m: Pick<LabMember, "full_name" | "preferred_name">) => m.preferred_name || m.full_name || "Unnamed";

export type RoleGrant = { profile_id: string; role: ErpRole };

export async function fetchRoleGrants(): Promise<RoleGrant[]> {
  return unwrap(await db().from("pf_user_role").select("profile_id,role")) as RoleGrant[];
}

export async function setRole(profileId: string, role: ErpRole, on: boolean) {
  check(
    on
      ? await db().from("pf_user_role").insert({ profile_id: profileId, role })
      : await db().from("pf_user_role").delete().eq("profile_id", profileId).eq("role", role),
  );
}

export const AUDIT_PAGE = 100;

export async function fetchAudit(table: string | null): Promise<AuditEntry[]> {
  const query = db().from("pf_audit_log").select("id,at,actor_id,table_name,row_id,action,old_data,new_data").order("id", { ascending: false }).limit(AUDIT_PAGE);
  return unwrap(await (table ? query.eq("table_name", table) : query)) as AuditEntry[];
}

/** What one account changed. Readable by Admin and Pimpinan only, so a refusal comes back empty rather than as an error. */
export async function fetchActorAudit(actor: string): Promise<AuditEntry[]> {
  const { data, error } = await db().from("pf_audit_log").select("id,at,actor_id,table_name,row_id,action,old_data,new_data").eq("actor_id", actor).order("id", { ascending: false }).limit(AUDIT_PAGE);
  return error ? [] : ((data ?? []) as AuditEntry[]);
}

export type FoundationSummary = { slots: SlotCoverage; crops: number; activeRecipes: number; seedLots: number };

export async function fetchFoundationSummary(): Promise<FoundationSummary> {
  const [slots, crops, recipes, lots] = await Promise.all([
    db().from("pf_location").select("code").in("level", ["hole", "tray_position"]).limit(5000),
    db().from("pf_crop").select("id", { count: "exact", head: true }).eq("active", true),
    db().from("pf_recipe").select("id", { count: "exact", head: true }).eq("status", "active"),
    db().from("pf_stock_lot").select("id", { count: "exact", head: true }),
  ]);
  check(crops);
  check(recipes);
  return {
    slots: slotCoverage(unwrap(slots) as { code: string }[]),
    crops: crops.count ?? 0,
    activeRecipes: recipes.count ?? 0,
    // Tahap 2's table: the rest of this card still works before it is installed.
    seedLots: lots.error ? 0 : (lots.count ?? 0),
  };
}

/** The strongest thing this person is here as, for the profile menu. */
export function accessLabel(a: ErpAccess) {
  if (a.canAdmin) return "System admin";
  if (a.canManageProduction) return "Production manager";
  if (a.canSell) return "Sales staff";
  if (a.canManagePeople) return "HR staff";
  if (a.canMaintain) return "Technician";
  if (a.canOperate) return "Operator";
  if (a.canReadAudit) return "Leadership";
  return "Researchers and students";
}

/**
 * A money amount as people type it, in either habit: 1.500.000, 1,500,000, 12,5 or 12.5.
 * A separator followed by exactly three digits, every time, groups thousands; otherwise it
 * marks decimals. NaN when it is not a number at all, null when empty.
 */
export function parseAmount(text: string): number | null {
  const clean = text.trim().replace(/^rp\.?\s*/i, "").replace(/\s/g, "");
  if (clean === "") return null;
  if (/^-?\d{1,3}(\.\d{3})+$/.test(clean)) return Number(clean.replace(/\./g, ""));
  if (/^-?\d{1,3}(,\d{3})+$/.test(clean)) return Number(clean.replace(/,/g, ""));
  const lastDot = clean.lastIndexOf(".");
  const lastComma = clean.lastIndexOf(",");
  if (lastDot >= 0 && lastComma >= 0) {
    const decimal = lastDot > lastComma ? "." : ",";
    const group = decimal === "." ? /,/g : /\./g;
    return Number(clean.replace(group, "").replace(decimal, "."));
  }
  return Number(clean.replace(",", "."));
}
