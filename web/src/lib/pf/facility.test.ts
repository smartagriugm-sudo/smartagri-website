import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { HOLES_TOTAL, batchOf, isPlanted, seedHoles } from "./facility";
import { PfProvider } from "./provider";

const manifest = JSON.parse(readFileSync("node_modules/plant-factory-3d/assets/manifest.json", "utf8")) as {
  holes: { id: string }[];
  objects: { id: string; type: string }[];
};

describe("plant factory data", () => {
  it("uses exactly the hole ids of the 3D model", () => {
    const ours = seedHoles().map((h) => h.id).sort();
    expect(ours).toHaveLength(HOLES_TOTAL);
    expect(ours).toEqual(manifest.holes.map((h) => h.id).sort());
  });

  it("knows every lamp and pump of the 3D model", () => {
    const p = new PfProvider();
    for (const o of manifest.objects) {
      if (o.type === "lamp") expect(p.lamps.has(o.id), o.id).toBe(true);
      if (o.type === "pump") expect(p.pumps.has(o.id), o.id).toBe(true);
    }
  });

  it("gives every planted hole a batch, and no empty hole one", () => {
    for (const h of seedHoles()) {
      if (isPlanted(h.state)) expect(batchOf(h.batch), h.id).toBeDefined();
      else expect(h.batch, h.id).toBeNull();
    }
  });

  it("drops the batch when an edit empties a hole", () => {
    const p = new PfProvider();
    const planted = [...p.holes.values()].find((h) => isPlanted(h.state))!;
    p.updateHole(planted.id, { state: "kosong", note: "dipanen" });
    expect(p.getHole(planted.id)).toMatchObject({ state: "kosong", batch: null, note: "dipanen" });
  });

  it("switches off the lamp of a tier under sanitation only", () => {
    const p = new PfProvider();
    expect(p.lamps.get("LAMP-R2-T1")).toBe(false);
    expect(p.lamps.get("LAMP-R1-T1")).toBe(true);
  });
});
