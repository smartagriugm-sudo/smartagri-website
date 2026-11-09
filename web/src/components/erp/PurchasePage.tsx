import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Plus, Printer, Trash2 } from "lucide-react";
import { jakartaToday } from "../../lib/pf/batch";
import { formatLongDate } from "../../lib/pf/dashboard";
import { PO_STAGE, cancelPurchaseOrder, fetchItems, fetchPoLines, fetchPurchaseOrder, fetchPurchaseOrders, fetchSuppliers, formatQty, parsePoForm, parseReceive, placePurchaseOrder, poFormTotal, poStage, receivePoLine, savePurchaseOrder, saveSupplier, type Item, type PoLine, type PoLineForm, type PurchaseOrder, type Supplier } from "../../lib/pf/inventory";
import { formatRupiah } from "../../lib/pf/sales";
import { ActionNote, DataState, ErpPage, Field, PrimaryButton, ReadOnlyNote, SecondaryButton, inputClass, useAction, useErpAccess, useLoad } from "./page";
import { PaperHead } from "./SalesDocuments";
import { Card, Disclosure, Note, Rows } from "./ui";
import DataTable, { CellTitle, Chip, type Column } from "./DataTable";

// Buying: who from, what was ordered, what has arrived. Stock goes up only when a
// delivery is received, one lot at a time, so every lot knows which order it came from.

const sectionTitle = "text-[16px] font-medium tracking-[-0.02em] text-[#0F2F36]";

function SupplierCard({ suppliers, canManage, reload }: { suppliers: Supplier[]; canManage: boolean; reload: () => Promise<void> }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [phone, setPhone] = useState("");
  const action = useAction();
  const submit = async () => {
    if (!name.trim()) return action.setError("A name is required.");
    const saved = await action.run(async () => {
      await saveSupplier(null, { name, contact_name: contact, phone, email: "", address: "", tax_id: "", notes: "", active: true });
      await reload();
    });
    if (saved) {
      setAdding(false);
      setName("");
      setContact("");
      setPhone("");
    }
  };
  return (
    <Card>
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <h2 className={sectionTitle}>Supplier</h2>
        {canManage && !adding && <button type="button" onClick={() => setAdding(true)} className="inline-flex min-h-[44px] items-center gap-1 text-[14px] font-medium text-[#0B6477] hover:underline sm:min-h-[24px]"><Plus className="h-4 w-4" /> Add</button>}
      </div>
      {adding && (
        <form className="space-y-3 border-t border-[#EDF2F2] p-4" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
          <Field label="Name"><input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Contact"><input className={inputClass} value={contact} onChange={(e) => setContact(e.target.value)} /></Field>
            <Field label="Phone"><input className={inputClass} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
          </div>
          <ActionNote action={action} />
          <div className="flex gap-2"><PrimaryButton type="submit" disabled={action.busy}>Save</PrimaryButton><SecondaryButton onClick={() => setAdding(false)}>Cancel</SecondaryButton></div>
        </form>
      )}
      {suppliers.length === 0 ? (
        <p className="border-t border-[#EDF2F2] px-4 py-3 text-[14px] text-[#4F6B73]">No suppliers yet.</p>
      ) : (
        <ul>
          {suppliers.map((s) => (
            <li key={s.id} className="border-t border-[#EDF2F2] px-4 py-2 text-[14px]">
              <span className="font-medium text-[#0F2F36]">{s.name}</span>
              {(s.contact_name || s.phone) && <span className="block text-[13px] text-[#4F6B73]">{[s.contact_name, s.phone].filter(Boolean).join(" · ")}</span>}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function PoEditor({ order, initial, suppliers, items, onCancel, onSaved }: { order: PurchaseOrder | null; initial?: PoLineForm[]; suppliers: Supplier[]; items: Item[]; onCancel: () => void; onSaved: (id: string) => void }) {
  const today = jakartaToday();
  const active = suppliers.filter((s) => s.active);
  const usable = items.filter((i) => i.active);
  const blank = (): PoLineForm => ({ itemId: usable[0]?.id ?? "", qty: "", unitPrice: "" });
  const [supplierId, setSupplierId] = useState(order?.supplier_id ?? active[0]?.id ?? "");
  const [orderedOn, setOrderedOn] = useState(order?.ordered_on ?? today);
  const [expectedOn, setExpectedOn] = useState(order?.expected_on ?? "");
  const [notes, setNotes] = useState(order?.notes ?? "");
  const [rows, setRows] = useState<PoLineForm[]>(initial?.length ? initial : [blank()]);
  const action = useAction();
  const change = (i: number, patch: Partial<PoLineForm>) => setRows((r) => r.map((row, n) => (n === i ? { ...row, ...patch } : row)));

  const submit = async () => {
    const parsed = parsePoForm(supplierId, orderedOn, expectedOn, rows);
    if (parsed.error !== null) return action.setError(parsed.error);
    let saved = "";
    if (await action.run(async () => { saved = await savePurchaseOrder(order?.id ?? null, supplierId, orderedOn, expectedOn, notes, parsed.lines); })) onSaved(saved);
  };

  if (active.length === 0) return <Note>Add a supplier first.</Note>;
  if (usable.length === 0) return <Note>Add items first on the Stock page.</Note>;

  return (
    <Card className="p-4">
      <h2 className={`${sectionTitle} mb-3`}>{order ? `Edit ${order.po_no}` : "New purchase order"}</h2>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <Field label="Supplier">
          <select className={inputClass} value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
            {active.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Order date"><input type="date" className={inputClass} value={orderedOn} onChange={(e) => setOrderedOn(e.target.value)} /></Field>
          <Field label="Expected arrival"><input type="date" className={inputClass} value={expectedOn} onChange={(e) => setExpectedOn(e.target.value)} /></Field>
        </div>
        <div className="space-y-2">
          <p className="text-[13px] font-medium text-[#36525A]">Order contents</p>
          {rows.map((r, i) => {
            const unit = usable.find((x) => x.id === r.itemId)?.unit ?? "";
            return (
              <div key={i} className="grid grid-cols-2 gap-2 rounded-lg border border-[#E3ECED] p-2">
                <select className={`${inputClass} col-span-2`} aria-label={`Item on line ${i + 1}`} value={r.itemId} onChange={(e) => change(i, { itemId: e.target.value })}>
                  {usable.map((x) => <option key={x.id} value={x.id}>{x.name} ({x.unit})</option>)}
                </select>
                <input className={inputClass} inputMode="decimal" aria-label={`Quantity on line ${i + 1}`} placeholder={`Quantity (${unit})`} value={r.qty} onChange={(e) => change(i, { qty: e.target.value })} />
                <input className={inputClass} inputMode="numeric" aria-label={`Unit price on line ${i + 1}`} placeholder="Unit price" value={r.unitPrice} onChange={(e) => change(i, { unitPrice: e.target.value })} />
                <button type="button" disabled={rows.length === 1} onClick={() => setRows((all) => all.filter((_, n) => n !== i))} className="col-span-2 flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg text-[13px] font-medium text-[#4F6B73] hover:bg-[#F3F7F7] disabled:opacity-40 sm:min-h-[28px]"><Trash2 className="h-4 w-4" /> Remove line</button>
              </div>
            );
          })}
          <SecondaryButton onClick={() => setRows((all) => [...all, blank()])}><Plus className="h-4 w-4" /> Add line</SecondaryButton>
          <p className="text-[14px] text-[#0F2F36]">Total <span className="font-medium tabular-nums">{formatRupiah(poFormTotal(rows))}</span></p>
        </div>
        <Field label="Notes"><textarea className={inputClass} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
        <ActionNote action={action} />
        <div className="flex gap-2">
          <PrimaryButton type="submit" disabled={action.busy}>{action.busy ? "Saving…" : order ? "Save draft" : "Create draft"}</PrimaryButton>
          <SecondaryButton onClick={onCancel}>Cancel</SecondaryButton>
        </div>
      </form>
    </Card>
  );
}


export function PurchasePage() {
  const state = useLoad(async () => {
    const [orders, suppliers, items] = await Promise.all([fetchPurchaseOrders(), fetchSuppliers(), fetchItems()]);
    return { orders, suppliers, items };
  });
  const { canManageProduction } = useErpAccess();
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();
  const today = jakartaToday();

  return (
    <ErpPage
      eyebrow="Inventory"
      title="Purchasing"
      sub="Stock goes up when goods are received, one lot at a time."
      actions={canManageProduction && !creating && state.data ? <PrimaryButton onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> Purchase order</PrimaryButton> : undefined}
    >
      <DataState state={state}>
        {({ orders, suppliers, items }) => {
          return (
            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="min-w-0 space-y-3">
                {!canManageProduction && <ReadOnlyNote who="Production manager" />}
                <DataTable
                  rows={orders}
                  rowKey={(o) => o.id}
                  noun="purchase orders"
                  rowLink={(o) => `/erp/purchasing/${o.id}`}
                  searchText={(o) => `${o.po_no} ${o.supplier_name}`}
                  searchLabel="Search by order number or supplier"
                  initialPill="open"
                  pills={[
                    { key: "open", label: "In progress", dot: "#14919B", match: (o) => ["draf", "menunggu", "sebagian"].includes(poStage(o)) },
                    { key: "received", label: "Received", dot: "#0E9B7A", match: (o) => poStage(o) === "diterima" },
                    { key: "cancelled", label: "Cancelled", dot: "#8FA3A8", match: (o) => poStage(o) === "batal" },
                  ]}
                  filters={[{ label: "Filter by supplier", all: "All suppliers", value: (o) => o.supplier_name }]}
                  empty="No purchase orders yet."
                  columns={[
                    { key: "no", label: "Order", track: "minmax(0,1.3fr)", phone: "title", sort: (a, b) => a.po_no.localeCompare(b.po_no), cell: (o) => <CellTitle title={o.po_no} sub={o.supplier_name} /> },
                    { key: "stage", label: "Stage", track: "minmax(160px,1fr)", cell: (o) => { const stage = PO_STAGE[poStage(o)]; return <Chip label={stage.label} className={stage.className} />; } },
                    { key: "date", label: "Expected", sort: (a, b) => (a.expected_on ?? a.ordered_on).localeCompare(b.expected_on ?? b.ordered_on), cell: (o) => {
                      const late = !!o.expected_on && o.expected_on < today && o.status === "dipesan" && o.open_lines > 0;
                      return <span className={`text-[13px] ${late ? "font-medium text-[#B3362C]" : ""}`}>{o.expected_on ? `${late ? "Late, " : ""}${formatLongDate(o.expected_on)}` : `Ordered ${formatLongDate(o.ordered_on)}`}</span>;
                    } },
                    { key: "total", label: "Total", track: "140px", align: "right", sort: (a, b) => a.total - b.total, cell: (o) => <span className="font-medium tabular-nums text-[#0F2F36]">{formatRupiah(o.total)}</span> },
                  ] satisfies Column<PurchaseOrder>[]}
                />
              </div>
              <div className="min-w-0 space-y-4">
                {creating && <PoEditor order={null} suppliers={suppliers} items={items} onCancel={() => setCreating(false)} onSaved={(id) => void navigate({ to: "/erp/purchasing/$id", params: { id } })} />}
                <SupplierCard suppliers={suppliers} canManage={canManageProduction} reload={state.reload} />
              </div>
            </div>
          );
        }}
      </DataState>
    </ErpPage>
  );
}

function ReceiveLine({ line, reload }: { line: PoLine; reload: () => Promise<void> }) {
  const today = jakartaToday();
  const left = Math.round((line.qty - line.received_qty) * 100) / 100;
  const [lotNo, setLotNo] = useState("");
  const [qty, setQty] = useState("");
  const [receivedOn, setReceivedOn] = useState(today);
  const [expiryOn, setExpiryOn] = useState("");
  const action = useAction();
  const submit = async () => {
    const parsed = parseReceive({ lotNo, qty: qty.trim() || String(left), receivedOn, expiryOn }, today, line.track_expiry, left);
    if (parsed.error !== null) return action.setError(parsed.error);
    await action.run(async () => {
      await receivePoLine(line.id, parsed.qty, lotNo, receivedOn, expiryOn);
      await reload();
    });
  };
  return (
    <form className="mt-2 grid grid-cols-2 items-end gap-2 sm:grid-cols-[1fr_100px_1fr_1fr_auto]" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
      <Field label="Lot number"><input className={inputClass} value={lotNo} onChange={(e) => setLotNo(e.target.value)} /></Field>
      <Field label={`Quantity (${line.unit})`}><input className={inputClass} inputMode="decimal" value={qty} placeholder={String(left).replace(".", ",")} onChange={(e) => setQty(e.target.value)} /></Field>
      <Field label="Received date"><input type="date" className={inputClass} max={today} value={receivedOn} onChange={(e) => setReceivedOn(e.target.value)} /></Field>
      <Field label={line.track_expiry ? "Expires" : "Expires (optional)"}><input type="date" className={inputClass} value={expiryOn} onChange={(e) => setExpiryOn(e.target.value)} /></Field>
      <PrimaryButton type="submit" disabled={action.busy}>{action.busy ? "Saving…" : "Receive"}</PrimaryButton>
      <div className="col-span-full empty:hidden"><ActionNote action={{ error: action.error, saved: false }} /></div>
    </form>
  );
}

function CancelPo({ order, reload }: { order: PurchaseOrder; reload: () => Promise<void> }) {
  const [why, setWhy] = useState("");
  const action = useAction();
  return (
    <Card className="p-4">
      <div className="space-y-2">
        <Field label="Reason"><input className={inputClass} value={why} onChange={(e) => setWhy(e.target.value)} /></Field>
        <ActionNote action={{ error: action.error, saved: false }} />
        <SecondaryButton disabled={action.busy || !why.trim()} onClick={() => void action.run(async () => { await cancelPurchaseOrder(order.id, why); await reload(); })}>{action.busy ? "Cancelling…" : "Yes, cancel"}</SecondaryButton>
      </div>
    </Card>
  );
}

export function PurchaseDetailPage({ id }: { id: string }) {
  const state = useLoad(async () => {
    const [order, lines] = await Promise.all([fetchPurchaseOrder(id), fetchPoLines(id)]);
    return { order, lines };
  }, [id]);
  const editor = useLoad(async () => {
    const [suppliers, items] = await Promise.all([fetchSuppliers(), fetchItems()]);
    return { suppliers, items };
  });
  const { canManageProduction } = useErpAccess();
  const [editing, setEditing] = useState(false);
  const place = useAction();

  return (
    <ErpPage
      eyebrow="Inventory · Purchasing"
      title={state.data ? `${state.data.order.po_no} · ${state.data.order.supplier_name}` : "Purchase order"}
      sub={state.data ? PO_STAGE[poStage(state.data.order)].label : undefined}
      actions={
        <div className="flex flex-wrap items-center gap-3 print:hidden">
          <Link to="/erp/purchasing" className="inline-flex min-h-[44px] items-center gap-1 text-[14px] font-medium text-[#0B6477] hover:underline sm:min-h-[24px]"><ArrowLeft className="h-4 w-4" /> All purchases</Link>
          <SecondaryButton onClick={() => window.print()}><Printer className="h-4 w-4" /> Print or save as PDF</SecondaryButton>
        </div>
      }
    >
      <DataState state={state}>
        {({ order, lines }) => {
          const isDraft = order.status === "draf";
          const placed = order.status === "dipesan";
          return (
            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px] print:block">
              <div className="min-w-0 space-y-4">
                {order.status === "batal" && <Note tone="warn">Cancelled: {order.cancel_note}</Note>}
                {!canManageProduction && <div className="print:hidden"><ReadOnlyNote who="Production manager" /></div>}
                {isDraft && editing && editor.data ? (
                  <PoEditor
                    order={order}
                    initial={lines.map((l) => ({ itemId: l.item_id, qty: String(l.qty).replace(".", ","), unitPrice: String(l.unit_price) }))}
                    suppliers={editor.data.suppliers}
                    items={editor.data.items}
                    onCancel={() => setEditing(false)}
                    onSaved={() => { setEditing(false); void state.reload(); }}
                  />
                ) : (
                  <>
                    <div className="hidden print:block">
                      <PaperHead kind="PURCHASE ORDER" number={order.po_no}>Date {formatLongDate(order.ordered_on)}</PaperHead>
                      <p className="py-3 text-[14px] text-[#0F2F36]">To {order.supplier_name}</p>
                      <table className="w-full text-left text-[14px]">
                        <thead><tr className="border-b border-[#DCE7E8] text-[#4F6B73]"><th className="pb-2 font-medium">Item</th><th className="pb-2 text-right font-medium">Quantity</th><th className="pb-2 text-right font-medium">Unit price</th><th className="pb-2 text-right font-medium">Total</th></tr></thead>
                        <tbody>{lines.map((l) => <tr key={l.id} className="border-b border-[#EDF2F2]"><td className="py-2">{l.item_name}</td><td className="py-2 text-right">{formatQty(l.qty, l.unit)}</td><td className="py-2 text-right">{formatRupiah(l.unit_price)}</td><td className="py-2 text-right">{formatRupiah(l.amount)}</td></tr>)}</tbody>
                      </table>
                      <p className="mt-3 text-right font-semibold text-[#0F2F36]">Total {formatRupiah(order.total)}</p>
                      {order.notes && <p className="mt-3 text-[13.5px] text-[#36525A]">{order.notes}</p>}
                    </div>
                    <Card className="p-4 print:hidden">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <h2 className={sectionTitle}>{placed ? "Receive goods" : "Order contents"}</h2>
                        {isDraft && canManageProduction && <SecondaryButton onClick={() => setEditing(true)}>Edit</SecondaryButton>}
                      </div>
                      <div className="space-y-2">
                        {lines.map((l) => (
                          <div key={l.id} className="rounded-lg border border-[#E3ECED] p-3">
                            <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-[14px]">
                              <span className="font-medium text-[#0F2F36]">{l.item_name}</span>
                              <span className="tabular-nums text-[#4F6B73]">{isDraft ? `${formatQty(l.qty, l.unit)} × ${formatRupiah(l.unit_price)} = ${formatRupiah(l.amount)}` : `${formatQty(l.received_qty, l.unit)} of ${formatQty(l.qty, l.unit)}`}</span>
                            </div>
                            {placed && canManageProduction && l.received_qty < l.qty && <ReceiveLine key={l.received_qty} line={l} reload={state.reload} />}
                          </div>
                        ))}
                      </div>
                      {isDraft && canManageProduction && (
                        <div className="mt-3 space-y-2">
                          <ActionNote action={{ error: place.error, saved: false }} />
                          <PrimaryButton disabled={place.busy} onClick={() => void place.run(async () => { await placePurchaseOrder(order.id); await state.reload(); })}>{place.busy ? "Saving…" : "Mark as ordered"}</PrimaryButton>
                        </div>
                      )}
                    </Card>
                  </>
                )}
                {canManageProduction && order.status !== "batal" && order.received_lines === 0 && <div className="print:hidden"><Disclosure title="Cancel purchase order"><CancelPo order={order} reload={state.reload} /></Disclosure></div>}
              </div>
              <Card className="p-4 print:hidden">
                <h2 className={`${sectionTitle} mb-3`}>Overview</h2>
                <Rows rows={[["Supplier", order.supplier_name], ["Ordered", formatLongDate(order.ordered_on)], ["Expected arrival", order.expected_on ? formatLongDate(order.expected_on) : "-"], ["Total", formatRupiah(order.total)]]} />
                {order.notes && <p className="mt-3 text-[13.5px] text-[#36525A]">{order.notes}</p>}
              </Card>
            </div>
          );
        }}
      </DataState>
    </ErpPage>
  );
}
