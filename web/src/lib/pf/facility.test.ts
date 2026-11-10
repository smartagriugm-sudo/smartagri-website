import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { HOLES_TOTAL, batchOf, isPlanted, seedHoles } from "./facility";
import { PfProvider } from "./provider";

// The manifest is private, so these two checks run only where the local model
// copy exists (see docs/setup/SETUP-ERP-MODEL.md).
const manifestPath = "public/brand/plant-factory/manifest.json";

describe.runIf(existsSync(manifestPath))("plant factory data against the 3D model", () => {
  const manifest = JSON.parse(existsSync(manifestPath) ? readFileSync(manifestPath, "utf8") : "{}") as {
    holes: { id: string }[];
    objects: { id: string; type: string }[];
  };

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
});

describe("plant factory data", () => {
  it("gives every planted hole a batch, and no empty hole one", () => {
    for (const h of seedHoles()) {
      if (isPlanted(h.state)) expect(batchOf(h.batch), h.id).toBeDefined();
      else expect(h.batch, h.id).toBeNull();
    }
  });

  it("switches off the lamp of a tier under sanitation only", () => {
    const p = new PfProvider();
    p.setHoles(seedHoles());
    expect(p.lamps.get("LAMP-R2-T1")).toBe(false);
    expect(p.lamps.get("LAMP-R1-T1")).toBe(true);
  });
});
