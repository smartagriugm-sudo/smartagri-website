import type { PlantFactoryProvider } from "plant-factory-3d";
import { RACK_SPEC, blankHoles, type Hole } from "./facility";

// The cache the 3D engine reads from. The engine only reads synchronously and
// never calls an API, so ERP data is loaded outside it, stored here, and shown
// by calling scene.refresh(). ErpStore fills it from the pf_* tables, or with the
// sample data from facility.ts where those are not installed yet.
//
// Lamp and pump states are read-only on purpose. They stand for real devices,
// so commands have to go through auth, permissions and confirmation on the
// server, and these maps change only after the server confirms.
export class PfProvider implements PlantFactoryProvider {
  holes = new Map<string, Hole>();
  lamps = new Map<string, boolean>();
  pumps = new Map<string, boolean>([
    ["PUMP-MAIN", true],
    ["PUMP-R1", true],
    ["PUMP-R2", true],
  ]);

  constructor() {
    this.setHoles(blankHoles());
  }

  setHoles(holes: readonly Hole[]) {
    this.holes = new Map(holes.map((h) => [h.id, h]));
    this.lamps.clear();
    for (const h of holes) {
      const lamp = `LAMP-R${h.rack}-T${h.tier}`;
      // A tier being sanitised has nothing to light.
      this.lamps.set(lamp, this.lamps.get(lamp) || h.state !== "sanitasi");
    }
  }

  getHole(id: string) {
    return this.holes.get(id);
  }

  holesOfRack(rack: number) {
    return [...this.holes.values()].filter((h) => h.rack === rack);
  }
}

export const RACK_NUMBERS = Array.from({ length: RACK_SPEC.count }, (_, i) => i + 1);
export const TIER_NUMBERS = Array.from({ length: RACK_SPEC.tiers }, (_, i) => i + 1);
