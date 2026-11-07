import { describe, expect, it } from "vitest";
import { chamberObjectFacts, factoryObjectFacts, holeFacts, slotFacts } from "./scene-facts";
import { ErpStore } from "./store";

const store = () => {
  const s = new ErpStore();
  s.useSample();
  return s;
};

describe("scene facts", () => {
  it("knows nothing about an id the model does not have", () => {
    expect(holeFacts(store(), "R9-T9-G9-H99")).toBeNull();
    expect(slotFacts(store(), "CH1-S9-P99")).toBeNull();
  });

  it("says what a planted hole is doing, and when it should be ready", () => {
    const s = store();
    const hole = [...s.pf.holes.values()].find((h) => h.batch)!;
    const facts = holeFacts(s, hole.id)!;
    expect(facts.state?.label).toBeTruthy();
    expect(facts.rows.map(([k]) => k)).toEqual(expect.arrayContaining(["Crop", "Batch", "Expected harvest"]));
    expect(facts.progress?.max).toBe(s.batch(hole.batch)!.cycle);
  });

  it("says plainly when a hole holds nothing", () => {
    const s = store();
    const hole = [...s.pf.holes.values()].find((h) => !h.batch)!;
    const facts = holeFacts(s, hole.id)!;
    expect(facts.rows).toEqual([]);
    expect(facts.note).not.toBe("");
  });

  it("counts germination in a tray, moved seedlings included", () => {
    const s = store();
    const tray = [...s.chamber.slots.values()].find((t) => t.batch)!;
    tray.moved = 2;
    const facts = slotFacts(s, tray.id)!;
    expect(facts.progress).toMatchObject({ value: tray.germinated + 2, max: tray.seedCount });
    expect(facts.rows).toContainEqual(["Already moved", "2 seedlings"]);
  });

  it("marks a lamp's state as an example until devices report", () => {
    const s = store();
    const facts = factoryObjectFacts(s, { id: "LAMP-R1-T1", type: "lamp", rack: 1, tier: 1 });
    expect(facts.title).toBe("Lamp, Rack 1 · Tier 1");
    expect(facts.note).toContain("Sample");
  });

  it("names the chamber's equipment", () => {
    expect(chamberObjectFacts(store(), { id: "X", type: "sensor_climate" }).title).toBe("Microclimate sensor");
    expect(chamberObjectFacts(store(), { id: "L", type: "lamp", lights_shelf: 2 }).title).toBe("LED panel above shelf 2");
  });
});
