import { useState } from "react";
import { Plus } from "lucide-react";
import { jakartaToday } from "../../lib/pf/batch";
import { COST_AREAS, cancelWorkOrder, costAreaLabel, createWorkOrder, fetchPlans, fetchWorkOrders, finishWorkOrder, parseRupiah, planState, savePlan, type MaintenancePlan, type PlanState, type WorkOrder } from "../../lib/pf/cost";
import { formatLongDate } from "../../lib/pf/dashboard";
import { fetchAssets, type Asset } from "../../lib/pf/monitoring";
import { formatRupiah } from "../../lib/pf/sales";
import { useLang, useT, type Bi } from "../../lib/i18n";
import { ActionNote, DataState, ErpPage, Field, PrimaryButton, ReadOnlyNote, SecondaryButton, inputClass, useAction, useErpAccess, useLoad } from "./page";
import { Card, Disclosure, Note } from "./ui";
import DataTable, { CellTitle, Chip, type Column } from "./DataTable";

// Keeping devices and rooms working. A plan says how often; when it comes due, someone
// opens a work order and closes it with what was done and what it cost. That cost goes
// into the room's bills for the month, so it reaches batch costs without being typed twice.

const sectionTitle = "text-[16px] font-medium tracking-[-0.02em] text-[#0F2F36]";
const PLAN_STATE: Record<PlanState, { label: Bi; className: string }> = {
  lewat: { label: { en: "Overdue", id: "Terlambat" }, className: "bg-[#FDECEA] text-[#B3362C]" },
  segera: { label: { en: "Soon", id: "Segera" }, className: "bg-[#FFF6E5] text-[#8A5A07]" },
  aman: { label: { en: "Scheduled", id: "Terjadwal" }, className: "bg-[#EEF3F4] text-[#4F6B73]" },
};
const NO_DEVICE: Bi = { en: "Not tied to a device", id: "Tidak terkait perangkat" };
const assetLabel = (x: { asset_code: string | null; asset_name: string | null }) => (x.asset_code ? `${x.asset_code} · ${x.asset_name}` : "");

function PlanForm({ assets, onDone }: { assets: Asset[]; onDone: () => Promise<void> }) {
  const [title, setTitle] = useState("");
  const [asset, setAsset] = useState("");
  const [every, setEvery] = useState("30");
  const [last, setLast] = useState("");
  const action = useAction();
  const t = useT();
  const submit = async () => {
    const days = Number(every);
    if (!title.trim()) return action.setError(t({ en: "A task name is required.", id: "Nama tugas wajib diisi." }));
    if (!Number.isInteger(days) || days < 1) return action.setError(t({ en: "Maintenance must be at least 1 day apart.", id: "Jarak pemeliharaan minimal 1 hari." }));
    const saved = await action.run(async () => {
      await savePlan(null, { title, asset, every: days, last, notes: "", active: true });
      await onDone();
    });
    if (saved) {
      setTitle("");
      setLast("");
    }
  };
  return (
    <Card className="p-4">
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <Field label={t({ en: "Task", id: "Tugas" })}><input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t({ en: "EC sensor calibration", id: "Kalibrasi sensor EC" })} /></Field>
        <Field label={t({ en: "Device", id: "Perangkat" })}>
          <select className={inputClass} value={asset} onChange={(e) => setAsset(e.target.value)}>
            <option value="">{t(NO_DEVICE)}</option>
            {assets.map((a) => <option key={a.id} value={a.id}>{a.code} · {a.name}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t({ en: "Every (days)", id: "Setiap (hari)" })}><input className={inputClass} inputMode="numeric" value={every} onChange={(e) => setEvery(e.target.value)} /></Field>
          <Field label={t({ en: "Last done", id: "Terakhir dikerjakan" })}><input type="date" className={inputClass} max={jakartaToday()} value={last} onChange={(e) => setLast(e.target.value)} /></Field>
        </div>
        <ActionNote action={action} />
        <PrimaryButton type="submit" disabled={action.busy}>{action.busy ? t({ en: "Saving…", id: "Menyimpan…" }) : t({ en: "Save plan", id: "Simpan rencana" })}</PrimaryButton>
      </form>
    </Card>
  );
}

function RepairForm({ assets, onDone }: { assets: Asset[]; onDone: () => Promise<void> }) {
  const [title, setTitle] = useState("");
  const [asset, setAsset] = useState("");
  const action = useAction();
  const t = useT();
  return (
    <Card className="p-4">
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void action.run(async () => { await createWorkOrder(null, asset || null, title, jakartaToday()); setTitle(""); await onDone(); }); }}>
        <Field label={t({ en: "Damaged", id: "Yang rusak" })}><input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
        <Field label={t({ en: "Device", id: "Perangkat" })}>
          <select className={inputClass} value={asset} onChange={(e) => setAsset(e.target.value)}>
            <option value="">{t(NO_DEVICE)}</option>
            {assets.map((a) => <option key={a.id} value={a.id}>{a.code} · {a.name}</option>)}
          </select>
        </Field>
        <ActionNote action={{ error: action.error, saved: false }} />
        <PrimaryButton type="submit" disabled={action.busy || !title.trim()}>{t({ en: "Open work order", id: "Buka perintah kerja" })}</PrimaryButton>
      </form>
    </Card>
  );
}

function OrderRow({ order, canEdit, reload }: { order: WorkOrder; canEdit: boolean; reload: () => Promise<void> }) {
  const today = jakartaToday();
  const [mode, setMode] = useState<"finish" | "cancel" | null>(null);
  const [done, setDone] = useState(today);
  const [note, setNote] = useState("");
  const [cost, setCost] = useState("");
  const [room, setRoom] = useState<string>("plant_factory");
  const action = useAction();
  const t = useT();
  const lang = useLang();
  const late = order.due_on < today;
  const finish = async () => {
    const value = cost.trim() === "" ? 0 : parseRupiah(cost);
    if (value === null) return action.setError(t({ en: "Cost must be a number.", id: "Biaya harus berupa angka." }));
    await action.run(async () => { await finishWorkOrder(order.id, done, note, value, value > 0 ? room : null); await reload(); });
  };
  return (
    <li className="border-t border-[#EDF2F2] px-4 py-2.5 first:border-0">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <span className="min-w-0 flex-1 basis-[200px]">
          <span className="block text-[14px] font-medium text-[#0F2F36]">{order.title}</span>
          <span className="block text-[13px] text-[#4F6B73]">{order.wo_no} · {order.kind === "perbaikan" ? t({ en: "Repair", id: "Perbaikan" }) : t({ en: "Scheduled", id: "Terjadwal" })}{assetLabel(order) ? ` · ${assetLabel(order)}` : ""}</span>
          <span className={`block text-[13px] ${late ? "font-medium text-[#B3362C]" : "text-[#4F6B73]"}`}>Target {formatLongDate(order.due_on, lang)}</span>
        </span>
        {canEdit && mode === null && (
          <span className="flex gap-2">
            <SecondaryButton onClick={() => setMode("finish")}>{t({ en: "Finish", id: "Selesaikan" })}</SecondaryButton>
            <SecondaryButton onClick={() => setMode("cancel")}>{t({ en: "Cancel", id: "Batalkan" })}</SecondaryButton>
          </span>
        )}
      </div>
      {mode === "finish" && (
        <form className="mt-2 space-y-2 rounded-lg bg-[#F3F7F7] p-2.5" onSubmit={(e) => { e.preventDefault(); void finish(); }}>
          <div className="grid grid-cols-2 gap-2">
            <Field label={t({ en: "End date", id: "Tanggal selesai" })}><input type="date" className={inputClass} max={today} value={done} onChange={(e) => setDone(e.target.value)} /></Field>
            <Field label={t({ en: "Cost (Rp)", id: "Biaya (Rp)" })}><input className={inputClass} inputMode="numeric" placeholder="0" value={cost} onChange={(e) => setCost(e.target.value)} /></Field>
          </div>
          {cost.trim() !== "" && parseRupiah(cost) !== 0 && (
            <Field label={t({ en: "Rooms that carry it", id: "Ruang yang menanggung" })} hint={t({ en: "Goes into this room's bill for that month.", id: "Masuk ke tagihan ruang ini untuk bulan tersebut." })}>
              <select className={inputClass} value={room} onChange={(e) => setRoom(e.target.value)}>
                {COST_AREAS.map((a) => <option key={a.key} value={a.key}>{costAreaLabel(a.key, lang)}</option>)}
              </select>
            </Field>
          )}
          <Field label={t({ en: "Notes", id: "Catatan" })}><input className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
          <ActionNote action={{ error: action.error, saved: false }} />
          <div className="flex gap-2">
            <SecondaryButton type="submit" disabled={action.busy}>{t({ en: "Save", id: "Simpan" })}</SecondaryButton>
            <SecondaryButton onClick={() => setMode(null)}>{t({ en: "Close", id: "Tutup" })}</SecondaryButton>
          </div>
        </form>
      )}
      {mode === "cancel" && (
        <form className="mt-2 space-y-2 rounded-lg bg-[#F3F7F7] p-2.5" onSubmit={(e) => { e.preventDefault(); void action.run(async () => { await cancelWorkOrder(order.id, note); await reload(); }); }}>
          <Field label={t({ en: "Reason for cancelling", id: "Alasan pembatalan" })}><input className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} autoFocus /></Field>
          <ActionNote action={{ error: action.error, saved: false }} />
          <div className="flex gap-2">
            <SecondaryButton type="submit" disabled={action.busy || !note.trim()}>{t({ en: "Yes, cancel", id: "Ya, batalkan" })}</SecondaryButton>
            <SecondaryButton onClick={() => setMode(null)}>{t({ en: "Close", id: "Tutup" })}</SecondaryButton>
          </div>
        </form>
      )}
    </li>
  );
}

function PlanRow({ plan, canEdit, reload }: { plan: MaintenancePlan; canEdit: boolean; reload: () => Promise<void> }) {
  const today = jakartaToday();
  const state = PLAN_STATE[planState(plan.next_due, today)];
  const action = useAction();
  const t = useT();
  const lang = useLang();
  return (
    <li className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-[#EDF2F2] px-4 py-2.5 first:border-0">
      <span className="min-w-0 flex-1 basis-[200px]">
        <span className="block text-[14px] font-medium text-[#0F2F36]">{plan.title}</span>
        <span className="block text-[13px] text-[#4F6B73]">
          {t({ en: `Every ${plan.every_days} days`, id: `Setiap ${plan.every_days} hari` })}{assetLabel(plan) ? ` · ${assetLabel(plan)}` : ""}
        </span>
        <span className="block text-[13px] text-[#4F6B73]">{plan.last_done ? t({ en: `Last ${formatLongDate(plan.last_done)}, next ${formatLongDate(plan.next_due)}`, id: `Terakhir ${formatLongDate(plan.last_done, lang)}, berikutnya ${formatLongDate(plan.next_due, lang)}` }) : t({ en: "Never done", id: "Belum pernah dikerjakan" })}</span>
        {action.error && <span className="block text-[13px] text-[#8A5A07]">{action.error}</span>}
      </span>
      <span className="flex items-center gap-2">
        {plan.open_order_id ? <span className="rounded-md bg-[#E3F4F4] px-2 py-0.5 text-[12.5px] font-medium text-[#0B6477]">{t({ en: "Currently open", id: "Sedang terbuka" })}</span> : <span className={`rounded-md px-2 py-0.5 text-[12.5px] font-medium ${state.className}`}>{t(state.label)}</span>}
        {canEdit && !plan.open_order_id && <SecondaryButton disabled={action.busy} onClick={() => void action.run(async () => { await createWorkOrder(plan.id, null, null, plan.next_due); await reload(); })}>{t({ en: "Open work order", id: "Buka perintah kerja" })}</SecondaryButton>}
      </span>
    </li>
  );
}

export default function MaintenancePage() {
  const { canMaintain, canReadMaintenance } = useErpAccess();
  const t = useT();
  const lang = useLang();
  const state = useLoad(async () => {
    const [plans, orders, assets] = await Promise.all([fetchPlans(), fetchWorkOrders(), fetchAssets().catch(() => [] as Asset[])]);
    return { plans, orders, assets };
  });
  const [adding, setAdding] = useState(false);
  return (
    <ErpPage
      eyebrow={t({ en: "Monitoring", id: "Pemantauan" })}
      title={t({ en: "Maintenance", id: "Pemeliharaan" })}
      sub={t({ en: "Recurring plans and work orders for devices and rooms.", id: "Rencana berkala dan perintah kerja untuk perangkat dan ruang." })}
      actions={canMaintain && !adding && state.data ? <PrimaryButton onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> {t({ en: "New plan", id: "Rencana baru" })}</PrimaryButton> : undefined}
    >
      {!canReadMaintenance ? <Note>{t({ en: "This page is for Technicians, Production managers, Admins and Leadership.", id: "Halaman ini untuk Teknisi, Manajer produksi, Admin, dan Pimpinan." })}</Note> : (
        <DataState state={state}>
          {({ plans, orders, assets }) => {
            const open = orders.filter((o) => o.status === "terbuka").sort((a, b) => a.due_on.localeCompare(b.due_on));
            const closed = orders.filter((o) => o.status !== "terbuka").slice(0, 20);
            return (
              <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
                <div className="min-w-0 space-y-4">
                  {!canMaintain && <ReadOnlyNote who={t({ en: "Technician or Admin", id: "Teknisi atau Admin" })} />}
                  <Card>
                    <h2 className={`${sectionTitle} px-4 py-3`}>{t({ en: "Open work orders", id: "Perintah kerja terbuka" })}</h2>
                    {open.length === 0 ? <p className="border-t border-[#EDF2F2] px-4 py-3 text-[14px] text-[#4F6B73]">{t({ en: "None.", id: "Tidak ada." })}</p> : <ul className="border-t border-[#EDF2F2]">{open.map((o) => <OrderRow key={o.id} order={o} canEdit={canMaintain} reload={state.reload} />)}</ul>}
                  </Card>
                  <Card>
                    <h2 className={`${sectionTitle} px-4 py-3`}>{t({ en: "Recurring plans", id: "Rencana berkala" })}</h2>
                    {plans.filter((p) => p.active).length === 0 ? <p className="border-t border-[#EDF2F2] px-4 py-3 text-[14px] text-[#4F6B73]">{t({ en: "No plans yet.", id: "Belum ada rencana." })}</p> : <ul className="border-t border-[#EDF2F2]">{plans.filter((p) => p.active).map((p) => <PlanRow key={p.id} plan={p} canEdit={canMaintain} reload={state.reload} />)}</ul>}
                  </Card>
                  {closed.length > 0 && (
                    <Disclosure title={t({ en: "History", id: "Riwayat" })}>
                      <DataTable
                        rows={closed}
                        rowKey={(o) => o.id}
                        noun={t({ en: "work orders", id: "perintah kerja" })}
                        searchText={(o) => `${o.title} ${o.wo_no}`}
                        searchLabel={t({ en: "Search work orders", id: "Cari perintah kerja" })}
                        columns={[
                          { key: "title", label: t({ en: "Work order", id: "Perintah kerja" }), phone: "title", sort: (a, b) => a.title.localeCompare(b.title), cell: (o) => <CellTitle title={o.title} sub={`${o.wo_no}${o.done_note ? ` · ${o.done_note}` : ""}`} /> },
                          { key: "state", label: t({ en: "Outcome", id: "Hasil" }), cell: (o) => <Chip label={o.status === "batal" ? t({ en: "Cancelled", id: "Dibatalkan" }) : `${t({ en: "Done", id: "Selesai" })} ${o.done_on ? formatLongDate(o.done_on, lang) : ""}`} className={o.status === "batal" ? undefined : "bg-[#E3F7F0] text-[#0E7A5C]"} /> },
                          { key: "cost", label: t({ en: "Cost", id: "Biaya" }), track: "130px", align: "right", sort: (a, b) => a.cost_idr - b.cost_idr, cell: (o) => <span className="tabular-nums">{o.cost_idr > 0 ? formatRupiah(o.cost_idr, lang) : "-"}</span> },
                        ] satisfies Column<(typeof closed)[number]>[]}
                      />
                    </Disclosure>
                  )}
                </div>
                {canMaintain && (
                  <div className="min-w-0 space-y-3">
                    {adding && <PlanForm assets={assets} onDone={async () => { setAdding(false); await state.reload(); }} />}
                    <Disclosure title={t({ en: "Report a fault", id: "Laporkan kerusakan" })}><RepairForm assets={assets} onDone={state.reload} /></Disclosure>
                  </div>
                )}
              </div>
            );
          }}
        </DataState>
      )}
    </ErpPage>
  );
}
