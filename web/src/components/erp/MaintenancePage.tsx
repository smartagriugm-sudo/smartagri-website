import { useState } from "react";
import { Plus } from "lucide-react";
import { jakartaToday } from "../../lib/pf/batch";
import { COST_AREAS, cancelWorkOrder, createWorkOrder, fetchPlans, fetchWorkOrders, finishWorkOrder, parseRupiah, planState, savePlan, type MaintenancePlan, type PlanState, type WorkOrder } from "../../lib/pf/cost";
import { formatLongDate } from "../../lib/pf/dashboard";
import { fetchAssets, type Asset } from "../../lib/pf/monitoring";
import { formatRupiah } from "../../lib/pf/sales";
import { ActionNote, DataState, ErpPage, Field, PrimaryButton, ReadOnlyNote, SecondaryButton, inputClass, useAction, useErpAccess, useLoad } from "./page";
import { Card, Disclosure, Note } from "./ui";
import DataTable, { CellTitle, Chip, type Column } from "./DataTable";

// Keeping devices and rooms working. A plan says how often; when it comes due, someone
// opens a work order and closes it with what was done and what it cost. That cost goes
// into the room's bills for the month, so it reaches batch costs without being typed twice.

const sectionTitle = "text-[16px] font-medium tracking-[-0.02em] text-[#0F2F36]";
const PLAN_STATE: Record<PlanState, { label: string; className: string }> = {
  lewat: { label: "Overdue", className: "bg-[#FDECEA] text-[#B3362C]" },
  segera: { label: "Soon", className: "bg-[#FFF6E5] text-[#8A5A07]" },
  aman: { label: "Scheduled", className: "bg-[#EEF3F4] text-[#4F6B73]" },
};
const assetLabel = (x: { asset_code: string | null; asset_name: string | null }) => (x.asset_code ? `${x.asset_code} · ${x.asset_name}` : "");

function PlanForm({ assets, onDone }: { assets: Asset[]; onDone: () => Promise<void> }) {
  const [title, setTitle] = useState("");
  const [asset, setAsset] = useState("");
  const [every, setEvery] = useState("30");
  const [last, setLast] = useState("");
  const action = useAction();
  const submit = async () => {
    const days = Number(every);
    if (!title.trim()) return action.setError("A task name is required.");
    if (!Number.isInteger(days) || days < 1) return action.setError("Maintenance must be at least 1 day apart.");
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
        <Field label="Task"><input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="EC sensor calibration" /></Field>
        <Field label="Device">
          <select className={inputClass} value={asset} onChange={(e) => setAsset(e.target.value)}>
            <option value="">Not tied to a device</option>
            {assets.map((a) => <option key={a.id} value={a.id}>{a.code} · {a.name}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Every (days)"><input className={inputClass} inputMode="numeric" value={every} onChange={(e) => setEvery(e.target.value)} /></Field>
          <Field label="Last done"><input type="date" className={inputClass} max={jakartaToday()} value={last} onChange={(e) => setLast(e.target.value)} /></Field>
        </div>
        <ActionNote action={action} />
        <PrimaryButton type="submit" disabled={action.busy}>{action.busy ? "Saving..." : "Save plan"}</PrimaryButton>
      </form>
    </Card>
  );
}

function RepairForm({ assets, onDone }: { assets: Asset[]; onDone: () => Promise<void> }) {
  const [title, setTitle] = useState("");
  const [asset, setAsset] = useState("");
  const action = useAction();
  return (
    <Card className="p-4">
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void action.run(async () => { await createWorkOrder(null, asset || null, title, jakartaToday()); setTitle(""); await onDone(); }); }}>
        <Field label="Damaged"><input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
        <Field label="Device">
          <select className={inputClass} value={asset} onChange={(e) => setAsset(e.target.value)}>
            <option value="">Not tied to a device</option>
            {assets.map((a) => <option key={a.id} value={a.id}>{a.code} · {a.name}</option>)}
          </select>
        </Field>
        <ActionNote action={{ error: action.error, saved: false }} />
        <PrimaryButton type="submit" disabled={action.busy || !title.trim()}>Open work order</PrimaryButton>
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
  const late = order.due_on < today;
  const finish = async () => {
    const value = cost.trim() === "" ? 0 : parseRupiah(cost);
    if (value === null) return action.setError("Cost must be a number.");
    await action.run(async () => { await finishWorkOrder(order.id, done, note, value, value > 0 ? room : null); await reload(); });
  };
  return (
    <li className="border-t border-[#EDF2F2] px-4 py-2.5 first:border-0">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <span className="min-w-0 flex-1 basis-[200px]">
          <span className="block text-[14px] font-medium text-[#0F2F36]">{order.title}</span>
          <span className="block text-[13px] text-[#4F6B73]">{order.wo_no} · {order.kind === "perbaikan" ? "Repair" : "Scheduled"}{assetLabel(order) ? ` · ${assetLabel(order)}` : ""}</span>
          <span className={`block text-[13px] ${late ? "font-medium text-[#B3362C]" : "text-[#4F6B73]"}`}>Target {formatLongDate(order.due_on)}</span>
        </span>
        {canEdit && mode === null && (
          <span className="flex gap-2">
            <SecondaryButton onClick={() => setMode("finish")}>Finish</SecondaryButton>
            <SecondaryButton onClick={() => setMode("cancel")}>Cancel</SecondaryButton>
          </span>
        )}
      </div>
      {mode === "finish" && (
        <form className="mt-2 space-y-2 rounded-lg bg-[#F3F7F7] p-2.5" onSubmit={(e) => { e.preventDefault(); void finish(); }}>
          <div className="grid grid-cols-2 gap-2">
            <Field label="End date"><input type="date" className={inputClass} max={today} value={done} onChange={(e) => setDone(e.target.value)} /></Field>
            <Field label="Cost (Rp)"><input className={inputClass} inputMode="numeric" placeholder="0" value={cost} onChange={(e) => setCost(e.target.value)} /></Field>
          </div>
          {cost.trim() !== "" && parseRupiah(cost) !== 0 && (
            <Field label="Rooms that carry it" hint="Goes into this room's bill for that month.">
              <select className={inputClass} value={room} onChange={(e) => setRoom(e.target.value)}>
                {COST_AREAS.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
              </select>
            </Field>
          )}
          <Field label="Notes"><input className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
          <ActionNote action={{ error: action.error, saved: false }} />
          <div className="flex gap-2">
            <SecondaryButton type="submit" disabled={action.busy}>Save</SecondaryButton>
            <SecondaryButton onClick={() => setMode(null)}>Close</SecondaryButton>
          </div>
        </form>
      )}
      {mode === "cancel" && (
        <form className="mt-2 space-y-2 rounded-lg bg-[#F3F7F7] p-2.5" onSubmit={(e) => { e.preventDefault(); void action.run(async () => { await cancelWorkOrder(order.id, note); await reload(); }); }}>
          <Field label="Reason for cancelling"><input className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} autoFocus /></Field>
          <ActionNote action={{ error: action.error, saved: false }} />
          <div className="flex gap-2">
            <SecondaryButton type="submit" disabled={action.busy || !note.trim()}>Yes, cancel</SecondaryButton>
            <SecondaryButton onClick={() => setMode(null)}>Close</SecondaryButton>
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
  return (
    <li className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-[#EDF2F2] px-4 py-2.5 first:border-0">
      <span className="min-w-0 flex-1 basis-[200px]">
        <span className="block text-[14px] font-medium text-[#0F2F36]">{plan.title}</span>
        <span className="block text-[13px] text-[#4F6B73]">
          Every {plan.every_days} days{assetLabel(plan) ? ` · ${assetLabel(plan)}` : ""}
        </span>
        <span className="block text-[13px] text-[#4F6B73]">{plan.last_done ? `Last ${formatLongDate(plan.last_done)}, next ${formatLongDate(plan.next_due)}` : "Never done"}</span>
        {action.error && <span className="block text-[13px] text-[#8A5A07]">{action.error}</span>}
      </span>
      <span className="flex items-center gap-2">
        {plan.open_order_id ? <span className="rounded-md bg-[#E3F4F4] px-2 py-0.5 text-[12.5px] font-medium text-[#0B6477]">Currently open</span> : <span className={`rounded-md px-2 py-0.5 text-[12.5px] font-medium ${state.className}`}>{state.label}</span>}
        {canEdit && !plan.open_order_id && <SecondaryButton disabled={action.busy} onClick={() => void action.run(async () => { await createWorkOrder(plan.id, null, null, plan.next_due); await reload(); })}>Open work order</SecondaryButton>}
      </span>
    </li>
  );
}

export default function MaintenancePage() {
  const { canMaintain, canReadMaintenance } = useErpAccess();
  const state = useLoad(async () => {
    const [plans, orders, assets] = await Promise.all([fetchPlans(), fetchWorkOrders(), fetchAssets().catch(() => [] as Asset[])]);
    return { plans, orders, assets };
  });
  const [adding, setAdding] = useState(false);
  return (
    <ErpPage
      eyebrow="Monitoring"
      title="Maintenance"
      sub="Recurring plans and work orders for devices and rooms."
      actions={canMaintain && !adding && state.data ? <PrimaryButton onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> New plan</PrimaryButton> : undefined}
    >
      {!canReadMaintenance ? <Note>This page is for Technicians, Production managers, Admins and Leadership.</Note> : (
        <DataState state={state}>
          {({ plans, orders, assets }) => {
            const open = orders.filter((o) => o.status === "terbuka").sort((a, b) => a.due_on.localeCompare(b.due_on));
            const closed = orders.filter((o) => o.status !== "terbuka").slice(0, 20);
            return (
              <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
                <div className="min-w-0 space-y-4">
                  {!canMaintain && <ReadOnlyNote who="Technician or Admin" />}
                  <Card>
                    <h2 className={`${sectionTitle} px-4 py-3`}>Open work orders</h2>
                    {open.length === 0 ? <p className="border-t border-[#EDF2F2] px-4 py-3 text-[14px] text-[#4F6B73]">None.</p> : <ul className="border-t border-[#EDF2F2]">{open.map((o) => <OrderRow key={o.id} order={o} canEdit={canMaintain} reload={state.reload} />)}</ul>}
                  </Card>
                  <Card>
                    <h2 className={`${sectionTitle} px-4 py-3`}>Recurring plans</h2>
                    {plans.filter((p) => p.active).length === 0 ? <p className="border-t border-[#EDF2F2] px-4 py-3 text-[14px] text-[#4F6B73]">No plans yet.</p> : <ul className="border-t border-[#EDF2F2]">{plans.filter((p) => p.active).map((p) => <PlanRow key={p.id} plan={p} canEdit={canMaintain} reload={state.reload} />)}</ul>}
                  </Card>
                  {closed.length > 0 && (
                    <Disclosure title="History">
                      <DataTable
                        rows={closed}
                        rowKey={(o) => o.id}
                        noun="work orders"
                        searchText={(o) => `${o.title} ${o.wo_no}`}
                        searchLabel="Search work orders"
                        columns={[
                          { key: "title", label: "Work order", phone: "title", sort: (a, b) => a.title.localeCompare(b.title), cell: (o) => <CellTitle title={o.title} sub={`${o.wo_no}${o.done_note ? ` · ${o.done_note}` : ""}`} /> },
                          { key: "state", label: "Outcome", cell: (o) => <Chip label={o.status === "batal" ? "Cancelled" : `Done ${o.done_on ? formatLongDate(o.done_on) : ""}`} className={o.status === "batal" ? undefined : "bg-[#E3F7F0] text-[#0E7A5C]"} /> },
                          { key: "cost", label: "Cost", track: "130px", align: "right", sort: (a, b) => a.cost_idr - b.cost_idr, cell: (o) => <span className="tabular-nums">{o.cost_idr > 0 ? formatRupiah(o.cost_idr) : "-"}</span> },
                        ] satisfies Column<(typeof closed)[number]>[]}
                      />
                    </Disclosure>
                  )}
                </div>
                {canMaintain && (
                  <div className="min-w-0 space-y-3">
                    {adding && <PlanForm assets={assets} onDone={async () => { setAdding(false); await state.reload(); }} />}
                    <Disclosure title="Report a fault"><RepairForm assets={assets} onDone={state.reload} /></Disclosure>
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
