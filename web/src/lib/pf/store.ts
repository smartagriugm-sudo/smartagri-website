import { ChamberProvider, emptySlot, DAYS_TO_TRANSPLANT, type Slot, type SlotState } from "./chamber";
import { BATCHES, DUMMY_TODAY, addDays, daysBetween, isPlanted, type Batch, type Hole } from "./facility";
import { PfProvider, RACK_NUMBERS, TIER_NUMBERS } from "./provider";

// The ERP's shared state, and the seam between its two facilities. A batch is
// one record across both: it is sown in growth chamber trays, then transplant()
// moves its seedlings into plant factory holes. Each 3D engine only ever reads
// its own provider, so both screens stay consistent by going through here.
//
// Everything lives in memory until the pf_* tables exist. The ERP layout route
// owns the instance, so it survives moving between the two screens and is gone
// on a full reload.

export const LIFECYCLE_PHASES = [
  { label: "Semai", place: "CH1", day: 0 },
  { label: "Germinasi", place: "CH1", day: 4 },
  { label: "Pindah tanam", place: "ke PF01", day: DAYS_TO_TRANSPLANT },
  { label: "Vegetatif", place: "PF01", day: 14 },
  { label: "Panen", place: "PF01", day: -1 },
];

export type SlotPatch = Pick<Slot, "state" | "crop" | "sownOn" | "seedCount" | "germinated" | "transplantOn" | "note"> & { batch: string };

export type TierCapacity = {
  rack: number;
  tier: number;
  /** Empty holes a seedling can go into. */
  free: number;
  /** Why this tier cannot take the batch, or null. */
  blocked: string | null;
};

export type TransplantResult = { batch: string; rack: number; tier: number; count: number; firstHole: string; left: number };

export class ErpStore {
  pf = new PfProvider();
  chamber = new ChamberProvider();
  batches = new Map<string, Batch>(BATCHES.map((b) => [b.code, { ...b, archived: { ...b.archived } }]));
  revision = 0;
  private listeners = new Set<() => void>();

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
    if (this.holesOfBatch(batch.code).length > 0) {
      if (batch.age >= batch.cycle - 3) return 4;
      return batch.age >= 14 ? 3 : 2;
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

  /** Validates and applies the tray form. Returns what is wrong, or null. */
  updateSlot(id: string, patch: SlotPatch): string | null {
    const slot = this.chamber.slots.get(id);
    if (!slot) return "Posisi tidak dikenal.";
    if (patch.state === "kosong") {
      this.chamber.slots.set(id, { ...emptySlot(slot), note: patch.note });
      this.emit();
      return null;
    }
    const code = patch.batch.trim();
    const crop = patch.crop.trim();
    if (!code || !crop) return "Batch dan tanaman wajib diisi.";
    if (!patch.sownOn) return "Tanggal semai wajib diisi.";
    if (patch.seedCount <= 0) return "Jumlah benih harus lebih dari 0.";
    if (patch.germinated < 0 || patch.germinated + slot.moved > patch.seedCount) return "Jumlah berkecambah melebihi jumlah benih.";
    if (patch.transplantOn && patch.transplantOn < patch.sownOn) return "Rencana pindah tanam sebelum tanggal semai.";
    const known = this.batches.get(code);
    if (known && known.crop !== crop) return `Batch ${code} sudah tercatat untuk ${known.crop}.`;
    if (!known) {
      this.batches.set(code, {
        code,
        crop,
        recipe: "Resep belum dipilih",
        sownAt: patch.sownOn,
        age: daysBetween(patch.sownOn, DUMMY_TODAY),
        cycle: 35,
        transplantedAt: null,
        archived: { seeds: 0, germinated: 0 },
      });
    }
    Object.assign(slot, patch, {
      batch: code,
      crop,
      transplantOn: patch.transplantOn || addDays(patch.sownOn, DAYS_TO_TRANSPLANT),
    });
    this.emit();
    return null;
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

  /** Each plant factory tier and whether it can receive this batch. A tier grows one batch at a time. */
  tiersFor(code: string): TierCapacity[] {
    const out: TierCapacity[] = [];
    for (const rack of RACK_NUMBERS) {
      for (const tier of TIER_NUMBERS) {
        const holes = this.pf.holesOfRack(rack).filter((h) => h.tier === tier);
        const other = holes.find((h) => isPlanted(h.state) && h.batch !== code);
        const free = holes.filter((h) => h.state === "kosong").length;
        let blocked: string | null = null;
        if (holes.some((h) => h.state === "sanitasi")) blocked = "Masih sanitasi";
        else if (other) blocked = `Dipakai ${other.batch ?? "batch lain"}`;
        else if (!free) blocked = "Penuh";
        out.push({ rack, tier, free, blocked });
      }
    }
    return out;
  }

  /** Empty holes across the tiers that could take a new batch. */
  freeCapacity() {
    return this.tiersFor("").reduce((n, t) => (t.blocked ? n : n + t.free), 0);
  }

  /**
   * Moves a batch's ready seedlings into one tier, as many as fit. A tray left
   * with seedlings stays ready for the next tier; an emptied tray returns to
   * the shelf, its counts kept on the batch.
   */
  transplant(code: string, rack: number, tier: number): TransplantResult {
    const batch = this.batch(code);
    const ready = this.readyToMove().find((r) => r.batch.code === code);
    const target = this.tiersFor(code).find((t) => t.rack === rack && t.tier === tier);
    if (!batch || !ready) throw new Error(`Batch ${code} tidak punya bibit siap pindah.`);
    if (!target) throw new Error(`Rak ${rack} tingkat ${tier} tidak dikenal.`);
    if (target.blocked) throw new Error(`Rak ${rack} tingkat ${tier}: ${target.blocked}.`);

    const holes: Hole[] = this.pf
      .holesOfRack(rack)
      .filter((h) => h.tier === tier && h.state === "kosong")
      .sort((a, b) => a.gully - b.gully || a.hole - b.hole);
    let filled = 0;
    for (const tray of ready.trays) {
      const take = Math.min(tray.germinated, holes.length - filled);
      for (const hole of holes.slice(filled, filled + take)) {
        Object.assign(hole, { state: "semai", batch: code, sourceSlot: tray.id, note: "" });
      }
      filled += take;
      tray.germinated -= take;
      tray.moved += take;
      if (tray.germinated === 0) {
        batch.archived.seeds += tray.seedCount;
        batch.archived.germinated += tray.moved;
        this.chamber.slots.set(tray.id, emptySlot(tray));
      }
      if (filled === holes.length) break;
    }
    batch.transplantedAt ??= DUMMY_TODAY;
    this.emit();
    return { batch: code, rack, tier, count: filled, firstHole: holes[0].id, left: ready.seedlings - filled };
  }

  countSlots() {
    const c: Record<SlotState, number> = { kosong: 0, disemai: 0, berkecambah: 0, siap_pindah: 0, masalah: 0 };
    for (const s of this.chamber.slots.values()) c[s.state]++;
    return c;
  }
}
