import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, MoveRight, Sprout, Trash2 } from "lucide-react";
import { closeHole, closeTray, fetchBatches, fetchBatchSlots, fetchSeedLots, jakartaToday, parseGerminated, parseSowForm, sowBatch, tierSanitized, tierOfHole, transplantBatch, updateHole, updateTray, type BatchOverview, type OpenSlot, type SeedLot } from "../../lib/pf/batch";
import { slotStateLabel } from "../../lib/pf/chamber";
import { useLang, useT } from "../../lib/i18n";
import { formatQty } from "../../lib/pf/inventory";
import { blockedLabel, type ErpStore } from "../../lib/pf/store";
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
  const t = useT();
  if (store.mode !== "live") return <Note>{t({ en: "This is sample data, so it cannot be changed here.", id: "Ini data contoh, jadi tidak bisa diubah di sini." })}</Note>;
  if (!canOperate) return <Note>{t({ en: "Changing this needs the Operator or Production manager role.", id: "Perubahan ini butuh peran Operator atau Manajer produksi." })}</Note>;
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
  const t = useT();
  return (
    <div className="space-y-2 rounded-lg bg-[#FFF6E5] p-2.5">
      <p className="text-[14px] font-medium text-[#0F2F36]">{what}</p>
      <p className="text-[13px] text-[#4F6B73]">{t({ en: "This cannot be undone. The spot becomes empty again.", id: "Ini tidak bisa dibatalkan. Posisi ini akan kosong lagi." })}</p>
      <Field label={t({ en: "Reason", id: "Alasan" })}><input className={inputClass} value={why} autoFocus onChange={(e) => setWhy(e.target.value)} /></Field>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy || !why.trim()} className={dangerClass} onClick={onConfirm}><Trash2 className="h-4 w-4" /> {busy ? t({ en: "Removing…", id: "Menghapus…" }) : t({ en: "Yes, remove", id: "Ya, hapus" })}</button>
        <SecondaryButton disabled={busy} onClick={onCancel}>{t({ en: "Cancel", id: "Batal" })}</SecondaryButton>
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
  const t = useT();
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
      {(slot) => !slot ? <Note>{t({ en: "This plant has no open record, so it cannot be changed here.", id: "Tanaman ini tidak punya catatan terbuka, jadi tidak bisa diubah di sini." })}</Note> : (
        <div className="space-y-2.5">
          <Field label={t({ en: "Note", id: "Catatan" })}><input className={inputClass} value={note ?? slot.note} placeholder={t({ en: "Yellowing leaves", id: "Daun menguning" })} onChange={(e) => setNote(e.target.value)} /></Field>
          <ActionNote action={action} />
          {removing ? (
            <RemoveConfirm what={t({ en: `Remove the plant in ${id}?`, id: `Hapus tanaman di ${id}?` })} why={why} setWhy={setWhy} busy={action.busy} onCancel={() => setRemoving(false)} onConfirm={() => run(async (s) => { await closeHole(s.id, why); })} />
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {slot.state === "masalah" ? (
                <SecondaryButton disabled={action.busy} onClick={() => run(async (s) => { await updateHole(s.id, "tumbuh", note ?? s.note); })}>{t({ en: "Back to normal", id: "Kembali normal" })}</SecondaryButton>
              ) : (
                <SecondaryButton disabled={action.busy} onClick={() => run(async (s) => { await updateHole(s.id, "masalah", note ?? s.note); })}>{t({ en: "Mark as a problem", id: "Tandai bermasalah" })}</SecondaryButton>
              )}
              {note !== null && note !== slot.note && <SecondaryButton disabled={action.busy} onClick={() => run(async (s) => { await updateHole(s.id, s.state === "masalah" ? "masalah" : "tumbuh", note); })}>{t({ en: "Save note", id: "Simpan catatan" })}</SecondaryButton>}
              <button type="button" disabled={action.busy} className={`${dangerLink} ml-auto`} onClick={() => setRemoving(true)}><Trash2 className="h-4 w-4" /> {t({ en: "Remove plant", id: "Hapus tanaman" })}</button>
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
  const t = useT();
  const lang = useLang();
  const current = ready.find((r) => r.batch.code === chosen) ?? ready[0];
  const tier = current ? store.tiersFor(current.batch.code).find((t) => t.code === tierCode) : undefined;
  const count = current && tier ? Math.min(current.seedlings, tier.free) : 0;
  if (ready.length === 0) {
    return (
      <div className="space-y-2">
        <Note>{t({ en: "No seedlings are ready to transplant yet. Plants come here from trays marked ready in the seedling chamber.", id: "Belum ada bibit yang siap pindah tanam. Tanaman datang ke sini dari tray yang ditandai siap di ruang bibit." })}</Note>
        <Link to="/erp/seedlings" className="flex items-center gap-1 text-[13px] font-medium text-[#0B6477] hover:underline">{t({ en: "Go to seedlings", id: "Buka bibit" })} <ArrowRight className="h-3.5 w-3.5" /></Link>
      </div>
    );
  }
  return (
    <div className="space-y-2.5">
      <Field label={t({ en: "Batch to transplant", id: "Batch yang dipindah tanam" })}>
        <select className={inputClass} value={current?.batch.code ?? ""} onChange={(e) => setChosen(e.target.value)}>
          {ready.map((r) => <option key={r.batch.code} value={r.batch.code}>{r.batch.code} · {r.batch.crop} · {r.seedlings} {t({ en: "seedlings", id: "bibit" })}</option>)}
        </select>
      </Field>
      {tier?.blocked ? <Note tone="warn">{t({ en: `Tier ${tierCode} cannot take this batch: ${tier.blocked}.`, id: `Tingkat ${tierCode} tidak bisa menerima batch ini: ${blockedLabel(tier.blocked, lang)}.` })}</Note> : <p className="text-[13px] text-[#4F6B73]">{t({ en: `Seedlings fill tier ${tierCode} from its first free hole, since a tier grows one batch at a time.`, id: `Bibit mengisi tingkat ${tierCode} mulai dari lubang kosong pertama, karena satu tingkat menanam satu batch sekaligus.` })}</p>}
      <ActionNote action={action} />
      <PrimaryButton
        disabled={action.busy || !current?.batch.id || !!tier?.blocked || count === 0}
        onClick={() => void action.run(async () => {
          await transplantBatch(current!.batch.id!, store.locationIds.get(tierCode) ?? "");
          await store.load();
        })}
      >
        <MoveRight className="h-4 w-4" /> {action.busy ? t({ en: "Transplanting…", id: "Memindah tanam…" }) : t({ en: `Transplant ${count} seedlings`, id: `Pindah tanam ${count} bibit` })}
      </PrimaryButton>
    </div>
  );
}

function CleaningHole({ id, store }: { id: string; store: ErpStore }) {
  const tierCode = tierOfHole(id);
  const action = useAction();
  const t = useT();
  return (
    <div className="space-y-2">
      <p className="text-[13px] text-[#4F6B73]">{t({ en: `Tier ${tierCode} is being cleaned after its last harvest. Once it is clean, its holes can take plants again.`, id: `Tingkat ${tierCode} sedang dibersihkan setelah panen terakhir. Setelah bersih, lubangnya bisa ditanami lagi.` })}</p>
      <ActionNote action={action} />
      <PrimaryButton disabled={action.busy} onClick={() => void action.run(async () => { await tierSanitized(store.locationIds.get(tierCode) ?? ""); await store.load(); })}>{action.busy ? t({ en: "Saving…", id: "Menyimpan…" }) : t({ en: `Tier ${tierCode} is clean`, id: `Tingkat ${tierCode} sudah bersih` })}</PrimaryButton>
    </div>
  );
}

export function HoleEditor({ id, store }: { id: string; store: ErpStore }) {
  const { canOperate } = useErpAccess();
  const t = useT();
  const hole = store.pf.getHole(id);
  const batch = store.batch(hole?.batch);
  if (!hole) return null;
  return (
    <div className="space-y-2.5 border-t border-[#E3ECED] pt-3">
      <p className={panelTitle}>{t({ en: "Change this spot", id: "Ubah posisi ini" })}</p>
      <Blocked store={store} />
      {canEdit(store, canOperate) && (
        hole.offline ? <Note>{t({ en: "This hole is out of use.", id: "Lubang ini tidak dipakai." })}</Note>
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
  const t = useT();
  return <DataState state={row}>{(slot) => !slot ? <Note>{t({ en: "This tray has no open record, so it cannot be changed here.", id: "Tray ini tidak punya catatan terbuka, jadi tidak bisa diubah di sini." })}</Note> : <TrayForm key={`${slot.id}:${slot.state}:${slot.germinated}`} id={id} slot={slot} store={store} />}</DataState>;
}

function TrayForm({ id, slot, store }: { id: string; slot: OpenSlot; store: ErpStore }) {
  const [state, setState] = useState<string>(slot.state);
  const [count, setCount] = useState(String(slot.germinated));
  const [note, setNote] = useState(slot.note);
  const [removing, setRemoving] = useState(false);
  const [why, setWhy] = useState("");
  const action = useAction();
  const t = useT();
  const lang = useLang();
  const save = async () => {
    const parsed = parseGerminated(count, slot, lang);
    if (parsed.error !== null) return action.setError(parsed.error);
    await action.run(async () => {
      await updateTray(slot.id, state, parsed.count, note);
      await store.load();
    });
  };
  const options = (["disemai", "berkecambah", "siap_pindah", "masalah"] as const).map((k) => ({ key: k, label: slotStateLabel(k, lang) }));
  return (
    <form className="space-y-2.5" onSubmit={(e) => { e.preventDefault(); void save(); }}>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Status">
          <select className={inputClass} value={state} onChange={(e) => setState(e.target.value)}>
            {options.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
        </Field>
        <Field label={t({ en: `Germinated, of ${slot.qty}`, id: `Berkecambah, dari ${slot.qty}` })}><input className={inputClass} inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value)} /></Field>
      </div>
      <Field label={t({ en: "Note", id: "Catatan" })}><input className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      <ActionNote action={action} />
      {removing ? (
        <RemoveConfirm what={t({ en: `Remove the tray in ${id}?`, id: `Hapus tray di ${id}?` })} why={why} setWhy={setWhy} busy={action.busy} onCancel={() => setRemoving(false)} onConfirm={() => void action.run(async () => { await closeTray(slot.id, why); await store.load(); })} />
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <PrimaryButton type="submit" disabled={action.busy}>{action.busy ? t({ en: "Saving…", id: "Menyimpan…" }) : t({ en: "Save", id: "Simpan" })}</PrimaryButton>
          <button type="button" disabled={action.busy} className={`${dangerLink} ml-auto`} onClick={() => setRemoving(true)}><Trash2 className="h-4 w-4" /> {t({ en: "Remove tray", id: "Hapus tray" })}</button>
        </div>
      )}
    </form>
  );
}

function SowHere({ id, store, batches, lots }: { id: string; store: ErpStore; batches: BatchOverview[]; lots: SeedLot[] }) {
  const today = jakartaToday();
  const t = useT();
  const lang = useLang();
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
        <Note>{t({ en: "A tray belongs to a batch, and no batch is open. Start one first.", id: "Tray harus masuk ke sebuah batch, dan belum ada batch yang terbuka. Mulai batch dulu." })}</Note>
        <Link to="/erp/batch" className="flex items-center gap-1 text-[13px] font-medium text-[#0B6477] hover:underline">{t({ en: "Go to batches", id: "Buka batch" })} <ArrowRight className="h-3.5 w-3.5" /></Link>
      </div>
    );
  }
  const submit = async () => {
    if (!lot) return action.setError(t({ en: "This batch's seed lot could not be read.", id: "Lot benih batch ini tidak dapat dibaca." }));
    const parsed = parseSowForm([id], seeds, today, today, lot.unit, used, lang);
    if (parsed.error !== null) return action.setError(parsed.error);
    const saved = await action.run(async () => {
      await sowBatch(batch.id, [{ location_id: store.locationIds.get(id) ?? "", seeds: parsed.perTray }], today, parsed.seedUsed);
      await store.load();
    });
    if (saved) setSeeds("");
  };
  return (
    <form className="space-y-2.5" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
      <Field label={t({ en: "Batch", id: "Batch" })}>
        <select className={inputClass} value={batchId} onChange={(e) => setBatchId(e.target.value)}>
          {usable.map((b) => <option key={b.id} value={b.id}>{b.code} · {b.crop_name}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label={t({ en: "Seeds in this tray", id: "Benih di tray ini" })}><input className={inputClass} inputMode="numeric" value={seeds} onChange={(e) => setSeeds(e.target.value)} /></Field>
        {lot?.unit === "gram" && <Field label={t({ en: "Seed used (gram)", id: "Benih terpakai (gram)" })}><input className={inputClass} inputMode="decimal" value={used} onChange={(e) => setUsed(e.target.value)} /></Field>}
      </div>
      {lot && <p className="text-[13px] text-[#4F6B73]">{t({ en: `Lot ${lot.lot_no} has ${formatQty(lot.qty_on_hand, lot.unit, lang)} left.`, id: `Lot ${lot.lot_no} tersisa ${formatQty(lot.qty_on_hand, lot.unit, lang)}.` })}</p>}
      <ActionNote action={action} />
      <PrimaryButton type="submit" disabled={action.busy}><Sprout className="h-4 w-4" /> {action.busy ? t({ en: "Sowing…", id: "Menyemai…" }) : t({ en: "Sow in this tray", id: "Semai di tray ini" })}</PrimaryButton>
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
  const t = useT();
  const slot = store.chamber.getSlot(id);
  const batch = store.batch(slot?.batch);
  if (!slot) return null;
  return (
    <div className="space-y-2.5 border-t border-[#E3ECED] pt-3">
      <p className={panelTitle}>{t({ en: "Change this spot", id: "Ubah posisi ini" })}</p>
      <Blocked store={store} />
      {canEdit(store, canOperate) && (
        slot.offline ? <Note>{t({ en: "This position is out of use.", id: "Posisi ini tidak dipakai." })}</Note>
        : batch?.id ? <FilledTray key={id} id={id} store={store} batchId={batch.id} />
        : <EmptyTray key={id} id={id} store={store} />
      )}
    </div>
  );
}
