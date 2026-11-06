import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Search } from "lucide-react";
import { jakartaToday } from "../../lib/pf/batch";
import { formatLongDate } from "../../lib/pf/dashboard";
import { fetchCrops } from "../../lib/pf/foundation";
import {
  ORDER_STEPS,
  PAY_STATE,
  allocate,
  cancelDelivery,
  cancelOrder,
  confirmOrder,
  createDelivery,
  fetchAllocations,
  fetchAvailableLots,
  fetchDeliveries,
  fetchOrder,
  fetchOrderInvoices,
  fetchOrderLines,
  fetchPartners,
  fetchTaxRates,
  formatKg,
  formatRupiah,
  issueInvoice,
  lineLabel,
  lotsForLine,
  orderStageLabel,
  orderStep,
  parseAllocation,
  payState,
  releaseAllocation,
  roundKg,
  type Allocation,
  type AvailableLot,
  type Delivery,
  type OrderLine,
  type OrderOverview,
  type TaxRate,
} from "../../lib/pf/sales";
import { OrderEditor } from "./OrdersPage";
import { ActionNote, DataState, ErpPage, Field, PrimaryButton, ReadOnlyNote, SecondaryButton, inputClass, useAction, useErpAccess, useLoad } from "./page";
import { Card, Disclosure, Note, Rows, StepStrip } from "./ui";

// One order from draft to paid, the next step first. Each lot chosen here is what
// later ties the customer to a batch and a seed lot.

const sectionTitle = "text-[16px] font-medium tracking-[-0.02em] text-[#0F2F36]";
const link = "inline-flex min-h-[44px] items-center text-[14px] font-medium text-[#0B6477] hover:underline sm:min-h-[24px]";

type Reload = () => Promise<void>;

function AllocationRow({ a, canSell, reload }: { a: Allocation; canSell: boolean; reload: Reload }) {
  const action = useAction();
  return (
    <li className="flex flex-wrap items-center gap-x-3 border-t border-[#EDF2F2] py-2 text-[14px] first:border-0">
      <span className="min-w-0 flex-1 basis-[180px]">
        <span className="font-medium text-[#0F2F36]">{a.lot_code}</span>
        <span className="tabular-nums text-[#0F2F36]"> · {formatKg(a.qty_kg)}</span>
        <span className="block text-[13px] text-[#4F6B73]">
          Dari <Link to="/erp/batch/$id" params={{ id: a.batch_id }} className="text-[#0B6477] hover:underline">{a.batch_code}</Link>
          {a.best_before ? ` · simpan sampai ${formatLongDate(a.best_before)}` : ""}
          {a.delivery_no ? ` · terkirim ${a.delivery_no}` : ""}
        </span>
      </span>
      {canSell && !a.delivery_id && (
        <button type="button" disabled={action.busy} onClick={() => void action.run(async () => { await releaseAllocation(a.id); await reload(); })} className="min-h-[44px] text-[14px] font-medium text-[#4F6B73] hover:text-[#B3362C] sm:min-h-[24px]">
          {action.busy ? "Melepas..." : "Lepas"}
        </button>
      )}
      <div className="basis-full empty:hidden"><ActionNote action={{ error: action.error, saved: false }} /></div>
    </li>
  );
}

function LineCard({ line, allocations, lots, canSell, open, reload }: { line: OrderLine; allocations: Allocation[]; lots: AvailableLot[]; canSell: boolean; open: boolean; reload: Reload }) {
  const today = jakartaToday();
  const needed = roundKg(line.qty_kg - line.allocated_kg);
  const options = lotsForLine(lots, line, today);
  const [lotId, setLotId] = useState("");
  const chosen = options.find((l) => l.id === lotId) ?? options[0];
  const [kg, setKg] = useState("");
  const action = useAction();
  const suggested = chosen ? Math.min(needed, chosen.remaining_kg) : 0;

  const submit = async () => {
    const parsed = parseAllocation(kg.trim() || String(suggested), line, chosen);
    if (parsed.error !== null) return action.setError(parsed.error);
    const saved = await action.run(async () => {
      await allocate(line.id, chosen!.id, parsed.kg);
      await reload();
    });
    if (saved) setKg("");
  };

  return (
    <div className="rounded-lg border border-[#E3ECED] p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <span className="text-[14px] font-medium text-[#0F2F36]">{lineLabel(line)}</span>
        <span className="text-[13px] tabular-nums text-[#4F6B73]">{formatKg(line.allocated_kg)} dari {formatKg(line.qty_kg)}</span>
      </div>
      {allocations.length > 0 && <ul className="mt-1">{allocations.map((a) => <AllocationRow key={a.id} a={a} canSell={canSell} reload={reload} />)}</ul>}
      {open && canSell && needed > 0 && (
        options.length === 0 ? (
          <p className="mt-2 text-[13px] text-[#4F6B73]">Belum ada lot {line.crop_name} grade {line.grade} yang tersisa. Masih perlu {formatKg(needed)}.</p>
        ) : (
          <form className="mt-2 grid grid-cols-1 items-end gap-2 sm:grid-cols-[minmax(0,1fr)_110px_auto]" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
            <Field label="Lot panen">
              <select className={inputClass} value={chosen?.id ?? ""} onChange={(e) => setLotId(e.target.value)}>
                {options.map((l) => <option key={l.id} value={l.id}>{l.lot_code} · sisa {formatKg(l.remaining_kg)} · {l.batch_code}{l.best_before ? ` · s.d. ${formatLongDate(l.best_before)}` : ""}</option>)}
              </select>
            </Field>
            <Field label="Berat (kg)"><input className={inputClass} inputMode="decimal" value={kg} placeholder={String(suggested).replace(".", ",")} onChange={(e) => setKg(e.target.value)} /></Field>
            <PrimaryButton type="submit" disabled={action.busy}>{action.busy ? "Menyimpan..." : "Pilih lot"}</PrimaryButton>
          </form>
        )
      )}
      <div className="mt-1 empty:hidden"><ActionNote action={{ error: action.error, saved: false }} /></div>
    </div>
  );
}

function DeliveryCard({ order, allocations, deliveries, canSell, reload }: { order: OrderOverview; allocations: Allocation[]; deliveries: Delivery[]; canSell: boolean; reload: Reload }) {
  const today = jakartaToday();
  const ready = allocations.filter((a) => !a.delivery_id);
  const [picked, setPicked] = useState<string[] | null>(null);
  const chosen = picked ?? ready.map((a) => a.id);
  const [deliveredOn, setDeliveredOn] = useState(today);
  const [recipient, setRecipient] = useState("");
  const action = useAction();
  const navigate = useNavigate();
  const shown = deliveries.filter((d) => !d.cancelled_at);

  const submit = async () => {
    if (chosen.length === 0) return action.setError("Pilih minimal satu lot untuk dikirim.");
    let created = "";
    if (await action.run(async () => { created = await createDelivery(order.id, chosen, deliveredOn, recipient, ""); await reload(); })) {
      setPicked(null);
      void navigate({ to: "/erp/pengiriman/$id", params: { id: created } });
    }
  };

  if (ready.length === 0 && shown.length === 0) return null;
  return (
    <Card className="p-4">
      <h2 className={`${sectionTitle} mb-2`}>Pengiriman</h2>
      {shown.length > 0 && (
        <ul className="mb-3">
          {shown.map((d) => <DeliveryRow key={d.id} delivery={d} canSell={canSell} reload={reload} />)}
        </ul>
      )}
      {canSell && ready.length > 0 && order.status === "dikonfirmasi" && (
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
          <fieldset>
            <legend className="mb-1 text-[13px] font-medium text-[#36525A]">Lot yang dikirim</legend>
            {ready.map((a) => (
              <label key={a.id} className="flex min-h-[44px] items-center gap-2 text-[14px] text-[#0F2F36] sm:min-h-[28px]">
                <input type="checkbox" className="h-4 w-4 accent-[#14919B]" checked={chosen.includes(a.id)} onChange={(e) => setPicked(e.target.checked ? [...chosen, a.id] : chosen.filter((x) => x !== a.id))} />
                {a.lot_code} · <span className="tabular-nums">{formatKg(a.qty_kg)}</span>
              </label>
            ))}
          </fieldset>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tanggal kirim"><input type="date" className={inputClass} max={today} value={deliveredOn} onChange={(e) => setDeliveredOn(e.target.value)} /></Field>
            <Field label="Penerima"><input className={inputClass} value={recipient} onChange={(e) => setRecipient(e.target.value)} /></Field>
          </div>
          <ActionNote action={action} />
          <PrimaryButton type="submit" disabled={action.busy}>{action.busy ? "Menyimpan..." : "Buat surat jalan"}</PrimaryButton>
        </form>
      )}
    </Card>
  );
}

function DeliveryRow({ delivery, canSell, reload }: { delivery: Delivery; canSell: boolean; reload: Reload }) {
  const [asking, setAsking] = useState(false);
  const [why, setWhy] = useState("");
  const action = useAction();
  return (
    <li className="border-t border-[#EDF2F2] py-2 first:border-0">
      <div className="flex flex-wrap items-center justify-between gap-x-3 text-[14px]">
        <span>
          <Link to="/erp/pengiriman/$id" params={{ id: delivery.id }} className="inline-flex min-h-[44px] items-center sm:min-h-0 font-medium text-[#0B6477] hover:underline">{delivery.delivery_no}</Link>
          <span className="text-[#4F6B73]"> · {formatLongDate(delivery.delivered_on)}{delivery.recipient ? ` · ${delivery.recipient}` : ""}</span>
        </span>
        {canSell && !asking && <button type="button" onClick={() => setAsking(true)} className="min-h-[44px] text-[14px] font-medium text-[#4F6B73] hover:text-[#B3362C] sm:min-h-[24px]">Batalkan</button>}
      </div>
      {asking && (
        <div className="mt-2 space-y-2 rounded-lg bg-[#FFF6E5] p-2.5">
          <Field label="Kenapa dibatalkan?" hint="Lot kembali menjadi belum terkirim."><input className={inputClass} value={why} onChange={(e) => setWhy(e.target.value)} autoFocus /></Field>
          <ActionNote action={{ error: action.error, saved: false }} />
          <div className="flex flex-wrap gap-2">
            <SecondaryButton disabled={action.busy || !why.trim()} onClick={() => void action.run(async () => { await cancelDelivery(delivery.id, why); await reload(); })}>Ya, batalkan</SecondaryButton>
            <SecondaryButton onClick={() => setAsking(false)}>Tutup</SecondaryButton>
          </div>
        </div>
      )}
    </li>
  );
}

function InvoiceCard({ order, rates, invoices, canSell, reload }: { order: OrderOverview; rates: TaxRate[]; invoices: Awaited<ReturnType<typeof fetchOrderInvoices>>; canSell: boolean; reload: Reload }) {
  const today = jakartaToday();
  const open = roundKg(order.delivered_kg - order.invoiced_kg);
  const active = rates.filter((r) => r.active);
  const [issuedOn, setIssuedOn] = useState(today);
  const [dueOn, setDueOn] = useState(today);
  const [rate, setRate] = useState("");
  const [notes, setNotes] = useState("");
  const action = useAction();
  const navigate = useNavigate();

  const submit = async () => {
    if (dueOn < issuedOn) return action.setError("Tanggal jatuh tempo sebelum tanggal invoice.");
    let created = "";
    if (await action.run(async () => { created = await issueInvoice(order.id, issuedOn, dueOn, rate || null, notes); await reload(); })) {
      void navigate({ to: "/erp/invoice/$id", params: { id: created } });
    }
  };

  if (invoices.length === 0 && open <= 0) return null;
  return (
    <Card className="p-4">
      <h2 className={`${sectionTitle} mb-2`}>Invoice</h2>
      {invoices.length > 0 && (
        <ul className="mb-3">
          {invoices.map((i) => {
            const state = PAY_STATE[payState(i, today)];
            return (
              <li key={i.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-[#EDF2F2] py-2 text-[14px] first:border-0">
                <span>
                  <Link to="/erp/invoice/$id" params={{ id: i.id }} className="inline-flex min-h-[44px] items-center sm:min-h-0 font-medium text-[#0B6477] hover:underline">{i.invoice_no}</Link>
                  <span className="tabular-nums text-[#4F6B73]"> · {formatRupiah(i.total)}</span>
                </span>
                <span className={`rounded-md px-2 py-0.5 text-[12.5px] font-medium ${state.className}`}>{state.label}</span>
              </li>
            );
          })}
        </ul>
      )}
      {canSell && open > 0 && order.status === "dikonfirmasi" && (
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
          <p className="text-[13px] text-[#4F6B73]">Menagih {formatKg(open)} yang sudah terkirim dan belum ditagih.</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tanggal invoice"><input type="date" className={inputClass} value={issuedOn} onChange={(e) => setIssuedOn(e.target.value)} /></Field>
            <Field label="Jatuh tempo"><input type="date" className={inputClass} min={issuedOn} value={dueOn} onChange={(e) => setDueOn(e.target.value)} /></Field>
          </div>
          <Field label="Pajak" hint={active.length ? undefined : "Tarif pajak bisa ditambahkan di halaman Invoice."}>
            <select className={inputClass} value={rate} onChange={(e) => setRate(e.target.value)}>
              <option value="">Tanpa pajak</option>
              {active.map((r) => <option key={r.id} value={r.id}>{r.name} ({r.percent}%)</option>)}
            </select>
          </Field>
          <Field label="Catatan di invoice" hint="Mis. nomor rekening tujuan pembayaran."><textarea className={inputClass} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
          <ActionNote action={action} />
          <PrimaryButton type="submit" disabled={action.busy}>{action.busy ? "Menerbitkan..." : "Terbitkan invoice"}</PrimaryButton>
        </form>
      )}
    </Card>
  );
}

function CancelCard({ order, reload }: { order: OrderOverview; reload: Reload }) {
  const [why, setWhy] = useState("");
  const action = useAction();
  return (
    <Card className="p-4">
      <p className="mb-2 text-[14px] text-[#4F6B73]">Lot yang sudah dipilih kembali ke stok. Nomor pesanan tetap tercatat.</p>
      <div className="space-y-2">
        <Field label="Alasan"><input className={inputClass} value={why} onChange={(e) => setWhy(e.target.value)} /></Field>
        <ActionNote action={{ error: action.error, saved: false }} />
        <SecondaryButton disabled={action.busy || !why.trim()} onClick={() => void action.run(async () => { await cancelOrder(order.id, why); await reload(); })}>{action.busy ? "Membatalkan..." : "Ya, batalkan pesanan"}</SecondaryButton>
      </div>
    </Card>
  );
}

export default function OrderDetailPage({ id }: { id: string }) {
  const state = useLoad(async () => {
    const [order, lines, allocations, lots, deliveries, invoices, rates] = await Promise.all([
      fetchOrder(id), fetchOrderLines(id), fetchAllocations(id), fetchAvailableLots(), fetchDeliveries(id), fetchOrderInvoices(id), fetchTaxRates(),
    ]);
    return { order, lines, allocations, lots, deliveries, invoices, rates };
  }, [id]);
  const editorData = useLoad(async () => {
    const [partners, crops] = await Promise.all([fetchPartners(), fetchCrops()]);
    return { partners, crops };
  });
  const { canSell } = useErpAccess();
  const [editing, setEditing] = useState(false);
  const confirm = useAction();
  const reload = state.reload;

  return (
    <ErpPage
      eyebrow="Penjualan · Pesanan"
      title={state.data ? `${state.data.order.so_no} · ${state.data.order.partner_name}` : "Pesanan"}
      sub={state.data ? orderStageLabel(state.data.order) : undefined}
      actions={<Link to="/erp/pesanan" className="inline-flex min-h-[44px] items-center gap-1 text-[14px] font-medium text-[#0B6477] hover:underline sm:min-h-[24px]"><ArrowLeft className="h-4 w-4" /> Semua pesanan</Link>}
    >
      <DataState state={state}>
        {({ order, lines, allocations, lots, deliveries, invoices, rates }) => {
          const step = orderStep(order);
          const isDraft = order.status === "draf";
          const isOpen = order.status === "dikonfirmasi";
          return (
            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
              <div className="min-w-0 space-y-4">
                {step !== null && <StepStrip steps={ORDER_STEPS} current={step} label="Langkah pesanan" />}
                {!canSell && <ReadOnlyNote who="Staf penjualan" />}
                {order.status === "batal" && <Note tone="warn">Pesanan dibatalkan: {order.cancel_note}</Note>}

                {isDraft && editing && editorData.data ? (
                  <OrderEditor
                    order={order}
                    initialLines={lines.map((l) => ({ cropId: l.crop_id, grade: l.grade, qtyKg: String(l.qty_kg).replace(".", ","), pricePerKg: String(l.price_per_kg) }))}
                    partners={editorData.data.partners}
                    crops={editorData.data.crops}
                    onCancel={() => setEditing(false)}
                    onSaved={() => { setEditing(false); void reload(); }}
                  />
                ) : (
                  <Card className="p-4">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <h2 className={sectionTitle}>{isOpen ? "Pilih lot panen" : "Isi pesanan"}</h2>
                      {isDraft && canSell && <SecondaryButton onClick={() => setEditing(true)}>Ubah</SecondaryButton>}
                    </div>
                    {isOpen && <p className="mb-2 text-[13px] text-[#4F6B73]">Lot terlama tampil lebih dulu. Lot yang dipilih langsung mengurangi stok.</p>}
                    <div className="space-y-2">
                      {lines.map((l) => (
                        isDraft ? (
                          <div key={l.id} className="flex flex-wrap items-baseline justify-between gap-x-3 rounded-lg border border-[#E3ECED] p-3 text-[14px]">
                            <span className="font-medium text-[#0F2F36]">{lineLabel(l)}</span>
                            <span className="tabular-nums text-[#0F2F36]">{formatKg(l.qty_kg)} × {formatRupiah(l.price_per_kg)} = {formatRupiah(l.amount)}</span>
                          </div>
                        ) : (
                          <LineCard key={`${l.id}:${l.allocated_kg}`} line={l} allocations={allocations.filter((a) => a.so_line_id === l.id)} lots={lots} canSell={canSell} open={isOpen} reload={reload} />
                        )
                      ))}
                    </div>
                    {isDraft && canSell && (
                      <div className="mt-3 space-y-2">
                        <ActionNote action={{ error: confirm.error, saved: false }} />
                        <PrimaryButton disabled={confirm.busy} onClick={() => void confirm.run(async () => { await confirmOrder(order.id); await reload(); })}>{confirm.busy ? "Menyimpan..." : "Konfirmasi pesanan"}</PrimaryButton>
                      </div>
                    )}
                  </Card>
                )}

                {order.status !== "draf" && <DeliveryCard key={`d:${allocations.map((a) => a.id).join()}`} order={order} allocations={allocations} deliveries={deliveries} canSell={canSell} reload={reload} />}
                {order.status !== "draf" && <InvoiceCard order={order} rates={rates} invoices={invoices} canSell={canSell} reload={reload} />}
                {canSell && order.status !== "batal" && <Disclosure title="Batalkan pesanan"><CancelCard order={order} reload={reload} /></Disclosure>}
              </div>

              <div className="min-w-0 space-y-4">
                <Card className="p-4">
                  <h2 className={`${sectionTitle} mb-3`}>Ringkasan</h2>
                  <Rows
                    rows={[
                      ["Pelanggan", order.partner_name],
                      ["Dipesan", formatLongDate(order.ordered_on)],
                      ["Diminta", order.requested_on ? formatLongDate(order.requested_on) : "-"],
                      ["Dipesan (kg)", formatKg(order.ordered_kg)],
                      ["Lot dipilih", formatKg(order.allocated_kg)],
                      ["Terkirim", formatKg(order.delivered_kg)],
                      ["Nilai pesanan", formatRupiah(order.amount)],
                      ["Ditagih", formatRupiah(order.invoiced_amount)],
                      ["Dibayar", formatRupiah(order.paid_amount)],
                    ]}
                  />
                  {order.notes && <p className="mt-3 text-[13.5px] text-[#36525A]">{order.notes}</p>}
                </Card>
                {allocations.length > 0 && (
                  <Link to="/erp/telusur" search={{ code: order.so_no }} className={`${link} gap-1.5`}><Search className="h-4 w-4" /> Telusuri sampai lot benih</Link>
                )}
              </div>
            </div>
          );
        }}
      </DataState>
    </ErpPage>
  );
}
