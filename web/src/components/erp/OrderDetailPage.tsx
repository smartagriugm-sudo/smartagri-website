import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Search } from "lucide-react";
import { jakartaToday } from "../../lib/pf/batch";
import { formatLongDate } from "../../lib/pf/dashboard";
import { useLang, useT } from "../../lib/i18n";
import { fetchCrops } from "../../lib/pf/foundation";
import {
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
  orderSteps,
  parseAllocation,
  payState,
  payStateLabel,
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
  const t = useT();
  const lang = useLang();
  const action = useAction();
  return (
    <li className="flex flex-wrap items-center gap-x-3 border-t border-[#EDF2F2] py-2 text-[14px] first:border-0">
      <span className="min-w-0 flex-1 basis-[180px]">
        <span className="font-medium text-[#0F2F36]">{a.lot_code}</span>
        <span className="tabular-nums text-[#0F2F36]"> · {formatKg(a.qty_kg, lang)}</span>
        <span className="block text-[13px] text-[#4F6B73]">
          {t({ en: "From", id: "Dari" })} <Link to="/erp/batch/$id" params={{ id: a.batch_id }} className="text-[#0B6477] hover:underline">{a.batch_code}</Link>
          {a.best_before ? ` · ${t({ en: "keep until", id: "simpan sampai" })} ${formatLongDate(a.best_before, lang)}` : ""}
          {a.delivery_no ? ` · ${t({ en: "delivered", id: "dikirim" })} ${a.delivery_no}` : ""}
        </span>
      </span>
      {canSell && !a.delivery_id && (
        <button type="button" disabled={action.busy} onClick={() => void action.run(async () => { await releaseAllocation(a.id); await reload(); })} className="min-h-[44px] text-[14px] font-medium text-[#4F6B73] hover:text-[#B3362C] sm:min-h-[24px]">
          {action.busy ? t({ en: "Releasing…", id: "Melepas…" }) : t({ en: "Release", id: "Lepas" })}
        </button>
      )}
      <div className="basis-full empty:hidden"><ActionNote action={{ error: action.error, saved: false }} /></div>
    </li>
  );
}

function LineCard({ line, allocations, lots, canSell, open, reload }: { line: OrderLine; allocations: Allocation[]; lots: AvailableLot[]; canSell: boolean; open: boolean; reload: Reload }) {
  const t = useT();
  const lang = useLang();
  const today = jakartaToday();
  const needed = roundKg(line.qty_kg - line.allocated_kg);
  const options = lotsForLine(lots, line, today);
  const [lotId, setLotId] = useState("");
  const chosen = options.find((l) => l.id === lotId) ?? options[0];
  const [kg, setKg] = useState("");
  const action = useAction();
  const suggested = chosen ? Math.min(needed, chosen.remaining_kg) : 0;

  const submit = async () => {
    const parsed = parseAllocation(kg.trim() || String(suggested), line, chosen, lang);
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
        <span className="text-[13px] tabular-nums text-[#4F6B73]">{formatKg(line.allocated_kg, lang)} {t({ en: "of", id: "dari" })} {formatKg(line.qty_kg, lang)}</span>
      </div>
      {allocations.length > 0 && <ul className="mt-1">{allocations.map((a) => <AllocationRow key={a.id} a={a} canSell={canSell} reload={reload} />)}</ul>}
      {open && canSell && needed > 0 && (
        options.length === 0 ? (
          <p className="mt-2 text-[13px] text-[#4F6B73]">{t({ en: `No lots yet for ${line.crop_name} grade ${line.grade} left. Still needs ${formatKg(needed)}.`, id: `Belum ada lot tersisa untuk ${line.crop_name} grade ${line.grade}. Masih kurang ${formatKg(needed, lang)}.` })}</p>
        ) : (
          <form className="mt-2 grid grid-cols-1 items-end gap-2 sm:grid-cols-[minmax(0,1fr)_110px_auto]" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
            <Field label={t({ en: "Harvest lot", id: "Lot panen" })}>
              <select className={inputClass} value={chosen?.id ?? ""} onChange={(e) => setLotId(e.target.value)}>
                {options.map((l) => <option key={l.id} value={l.id}>{l.lot_code} · {t({ en: "left", id: "sisa" })} {formatKg(l.remaining_kg, lang)} · {l.batch_code}{l.best_before ? ` · ${t({ en: "until", id: "s.d." })} ${formatLongDate(l.best_before, lang)}` : ""}</option>)}
              </select>
            </Field>
            <Field label={t({ en: "Weight (kg)", id: "Berat (kg)" })}><input className={inputClass} inputMode="decimal" value={kg} placeholder={String(suggested).replace(".", ",")} onChange={(e) => setKg(e.target.value)} /></Field>
            <PrimaryButton type="submit" disabled={action.busy}>{action.busy ? t({ en: "Saving…", id: "Menyimpan…" }) : t({ en: "Choose lots", id: "Pilih lot" })}</PrimaryButton>
          </form>
        )
      )}
      <div className="mt-1 empty:hidden"><ActionNote action={{ error: action.error, saved: false }} /></div>
    </div>
  );
}

function DeliveryCard({ order, allocations, deliveries, canSell, reload }: { order: OrderOverview; allocations: Allocation[]; deliveries: Delivery[]; canSell: boolean; reload: Reload }) {
  const t = useT();
  const lang = useLang();
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
    if (chosen.length === 0) return action.setError(t({ en: "Choose at least one lot to send.", id: "Pilih minimal satu lot untuk dikirim." }));
    let created = "";
    if (await action.run(async () => { created = await createDelivery(order.id, chosen, deliveredOn, recipient, ""); await reload(); })) {
      setPicked(null);
      void navigate({ to: "/erp/deliveries/$id", params: { id: created } });
    }
  };

  if (ready.length === 0 && shown.length === 0) return null;
  return (
    <Card className="p-4">
      <h2 className={`${sectionTitle} mb-2`}>{t({ en: "Delivery", id: "Pengiriman" })}</h2>
      {shown.length > 0 && (
        <ul className="mb-3">
          {shown.map((d) => <DeliveryRow key={d.id} delivery={d} canSell={canSell} reload={reload} />)}
        </ul>
      )}
      {canSell && ready.length > 0 && order.status === "dikonfirmasi" && (
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
          <fieldset>
            <legend className="mb-1 text-[13px] font-medium text-[#36525A]">{t({ en: "Lots delivered", id: "Lot yang dikirim" })}</legend>
            {ready.map((a) => (
              <label key={a.id} className="flex min-h-[44px] items-center gap-2 text-[14px] text-[#0F2F36] sm:min-h-[28px]">
                <input type="checkbox" className="h-4 w-4 accent-[#14919B]" checked={chosen.includes(a.id)} onChange={(e) => setPicked(e.target.checked ? [...chosen, a.id] : chosen.filter((x) => x !== a.id))} />
                {a.lot_code} · <span className="tabular-nums">{formatKg(a.qty_kg, lang)}</span>
              </label>
            ))}
          </fieldset>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t({ en: "Delivery date", id: "Tanggal kirim" })}><input type="date" className={inputClass} max={today} value={deliveredOn} onChange={(e) => setDeliveredOn(e.target.value)} /></Field>
            <Field label={t({ en: "Recipient", id: "Penerima" })}><input className={inputClass} value={recipient} onChange={(e) => setRecipient(e.target.value)} /></Field>
          </div>
          <ActionNote action={action} />
          <PrimaryButton type="submit" disabled={action.busy}>{action.busy ? t({ en: "Saving…", id: "Menyimpan…" }) : t({ en: "Create delivery note", id: "Buat surat jalan" })}</PrimaryButton>
        </form>
      )}
    </Card>
  );
}

function DeliveryRow({ delivery, canSell, reload }: { delivery: Delivery; canSell: boolean; reload: Reload }) {
  const t = useT();
  const lang = useLang();
  const [asking, setAsking] = useState(false);
  const [why, setWhy] = useState("");
  const action = useAction();
  return (
    <li className="border-t border-[#EDF2F2] py-2 first:border-0">
      <div className="flex flex-wrap items-center justify-between gap-x-3 text-[14px]">
        <span>
          <Link to="/erp/deliveries/$id" params={{ id: delivery.id }} className="inline-flex min-h-[44px] items-center sm:min-h-0 font-medium text-[#0B6477] hover:underline">{delivery.delivery_no}</Link>
          <span className="text-[#4F6B73]"> · {formatLongDate(delivery.delivered_on, lang)}{delivery.recipient ? ` · ${delivery.recipient}` : ""}</span>
        </span>
        {canSell && !asking && <button type="button" onClick={() => setAsking(true)} className="min-h-[44px] text-[14px] font-medium text-[#4F6B73] hover:text-[#B3362C] sm:min-h-[24px]">{t({ en: "Cancel", id: "Batalkan" })}</button>}
      </div>
      {asking && (
        <div className="mt-2 space-y-2 rounded-lg bg-[#FFF6E5] p-2.5">
          <Field label={t({ en: "Why was it cancelled?", id: "Mengapa dibatalkan?" })} hint={t({ en: "The lots go back to not delivered.", id: "Lot kembali berstatus belum dikirim." })}><input className={inputClass} value={why} onChange={(e) => setWhy(e.target.value)} autoFocus /></Field>
          <ActionNote action={{ error: action.error, saved: false }} />
          <div className="flex flex-wrap gap-2">
            <SecondaryButton disabled={action.busy || !why.trim()} onClick={() => void action.run(async () => { await cancelDelivery(delivery.id, why); await reload(); })}>{t({ en: "Yes, cancel", id: "Ya, batalkan" })}</SecondaryButton>
            <SecondaryButton onClick={() => setAsking(false)}>{t({ en: "Close", id: "Tutup" })}</SecondaryButton>
          </div>
        </div>
      )}
    </li>
  );
}

function InvoiceCard({ order, rates, invoices, canSell, reload }: { order: OrderOverview; rates: TaxRate[]; invoices: Awaited<ReturnType<typeof fetchOrderInvoices>>; canSell: boolean; reload: Reload }) {
  const t = useT();
  const lang = useLang();
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
    if (dueOn < issuedOn) return action.setError(t({ en: "The due date is before the invoice date.", id: "Jatuh tempo lebih awal dari tanggal invoice." }));
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
            const ps = payState(i, today);
            const state = { className: PAY_STATE[ps].className, label: payStateLabel(ps, lang) };
            return (
              <li key={i.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-[#EDF2F2] py-2 text-[14px] first:border-0">
                <span>
                  <Link to="/erp/invoice/$id" params={{ id: i.id }} className="inline-flex min-h-[44px] items-center sm:min-h-0 font-medium text-[#0B6477] hover:underline">{i.invoice_no}</Link>
                  <span className="tabular-nums text-[#4F6B73]"> · {formatRupiah(i.total, lang)}</span>
                </span>
                <span className={`rounded-md px-2 py-0.5 text-[12.5px] font-medium ${state.className}`}>{state.label}</span>
              </li>
            );
          })}
        </ul>
      )}
      {canSell && open > 0 && order.status === "dikonfirmasi" && (
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
          <p className="text-[13px] text-[#4F6B73]">{t({ en: `Bills ${formatKg(open)} already delivered and not yet invoiced.`, id: `Menagih ${formatKg(open, lang)} yang sudah dikirim dan belum diinvoice.` })}</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t({ en: "Invoice date", id: "Tanggal invoice" })}><input type="date" className={inputClass} value={issuedOn} onChange={(e) => setIssuedOn(e.target.value)} /></Field>
            <Field label={t({ en: "Due date", id: "Jatuh tempo" })}><input type="date" className={inputClass} min={issuedOn} value={dueOn} onChange={(e) => setDueOn(e.target.value)} /></Field>
          </div>
          <Field label={t({ en: "Tax", id: "Pajak" })} hint={active.length ? undefined : t({ en: "Tax rates can be added on the Invoice page.", id: "Tarif pajak bisa ditambahkan di halaman Invoice." })}>
            <select className={inputClass} value={rate} onChange={(e) => setRate(e.target.value)}>
              <option value="">{t({ en: "No tax", id: "Tanpa pajak" })}</option>
              {active.map((r) => <option key={r.id} value={r.id}>{r.name} ({r.percent}%)</option>)}
            </select>
          </Field>
          <Field label={t({ en: "Notes on the invoice", id: "Catatan di invoice" })} hint={t({ en: "For example, the bank account for payment.", id: "Misalnya, rekening bank untuk pembayaran." })}><textarea className={inputClass} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
          <ActionNote action={action} />
          <PrimaryButton type="submit" disabled={action.busy}>{action.busy ? t({ en: "Issuing…", id: "Menerbitkan…" }) : t({ en: "Issue invoice", id: "Terbitkan invoice" })}</PrimaryButton>
        </form>
      )}
    </Card>
  );
}

function CancelCard({ order, reload }: { order: OrderOverview; reload: Reload }) {
  const t = useT();
  const [why, setWhy] = useState("");
  const action = useAction();
  return (
    <Card className="p-4">
      <p className="mb-2 text-[14px] text-[#4F6B73]">{t({ en: "Chosen lots return to stock. The order number stays on record.", id: "Lot yang dipilih kembali ke stok. Nomor pesanan tetap tercatat." })}</p>
      <div className="space-y-2">
        <Field label={t({ en: "Reason", id: "Alasan" })}><input className={inputClass} value={why} onChange={(e) => setWhy(e.target.value)} /></Field>
        <ActionNote action={{ error: action.error, saved: false }} />
        <SecondaryButton disabled={action.busy || !why.trim()} onClick={() => void action.run(async () => { await cancelOrder(order.id, why); await reload(); })}>{action.busy ? t({ en: "Cancelling…", id: "Membatalkan…" }) : t({ en: "Yes, cancel order", id: "Ya, batalkan pesanan" })}</SecondaryButton>
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
  const t = useT();
  const lang = useLang();

  return (
    <ErpPage
      eyebrow={t({ en: "Sales · Orders", id: "Penjualan · Pesanan" })}
      title={state.data ? `${state.data.order.so_no} · ${state.data.order.partner_name}` : t({ en: "Order", id: "Pesanan" })}
      sub={state.data ? orderStageLabel(state.data.order, lang) : undefined}
      actions={<Link to="/erp/orders" className="inline-flex min-h-[44px] items-center gap-1 text-[14px] font-medium text-[#0B6477] hover:underline sm:min-h-[24px]"><ArrowLeft className="h-4 w-4" /> {t({ en: "All orders", id: "Semua pesanan" })}</Link>}
    >
      <DataState state={state}>
        {({ order, lines, allocations, lots, deliveries, invoices, rates }) => {
          const step = orderStep(order);
          const isDraft = order.status === "draf";
          const isOpen = order.status === "dikonfirmasi";
          return (
            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
              <div className="min-w-0 space-y-4">
                {step !== null && <StepStrip steps={orderSteps(lang)} current={step} label={t({ en: "Order steps", id: "Tahap pesanan" })} />}
                {!canSell && <ReadOnlyNote who={t({ en: "Sales staff", id: "Staf penjualan" })} />}
                {order.status === "batal" && <Note tone="warn">{t({ en: "Order cancelled", id: "Pesanan dibatalkan" })}: {order.cancel_note}</Note>}

                {isDraft && editing && editorData.data ? (
                  <OrderEditor
                    order={order}
                    initialLines={lines.map((l) => ({ cropId: l.crop_id, grade: l.grade, qtyKg: String(l.qty_kg), pricePerKg: String(l.price_per_kg) }))}
                    partners={editorData.data.partners}
                    crops={editorData.data.crops}
                    onCancel={() => setEditing(false)}
                    onSaved={() => { setEditing(false); void reload(); }}
                  />
                ) : (
                  <Card className="p-4">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <h2 className={sectionTitle}>{isOpen ? t({ en: "Choose harvest lots", id: "Pilih lot panen" }) : t({ en: "Order contents", id: "Isi pesanan" })}</h2>
                      {isDraft && canSell && <SecondaryButton onClick={() => setEditing(true)}>{t({ en: "Edit", id: "Ubah" })}</SecondaryButton>}
                    </div>
                    {isOpen && <p className="mb-2 text-[13px] text-[#4F6B73]">{t({ en: "The oldest lot comes first. A chosen lot reduces stock straight away.", id: "Lot tertua didahulukan. Lot yang dipilih langsung mengurangi stok." })}</p>}
                    <div className="space-y-2">
                      {lines.map((l) => (
                        isDraft ? (
                          <div key={l.id} className="flex flex-wrap items-baseline justify-between gap-x-3 rounded-lg border border-[#E3ECED] p-3 text-[14px]">
                            <span className="font-medium text-[#0F2F36]">{lineLabel(l)}</span>
                            <span className="tabular-nums text-[#0F2F36]">{formatKg(l.qty_kg, lang)} × {formatRupiah(l.price_per_kg, lang)} = {formatRupiah(l.amount, lang)}</span>
                          </div>
                        ) : (
                          <LineCard key={`${l.id}:${l.allocated_kg}`} line={l} allocations={allocations.filter((a) => a.so_line_id === l.id)} lots={lots} canSell={canSell} open={isOpen} reload={reload} />
                        )
                      ))}
                    </div>
                    {isDraft && canSell && (
                      <div className="mt-3 space-y-2">
                        <ActionNote action={{ error: confirm.error, saved: false }} />
                        <PrimaryButton disabled={confirm.busy} onClick={() => void confirm.run(async () => { await confirmOrder(order.id); await reload(); })}>{confirm.busy ? t({ en: "Saving…", id: "Menyimpan…" }) : t({ en: "Order confirmation", id: "Konfirmasi pesanan" })}</PrimaryButton>
                      </div>
                    )}
                  </Card>
                )}

                {order.status !== "draf" && <DeliveryCard key={`d:${allocations.map((a) => a.id).join()}`} order={order} allocations={allocations} deliveries={deliveries} canSell={canSell} reload={reload} />}
                {order.status !== "draf" && <InvoiceCard order={order} rates={rates} invoices={invoices} canSell={canSell} reload={reload} />}
                {canSell && order.status !== "batal" && <Disclosure title={t({ en: "Cancel order", id: "Batalkan pesanan" })}><CancelCard order={order} reload={reload} /></Disclosure>}
              </div>

              <div className="min-w-0 space-y-4">
                <Card className="p-4">
                  <h2 className={`${sectionTitle} mb-3`}>{t({ en: "Overview", id: "Ringkasan" })}</h2>
                  <Rows
                    rows={[
                      [t({ en: "Customer", id: "Pelanggan" }), order.partner_name],
                      [t({ en: "Ordered", id: "Dipesan" }), formatLongDate(order.ordered_on, lang)],
                      [t({ en: "Requested", id: "Diminta" }), order.requested_on ? formatLongDate(order.requested_on, lang) : "-"],
                      [t({ en: "Ordered (kg)", id: "Dipesan (kg)" }), formatKg(order.ordered_kg, lang)],
                      [t({ en: "Lots chosen", id: "Lot dipilih" }), formatKg(order.allocated_kg, lang)],
                      [t({ en: "Delivered", id: "Dikirim" }), formatKg(order.delivered_kg, lang)],
                      [t({ en: "Order value", id: "Nilai pesanan" }), formatRupiah(order.amount, lang)],
                      [t({ en: "Invoiced", id: "Diinvoice" }), formatRupiah(order.invoiced_amount, lang)],
                      [t({ en: "Paid", id: "Dibayar" }), formatRupiah(order.paid_amount, lang)],
                    ]}
                  />
                  {order.notes && <p className="mt-3 text-[13.5px] text-[#36525A]">{order.notes}</p>}
                </Card>
                {allocations.length > 0 && (
                  <Link to="/erp/trace" search={{ code: order.so_no }} className={`${link} gap-1.5`}><Search className="h-4 w-4" /> {t({ en: "Trace back to the seed lot", id: "Telusur sampai lot benih" })}</Link>
                )}
              </div>
            </div>
          );
        }}
      </DataState>
    </ErpPage>
  );
}
