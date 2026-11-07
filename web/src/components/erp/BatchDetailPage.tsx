import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { formatLongDate } from "../../lib/pf/dashboard";
import { addLabor, fetchBatchLabor, formatMinutes, parseDuration, removeLabor } from "../../lib/pf/people";
import { fetchBatchMoves, fetchItems, formatQty, parseQtyInput, useStock } from "../../lib/pf/inventory";
import {
  BATCH_STATUS,
  BATCH_STEPS,
  EVENT_LABELS,
  HARVEST_GRADES,
  gradeLabel,
  addBatchNote,
  addHarvest,
  ageOn,
  batchLabel,
  batchStage,
  batchStep,
  closeHole,
  closeTray,
  correctHarvest,
  fetchBatch,
  fetchBatchEvents,
  fetchBatchSlots,
  fetchHarvestLots,
  fetchSeedLot,
  finishBatch,
  germinationRate,
  jakartaToday,
  parseGerminated,
  parseHarvestForm,
  parseSowForm,
  sowBatch,
  tierOfHole,
  transplantBatch,
  updateHole,
  updateTray,
  type BatchEvent,
  type BatchOverview,
  type HarvestGrade,
  type HarvestLot,
  type OpenSlot,
  type SeedLot,
  type TransplantResult,
} from "../../lib/pf/batch";
import { SHELVES, SLOT_STATES, SLOT_STATE_KEYS, slotId, type SlotState } from "../../lib/pf/chamber";
import { fetchMembers, memberName } from "../../lib/pf/foundation";
import { useErpStore } from "./ErpContext";
import { ActionNote, DataState, ErpPage, Field, PrimaryButton, ReadOnlyNote, SecondaryButton, formatDateTime, inputClass, useAction, useErpAccess, useLoad } from "./page";
import { Bar, Card, Disclosure, Note, Rows, Segmented, StepStrip } from "./ui";

// One batch from sowing to harvest, written for a phone at the rack: the card for
// what comes next is on top, and each form saves on its own. The database's
// functions check every move, so what is refused here comes with its reason.

const sectionTitle = "text-[16px] font-medium tracking-[-0.02em] text-[#0F2F36]";
const link = "inline-flex min-h-[44px] items-center sm:min-h-[24px] text-[14px] font-medium text-[#0B6477] hover:underline";

type Reload = () => Promise<void>;

/* ------------------------------------------------------------------- sowing */

function SowCard({ batch, lot, reload }: { batch: BatchOverview; lot: SeedLot; reload: Reload }) {
  const store = useErpStore();
  const today = jakartaToday();
  const [picked, setPicked] = useState<string[]>([]);
  const [seeds, setSeeds] = useState("");
  const [sownOn, setSownOn] = useState(today);
  const [used, setUsed] = useState("");
  const action = useAction();

  const toggle = (code: string) => setPicked((p) => (p.includes(code) ? p.filter((c) => c !== code) : [...p, code]));

  const submit = async () => {
    const parsed = parseSowForm(picked, seeds, sownOn, today, lot.unit, used);
    if (parsed.error !== null) return action.setError(parsed.error);
    const trays = picked.map((code) => ({ location_id: store.locationIds.get(code) ?? "", seeds: parsed.perTray }));
    const saved = await action.run(async () => {
      await sowBatch(batch.id, trays, sownOn, parsed.seedUsed);
      await reload();
    });
    if (saved) {
      setPicked([]);
      setUsed("");
    }
  };

  return (
    <Card className="p-4">
      <h2 className={sectionTitle}>Sow</h2>
      <p className="mb-3 text-[13px] text-[#4F6B73]">Choose tray positions in the chamber. Lot {lot.lot_no} has {formatQty(lot.qty_on_hand, lot.unit)}.</p>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <div className="space-y-2">
          {SHELVES.map((s) => (
            <div key={s.shelf}>
              <p className="mb-1 text-[13px] font-medium text-[#36525A]">{s.label}</p>
              <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
                {Array.from({ length: s.positions }, (_, i) => {
                  const code = slotId(s.shelf, i + 1);
                  const slot = store.chamber.getSlot(code);
                  const taken = !!slot?.batch;
                  const off = !!slot?.offline;
                  const on = picked.includes(code);
                  return (
                    <button
                      key={code}
                      type="button"
                      disabled={taken || off}
                      aria-pressed={on}
                      title={taken ? `Used ${slot?.batch}` : off ? "Not ready to use" : code}
                      onClick={() => toggle(code)}
                      className={`min-h-[44px] rounded-lg border px-1 py-1.5 text-[13px] font-medium ${on ? "border-[#14919B] bg-[#14919B] text-white" : taken || off ? "cursor-not-allowed border-[#E3ECED] bg-[#F3F7F7] text-[#4F6B73]" : "border-[#DCE7E8] bg-white text-[#0F2F36] hover:border-[#14919B]"}`}
                    >
                      P{String(i + 1).padStart(2, "0")}
                      <span className="block text-[12px] font-normal">{taken ? slot?.batch : off ? "Close" : "Empty"}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Seeds per tray"><input className={inputClass} inputMode="numeric" value={seeds} onChange={(e) => setSeeds(e.target.value)} /></Field>
          <Field label="Sowing date"><input type="date" className={inputClass} max={today} value={sownOn} onChange={(e) => setSownOn(e.target.value)} /></Field>
          {lot.unit !== "biji" && <Field label="Seed used (gram)"><input className={inputClass} inputMode="decimal" value={used} onChange={(e) => setUsed(e.target.value)} /></Field>}
        </div>
        <ActionNote action={action} />
        <PrimaryButton type="submit" disabled={action.busy}>{action.busy ? "Saving..." : picked.length ? `Sow in ${picked.length} trays` : "Sow"}</PrimaryButton>
      </form>
    </Card>
  );
}

/* -------------------------------------------------------------------- trays */

function TrayRow({ tray, reload, canOperate, startOpen }: { tray: OpenSlot; reload: Reload; canOperate: boolean; startOpen: boolean }) {
  const [state, setState] = useState<SlotState>(tray.state === "tumbuh" ? "berkecambah" : tray.state);
  const [germinated, setGerminated] = useState(String(tray.germinated));
  const [note, setNote] = useState(tray.note);
  const [closing, setClosing] = useState(false);
  const [why, setWhy] = useState("");
  const [open, setOpen] = useState(startOpen);
  const action = useAction();

  const save = async () => {
    const parsed = parseGerminated(germinated, tray);
    if (parsed.error !== null) return action.setError(parsed.error);
    await action.run(async () => {
      await updateTray(tray.id, state, parsed.count, note);
      await reload();
    });
  };

  return (
    <div className="rounded-lg border border-[#E3ECED] p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <Link to="/erp/seedlings" search={{ slot: tray.location_code }} className="inline-flex min-h-[44px] items-center sm:min-h-[24px] text-[14px] font-medium text-[#0F2F36] hover:text-[#0B6477]">{tray.location_code}</Link>
        <span className="text-[13px] text-[#4F6B73]">{tray.qty} seeds{tray.moved > 0 ? ` · ${tray.moved} already moved` : ""}</span>
      </div>
      {canOperate && !open && (
        <div className="mt-1 flex items-center justify-between gap-3">
          <p className="text-[13px] text-[#4F6B73]">{SLOT_STATES[tray.state === "tumbuh" ? "berkecambah" : tray.state].label} · {tray.germinated} germinated{tray.note ? ` · ${tray.note}` : ""}</p>
          <button type="button" onClick={() => setOpen(true)} className="min-h-[44px] shrink-0 text-[14px] font-medium text-[#0B6477] hover:underline sm:min-h-[24px]">Record</button>
        </div>
      )}
      {canOperate && open && (
        <form className="mt-2 space-y-2" onSubmit={(e) => { e.preventDefault(); void save(); }}>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Status">
              <select className={inputClass} value={state} onChange={(e) => setState(e.target.value as SlotState)}>
                {SLOT_STATE_KEYS.filter((s) => s !== "kosong").map((s) => <option key={s} value={s}>{SLOT_STATES[s].label}</option>)}
              </select>
            </Field>
            <Field label="Germinated"><input className={inputClass} inputMode="numeric" value={germinated} onChange={(e) => setGerminated(e.target.value)} /></Field>
          </div>
          <Field label="Notes"><input className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
          <ActionNote action={action} />
          {closing ? (
            <div className="space-y-2 rounded-lg bg-[#FFF6E5] p-2.5">
              <Field label="Why is this tray being closed?" hint="The seed still counts as used. If it was recorded wrongly, correct the stock on the Seed lots page."><input className={inputClass} value={why} onChange={(e) => setWhy(e.target.value)} autoFocus /></Field>
              <div className="flex gap-2">
                <SecondaryButton disabled={action.busy || !why.trim()} onClick={() => void action.run(async () => { await closeTray(tray.id, why); await reload(); })}>Close tray</SecondaryButton>
                <SecondaryButton onClick={() => setClosing(false)}>Cancel</SecondaryButton>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <PrimaryButton type="submit" disabled={action.busy}>{action.busy ? "Saving..." : "Save"}</PrimaryButton>
              <button type="button" onClick={() => setClosing(true)} className="px-2 py-2 text-[14px] font-medium text-[#4F6B73] hover:text-[#B3362C]">Close tray</button>
            </div>
          )}
        </form>
      )}
      {!canOperate && <p className="mt-1 text-[13px] text-[#4F6B73]">{SLOT_STATES[tray.state === "tumbuh" ? "berkecambah" : tray.state].label} · {tray.germinated} germinated{tray.note ? ` · ${tray.note}` : ""}</p>}
    </div>
  );
}

function TrayCard({ trays, reload, canOperate }: { trays: OpenSlot[]; reload: Reload; canOperate: boolean }) {
  return (
    <Card className="p-4">
      <h2 className={`${sectionTitle} mb-1`}>Seedlings</h2>
      <p className="mb-3 text-[13px] text-[#4F6B73]">Record how many germinated. Trays marked Ready to transplant go on to the transplant step.</p>
      <div className="space-y-2">
        {/* Keyed by what the server holds, so a form never keeps a stale count after a move. */}
        {trays.map((t) => <TrayRow key={`${t.id}:${t.germinated}:${t.moved}:${t.state}`} tray={t} reload={reload} canOperate={canOperate} startOpen={trays.length === 1 && t.state !== "siap_pindah"} />)}
      </div>
    </Card>
  );
}

/* --------------------------------------------------------------- transplant */

function TransplantCard({ batch, ready, reload, onMoved }: { batch: BatchOverview; ready: number; reload: Reload; onMoved: (r: TransplantResult) => void }) {
  const store = useErpStore();
  const tiers = store.tiersFor(batch.code);
  const [target, setTarget] = useState("");
  const chosen = tiers.find((t) => t.code === target && !t.blocked) ?? tiers.find((t) => !t.blocked);
  const action = useAction();
  const count = chosen ? Math.min(chosen.free, ready) : 0;

  return (
    <Card className="p-4">
      <h2 className={sectionTitle}>Transplant</h2>
      <p className="mb-3 text-[13px] text-[#4F6B73]">{ready} seedlings ready to transplant. A tier takes only one batch.</p>
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2" role="radiogroup" aria-label="Target tier">
        {tiers.map((t) => (
          <label key={t.code} className={`flex min-h-[44px] items-center gap-2 rounded-lg border px-3 py-2 text-[13.5px] ${t.blocked ? "border-[#E3ECED] bg-[#F3F7F7] text-[#4F6B73]" : chosen?.code === t.code ? "border-[#14919B] bg-[#14919B]/5" : "cursor-pointer border-[#E3ECED] hover:border-[#14919B]"}`}>
            <input type="radio" name="tier" className="accent-[#14919B]" disabled={!!t.blocked} checked={chosen?.code === t.code} onChange={() => setTarget(t.code)} />
            <span>
              <span className={`block font-medium ${t.blocked ? "" : "text-[#0F2F36]"}`}>Rack {t.rack} · Tier {t.tier}</span>
              <span className="block text-[12.5px]">{t.blocked ?? `${t.free} empty holes`}</span>
            </span>
          </label>
        ))}
      </div>
      <div className="mt-3 space-y-2">
        {!chosen && <Note tone="warn">No tier can take this batch yet.</Note>}
        {chosen && count < ready && <Note tone="warn">This tier holds {count} seedlings. The other {ready - count} seedlings stay in the chamber.</Note>}
        <ActionNote action={action} />
        <PrimaryButton
          disabled={action.busy || !chosen}
          onClick={() => void action.run(async () => {
            const moved = await transplantBatch(batch.id, store.locationIds.get(chosen!.code) ?? "");
            onMoved(moved);
            await reload();
          })}
        >
          {action.busy ? "Moving..." : `Move ${count} seedlings`}
        </PrimaryButton>
      </div>
    </Card>
  );
}

/* -------------------------------------------------------------------- holes */

/** The batch's holes as they sit on the rack. Larger screens only: on a phone twenty cells are too narrow to tap. */
function HoleMap({ holes, selected, onPick }: { holes: OpenSlot[]; selected: string; onPick: (h: OpenSlot) => void }) {
  const byCode = new Map(holes.map((h) => [h.location_code, h]));
  const tiers = [...new Set(holes.map((h) => tierOfHole(h.location_code)))];
  return (
    <div className="hidden space-y-3 sm:block">
      {tiers.map((tier) => (
        <div key={tier} className="space-y-1">
          <p className="text-[13px] font-medium text-[#36525A]">{tier}</p>
          {[1, 2, 3, 4].map((gully) => (
            <div key={gully} className="flex items-center gap-2">
              <span className="w-[26px] shrink-0 text-[12px] text-[#4F6B73]">G{gully}</span>
              <div className="grid flex-1 grid-cols-[repeat(20,minmax(0,1fr))] gap-[3px]">
                {Array.from({ length: 20 }, (_, i) => {
                  const code = `${tier}-G${gully}-H${String(i + 1).padStart(2, "0")}`;
                  const hole = byCode.get(code);
                  if (!hole) return <span key={code} className="h-6 rounded-[3px] border border-dashed border-[#DCE7E8]" />;
                  const problem = hole.state === "masalah";
                  return (
                    <button
                      key={code}
                      type="button"
                      aria-label={`${code}${problem ? ", with a problem" : ""}`}
                      aria-pressed={selected === code}
                      title={`${code}${hole.note ? `: ${hole.note}` : ""}`}
                      onClick={() => onPick(hole)}
                      className={`h-6 rounded-[3px] ${problem ? "bg-[#D9433B]" : "bg-[#BFE3E3] hover:bg-[#14919B]"} ${selected === code ? "outline-2 outline-offset-1 outline-[#0B6477]" : ""}`}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function HoleCard({ holes, reload, canOperate, focus }: { holes: OpenSlot[]; reload: Reload; canOperate: boolean; focus?: string }) {
  const tiers = new Map<string, OpenSlot[]>();
  for (const h of holes) tiers.set(tierOfHole(h.location_code), [...(tiers.get(tierOfHole(h.location_code)) ?? []), h]);
  const problems = holes.filter((h) => h.state === "masalah");
  const [code, setCode] = useState(holes.some((h) => h.location_code === focus) ? focus! : "");
  const [note, setNote] = useState("");
  const [discarding, setDiscarding] = useState(false);
  const action = useAction();
  const hole = holes.find((h) => h.location_code === code);

  const run = (work: () => Promise<void>) => action.run(async () => {
    await work();
    setNote("");
    await reload();
  });

  return (
    <Card className="p-4">
      <h2 className={`${sectionTitle} mb-3`}>Plant factory</h2>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {[...tiers.entries()].map(([tier, list]) => (
          <Link key={tier} to="/erp/plant-factory" search={{ hole: list[0].location_code }} className="flex items-center justify-between rounded-lg border border-[#E3ECED] px-3 py-2 text-[14px] hover:border-[#14919B]">
            <span className="font-medium text-[#0F2F36]">{tier}</span>
            <span className="text-[#4F6B73]">{list.length} plants <ArrowRight className="ml-0.5 inline h-3.5 w-3.5 text-[#0B6477]" /></span>
          </Link>
        ))}
      </div>
      {problems.length > 0 && (
        <div className="mt-3">
          <p className="mb-1 text-[13px] font-medium text-[#B3362C]">{problems.length} plants with a problem</p>
          <ul className="space-y-1 text-[13.5px] text-[#0F2F36]">
            {problems.map((h) => (
              <li key={h.id}>
                <button type="button" className="inline-flex min-h-[44px] items-center sm:min-h-[24px] font-medium text-[#0B6477] hover:underline" onClick={() => { setCode(h.location_code); setNote(h.note); setDiscarding(false); }}>{h.location_code}</button>
                {h.note && <span className="text-[#4F6B73]"> · {h.note}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
      {canOperate && (
        <div className="mt-3 space-y-2 border-t border-[#E3ECED] pt-3">
          <p className="text-[13px] font-medium text-[#36525A]">Record one hole</p>
          <HoleMap holes={holes} selected={code} onPick={(h) => { setCode(h.location_code); setNote(h.note); setDiscarding(false); }} />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Field label="Hole">
              <select className={inputClass} value={code} onChange={(e) => { setCode(e.target.value); setDiscarding(false); }}>
                <option value="">Choose a hole</option>
                {holes.map((h) => <option key={h.id} value={h.location_code}>{h.location_code}{h.state === "masalah" ? " (problem)" : ""}</option>)}
              </select>
            </Field>
            <Field label="Notes"><input className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Yellowing leaves" /></Field>
          </div>
          {hole?.source_code && <p className="text-[13px] text-[#4F6B73]">Source tray {hole.source_code}</p>}
          <ActionNote action={action} />
          {discarding && hole ? (
            <div className="space-y-2 rounded-lg bg-[#FFF6E5] p-2.5">
              <p className="text-[14px] font-medium text-[#0F2F36]">Discard the plant in {hole.location_code}?</p>
              <p className="text-[13.5px] text-[#4F6B73]">The plant leaves the batch and its hole is empty again. This cannot be undone.</p>
              <p className="text-[13.5px] text-[#4F6B73]">Reason: {note.trim()}</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={action.busy || !note.trim()}
                  className="rounded-lg bg-[#B3362C] px-3.5 py-2 text-[14px] font-medium text-white transition-colors hover:bg-[#962C24] disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => void run(async () => {
                    await closeHole(hole.id, note);
                    setCode("");
                    setDiscarding(false);
                  })}
                >
                  {action.busy ? "Discarding..." : "Yes, discard plant"}
                </button>
                <SecondaryButton disabled={action.busy} onClick={() => setDiscarding(false)}>Cancel</SecondaryButton>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <SecondaryButton disabled={!hole || action.busy} onClick={() => void run(() => updateHole(hole!.id, "masalah", note))}>Mark as a problem</SecondaryButton>
              {hole?.state === "masalah" && <SecondaryButton disabled={action.busy} onClick={() => void run(() => updateHole(hole.id, "tumbuh", note))}>Back to normal</SecondaryButton>}
              <button
                type="button"
                disabled={!hole || action.busy}
                className="px-2 py-2 text-[14px] font-medium text-[#B3362C] hover:underline disabled:cursor-not-allowed disabled:opacity-50 sm:ml-auto"
                onClick={() => {
                  if (!note.trim()) return action.setError("Write why the plant was discarded in the notes box.");
                  action.setError(null);
                  setDiscarding(true);
                }}
              >
                Discard plant
              </button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ harvest */

function CorrectLot({ lot, reload, onClose }: { lot: HarvestLot; reload: Reload; onClose: () => void }) {
  const [kg, setKg] = useState(String(lot.fresh_kg));
  const [grade, setGrade] = useState(lot.grade);
  const [why, setWhy] = useState("");
  const action = useAction();
  return (
    <form
      className="mt-2 space-y-2 rounded-lg bg-[#F3F7F7] p-2.5"
      onSubmit={(e) => {
        e.preventDefault();
        const weight = Number(kg.trim().replace(",", "."));
        if (!Number.isFinite(weight) || weight <= 0) return action.setError("Weight must be above 0.");
        if (!why.trim()) return action.setError("A reason for the correction is required.");
        void action.run(async () => {
          await correctHarvest(lot.id, weight, grade, why);
          await reload();
          onClose();
        });
      }}
    >
      <div className="grid grid-cols-2 gap-2">
        <Field label="Weight (kg)"><input className={inputClass} inputMode="decimal" value={kg} onChange={(e) => setKg(e.target.value)} /></Field>
        <Field label="Grade">
          <select className={inputClass} value={grade} onChange={(e) => setGrade(e.target.value as HarvestGrade)}>
            {HARVEST_GRADES.map((g) => <option key={g} value={g}>{gradeLabel(g)}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Reason"><input className={inputClass} value={why} onChange={(e) => setWhy(e.target.value)} /></Field>
      <ActionNote action={action} />
      <div className="flex gap-2">
        <PrimaryButton type="submit" disabled={action.busy}>Save correction</PrimaryButton>
        <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
      </div>
    </form>
  );
}

function HarvestCard({ batch, lots, open, canOperate, canCorrect, canTrace, reload }: { batch: BatchOverview; lots: HarvestLot[]; open: boolean; canOperate: boolean; canCorrect: boolean; canTrace: boolean; reload: Reload }) {
  const today = jakartaToday();
  const [kg, setKg] = useState("");
  const [grade, setGrade] = useState<HarvestGrade>("A");
  const [harvestedOn, setHarvestedOn] = useState(today);
  const [bestBefore, setBestBefore] = useState("");
  const [notes, setNotes] = useState("");
  const [correcting, setCorrecting] = useState<string | null>(null);
  const action = useAction();

  const submit = async () => {
    const parsed = parseHarvestForm(kg, harvestedOn, bestBefore, batch.sown_at, today);
    if (parsed.error !== null) return action.setError(parsed.error);
    const saved = await action.run(async () => {
      await addHarvest(batch.id, parsed.weight, grade, harvestedOn, bestBefore, notes);
      await reload();
    });
    if (saved) {
      setKg("");
      setNotes("");
    }
  };

  return (
    <Card className="p-4">
      <h2 className={`${sectionTitle} mb-1`}>Harvest</h2>
      <p className="mb-3 text-[13px] text-[#4F6B73]">Each grade is recorded as one harvest lot.</p>
      {lots.length > 0 && (
        <ul className="mb-3 space-y-2">
          {lots.map((l) => (
            <li key={l.id} className="rounded-lg border border-[#E3ECED] px-3 py-2 text-[14px]">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="font-medium text-[#0F2F36]">{l.lot_code} · grade {gradeLabel(l.grade)}</span>
                <span className="tabular-nums text-[#0F2F36]">{l.fresh_kg.toLocaleString("en-GB")} kg{l.remaining_kg < l.fresh_kg ? `, left ${l.remaining_kg.toLocaleString("en-GB")} kg` : ""}</span>
              </div>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-[13px] text-[#4F6B73]">
                <span>{formatLongDate(l.harvested_at)}{l.best_before ? ` · keep until ${formatLongDate(l.best_before)}` : ""}{l.notes ? ` · ${l.notes}` : ""}</span>
                <span className="flex items-center gap-3">
                  {canTrace && <Link to="/erp/trace" search={{ code: l.lot_code }} className={link}>Trace</Link>}
                  {canCorrect && correcting !== l.id && <button type="button" className={link} onClick={() => setCorrecting(l.id)}>Correct</button>}
                </span>
              </div>
              {correcting === l.id && <CorrectLot lot={l} reload={reload} onClose={() => setCorrecting(null)} />}
            </li>
          ))}
        </ul>
      )}
      {open && canOperate && batch.plants_now === 0 && <Note>A harvest can be recorded once there are plants in the plant factory.</Note>}
      {open && canOperate && batch.plants_now > 0 && (
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fresh weight (kg)"><input className={inputClass} inputMode="decimal" value={kg} onChange={(e) => setKg(e.target.value)} /></Field>
            <Field label="Grade">
              <select className={inputClass} value={grade} onChange={(e) => setGrade(e.target.value as HarvestGrade)}>
                {HARVEST_GRADES.map((g) => <option key={g} value={g}>{gradeLabel(g)}</option>)}
              </select>
            </Field>
            <Field label="Harvest date"><input type="date" className={inputClass} max={today} value={harvestedOn} onChange={(e) => setHarvestedOn(e.target.value)} /></Field>
            <Field label="Keep until"><input type="date" className={inputClass} value={bestBefore} onChange={(e) => setBestBefore(e.target.value)} /></Field>
          </div>
          <Field label="Notes"><input className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
          <ActionNote action={action} />
          <PrimaryButton type="submit" disabled={action.busy}>{action.busy ? "Saving..." : "Record harvest lot"}</PrimaryButton>
        </form>
      )}
      {!open && lots.length === 0 && <p className="text-[14px] text-[#4F6B73]">No harvest lots.</p>}
    </Card>
  );
}

/* -------------------------------------------------------------------- close */

function FinishCard({ batch, hasHarvest, reload }: { batch: BatchOverview; hasHarvest: boolean; reload: Reload }) {
  const [confirm, setConfirm] = useState<"selesai" | "gagal" | null>(null);
  const [why, setWhy] = useState("");
  const action = useAction();
  const consequence = batch.plants_now > 0 ? `${batch.plants_now} holes will be emptied and go into sanitation. ` : "";

  if (!confirm) {
    return (
      <Card className="p-4">
        <h2 className={`${sectionTitle} mb-3`}>Close batch</h2>
        <div className="flex flex-wrap gap-2">
          <SecondaryButton disabled={!hasHarvest} title={hasHarvest ? undefined : "Record a harvest lot first"} onClick={() => setConfirm("selesai")}>Finish batch</SecondaryButton>
          <SecondaryButton onClick={() => setConfirm("gagal")}>Mark as failed</SecondaryButton>
        </div>
        {!hasHarvest && <p className="mt-2 text-[13px] text-[#4F6B73]">A batch can be finished once it has a harvest lot.</p>}
      </Card>
    );
  }
  return (
    <Card className="p-4">
      <h2 className={`${sectionTitle} mb-2`}>{confirm === "selesai" ? "Finish this batch?" : "Mark this batch as failed?"}</h2>
      <p className="mb-3 text-[14px] text-[#4F6B73]">{consequence}Once closed, nothing more can be recorded on the batch.</p>
      <div className="space-y-3">
        {confirm === "gagal" && <Field label="Reason"><input className={inputClass} value={why} onChange={(e) => setWhy(e.target.value)} autoFocus /></Field>}
        <ActionNote action={action} />
        <div className="flex gap-2">
          <PrimaryButton
            disabled={action.busy || (confirm === "gagal" && !why.trim())}
            onClick={() => void action.run(async () => {
              await finishBatch(batch.id, confirm, why);
              await reload();
            })}
          >
            {confirm === "selesai" ? "Yes, finish" : "Yes, mark as failed"}
          </PrimaryButton>
          <SecondaryButton onClick={() => setConfirm(null)}>Cancel</SecondaryButton>
        </div>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------- hours */

/** Time spent on this batch. Coordinators see everyone's; others see their own. */
function LaborCard({ batch, open }: { batch: BatchOverview; open: boolean }) {
  const today = jakartaToday();
  const entries = useLoad(() => fetchBatchLabor(batch.id), [batch.id]);
  const [workDate, setWorkDate] = useState(today);
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");
  const [activity, setActivity] = useState("");
  const action = useAction();
  if (entries.error?.notInstalled) return null;
  const submit = async () => {
    const parsed = parseDuration(hours, minutes);
    if (parsed.error !== null) return action.setError(parsed.error);
    const saved = await action.run(async () => {
      await addLabor(null, batch.id, workDate, parsed.minutes, activity);
      await entries.reload();
    });
    if (saved) {
      setHours("");
      setMinutes("");
      setActivity("");
    }
  };
  return (
    <Card className="p-4">
      <DataState state={entries}>
        {(rows) => (
          <>
            {rows.length === 0 ? <p className="mb-2 text-[14px] text-[#4F6B73]">No work hours recorded yet.</p> : (
              <>
                <p className="mb-1 text-[14px] text-[#4F6B73]">Total <span className="font-medium tabular-nums text-[#0F2F36]">{formatMinutes(rows.reduce((n, r) => n + r.minutes, 0))}</span></p>
                <ul className="mb-3 text-[14px]">
                  {rows.slice(0, 10).map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-3 border-t border-[#EDF2F2] py-1.5">
                      <span className="min-w-0">
                        <span className="font-medium text-[#0F2F36]">{r.full_name}</span>
                        <span className="tabular-nums text-[#0F2F36]"> · {formatMinutes(r.minutes)}</span>
                        <span className="block text-[13px] text-[#4F6B73]">{formatLongDate(r.work_date)}{r.activity ? ` · ${r.activity}` : ""}</span>
                      </span>
                      <button type="button" onClick={() => void action.run(async () => { await removeLabor(r.id); await entries.reload(); })} className="min-h-[44px] shrink-0 text-[13px] font-medium text-[#4F6B73] hover:text-[#B3362C] sm:min-h-[24px]">Delete</button>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {open && (
              <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
                <div className="grid grid-cols-3 gap-2">
                  <Field label="Date"><input type="date" className={inputClass} max={today} value={workDate} onChange={(e) => setWorkDate(e.target.value)} /></Field>
                  <Field label="Hours"><input className={inputClass} inputMode="decimal" value={hours} onChange={(e) => setHours(e.target.value)} /></Field>
                  <Field label="Minutes"><input className={inputClass} inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value)} /></Field>
                </div>
                <Field label="Activity"><input className={inputClass} value={activity} onChange={(e) => setActivity(e.target.value)} placeholder="Transplant" /></Field>
                <ActionNote action={action} />
                <SecondaryButton type="submit" disabled={action.busy}>{action.busy ? "Saving..." : "Log my work hours"}</SecondaryButton>
              </form>
            )}
          </>
        )}
      </DataState>
    </Card>
  );
}

/* --------------------------------------------------------------- materials */

/** What this batch has used, automatically and by hand, and a way to record more. */
function MaterialsCard({ batch, open, canOperate }: { batch: BatchOverview; open: boolean; canOperate: boolean }) {
  const state = useLoad(async () => {
    const [moves, items] = await Promise.all([fetchBatchMoves(batch.id), fetchItems()]);
    return { moves, items };
  }, [batch.id]);
  const [itemId, setItemId] = useState("");
  const [qty, setQty] = useState("");
  const action = useAction();
  if (state.error?.notInstalled) return null;
  return (
    <Card className="p-4">
      <DataState state={state}>
        {({ moves, items }) => {
          const used = new Map<string, { name: string; unit: string; qty: number }>();
          for (const m of moves) {
            const row = used.get(m.item_id) ?? { name: m.item_name, unit: m.unit, qty: 0 };
            row.qty += -m.qty;
            used.set(m.item_id, row);
          }
          const usable = items.filter((i) => i.active && i.category !== "benih" && i.usable_qty > 0);
          const chosen = usable.find((i) => i.id === itemId) ?? usable[0];
          const submit = async () => {
            const parsed = parseQtyInput(qty);
            if (parsed.error !== null) return action.setError(parsed.error);
            if (!chosen) return;
            const saved = await action.run(async () => {
              await useStock(chosen.id, parsed.qty, batch.id, "");
              await state.reload();
            });
            if (saved) setQty("");
          };
          return (
            <>
              {used.size === 0 ? <p className="mb-2 text-[14px] text-[#4F6B73]">No materials recorded yet.</p> : (
                <ul className="mb-2 text-[14px]">
                  {[...used.values()].map((u) => (
                    <li key={u.name} className="flex justify-between gap-3 border-t border-[#EDF2F2] py-1.5 first:border-0">
                      <span className="text-[#0F2F36]">{u.name}</span>
                      <span className="tabular-nums text-[#0F2F36]">{formatQty(u.qty, u.unit)}</span>
                    </li>
                  ))}
                </ul>
              )}
              {open && canOperate && usable.length > 0 && (
                <form className="grid grid-cols-1 items-end gap-2 sm:grid-cols-[minmax(0,1fr)_110px_auto]" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
                  <Field label="Item">
                    <select className={inputClass} value={chosen?.id ?? ""} onChange={(e) => setItemId(e.target.value)}>
                      {usable.map((i) => <option key={i.id} value={i.id}>{i.name} · left {formatQty(i.usable_qty, i.unit)}</option>)}
                    </select>
                  </Field>
                  <Field label={`Quantity${chosen ? ` (${chosen.unit})` : ""}`}><input className={inputClass} inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} /></Field>
                  <SecondaryButton type="submit" disabled={action.busy}>{action.busy ? "Saving..." : "Record"}</SecondaryButton>
                  <div className="col-span-full empty:hidden"><ActionNote action={action} /></div>
                </form>
              )}
            </>
          );
        }}
      </DataState>
    </Card>
  );
}

/* ------------------------------------------------------------------- diary */

function Diary({ batch, events, names, open, canOperate, reload }: { batch: BatchOverview; events: BatchEvent[]; names: Map<string, string>; open: boolean; canOperate: boolean; reload: Reload }) {
  const [note, setNote] = useState("");
  const action = useAction();
  const qtyText = (e: BatchEvent) => {
    if (e.qty === null) return "";
    if (e.type === "panen" || e.type === "koreksi_panen") return ` · ${e.qty.toLocaleString("en-GB")} kg`;
    if (e.type === "semai") return ` · ${e.qty} seeds`;
    if (e.type === "germinasi" || e.type === "masalah") return e.location_code?.startsWith("CH") ? ` · ${e.qty} germinated` : "";
    if (e.type === "pindah_tanam") return ` · ${e.qty} seedlings`;
    return "";
  };
  return (
    <Card className="p-4">
      <h2 className={`${sectionTitle} mb-3`}>History</h2>
      {open && canOperate && (
        <form
          className="mb-3 space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            void action.run(async () => {
              await addBatchNote(batch.id, note);
              setNote("");
              await reload();
            });
          }}
        >
          <Field label="Observation"><textarea className={inputClass} rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Healthy leaves, white roots" /></Field>
          <ActionNote action={action} />
          <SecondaryButton type="submit" disabled={action.busy || !note.trim()}>Add a note</SecondaryButton>
        </form>
      )}
      <ol className="space-y-2.5">
        {events.map((e) => (
          <li key={e.id} className="border-l-2 border-[#DCE7E8] pl-3">
            <p className="text-[14px] font-medium text-[#0F2F36]">{EVENT_LABELS[e.type]}{e.location_code ? ` · ${e.location_code}` : ""}{qtyText(e)}</p>
            {e.note && <p className="text-[13.5px] text-[#36525A]">{e.note}</p>}
            <p className="text-[12.5px] text-[#4F6B73]">{formatDateTime(e.at)}{e.by_id && names.get(e.by_id) ? ` · ${names.get(e.by_id)}` : ""}</p>
          </li>
        ))}
      </ol>
    </Card>
  );
}

/* --------------------------------------------------------------------- page */

export default function BatchDetailPage({ id, focusHole }: { id: string; focusHole?: string }) {
  const store = useErpStore();
  const state = useLoad(async () => {
    const batch = await fetchBatch(id);
    const [slots, events, lots, seedLot, members] = await Promise.all([
      fetchBatchSlots(id),
      fetchBatchEvents(id),
      fetchHarvestLots(id),
      fetchSeedLot(batch.seed_lot_id),
      fetchMembers().catch(() => []),
    ]);
    return { batch, slots, events, lots, seedLot, names: new Map(members.map((m) => [m.id, memberName(m)])) };
  }, [id]);
  const { canManageProduction, canOperate, canReadSales, canReadCost } = useErpAccess();
  const today = jakartaToday();
  const [phoneTab, setPhoneTab] = useState<"kerja" | "ringkasan" | "riwayat">("kerja");
  // Kept here: the transplant card is gone once its last seedling has moved.
  const [moved, setMoved] = useState<TransplantResult | null>(null);

  // Both the page and the 3D screens' cache change with every move.
  const reload = async () => {
    await Promise.all([state.reload(), store.load()]);
  };

  return (
    <ErpPage
      eyebrow="Growing · Batches"
      title={state.data ? `${state.data.batch.code} · ${batchLabel(state.data.batch)}` : "Batch"}
      sub={state.data ? batchStage(state.data.batch, today) : undefined}
      actions={<Link to="/erp/batch" className="inline-flex min-h-[44px] items-center gap-1 text-[14px] font-medium text-[#0B6477] hover:underline sm:min-h-[24px]"><ArrowLeft className="h-4 w-4" /> All batches</Link>}
    >
      <DataState state={state}>
        {({ batch, slots, events, lots, seedLot, names }) => {
          const open = batch.status === "direncanakan" || batch.status === "berjalan";
          const trays = slots.filter((s) => s.kind === "tray");
          const holes = slots.filter((s) => s.kind === "hole");
          const ready = trays.filter((t) => t.state === "siap_pindah").reduce((n, t) => n + t.germinated, 0);
          const age = ageOn(batch.sown_at, today);
          const step = batchStep(batch, ready, store.holesOfBatch(batch.code).some((h) => h.state === "siap_panen"));
          return (
            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="min-w-0 space-y-4">
                <StepStrip steps={BATCH_STEPS} current={step} label="Batch steps" />
                {!canOperate && <ReadOnlyNote who="Operator or Production manager" />}
                <div className="lg:hidden">
                  <Segmented value={phoneTab} options={[{ key: "kerja", label: "Records" }, { key: "ringkasan", label: "Overview" }, { key: "riwayat", label: `History (${events.length})` }]} onChange={setPhoneTab} />
                </div>
                <div className={`space-y-4 ${phoneTab === "kerja" ? "" : "hidden lg:block"}`}>
                  {moved && (
                    <Note>
                      {moved.count} seedlings now at {moved.tier}.{moved.left > 0 ? ` ${moved.left} seedlings do not fit and stay in the chamber.` : ""}{" "}
                      <Link to="/erp/plant-factory" search={{ hole: moved.first_hole }} className="font-medium text-[#0B6477] hover:underline">View in the plant factory</Link>
                    </Note>
                  )}
                  {open && canOperate && ready > 0 && <TransplantCard batch={batch} ready={ready} reload={reload} onMoved={setMoved} />}
                  {trays.length > 0 && <TrayCard trays={trays} reload={reload} canOperate={canOperate && open} />}
                  {open && canOperate && batch.status === "direncanakan" && <SowCard batch={batch} lot={seedLot} reload={reload} />}
                  {holes.length > 0 && <HoleCard key={holes.length} holes={holes} reload={reload} canOperate={canOperate && open} focus={focusHole} />}
                  {(batch.plants_now > 0 || lots.length > 0) && <HarvestCard batch={batch} lots={lots} open={open} canOperate={canOperate} canCorrect={canManageProduction} canTrace={canReadSales} reload={reload} />}
                  {batch.status !== "direncanakan" && canReadCost && <Link to="/erp/costs/$id" params={{ id: batch.id }} className="flex min-h-[44px] items-center rounded-xl border border-[#DCE7E8] bg-white px-4 text-[14px] font-medium text-[#0B6477] hover:border-[#14919B]">View this batch's costs</Link>}
                  {batch.status !== "direncanakan" && <Disclosure title="Work hours"><LaborCard batch={batch} open={open} /></Disclosure>}
                  {batch.status !== "direncanakan" && <Disclosure title="Materials used"><MaterialsCard batch={batch} open={open} canOperate={canOperate} /></Disclosure>}
                  {open && canOperate && batch.status === "berjalan" && batch.plants_now === 0 && <Disclosure title="Sow in other trays"><SowCard batch={batch} lot={seedLot} reload={reload} /></Disclosure>}
                  {open && canOperate && <Disclosure title="Close batch"><FinishCard batch={batch} hasHarvest={lots.length > 0} reload={reload} /></Disclosure>}
                </div>
              </div>
              <div className="min-w-0 space-y-4">
                <Card className={`p-4 ${phoneTab === "ringkasan" ? "" : "hidden lg:block"}`}>
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <h2 className={sectionTitle}>Overview</h2>
                    <span className={`rounded-full px-2 py-0.5 text-[12.5px] font-medium ${BATCH_STATUS[batch.status].className}`}>{BATCH_STATUS[batch.status].label}</span>
                  </div>
                  {batch.sown_at && batch.cycle_days > 0 && <div className="mb-3"><Bar value={Math.min(age, batch.cycle_days)} max={batch.cycle_days} /></div>}
                  <Rows
                    rows={[
                      ["Recipe", `${batch.recipe_code} v${batch.recipe_version}`],
                      ["Seed lot", batch.seed_lot_no],
                      ["Sowing date", batch.sown_at ? formatLongDate(batch.sown_at) : "Not yet"],
                      ["Age", batch.sown_at ? `${age} of ${batch.cycle_days} days` : "Not yet"],
                      ["Seeds sown", `${batch.seeds}`],
                      ["Germination", batch.seeds ? `${Math.round(germinationRate(batch) * 100)}%` : "Not yet"],
                      ["Plants now", `${batch.plants_now}`],
                      ["Total harvest", `${batch.harvested_kg.toLocaleString("en-GB")} kg`],
                    ]}
                  />
                  {batch.notes && <p className="mt-3 text-[13.5px] text-[#36525A]">{batch.notes}</p>}
                </Card>
                <div className={phoneTab === "riwayat" ? "" : "hidden lg:block"}>
                  <Diary batch={batch} events={events} names={names} open={open} canOperate={canOperate} reload={reload} />
                </div>
              </div>
            </div>
          );
        }}
      </DataState>
    </ErpPage>
  );
}
