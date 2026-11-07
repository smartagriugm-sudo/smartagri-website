import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { formatLongDate } from "../../lib/pf/dashboard";
import { jakartaToday } from "../../lib/pf/batch";
import { cropLabel, fetchCrops, type PfCrop } from "../../lib/pf/foundation";
import { fetchAvailableLots, fetchOrders, fetchPartners, formTotal, formatKg, formatRupiah, orderStageLabel, orderStep, parseOrderForm, roundKg, saveOrder, type AvailableLot, type LineForm, type OrderOverview, type Partner } from "../../lib/pf/sales";
import { ActionNote, DataState, ErpPage, Field, PrimaryButton, ReadOnlyNote, SecondaryButton, inputClass, useAction, useErpAccess, useLoad } from "./page";
import { Card } from "./ui";
import DataTable, { CellTitle, Chip, type Column } from "./DataTable";

// Every order and where it stands, and what is on hand to sell. The work on one
// order is on its own page.

const GRADES = ["A", "B", "Afkir"];

/** Unsold harvest, by crop and grade, because that is what a buyer asks for. */
export function StockSummary({ lots, today }: { lots: AvailableLot[]; today: string }) {
  const usable = lots.filter((l) => !l.best_before || l.best_before >= today);
  const groups = new Map<string, { label: string; grade: string; kg: number }>();
  for (const l of usable) {
    const key = `${l.crop_id}:${l.grade}`;
    const g = groups.get(key) ?? { label: cropLabel({ name: l.crop_name, variety: l.crop_variety }), grade: l.grade, kg: 0 };
    g.kg = roundKg(g.kg + l.remaining_kg);
    groups.set(key, g);
  }
  const rows = [...groups.values()].sort((a, b) => a.label.localeCompare(b.label) || a.grade.localeCompare(b.grade));
  return (
    <Card>
      <h2 className="px-4 py-3 text-[16px] font-medium tracking-[-0.02em] text-[#0F2F36]">Harvest stock ready to sell</h2>
      {rows.length === 0 ? (
        <p className="border-t border-[#EDF2F2] px-4 py-3 text-[14px] text-[#4F6B73]">No harvest lots left.</p>
      ) : (
        <ul>
          {rows.map((r) => (
            <li key={`${r.label}${r.grade}`} className="flex justify-between gap-3 border-t border-[#EDF2F2] px-4 py-2 text-[14px]">
              <span className="text-[#0F2F36]">{r.label}, grade {r.grade}</span>
              <span className="font-medium tabular-nums text-[#0F2F36]">{formatKg(r.kg)}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function OrderEditor({ order, initialLines, partners, crops, onCancel, onSaved }: {
  order: OrderOverview | null;
  initialLines?: LineForm[];
  partners: Partner[];
  crops: PfCrop[];
  onCancel: () => void;
  onSaved: (id: string) => void;
}) {
  const today = jakartaToday();
  const active = partners.filter((p) => p.active && p.kind !== "pemasok");
  const usableCrops = crops.filter((c) => c.active);
  const emptyRow = (): LineForm => ({ cropId: usableCrops[0]?.id ?? "", grade: "A", qtyKg: "", pricePerKg: "" });
  const [partnerId, setPartnerId] = useState(order?.partner_id ?? active[0]?.id ?? "");
  const [orderedOn, setOrderedOn] = useState(order?.ordered_on ?? today);
  const [requestedOn, setRequestedOn] = useState(order?.requested_on ?? "");
  const [notes, setNotes] = useState(order?.notes ?? "");
  const [rows, setRows] = useState<LineForm[]>(initialLines?.length ? initialLines : [emptyRow()]);
  const action = useAction();

  const change = (i: number, patch: Partial<LineForm>) => setRows((r) => r.map((row, n) => (n === i ? { ...row, ...patch } : row)));

  const submit = async () => {
    const parsed = parseOrderForm(partnerId, orderedOn, requestedOn, rows);
    if (parsed.error !== null) return action.setError(parsed.error);
    let saved = "";
    if (await action.run(async () => { saved = await saveOrder(order?.id ?? null, partnerId, orderedOn, requestedOn, notes, parsed.lines); })) onSaved(saved);
  };

  if (active.length === 0) {
    return <Card className="p-4 text-[14px] text-[#4F6B73]">No active customers yet. Add one first on the page <Link to="/erp/customers" className="font-medium text-[#0B6477] hover:underline">Customers</Link>.</Card>;
  }

  return (
    <Card className="p-4">
      <h2 className="mb-3 text-[16px] font-medium tracking-[-0.02em] text-[#0F2F36]">{order ? `Edit ${order.so_no}` : "New order"}</h2>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <Field label="Customer">
          <select className={inputClass} value={partnerId} onChange={(e) => setPartnerId(e.target.value)}>
            {active.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Order date"><input type="date" className={inputClass} value={orderedOn} onChange={(e) => setOrderedOn(e.target.value)} /></Field>
          <Field label="Requested on"><input type="date" className={inputClass} value={requestedOn} onChange={(e) => setRequestedOn(e.target.value)} /></Field>
        </div>
        <div className="space-y-2">
          <p className="text-[13px] font-medium text-[#36525A]">Order contents</p>
          {rows.map((r, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 rounded-lg border border-[#E3ECED] p-2">
              <select className={`${inputClass} col-span-2`} aria-label={`Crop on line ${i + 1}`} value={r.cropId} onChange={(e) => change(i, { cropId: e.target.value })}>
                {usableCrops.map((c) => <option key={c.id} value={c.id}>{cropLabel(c)}</option>)}
              </select>
              <select className={inputClass} aria-label={`Grade on line ${i + 1}`} value={r.grade} onChange={(e) => change(i, { grade: e.target.value })}>
                {GRADES.map((g) => <option key={g} value={g}>Grade {g}</option>)}
              </select>
              <input className={inputClass} inputMode="decimal" aria-label={`Weight on line ${i + 1} in kg`} placeholder="Weight (kg)" value={r.qtyKg} onChange={(e) => change(i, { qtyKg: e.target.value })} />
              <input className={inputClass} inputMode="numeric" aria-label={`Price per kg on line ${i + 1}`} placeholder="Price per kg" value={r.pricePerKg} onChange={(e) => change(i, { pricePerKg: e.target.value })} />
              <button type="button" disabled={rows.length === 1} onClick={() => setRows((all) => all.filter((_, n) => n !== i))} className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg text-[13px] font-medium text-[#4F6B73] hover:bg-[#F3F7F7] disabled:opacity-40 sm:min-h-0">
                <Trash2 className="h-4 w-4" /> Remove line
              </button>
            </div>
          ))}
          <SecondaryButton onClick={() => setRows((all) => [...all, emptyRow()])}><Plus className="h-4 w-4" /> Add line</SecondaryButton>
          <p className="text-[14px] text-[#0F2F36]">Total <span className="font-medium tabular-nums">{formatRupiah(formTotal(rows))}</span></p>
        </div>
        <Field label="Notes"><textarea className={inputClass} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
        <ActionNote action={action} />
        <div className="flex gap-2">
          <PrimaryButton type="submit" disabled={action.busy}>{action.busy ? "Saving..." : order ? "Save draft" : "Create draft"}</PrimaryButton>
          <SecondaryButton onClick={onCancel}>Cancel</SecondaryButton>
        </div>
      </form>
    </Card>
  );
}

type Show = "berjalan" | "selesai" | "batal";

export default function OrdersPage() {
  const state = useLoad(async () => {
    const [orders, lots, partners, crops] = await Promise.all([fetchOrders(), fetchAvailableLots(), fetchPartners(), fetchCrops()]);
    return { orders, lots, partners, crops };
  });
  const { canSell } = useErpAccess();
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();
  const today = jakartaToday();

  return (
    <ErpPage
      eyebrow="Sales"
      title="Orders"
      sub="From a new order, choosing harvest lots and delivery, through to payment."
      actions={canSell && !creating && state.data ? <PrimaryButton onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> New order</PrimaryButton> : undefined}
    >
      <DataState state={state}>
        {({ orders, lots, partners, crops }) => {
          const groups: Record<Show, OrderOverview[]> = {
            berjalan: orders.filter((o) => { const s = orderStep(o); return s !== null && s < 5; }),
            selesai: orders.filter((o) => orderStep(o) === 5),
            batal: orders.filter((o) => orderStep(o) === null),
          };
          const due = (o: OrderOverview) => o.requested_on ?? "9999";
          return (
            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="min-w-0 space-y-3">
                {!canSell && <ReadOnlyNote who="Sales staff" />}
                <DataTable
                  rows={[...groups.berjalan].sort((a, b) => due(a).localeCompare(due(b))).concat(groups.selesai, groups.batal)}
                  rowKey={(o) => o.id}
                  noun="orders"
                  rowLink={(o) => `/erp/orders/${o.id}`}
                  searchText={(o) => `${o.so_no} ${o.partner_name}`}
                  searchLabel="Search by order number or customer"
                  initialPill="open"
                  pills={[
                    { key: "open", label: "In progress", dot: "#14919B", match: (o) => { const s = orderStep(o); return s !== null && s < 5; } },
                    { key: "done", label: "Completed", dot: "#0E9B7A", match: (o) => orderStep(o) === 5 },
                    { key: "cancelled", label: "Cancelled", dot: "#8FA3A8", match: (o) => orderStep(o) === null },
                  ]}
                  filters={[{ label: "Filter by customer", all: "All customers", value: (o) => o.partner_name }]}
                  empty="No orders yet."
                  columns={[
                    { key: "no", label: "Order", track: "minmax(0,1.3fr)", phone: "title", sort: (a, b) => a.so_no.localeCompare(b.so_no), cell: (o) => <CellTitle title={o.so_no} sub={o.partner_name} /> },
                    { key: "stage", label: "Stage", cell: (o) => <Chip label={orderStageLabel(o)} className={orderStep(o) === null ? undefined : orderStep(o) === 5 ? "bg-[#E3F7F0] text-[#0E7A5C]" : "bg-[#E3F4F4] text-[#0B6477]"} /> },
                    { key: "due", label: "Requested", sort: (a, b) => due(a).localeCompare(due(b)), cell: (o) => {
                      const late = !!o.requested_on && o.requested_on < today && o.delivered_kg < o.ordered_kg && o.status !== "batal";
                      return <span className={`text-[13px] ${late ? "font-medium text-[#B3362C]" : ""}`}>{o.requested_on ? `${late ? "Late, " : ""}${formatLongDate(o.requested_on)}` : `Ordered ${formatLongDate(o.ordered_on)}`}</span>;
                    } },
                    { key: "qty", label: "Quantity", track: "100px", align: "right", sort: (a, b) => a.ordered_kg - b.ordered_kg, cell: (o) => <span className="tabular-nums">{formatKg(o.ordered_kg)}</span> },
                    { key: "amount", label: "Amount", track: "140px", align: "right", sort: (a, b) => a.amount - b.amount, cell: (o) => <span className="font-medium tabular-nums text-[#0F2F36]">{formatRupiah(o.amount)}</span> },
                  ] satisfies Column<OrderOverview>[]}
                />
              </div>
              <div className="min-w-0 space-y-4">
                {creating && <OrderEditor order={null} partners={partners} crops={crops} onCancel={() => setCreating(false)} onSaved={(id) => void navigate({ to: "/erp/orders/$id", params: { id } })} />}
                <StockSummary lots={lots} today={today} />
              </div>
            </div>
          );
        }}
      </DataState>
    </ErpPage>
  );
}
