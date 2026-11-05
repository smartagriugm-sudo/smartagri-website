import { supabase } from "../auth/supabase";
import { RACK_SPEC, holeId } from "./facility";
import { SHELVES, slotId } from "./chamber";

// The ERP's master data (supabase/pf-foundation.sql): places, crops, versioned
// recipes, roles and the audit log. RLS decides who may do what; the checks here
// only keep people from being offered something that would be refused.

/* ------------------------------------------------------------------ roles */

export const ERP_ROLES = [
  { key: "pimpinan", label: "Pimpinan", note: "Melihat semua data dan audit log" },
  { key: "admin", label: "Admin sistem", note: "Mengatur peran dan lokasi" },
  { key: "manajer_produksi", label: "Manajer produksi", note: "Mengatur tanaman dan resep" },
  { key: "staf_penjualan", label: "Staf penjualan", note: "Penjualan, mulai Tahap 3" },
  { key: "staf_sdm", label: "Staf SDM", note: "SDM, mulai Tahap 5" },
  { key: "teknisi", label: "Teknisi", note: "Perangkat, mulai Tahap 2" },
  { key: "operator", label: "Operator", note: "Catatan budidaya, mulai Tahap 2" },
  { key: "peneliti", label: "Peneliti dan mahasiswa", note: "Membaca data" },
] as const;

export type ErpRole = (typeof ERP_ROLES)[number]["key"];

export type ErpAccess = { canAdmin: boolean; canManageProduction: boolean; canReadAudit: boolean };

/** Mirrors pf_is_admin(), pf_can_manage_production() and pf_can_read_audit(). */
export function accessOf(roles: readonly string[], isLabAdmin: boolean): ErpAccess {
  const canAdmin = isLabAdmin || roles.includes("admin");
  return {
    canAdmin,
    canManageProduction: canAdmin || roles.includes("manajer_produksi"),
    canReadAudit: canAdmin || roles.includes("pimpinan"),
  };
}

/* -------------------------------------------------------------- locations */

export type LocationLevel = "site" | "room" | "rack" | "tier" | "gully" | "hole" | "chamber" | "chamber_shelf" | "tray_position";
export type SlotStatus = "available" | "maintenance" | "retired";

export const SLOT_STATUSES: { key: SlotStatus; label: string; color: string }[] = [
  { key: "available", label: "Siap pakai", color: "#2F9E57" },
  { key: "maintenance", label: "Perawatan", color: "#E0A526" },
  { key: "retired", label: "Tidak dipakai", color: "#8D9398" },
];

export const LEVEL_LABELS: Record<LocationLevel, string> = {
  site: "Site",
  room: "Ruang",
  rack: "Rak",
  tier: "Tingkat",
  gully: "Talang",
  hole: "Lubang",
  chamber: "Chamber",
  chamber_shelf: "Rak chamber",
  tray_position: "Posisi nampan",
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
  if (!name) return { fields: null, error: "Nama tanaman wajib diisi." };
  const cycle = parseNumber(f.cycleDays);
  if (cycle !== null && (!Number.isInteger(cycle) || cycle <= 0)) return { fields: null, error: "Siklus harus bilangan bulat di atas 0." };
  const germ = parseNumber(f.germRate);
  if (germ !== null && (!Number.isFinite(germ) || germ < 0 || germ > 100)) return { fields: null, error: "Daya kecambah harus 0–100%." };
  return {
    fields: { name, variety: f.variety.trim(), cycle_days: cycle, germ_rate: germ, notes: f.notes.trim(), active: f.active },
    error: null,
  };
}

export const cropLabel = (c: Pick<PfCrop, "name" | "variety">) => (c.variety ? `${c.name} ${c.variety}` : c.name);

/* ---------------------------------------------------------------- recipes */

export type RecipeStatus = "draft" | "active" | "retired";

export const RECIPE_STATUS: Record<RecipeStatus, { label: string; className: string }> = {
  draft: { label: "Draf", className: "bg-[#FFF6E5] text-[#8A5A07]" },
  active: { label: "Aktif", className: "bg-[#E3F7F0] text-[#0E7A5C]" },
  retired: { label: "Selesai", className: "bg-[#EEF3F4] text-[#4F6B73]" },
};

export const RECIPE_PHASES = [
  { key: "semai", label: "Semai" },
  { key: "germinasi", label: "Germinasi" },
  { key: "bibit", label: "Bibit" },
  { key: "vegetatif", label: "Vegetatif" },
  { key: "pra_panen", label: "Pra panen" },
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
  if (forms.length === 0) return { fields: null, error: "Resep perlu minimal satu fase." };
  const fields: PhaseFields[] = [];
  for (const [i, f] of forms.entries()) {
    const where = `Fase ${i + 1} (${phaseLabel(f.phase)})`;
    const days = parseNumber(f.durationDays);
    if (days === null || !Number.isInteger(days) || days <= 0) return { fields: null, error: `${where}: lama fase harus bilangan bulat di atas 0.` };
    const photo = parseNumber(f.photoperiodH);
    if (photo !== null && (!Number.isFinite(photo) || photo < 0 || photo > 24)) return { fields: null, error: `${where}: fotoperiode harus 0–24 jam.` };
    const ppfd = parseNumber(f.ppfdUmol);
    if (ppfd !== null && (!Number.isFinite(ppfd) || ppfd < 0)) return { fields: null, error: `${where}: PPFD tidak boleh negatif.` };
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
  { key: "pf_location", label: "Lokasi" },
  { key: "pf_crop", label: "Tanaman" },
  { key: "pf_recipe", label: "Resep" },
  { key: "pf_recipe_phase", label: "Fase resep" },
  { key: "pf_user_role", label: "Peran" },
];

export const AUDIT_ACTIONS: Record<AuditEntry["action"], string> = { INSERT: "Dibuat", UPDATE: "Diubah", DELETE: "Dihapus" };

export type AuditChange = { field: string; from: unknown; to: unknown };

export function auditChanges(e: Pick<AuditEntry, "old_data" | "new_data">): AuditChange[] {
  const before = e.old_data ?? {};
  const after = e.new_data ?? {};
  return [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .filter((field) => JSON.stringify(before[field]) !== JSON.stringify(after[field]))
    .map((field) => ({ field, from: before[field] ?? null, to: after[field] ?? null }));
}

/** A readable name for what an entry is about. */
export function auditSubject(e: Pick<AuditEntry, "old_data" | "new_data" | "row_id">): string {
  const d = e.new_data ?? e.old_data ?? {};
  const pick = (k: string) => (typeof d[k] === "string" && d[k] ? (d[k] as string) : "");
  if (pick("role")) return ERP_ROLES.find((r) => r.key === pick("role"))?.label ?? pick("role");
  if (pick("code")) return typeof d.version === "number" ? `${pick("code")} v${d.version}` : pick("code");
  if (pick("name")) return cropLabel({ name: pick("name"), variety: pick("variety") });
  if (pick("phase")) return phaseLabel(pick("phase"));
  return e.row_id;
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

function friendlyMessage(e: PostgrestLikeError) {
  if (e.code === "23505") return "Data dengan nama atau kode itu sudah ada.";
  if (e.code === "42501") return "Akun Anda tidak punya izin untuk tindakan ini.";
  return e.message;
}

function db() {
  if (!supabase) throw new ErpDataError("Supabase belum dikonfigurasi di lingkungan ini.", true);
  return supabase;
}

function unwrap<T>({ data, error }: { data: T | null; error: PostgrestLikeError | null }): T {
  if (error) throw toDataError(error);
  return data as T;
}

function check({ error }: { error: PostgrestLikeError | null }) {
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

export type LabMember = { id: string; full_name: string; preferred_name: string | null; lab_role: string };

export async function fetchMembers(): Promise<LabMember[]> {
  return unwrap(await db().rpc("lab_directory")) as LabMember[];
}

export const memberName = (m: Pick<LabMember, "full_name" | "preferred_name">) => m.preferred_name || m.full_name || "Tanpa nama";

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

export type FoundationSummary = { slots: SlotCoverage; crops: number; activeRecipes: number };

export async function fetchFoundationSummary(): Promise<FoundationSummary> {
  const [slots, crops, recipes] = await Promise.all([
    db().from("pf_location").select("code").in("level", ["hole", "tray_position"]).limit(5000),
    db().from("pf_crop").select("id", { count: "exact", head: true }).eq("active", true),
    db().from("pf_recipe").select("id", { count: "exact", head: true }).eq("status", "active"),
  ]);
  check(crops);
  check(recipes);
  return {
    slots: slotCoverage(unwrap(slots) as { code: string }[]),
    crops: crops.count ?? 0,
    activeRecipes: recipes.count ?? 0,
  };
}
