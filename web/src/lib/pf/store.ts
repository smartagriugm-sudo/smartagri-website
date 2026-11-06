import { blankSlots, ChamberProvider, seedSlots, type Slot, type SlotState } from "./chamber";
import { BATCHES, DUMMY_TODAY, addDays, blankHoles, daysBetween, isPlanted, seedHoles, type Batch } from "./facility";
import { ageOn, batchLabel, fetchErpSnapshot, holeStateOn, jakartaDate, trayState, transplantDay, type ErpSnapshot } from "./batch";
import { ErpDataError, toErpError } from "./foundation";
import { PfProvider, RACK_NUMBERS, TIER_NUMBERS } from "./provider";

// The ERP's shared view of both facilities, for the dashboard and the 3D screens.
// A batch is one record across both: sown in growth chamber trays, then moved into
// plant factory holes. Each 3D engine only ever reads its own provider, so load()
// fills both from the same snapshot. Writes happen on the batch pages, through
// the database's functions, and reach here on the next load().
//
// Where the pf_* tables are not installed yet it shows the sample data instead,
// and says so through `mode`.

export const LIFECYCLE_PHASES = [
  { label: "Semai", place: "CH1" },
  { label: "Germinasi", place: "CH1" },
  { label: "Pindah tanam", place: "ke PF01" },
  { label: "Vegetatif", place: "PF01" },
  { label: "Panen", place: "PF01" },
];

/** The day a batch reaches each step of the strip, from its own recipe. */
export function lifecycleDay(step: number, batch: Pick<Batch, "germinationDay" | "transplantDay" | "cycle">) {
  return [0, batch.germinationDay, batch.transplantDay, batch.transplantDay, batch.cycle][step];
}

export type StoreMode = "loading" | "live" | "sample" | "error";

export type TierCapacity = {
  rack: number;
  tier: number;
  code: string;
  /** Empty holes a seedling can go into. */
  free: number;
  /** Why this tier cannot take the batch, or null. */
  blocked: string | null;
};

export class ErpStore {
  pf = new PfProvider();
  chamber = new ChamberProvider();
  batches = new Map<string, Batch>();
  /** Location ids by code, for the writes that name a tier or a tray position. */
  locationIds = new Map<string, string>();
  mode: StoreMode = "loading";
  /** False until a load has filled the caches. Their blanks are not real zeros. */
  hasData = false;
  /** Why the last load failed, while mode is "error". */
  loadError: string | null = null;
  /** When the records on screen were read. */
  loadedAt: Date | null = null;
  today = DUMMY_TODAY;
  revision = 0;
  /** Moves when the records change, not when the simulated climate ticks. */
  dataVersion = 0;
  private listeners = new Set<() => void>();
  private latestLoad = 0;

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };

  /** Tells React the state changed, since it cannot see into these mutable caches. */
  emit() {
    this.revision++;
    for (const fn of this.listeners) fn();
  }

  /** Reads the records again. A reply older than the latest request is dropped. */
  async load() {
    const request = ++this.latestLoad;
    try {
      const snapshot = await fetchErpSnapshot();
      if (request === this.latestLoad) this.applySnapshot(snapshot);
    } catch (e) {
      if (request !== this.latestLoad) return;
      if (e instanceof ErpDataError && e.notInstalled) {
        this.useSample();
      } else {
        this.mode = "error";
        this.loadError = toErpError(e).message;
        this.dataVersion++;
        this.emit();
      }
    }
  }

  useSample() {
    this.today = DUMMY_TODAY;
    this.batches = new Map(BATCHES.map((b) => [b.code, { ...b, archived: { ...b.archived } }]));
    this.pf.setHoles(seedHoles());
    this.chamber.slots = new Map(seedSlots().map((s) => [s.id, s]));
    this.mode = "sample";
    this.hasData = true;
    this.loadError = null;
    this.dataVersion++;
    this.emit();
  }

  applySnapshot({ today, batches, slots, phases, locations }: ErpSnapshot) {
    this.today = today;
    this.locationIds = new Map(locations.map((l) => [l.code, l.id]));
    const status = new Map(locations.map((l) => [l.code, l.slot_status]));
    const openTrays = slots.filter((s) => s.kind === "tray");

    const phasesOf = new Map<string, ErpSnapshot["phases"]>();
    for (const p of phases) phasesOf.set(p.recipe_id, [...(phasesOf.get(p.recipe_id) ?? []), p]);

    const records = new Map(batches.map((b) => [b.id, b]));
    this.batches = new Map(
      batches.map((b) => {
        const mine = openTrays.filter((t) => t.batch_id === b.id);
        return [
          b.code,
          {
            id: b.id,
            code: b.code,
            crop: batchLabel(b),
            recipe: `${b.recipe_code} v${b.recipe_version}`,
            sownAt: b.sown_at ?? "",
            age: ageOn(b.sown_at, today),
            cycle: b.cycle_days,
            transplantedAt: b.transplanted_at ? jakartaDate(b.transplanted_at) : null,
            transplantDay: transplantDay(phasesOf.get(b.recipe_id) ?? []),
            germinationDay: phasesOf.get(b.recipe_id)?.[0]?.duration_days ?? 0,
            // Open trays are counted again by germinationOf().
            archived: {
              seeds: b.seeds - mine.reduce((n, t) => n + t.qty, 0),
              germinated: b.germinated - mine.reduce((n, t) => n + t.germinated + t.moved, 0),
            },
          },
        ];
      }),
    );

    const holes = blankHoles();
    const byCode = new Map(slots.filter((s) => s.kind === "hole").map((s) => [s.location_code, s]));
    for (const hole of holes) {
      const slot = byCode.get(hole.id);
      const place = status.get(hole.id);
      if (place === "sanitasi") hole.state = "sanitasi";
      hole.offline = place === "maintenance" || place === "retired";
      if (!slot) continue;
      const record = records.get(slot.batch_id);
      hole.batch = slot.batch_code;
      hole.sourceSlot = slot.source_code;
      hole.note = slot.note;
      hole.state = slot.state === "masalah" || !record ? "masalah" : holeStateOn(ageOn(record.sown_at, today), phasesOf.get(record.recipe_id) ?? []);
    }
    this.pf.setHoles(holes);

    const trays = blankSlots();
    const trayByCode = new Map(openTrays.map((s) => [s.location_code, s]));
    for (const tray of trays) {
      const place = status.get(tray.id);
      tray.offline = place !== undefined && place !== "available";
      const slot = trayByCode.get(tray.id);
      const record = slot && records.get(slot.batch_id);
      if (!slot || !record) continue;
      Object.assign(tray, {
        state: trayState(slot.state),
        batch: slot.batch_code,
        crop: batchLabel(record),
        sownOn: jakartaDate(slot.placed_at),
        seedCount: slot.qty,
        germinated: slot.germinated,
        moved: slot.moved,
        transplantOn: addDays(record.sown_at ?? today, transplantDay(phasesOf.get(record.recipe_id) ?? [])),
        note: slot.note,
      } satisfies Partial<Slot>);
    }
    this.chamber.slots = new Map(trays.map((s) => [s.id, s]));

    this.mode = "live";
    this.hasData = true;
    this.loadError = null;
    this.loadedAt = new Date();
    this.dataVersion++;
    this.emit();
  }

  ageOn(date: string) {
    return date ? Math.max(0, daysBetween(date, this.today)) : 0;
  }

  batch(code: string | null | undefined) {
    return code ? this.batches.get(code) : undefined;
  }

  holesOfBatch(code: string) {
    return [...this.pf.holes.values()].filter((h) => h.batch === code);
  }

  traysOfBatch(code: string) {
    return [...this.chamber.slots.values()].filter((s) => s.batch === code);
  }

  /** Batches growing in the plant factory, for its lifecycle strip and counts. */
  batchesInFactory() {
    return [...this.batches.values()].filter((b) => this.holesOfBatch(b.code).length > 0);
  }

  /** Batches still germinating, or part way through moving, in the chamber. */
  batchesInChamber() {
    return [...this.batches.values()].filter((b) => this.traysOfBatch(b.code).length > 0);
  }

  /** Index into LIFECYCLE_PHASES, from where the batch actually is rather than its planned dates. */
  phaseOf(batch: Batch) {
    const holes = this.holesOfBatch(batch.code).map((h) => h.state);
    if (holes.length > 0) {
      if (holes.includes("siap_panen")) return 4;
      return holes.includes("vegetatif") ? 3 : 2;
    }
    const states = this.traysOfBatch(batch.code).map((s) => s.state);
    if (states.includes("siap_pindah")) return 2;
    return states.includes("berkecambah") || states.includes("masalah") ? 1 : 0;
  }

  /** Germination across the batch's life, including trays already emptied into the plant factory. */
  germinationOf(code: string) {
    const batch = this.batch(code);
    let seeds = batch?.archived.seeds ?? 0;
    let germinated = batch?.archived.germinated ?? 0;
    for (const s of this.traysOfBatch(code)) {
      seeds += s.seedCount;
      germinated += s.germinated + s.moved;
    }
    return { seeds, germinated, rate: seeds ? germinated / seeds : 0 };
  }

  /** Trays ready to move, grouped by batch. */
  readyToMove() {
    const out: { batch: Batch; trays: Slot[]; seedlings: number }[] = [];
    for (const b of this.batches.values()) {
      const trays = this.traysOfBatch(b.code).filter((s) => s.state === "siap_pindah" && s.germinated > 0);
      if (trays.length) out.push({ batch: b, trays, seedlings: trays.reduce((n, s) => n + s.germinated, 0) });
    }
    return out;
  }

  /**
   * Each plant factory tier and whether it can receive this batch. A tier grows
   * one batch at a time. pf_batch_transplant() has the last word on this.
   */
  tiersFor(code: string): TierCapacity[] {
    const out: TierCapacity[] = [];
    for (const rack of RACK_NUMBERS) {
      for (const tier of TIER_NUMBERS) {
        const holes = this.pf.holesOfRack(rack).filter((h) => h.tier === tier);
        const other = holes.find((h) => isPlanted(h.state) && h.batch !== code);
        const free = holes.filter((h) => h.state === "kosong" && !h.offline).length;
        let blocked: string | null = null;
        if (holes.some((h) => h.state === "sanitasi")) blocked = "Masih sanitasi";
        else if (other) blocked = `Dipakai ${other.batch ?? "batch lain"}`;
        else if (!free) blocked = "Penuh";
        out.push({ rack, tier, code: `R${rack}-T${tier}`, free, blocked });
      }
    }
    return out;
  }

  /** Tiers waiting for someone to finish cleaning them. */
  tiersInSanitation() {
    return this.tiersFor("").filter((t) => t.blocked === "Masih sanitasi");
  }

  /** Empty holes across the tiers that could take a new batch. */
  freeCapacity() {
    return this.tiersFor("").reduce((n, t) => (t.blocked ? n : n + t.free), 0);
  }

  countSlots() {
    const c: Record<SlotState, number> = { kosong: 0, disemai: 0, berkecambah: 0, siap_pindah: 0, masalah: 0 };
    for (const s of this.chamber.slots.values()) c[s.state]++;
    return c;
  }
}
