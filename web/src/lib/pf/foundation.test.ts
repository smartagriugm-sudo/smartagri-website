import { describe, expect, it } from "vitest";
import { seedSlots } from "./chamber";
import { HOLES_TOTAL, seedHoles } from "./facility";
import {
  accessOf,
  auditChanges,
  auditSubject,
  buildLocationTree,
  expectedSlotCodes,
  groupRecipes,
  normalizeRecipeCode,
  parseCropForm,
  parsePhaseForms,
  RECIPE_CODE,
  slotCoverage,
  slotsUnder,
  toDataError,
  totalDays,
  emptyCropForm,
  type PfLocation,
  type PfRecipe,
} from "./foundation";

const place = (id: string, parent_id: string | null, level: PfLocation["level"], code: string): PfLocation => ({
  id,
  parent_id,
  level,
  code,
  name: "",
  capacity: null,
  slot_status: level === "hole" || level === "tray_position" ? "available" : null,
});

describe("location tree", () => {
  it("puts children under parents in natural order, so H10 follows H9", () => {
    const [root] = buildLocationTree([
      place("g", "s", "gully", "R1-T1-G1"),
      place("h10", "g", "hole", "R1-T1-G1-H10"),
      place("h9", "g", "hole", "R1-T1-G1-H9"),
      place("s", null, "site", "SARC"),
    ]);
    expect(root.code).toBe("SARC");
    expect(root.children[0].children.map((c) => c.code)).toEqual(["R1-T1-G1-H9", "R1-T1-G1-H10"]);
    expect(slotsUnder(root)).toHaveLength(2);
  });

  it("keeps a row whose parent is missing instead of losing it", () => {
    expect(buildLocationTree([place("h", "gone", "hole", "R1-T1-G1-H01")]).map((n) => n.id)).toEqual(["h"]);
  });
});

describe("slot coverage", () => {
  it("expects exactly the ids the 3D data uses", () => {
    const fromModels = [...seedHoles().map((h) => h.id), ...seedSlots().map((s) => s.id)];
    expect(expectedSlotCodes().sort()).toEqual(fromModels.sort());
    expect(expectedSlotCodes()).toHaveLength(HOLES_TOTAL + 22);
  });

  it("names what is missing", () => {
    const [first, ...rest] = expectedSlotCodes();
    expect(slotCoverage(rest.map((code) => ({ code })))).toMatchObject({ present: rest.length, missing: [first] });
    expect(slotCoverage(expectedSlotCodes().map((code) => ({ code }))).missing).toEqual([]);
  });
});

describe("access", () => {
  it("gives a lab admin everything, even with no ERP role", () => {
    expect(accessOf([], true)).toEqual({ canAdmin: true, canManageProduction: true, canReadAudit: true });
  });

  it("lets each role do only its part", () => {
    expect(accessOf(["manajer_produksi"], false)).toEqual({ canAdmin: false, canManageProduction: true, canReadAudit: false });
    expect(accessOf(["pimpinan"], false)).toEqual({ canAdmin: false, canManageProduction: false, canReadAudit: true });
    expect(accessOf(["operator", "peneliti"], false)).toEqual({ canAdmin: false, canManageProduction: false, canReadAudit: false });
  });
});

describe("crop form", () => {
  it("trims and converts", () => {
    const { fields } = parseCropForm({ ...emptyCropForm, name: " Selada ", variety: " Romaine ", cycleDays: "35", germRate: "92,5" });
    expect(fields).toMatchObject({ name: "Selada", variety: "Romaine", cycle_days: 35, germ_rate: 92.5 });
  });

  it("leaves empty numbers empty and refuses bad ones", () => {
    expect(parseCropForm({ ...emptyCropForm, name: "Pakcoy" }).fields).toMatchObject({ cycle_days: null, germ_rate: null });
    expect(parseCropForm(emptyCropForm).error).toBeTruthy();
    expect(parseCropForm({ ...emptyCropForm, name: "x", cycleDays: "2.5" }).error).toBeTruthy();
    expect(parseCropForm({ ...emptyCropForm, name: "x", germRate: "101" }).error).toBeTruthy();
    expect(parseCropForm({ ...emptyCropForm, name: "x", germRate: "abc" }).error).toBeTruthy();
  });
});

describe("recipes", () => {
  const recipe = (version: number, status: PfRecipe["status"], code = "RSP-SEL-03"): PfRecipe => ({
    id: `${code}-${version}`,
    crop_id: "c",
    code,
    version,
    parent_version_id: null,
    status,
    notes: "",
    created_at: "",
    activated_at: null,
  });

  it("groups versions, newest first, with the active one as current", () => {
    const [group] = groupRecipes([recipe(1, "retired"), recipe(3, "draft"), recipe(2, "active")]);
    expect(group.versions.map((v) => v.version)).toEqual([3, 2, 1]);
    expect(group.current.version).toBe(2);
  });

  it("falls back to the newest version when none is active", () => {
    expect(groupRecipes([recipe(1, "retired"), recipe(2, "draft")])[0].current.version).toBe(2);
  });

  it("orders recipe codes naturally", () => {
    expect(groupRecipes([recipe(1, "active", "R-10"), recipe(1, "active", "R-9")]).map((g) => g.code)).toEqual(["R-9", "R-10"]);
  });

  it("normalizes codes to what the table accepts", () => {
    expect(normalizeRecipeCode(" rsp sel 03 ")).toBe("RSP-SEL-03");
    expect(RECIPE_CODE.test("RSP-SEL-03")).toBe(true);
    expect(RECIPE_CODE.test("-RSP")).toBe(false);
    expect(RECIPE_CODE.test("RSP_1")).toBe(false);
  });

  it("numbers phases in screen order and checks their values", () => {
    const row = { phase: "semai" as const, durationDays: "4", photoperiodH: "16", ppfdUmol: "120" };
    const { fields } = parsePhaseForms([row, { ...row, phase: "vegetatif", durationDays: "21", photoperiodH: "", ppfdUmol: "" }]);
    expect(fields?.map((f) => f.seq)).toEqual([1, 2]);
    expect(fields?.[1]).toMatchObject({ phase: "vegetatif", duration_days: 21, photoperiod_h: null, ppfd_umol: null });
    expect(totalDays(fields!)).toBe(25);
    expect(parsePhaseForms([]).error).toBeTruthy();
    expect(parsePhaseForms([{ ...row, durationDays: "0" }]).error).toContain("Fase 1");
    expect(parsePhaseForms([{ ...row, durationDays: "" }]).error).toBeTruthy();
    expect(parsePhaseForms([{ ...row, photoperiodH: "25" }]).error).toContain("24");
    expect(parsePhaseForms([{ ...row, ppfdUmol: "-1" }]).error).toBeTruthy();
  });
});

describe("audit entries", () => {
  it("shows only what changed", () => {
    expect(auditChanges({ old_data: { a: 1, b: 2 }, new_data: { a: 1, b: 3 } })).toEqual([{ field: "b", from: 2, to: 3 }]);
    expect(auditChanges({ old_data: null, new_data: { a: 1 } })).toEqual([{ field: "a", from: null, to: 1 }]);
  });

  it("names the subject", () => {
    expect(auditSubject({ row_id: "x", old_data: null, new_data: { code: "RSP-1", version: 2 } })).toBe("RSP-1 v2");
    expect(auditSubject({ row_id: "x", old_data: null, new_data: { code: "R1-T1-G1-H01" } })).toBe("R1-T1-G1-H01");
    expect(auditSubject({ row_id: "x", old_data: { role: "operator" }, new_data: null })).toBe("Operator");
    expect(auditSubject({ row_id: "x", old_data: null, new_data: { name: "Selada", variety: "Romaine" } })).toBe("Selada Romaine");
    expect(auditSubject({ row_id: "x", old_data: null, new_data: {} })).toBe("x");
  });
});

describe("data errors", () => {
  it("recognizes a table that is not installed yet", () => {
    expect(toDataError({ code: "PGRST205", message: "no table" }).notInstalled).toBe(true);
    expect(toDataError({ code: "42P01", message: "no table" }).notInstalled).toBe(true);
    expect(toDataError({ code: "42501", message: "denied" }).notInstalled).toBe(false);
  });

  it("explains a duplicate and a refusal in plain words", () => {
    expect(toDataError({ code: "23505", message: "duplicate key" }).message).toContain("sudah ada");
    expect(toDataError({ code: "42501", message: "denied" }).message).toContain("izin");
    expect(toDataError({ code: "P0001", message: "Resep harus punya fase" }).message).toBe("Resep harus punya fase");
  });
});
