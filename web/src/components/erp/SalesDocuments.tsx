import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Printer } from "lucide-react";
import { A } from "../../lib/assets";
import { jakartaToday } from "../../lib/pf/batch";
import { formatLongDate } from "../../lib/pf/dashboard";
import { useLang, useT } from "../../lib/i18n";
import {
  PAYMENT_METHODS,
  PAY_STATE,
  addPayment,
  fetchAllocations,
  fetchDelivery,
  fetchInvoice,
  fetchInvoiceLines,
  fetchOrder,
  fetchOrderLines,
  fetchPartners,
  fetchPayments,
  formatKg,
  formatRupiah,
  lineLabel,
  parsePayment,
  payState,
  payStateLabel,
  paymentMethodLabel,
  voidInvoice,
  voidPayment,
  type InvoiceOverview,
  type Payment,
  type PaymentMethod,
} from "../../lib/pf/sales";
import { ActionNote, DataState, ErpPage, Field, PrimaryButton, ReadOnlyNote, SecondaryButton, inputClass, useAction, useErpAccess, useLoad } from "./page";
import { Card, Disclosure, Note } from "./ui";

// The two documents that leave the building, an invoice and a delivery note. Each is
// a page that prints as itself: the browser's print dialog saves it as a PDF, and the
// ERP's frame and side panels stay off the paper.

export function PaperHead({ kind, number, children }: { kind: string; number: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#DCE7E8] pb-4">
      <div>
        <img src={A.logoColor} alt="smartagri" className="h-8" />
        <p className="mt-2 text-[13px] leading-[1.45] text-[#36525A]">Smart Agriculture Research Center<br />Universitas Gadjah Mada</p>
      </div>
      <div className="text-right">
        <p className="text-[20px] font-semibold tracking-[-0.025em] text-[#0F2F36]">{kind}</p>
        <p className="text-[14px] tabular-nums text-[#0F2F36]">{number}</p>
        <div className="mt-1 text-[13px] text-[#36525A]">{children}</div>
      </div>
    </div>
  );
}

function PrintButton() {
  const t = useT();
  return <SecondaryButton onClick={() => window.print()}><Printer className="h-4 w-4" /> {t({ en: "Print or save as PDF", id: "Cetak atau simpan sebagai PDF" })}</SecondaryButton>;
}

function BackToOrder({ order }: { order: string }) {
  const t = useT();
  return <Link to="/erp/orders/$id" params={{ id: order }} className="inline-flex min-h-[44px] items-center gap-1 text-[14px] font-medium text-[#0B6477] hover:underline sm:min-h-[24px]"><ArrowLeft className="h-4 w-4" /> {t({ en: "To the order", id: "Ke pesanan" })}</Link>;
}

/* ----------------------------------------------------------------- payments */

function PaymentRow({ payment, canSell, reload }: { payment: Payment; canSell: boolean; reload: () => Promise<void> }) {
  const t = useT();
  const lang = useLang();
  const [asking, setAsking] = useState(false);
  const [why, setWhy] = useState("");
  const action = useAction();
  const voided = !!payment.voided_at;
  return (
    <li className="border-t border-[#EDF2F2] py-2 first:border-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-[14px]">
        <span className={`font-medium tabular-nums ${voided ? "text-[#4F6B73] line-through" : "text-[#0F2F36]"}`}>{formatRupiah(payment.amount, lang)}</span>
        {canSell && !voided && !asking && <button type="button" onClick={() => setAsking(true)} className="min-h-[44px] text-[14px] font-medium text-[#4F6B73] hover:text-[#B3362C] sm:min-h-[24px]">{t({ en: "Cancel", id: "Batalkan" })}</button>}
      </div>
      <p className="text-[13px] text-[#4F6B73]">
        {formatLongDate(payment.paid_on, lang)} · {paymentMethodLabel(payment.method, lang)}{payment.reference ? ` · ${payment.reference}` : ""}
        {voided ? ` · ${t({ en: "cancelled", id: "dibatalkan" })}: ${payment.void_note}` : ""}
      </p>
      {asking && (
        <div className="mt-2 space-y-2 rounded-lg bg-[#FFF6E5] p-2.5">
          <Field label={t({ en: "Why was it cancelled?", id: "Mengapa dibatalkan?" })}><input className={inputClass} value={why} onChange={(e) => setWhy(e.target.value)} autoFocus /></Field>
          <ActionNote action={{ error: action.error, saved: false }} />
          <div className="flex flex-wrap gap-2">
            <SecondaryButton disabled={action.busy || !why.trim()} onClick={() => void action.run(async () => { await voidPayment(payment.id, why); await reload(); })}>{t({ en: "Yes, cancel", id: "Ya, batalkan" })}</SecondaryButton>
            <SecondaryButton onClick={() => setAsking(false)}>{t({ en: "Close", id: "Tutup" })}</SecondaryButton>
          </div>
        </div>
      )}
    </li>
  );
}

function PaymentsCard({ invoice, payments, canSell, reload }: { invoice: InvoiceOverview; payments: Payment[]; canSell: boolean; reload: () => Promise<void> }) {
  const t = useT();
  const lang = useLang();
  const today = jakartaToday();
  const [amount, setAmount] = useState("");
  const [paidOn, setPaidOn] = useState(today);
  const [method, setMethod] = useState<PaymentMethod>("transfer");
  const [reference, setReference] = useState("");
  const action = useAction();
  const ps = payState(invoice, today);
  const state = { className: PAY_STATE[ps].className, label: payStateLabel(ps, lang) };

  const submit = async () => {
    const parsed = parsePayment(amount, paidOn, invoice.balance, today, lang);
    if (parsed.error !== null) return action.setError(parsed.error);
    const saved = await action.run(async () => {
      await addPayment(invoice.id, paidOn, parsed.amount, method, reference);
      await reload();
    });
    if (saved) {
      setAmount("");
      setReference("");
    }
  };

  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-[16px] font-medium tracking-[-0.02em] text-[#0F2F36]">{t({ en: "Payment", id: "Pembayaran" })}</h2>
        <span className={`rounded-md px-2 py-0.5 text-[12.5px] font-medium ${state.className}`}>{state.label}</span>
      </div>
      <p className="mb-2 text-[14px] text-[#4F6B73]">{t({ en: "Left", id: "Sisa" })} <span className="font-medium tabular-nums text-[#0F2F36]">{formatRupiah(invoice.status === "batal" ? 0 : invoice.balance, lang)}</span></p>
      {payments.length > 0 && <ul className="mb-3">{payments.map((p) => <PaymentRow key={p.id} payment={p} canSell={canSell} reload={reload} />)}</ul>}
      {canSell && invoice.status === "terbit" && invoice.balance > 0 && (
        <form className="space-y-3 border-t border-[#EDF2F2] pt-3" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t({ en: "Amount (Rp)", id: "Jumlah (Rp)" })}><input className={inputClass} inputMode="numeric" value={amount} placeholder={invoice.balance.toLocaleString(lang === "id" ? "id-ID" : "en-GB")} onChange={(e) => setAmount(e.target.value)} /></Field>
            <Field label={t({ en: "Payment date", id: "Tanggal bayar" })}><input type="date" className={inputClass} max={today} value={paidOn} onChange={(e) => setPaidOn(e.target.value)} /></Field>
            <Field label={t({ en: "Payment method", id: "Metode bayar" })}>
              <select className={inputClass} value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
                {PAYMENT_METHODS.map((m) => <option key={m.key} value={m.key}>{paymentMethodLabel(m.key, lang)}</option>)}
              </select>
            </Field>
            <Field label={t({ en: "Reference", id: "Referensi" })}><input className={inputClass} value={reference} onChange={(e) => setReference(e.target.value)} /></Field>
          </div>
          <ActionNote action={action} />
          <PrimaryButton type="submit" disabled={action.busy}>{action.busy ? t({ en: "Saving…", id: "Menyimpan…" }) : t({ en: "Record payment", id: "Catat pembayaran" })}</PrimaryButton>
        </form>
      )}
    </Card>
  );
}

function VoidInvoice({ invoice, reload }: { invoice: InvoiceOverview; reload: () => Promise<void> }) {
  const t = useT();
  const [why, setWhy] = useState("");
  const action = useAction();
  return (
    <Card className="p-4">
      <p className="mb-2 text-[14px] text-[#4F6B73]">{t({ en: "An issued invoice cannot be changed. Cancel it, then issue a new one from the order page. Its number is not used again.", id: "Invoice yang sudah terbit tidak bisa diubah. Batalkan, lalu terbitkan yang baru dari halaman pesanan. Nomornya tidak dipakai lagi." })}</p>
      <div className="space-y-2">
        <Field label={t({ en: "Reason", id: "Alasan" })}><input className={inputClass} value={why} onChange={(e) => setWhy(e.target.value)} /></Field>
        <ActionNote action={{ error: action.error, saved: false }} />
        <SecondaryButton disabled={action.busy || !why.trim()} onClick={() => void action.run(async () => { await voidInvoice(invoice.id, why); await reload(); })}>{action.busy ? t({ en: "Cancelling…", id: "Membatalkan…" }) : t({ en: "Yes, cancel invoice", id: "Ya, batalkan invoice" })}</SecondaryButton>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ invoice */

export function InvoiceDetailPage({ id }: { id: string }) {
  const state = useLoad(async () => {
    const [invoice, lines, payments] = await Promise.all([fetchInvoice(id), fetchInvoiceLines(id), fetchPayments(id)]);
    return { invoice, lines, payments };
  }, [id]);
  const { canSell } = useErpAccess();
  const t = useT();
  const lang = useLang();

  return (
    <ErpPage
      eyebrow={t({ en: "Sales · Invoice", id: "Penjualan · Invoice" })}
      title={state.data?.invoice.invoice_no ?? "Invoice"}
      sub={state.data?.invoice.partner_name}
      actions={state.data ? <div className="flex flex-wrap items-center gap-3 print:hidden"><BackToOrder order={state.data.invoice.sales_order_id} /><PrintButton /></div> : undefined}
    >
      <DataState state={state}>
        {({ invoice, lines, payments }) => (
          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px] print:block">
            <div className="min-w-0 space-y-3">
              {!canSell && <div className="print:hidden"><ReadOnlyNote who={t({ en: "Sales staff", id: "Staf penjualan" })} /></div>}
              {invoice.status === "batal" && <Note tone="warn">{t({ en: "Invoice cancelled", id: "Invoice dibatalkan" })}: {invoice.void_note}</Note>}
              <Card className="p-5 sm:p-8 print:border-0 print:p-0">
                <PaperHead kind="INVOICE" number={invoice.invoice_no}>
                  {t({ en: "Date", id: "Tanggal" })} {formatLongDate(invoice.issued_on, lang)}<br />{t({ en: "Due", id: "Jatuh tempo" })} {formatLongDate(invoice.due_on, lang)}
                </PaperHead>
                <div className="grid grid-cols-1 gap-3 py-4 text-[14px] sm:grid-cols-2">
                  <div>
                    <p className="text-[13px] text-[#4F6B73]">{t({ en: "To", id: "Kepada" })}</p>
                    <p className="font-medium text-[#0F2F36]">{invoice.partner_name}</p>
                    {invoice.partner_address && <p className="whitespace-pre-line text-[#36525A]">{invoice.partner_address}</p>}
                    {invoice.partner_tax_id && <p className="text-[#36525A]">{t({ en: "Tax ID", id: "NPWP" })} {invoice.partner_tax_id}</p>}
                  </div>
                  <div className="sm:text-right">
                    <p className="text-[13px] text-[#4F6B73]">{t({ en: "Orders", id: "Pesanan" })}</p>
                    <p className="text-[#0F2F36]">{invoice.so_no}</p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[440px] text-left text-[14px]">
                    <thead className="text-[13px] text-[#4F6B73]">
                      <tr className="border-b border-[#DCE7E8]">
                        <th className="pb-2 font-medium">{t({ en: "Description", id: "Uraian" })}</th>
                        <th className="pb-2 pl-3 text-right font-medium">{t({ en: "Weight", id: "Berat" })}</th>
                        <th className="pb-2 pl-3 text-right font-medium">{t({ en: "Price per kg", id: "Harga per kg" })}</th>
                        <th className="pb-2 pl-3 text-right font-medium">{t({ en: "Quantity", id: "Jumlah" })}</th>
                      </tr>
                    </thead>
                    <tbody className="text-[#0F2F36]">
                      {lines.map((l) => (
                        <tr key={l.id} className="border-b border-[#EDF2F2]">
                          <td className="py-2">{l.description}</td>
                          <td className="py-2 pl-3 text-right tabular-nums">{formatKg(l.qty_kg, lang)}</td>
                          <td className="py-2 pl-3 text-right tabular-nums">{formatRupiah(l.price_per_kg, lang)}</td>
                          <td className="py-2 pl-3 text-right tabular-nums">{formatRupiah(l.amount, lang)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <dl className="ml-auto mt-3 max-w-[300px] space-y-1 text-[14px]">
                  <div className="flex justify-between gap-4"><dt className="text-[#4F6B73]">Subtotal</dt><dd className="tabular-nums text-[#0F2F36]">{formatRupiah(invoice.subtotal, lang)}</dd></div>
                  {invoice.tax_name && <div className="flex justify-between gap-4"><dt className="text-[#4F6B73]">{invoice.tax_name} ({invoice.tax_percent.toLocaleString(lang === "id" ? "id-ID" : "en-GB")}%)</dt><dd className="tabular-nums text-[#0F2F36]">{formatRupiah(invoice.tax_amount, lang)}</dd></div>}
                  <div className="flex justify-between gap-4 border-t border-[#DCE7E8] pt-1 font-semibold text-[#0F2F36]"><dt>Total</dt><dd className="tabular-nums">{formatRupiah(invoice.total, lang)}</dd></div>
                </dl>
                {invoice.notes && <p className="mt-4 whitespace-pre-line text-[13.5px] text-[#36525A]">{invoice.notes}</p>}
              </Card>
            </div>
            <div className="min-w-0 space-y-4 print:hidden">
              <PaymentsCard invoice={invoice} payments={payments} canSell={canSell} reload={state.reload} />
              {canSell && invoice.status === "terbit" && <Disclosure title={t({ en: "Cancel invoice", id: "Batalkan invoice" })}><VoidInvoice invoice={invoice} reload={state.reload} /></Disclosure>}
            </div>
          </div>
        )}
      </DataState>
    </ErpPage>
  );
}

/* ------------------------------------------------------------ delivery note */

export function DeliveryNotePage({ id }: { id: string }) {
  const state = useLoad(async () => {
    const delivery = await fetchDelivery(id);
    const [order, lines, allocations, partners] = await Promise.all([fetchOrder(delivery.sales_order_id), fetchOrderLines(delivery.sales_order_id), fetchAllocations(delivery.sales_order_id), fetchPartners()]);
    return { delivery, order, lines, allocations: allocations.filter((a) => a.delivery_id === id), partner: partners.find((p) => p.id === order.partner_id) };
  }, [id]);
  const t = useT();
  const lang = useLang();

  return (
    <ErpPage
      eyebrow={t({ en: "Sales · Delivery note", id: "Penjualan · Surat jalan" })}
      title={state.data?.delivery.delivery_no ?? t({ en: "Delivery note", id: "Surat jalan" })}
      sub={state.data?.order.partner_name}
      actions={state.data ? <div className="flex flex-wrap items-center gap-3 print:hidden"><BackToOrder order={state.data.delivery.sales_order_id} /><PrintButton /></div> : undefined}
    >
      <DataState state={state}>
        {({ delivery, order, lines, allocations, partner }) => (
          <div className="mx-auto max-w-[820px] space-y-3">
            {delivery.cancelled_at && <Note tone="warn">{t({ en: "Delivery cancelled", id: "Pengiriman dibatalkan" })}: {delivery.cancel_note}</Note>}
            <Card className="p-5 sm:p-8 print:border-0 print:p-0">
              <PaperHead kind={t({ en: "DELIVERY NOTE", id: "SURAT JALAN" })} number={delivery.delivery_no}>{t({ en: "Date", id: "Tanggal" })} {formatLongDate(delivery.delivered_on, lang)}<br />{t({ en: "Order", id: "Pesanan" })} {order.so_no}</PaperHead>
              <div className="py-4 text-[14px]">
                <p className="text-[13px] text-[#4F6B73]">{t({ en: "To", id: "Kepada" })}</p>
                <p className="font-medium text-[#0F2F36]">{order.partner_name}</p>
                {partner?.address && <p className="whitespace-pre-line text-[#36525A]">{partner.address}</p>}
                {partner?.phone && <p className="text-[#36525A]">{partner.phone}</p>}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] text-left text-[14px]">
                  <thead className="text-[13px] text-[#4F6B73]">
                    <tr className="border-b border-[#DCE7E8]">
                      <th className="pb-2 font-medium">{t({ en: "Item", id: "Barang" })}</th>
                      <th className="pb-2 pl-3 font-medium">{t({ en: "Harvest lots", id: "Lot panen" })}</th>
                      <th className="pb-2 pl-3 font-medium">{t({ en: "Keep until", id: "Simpan sampai" })}</th>
                      <th className="pb-2 pl-3 text-right font-medium">{t({ en: "Weight", id: "Berat" })}</th>
                    </tr>
                  </thead>
                  <tbody className="text-[#0F2F36]">
                    {allocations.map((a) => {
                      const line = lines.find((l) => l.id === a.so_line_id);
                      return (
                        <tr key={a.id} className="border-b border-[#EDF2F2]">
                          <td className="py-2">{line ? lineLabel(line) : "-"}</td>
                          <td className="py-2 pl-3">{a.lot_code}</td>
                          <td className="py-2 pl-3">{a.best_before ? formatLongDate(a.best_before, lang) : "-"}</td>
                          <td className="py-2 pl-3 text-right tabular-nums">{formatKg(a.qty_kg, lang)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {delivery.notes && <p className="mt-3 text-[13.5px] text-[#36525A]">{delivery.notes}</p>}
              <div className="mt-10 grid grid-cols-2 gap-8 text-center text-[13px] text-[#36525A]">
                <div><p>{t({ en: "Sender", id: "Pengirim" })}</p><div className="mt-16 border-t border-[#9DB2B6]" /></div>
                <div><p>{t({ en: "Recipient", id: "Penerima" })}{delivery.recipient ? `: ${delivery.recipient}` : ""}</p><div className="mt-16 border-t border-[#9DB2B6]" /></div>
              </div>
            </Card>
          </div>
        )}
      </DataState>
    </ErpPage>
  );
}
