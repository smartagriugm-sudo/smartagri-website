import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, MoveRight, Sprout, Trash2 } from "lucide-react";
import { closeHole, closeTray, fetchBatches, fetchBatchSlots, fetchSeedLots, jakartaToday, parseGerminated, parseSowForm, sowBatch, tierSanitized, tierOfHole, transplantBatch, updateHole, updateTray, type BatchOverview, type OpenSlot, type SeedLot } from "../../lib/pf/batch";
import { SLOT_STATES } from "../../lib/pf/chamber";
import { formatQty } from "../../lib/pf/inventory";
import type { ErpStore } from "../../lib/pf/store";
import { ActionNote, DataState, Field, PrimaryButton, SecondaryButton, inputClass, useAction, useErpAccess, useLoad } from "./page";
import { Note } from "./ui";

// Changing what is in a spot, from the spot itself: pick a plant or a tray in the 3D
// model or on the 2D plan, and do the work here instead of finding its batch first. These
// are the same database functions the batch page calls, with the same rules, so a batch
// is still what plants belong to. A transplant still fills a tier, not one hole.

const panelTitle = "text-[13px] font-medium text-[#4F6B73]";
const dangerClass = "inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-[#B3362C] px-3.5 py-2 text-[14px] font-medium text-white transition-colors hover:bg-[#962C24] disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-0";
const dangerLink = "inline-flex min-h-[44px] items-center gap-1.5 text-[14px] font-medium text-[#B3362C] hover:underline disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-[24px]";

function Blocked({ store }: { store: ErpStore }) {
  const { canOperate } = useErpAccess();
  if (store.mode !== "live") return <Note>This is sample data, so it cannot be changed here.</Note>;
  if (!canOperate) return <Note>Changing this needs the Operator or Production manager role.</Note>;
  return null;
}

const canEdit = (store: ErpStore, canOperate: boolean) => store.mode === "live" && canOperate;

/** The open record behind a spot in the model. */
function useSlotRow(batchId: string | null | undefined, code: string, version: number) {
  return useLoad<OpenSlot | null>(async () => {
    if (!batchId) return null;
    const rows = await fetchBatchSlots(batchId);
    return rows.find((r) => r.location_code === code) ?? null;
  }, [batchId, code, version]);
}

function RemoveConfirm({ what, why, setWhy, busy, onConfirm, onCancel }: { what: string; why: string; setWhy: (v: string) => void; busy: boolean; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="space-y-2 rounded-lg bg-[#FFF6E5] p-2.5">
      <p className="text-[14px] font-medium text-[#0F2F36]">{what}</p>
      <p className="text-[13px] text-[#4F6B73]">This cannot be undone. The spot becomes empty again.</p>
      <Field label="Reason"><input className={inputClass} value={why} autoFocus onChange={(e) => setWhy(e.target.value)} /></Field>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy || !why.trim()} className={dangerClass} onClick={onConfirm}><Trash2 className="h-4 w-4" /> {busy ? "Removing…" : "Yes, remove"}</button>
        <SecondaryButton disabled={busy} onClick={onCancel}>Cancel</SecondaryButton>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- a hole */

function PlantedHole({ id, store, batchId }: { id: string; store: ErpStore; batchId: string }) {
  const row = useSlotRow(batchId, id, store.dataVersion);
  const [note, setNote] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);
  const [why, setWhy] = useState("");
  const action = useAction();
  const run = (work: (slot: OpenSlot) => Promise<void>) => {
    const slot = row.data;
    if (!slot) return;
    void action.run(async () => {
      await work(slot);
      await store.load();
      setNote(null);
    });
  };
  return (
    <DataState state={row}>
      {(slot) => !slot ? <Note>This plant has no open record, so it cannot be changed here.</Note> : (
        <div className="space-y-2.5">
          <Field label="Note"><input className={inputClass} value={note ?? slot.note} placeholder="Yellowing leaves" onChange={(e) => setNote(e.target.value)} /></Field>
          <ActionNote action={action} />
          {removing ? (
            <RemoveConfirm what={`Remove the plant in ${id}?`} why={why} setWhy={setWhy} busy={action.busy} onCancel={() => setRemoving(false)} onConfirm={() => run(async (s) => { await closeHole(s.id, why); })} />
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {slot.state === "masalah" ? (
                <SecondaryButton disabled={action.busy} onClick={() => run(async (s) => { await updateHole(s.id, "tumbuh", note ?? s.note); })}>Back to normal</SecondaryButton>
              ) : (
                <SecondaryButton disabled={action.busy} onClick={() => run(async (s) => { await updateHole(s.id, "masalah", note ?? s.note); })}>Mark as a problem</SecondaryButton>
              )}
              {note !== null && note !== slot.note && <SecondaryButton disabled={action.busy} onClick={() => run(async (s) => { await updateHole(s.id, s.state === "masalah" ? "masalah" : "tumbuh", note); })}>Save note</SecondaryButton>}
              <button type="button" disabled={action.busy} className={`${dangerLink} ml-auto`} onClick={() => setRemoving(true)}><Trash2 className="h-4 w-4" /> Remove plant</button>
            </div>
          )}
        </div>
      )}
    </DataState>
  );
}

function EmptyHole({ id, store }: { id: string; store: ErpStore }) {
  const ready = store.readyToMove();
  const tierCode = tierOfHole(id);
  const [chosen, setChosen] = useState("");
  const action = useAction();
  const current = ready.find((r) => r.batch.code === chosen) ?? ready[0];
  const tier = current ? store.tiersFor(current.batch.code).find((t) => t.code === tierCode) : undefined;
  const count = current && tier ? Math.min(current.seedlings, tier.free) : 0;
  if (ready.length === 0) {
    return (
      <div className="space-y-2">
        <Note>No seedlings are ready to transplant yet. Plants come here from trays marked ready in the seedling chamber.</Note>
        <Link to="/erp/seedlings" className="flex items-center gap-1 text-[13px] font-medium text-[#0B6477] hover:underline">Go to seedlings <ArrowRight className="h-3.5 w-3.5" /></Link>
      </div>
    );
  }
  return (
    <div className="space-y-2.5">
      <Field label="Batch to transplant">
        <select className={inputClass} value={current?.batch.code ?? ""} onChange={(e) => setChosen(e.target.value)}>
          {ready.map((r) => <option key={r.batch.code} value={r.batch.code}>{r.batch.code} · {r.batch.crop} · {r.seedlings} seedlings</option>)}
        </select>
      </Field>
      {tier?.blocked ? <Note tone="warn">Tier {tierCode} cannot take this batch: {tier.blocked}.</Note> : <p className="text-[13px] text-[#4F6B73]">Seedlings fill tier {tierCode} from its first free hole, since a tier grows one batch at a time.</p>}
      <ActionNote action={action} />
      <PrimaryButton
        disabled={action.busy || !current?.batch.id || !!tier?.blocked || count === 0}
        onClick={() => void action.run(async () => {
          await transplantBatch(current!.batch.id!, store.locationIds.get(tierCode) ?? "");
          await store.load();
        })}
      >
        <MoveRight className="h-4 w-4" /> {action.busy ? "Transplanting…" : `Transplant ${count} seedlings`}
      </PrimaryButton>
    </div>
  );
}

function CleaningHole({ id, store }: { id: string; store: ErpStore }) {
  const tierCode = tierOfHole(id);
  const action = useAction();
  return (
    <div className="space-y-2">
      <p className="text-[13px] text-[#4F6B73]">Tier {tierCode} is being cleaned after its last harvest. Once it is clean, its holes can take plants again.</p>
      <ActionNote action={action} />
      <PrimaryButton disabled={action.busy} onClick={() => void action.run(async () => { await tierSanitized(store.locationIds.get(tierCode) ?? ""); await store.load(); })}>{action.busy ? "Saving…" : `Tier ${tierCode} is clean`}</PrimaryButton>
    </div>
  );
}

export function HoleEditor({ id, store }: { id: string; store: ErpStore }) {
  const { canOperate } = useErpAccess();
  const hole = store.pf.getHole(id);
  const batch = store.batch(hole?.batch);
  if (!hole) return null;
  return (
    <div className="space-y-2.5 border-t border-[#E3ECED] pt-3">
      <p className={panelTitle}>Change this spot</p>
      <Blocked store={store} />
      {canEdit(store, canOperate) && (
        hole.offline ? <Note>This hole is out of use.</Note>
        : batch?.id ? <PlantedHole key={id} id={id} store={store} batchId={batch.id} />
        : hole.state === "sanitasi" ? <CleaningHole key={id} id={id} store={store} />
        : <EmptyHole key={id} id={id} store={store} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------- a tray */

function FilledTray({ id, store, batchId }: { id: string; store: ErpStore; batchId: string }) {
  const row = useSlotRow(batchId, id, store.dataVersion);
  return <DataState state={row}>{(slot) => !slot ? <Note>This tray has no open record, so it cannot be changed here.</Note> : <TrayForm key={`${slot.id}:${slot.state}:${slot.germinated}`} id={id} slot={slot} store={store} />}</DataState>;
}

function TrayForm({ id, slot, store }: { id: string; slot: OpenSlot; store: ErpStore }) {
  const [state, setState] = useState<string>(slot.state);
  const [count, setCount] = useState(String(slot.germinated));
  const [note, setNote] = useState(slot.note);
  const [removing, setRemoving] = useState(false);
  const [why, setWhy] = useState("");
  const action = useAction();
  const save = async () => {
    const parsed = parseGerminated(count, slot);
    if (parsed.error !== null) return action.setError(parsed.error);
    await action.run(async () => {
      await updateTray(slot.id, state, parsed.count, note);
      await store.load();
    });
  };
  const options = (["disemai", "berkecambah", "siap_pindah", "masalah"] as const).map((k) => ({ key: k, label: SLOT_STATES[k].label }));
  return (
    <form className="space-y-2.5" onSubmit={(e) => { e.preventDefault(); void save(); }}>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Status">
          <select className={inputClass} value={state} onChange={(e) => setState(e.target.value)}>
            {options.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
        </Field>
        <Field label={`Germinated, of ${slot.qty}`}><input className={inputClass} inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value)} /></Field>
      </div>
      <Field label="Note"><input className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      <ActionNote action={action} />
      {removing ? (
        <RemoveConfirm what={`Remove the tray in ${id}?`} why={why} setWhy={setWhy} busy={action.busy} onCancel={() => setRemoving(false)} onConfirm={() => void action.run(async () => { await closeTray(slot.id, why); await store.load(); })} />
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <PrimaryButton type="submit" disabled={action.busy}>{action.busy ? "Saving…" : "Save"}</PrimaryButton>
          <button type="button" disabled={action.busy} className={`${dangerLink} ml-auto`} onClick={() => setRemoving(true)}><Trash2 className="h-4 w-4" /> Remove tray</button>
        </div>
      )}
    </form>
  );
}

function SowHere({ id, store, batches, lots }: { id: string; store: ErpStore; batches: BatchOverview[]; lots: SeedLot[] }) {
  const today = jakartaToday();
  const usable = batches.filter((b) => b.status === "direncanakan" || b.status === "berjalan");
  const [batchId, setBatchId] = useState(usable[0]?.id ?? "");
  const [seeds, setSeeds] = useState("");
  const [used, setUsed] = useState("");
  const action = useAction();
  const batch = usable.find((b) => b.id === batchId);
  const lot = lots.find((l) => l.id === batch?.seed_lot_id);
  if (usable.length === 0 || !batch) {
    return (
      <div className="space-y-2">
        <Note>A tray belongs to a batch, and no batch is open. Start one first.</Note>
        <Link to="/erp/batch" className="flex items-center gap-1 text-[13px] font-medium text-[#0B6477] hover:underline">Go to batches <ArrowRight className="h-3.5 w-3.5" /></Link>
      </div>
    );
  }
  const submit = async () => {
    if (!lot) return action.setError("This batch's seed lot could not be read.");
    const parsed = parseSowForm([id], seeds, today, today, lot.unit, used);
    if (parsed.error !== null) return action.setError(parsed.error);
    const saved = await action.run(async () => {
      await sowBatch(batch.id, [{ location_id: store.locationIds.get(id) ?? "", seeds: parsed.perTray }], today, parsed.seedUsed);
      await store.load();
    });
    if (saved) setSeeds("");
  };
  return (
    <form className="space-y-2.5" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
      <Field label="Batch">
        <select className={inputClass} value={batchId} onChange={(e) => setBatchId(e.target.value)}>
          {usable.map((b) => <option key={b.id} value={b.id}>{b.code} · {b.crop_name}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Seeds in this tray"><input className={inputClass} inputMode="numeric" value={seeds} onChange={(e) => setSeeds(e.target.value)} /></Field>
        {lot?.unit === "gram" && <Field label="Seed used (gram)"><input className={inputClass} inputMode="decimal" value={used} onChange={(e) => setUsed(e.target.value)} /></Field>}
      </div>
      {lot && <p className="text-[13px] text-[#4F6B73]">Lot {lot.lot_no} has {formatQty(lot.qty_on_hand, lot.unit)} left.</p>}
      <ActionNote action={action} />
      <PrimaryButton type="submit" disabled={action.busy}><Sprout className="h-4 w-4" /> {action.busy ? "Sowing…" : "Sow in this tray"}</PrimaryButton>
    </form>
  );
}

function EmptyTray({ id, store }: { id: string; store: ErpStore }) {
  const data = useLoad(async () => {
    const [batches, lots] = await Promise.all([fetchBatches(), fetchSeedLots()]);
    return { batches, lots };
  }, [store.dataVersion]);
  return <DataState state={data}>{({ batches, lots }) => <SowHere key={id} id={id} store={store} batches={batches} lots={lots} />}</DataState>;
}

export function TrayEditor({ id, store }: { id: string; store: ErpStore }) {
  const { canOperate } = useErpAccess();
  const slot = store.chamber.getSlot(id);
  const batch = store.batch(slot?.batch);
  if (!slot) return null;
  return (
    <div className="space-y-2.5 border-t border-[#E3ECED] pt-3">
      <p className={panelTitle}>Change this spot</p>
      <Blocked store={store} />
      {canEdit(store, canOperate) && (
        slot.offline ? <Note>This position is out of use.</Note>
        : batch?.id ? <FilledTray key={id} id={id} store={store} batchId={batch.id} />
        : <EmptyTray key={id} id={id} store={store} />
      )}
    </div>
  );
}
