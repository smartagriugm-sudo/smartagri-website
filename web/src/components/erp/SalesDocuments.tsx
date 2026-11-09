import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Printer } from "lucide-react";
import { A } from "../../lib/assets";
import { jakartaToday } from "../../lib/pf/batch";
import { formatLongDate } from "../../lib/pf/dashboard";
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
  return <SecondaryButton onClick={() => window.print()}><Printer className="h-4 w-4" /> Print or save as PDF</SecondaryButton>;
}

function BackToOrder({ order }: { order: string }) {
  return <Link to="/erp/orders/$id" params={{ id: order }} className="inline-flex min-h-[44px] items-center gap-1 text-[14px] font-medium text-[#0B6477] hover:underline sm:min-h-[24px]"><ArrowLeft className="h-4 w-4" /> To the order</Link>;
}

/* ----------------------------------------------------------------- payments */

function PaymentRow({ payment, canSell, reload }: { payment: Payment; canSell: boolean; reload: () => Promise<void> }) {
  const [asking, setAsking] = useState(false);
  const [why, setWhy] = useState("");
  const action = useAction();
  const voided = !!payment.voided_at;
  return (
    <li className="border-t border-[#EDF2F2] py-2 first:border-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-[14px]">
        <span className={`font-medium tabular-nums ${voided ? "text-[#4F6B73] line-through" : "text-[#0F2F36]"}`}>{formatRupiah(payment.amount)}</span>
        {canSell && !voided && !asking && <button type="button" onClick={() => setAsking(true)} className="min-h-[44px] text-[14px] font-medium text-[#4F6B73] hover:text-[#B3362C] sm:min-h-[24px]">Cancel</button>}
      </div>
      <p className="text-[13px] text-[#4F6B73]">
        {formatLongDate(payment.paid_on)} · {PAYMENT_METHODS.find((m) => m.key === payment.method)?.label}{payment.reference ? ` · ${payment.reference}` : ""}
        {voided ? ` · cancelled: ${payment.void_note}` : ""}
      </p>
      {asking && (
        <div className="mt-2 space-y-2 rounded-lg bg-[#FFF6E5] p-2.5">
          <Field label="Why was it cancelled?"><input className={inputClass} value={why} onChange={(e) => setWhy(e.target.value)} autoFocus /></Field>
          <ActionNote action={{ error: action.error, saved: false }} />
          <div className="flex flex-wrap gap-2">
            <SecondaryButton disabled={action.busy || !why.trim()} onClick={() => void action.run(async () => { await voidPayment(payment.id, why); await reload(); })}>Yes, cancel</SecondaryButton>
            <SecondaryButton onClick={() => setAsking(false)}>Close</SecondaryButton>
          </div>
        </div>
      )}
    </li>
  );
}

function PaymentsCard({ invoice, payments, canSell, reload }: { invoice: InvoiceOverview; payments: Payment[]; canSell: boolean; reload: () => Promise<void> }) {
  const today = jakartaToday();
  const [amount, setAmount] = useState("");
  const [paidOn, setPaidOn] = useState(today);
  const [method, setMethod] = useState<PaymentMethod>("transfer");
  const [reference, setReference] = useState("");
  const action = useAction();
  const state = PAY_STATE[payState(invoice, today)];

  const submit = async () => {
    const parsed = parsePayment(amount, paidOn, invoice.balance, today);
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
        <h2 className="text-[16px] font-medium tracking-[-0.02em] text-[#0F2F36]">Payment</h2>
        <span className={`rounded-md px-2 py-0.5 text-[12.5px] font-medium ${state.className}`}>{state.label}</span>
      </div>
      <p className="mb-2 text-[14px] text-[#4F6B73]">Left <span className="font-medium tabular-nums text-[#0F2F36]">{formatRupiah(invoice.status === "batal" ? 0 : invoice.balance)}</span></p>
      {payments.length > 0 && <ul className="mb-3">{payments.map((p) => <PaymentRow key={p.id} payment={p} canSell={canSell} reload={reload} />)}</ul>}
      {canSell && invoice.status === "terbit" && invoice.balance > 0 && (
        <form className="space-y-3 border-t border-[#EDF2F2] pt-3" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Amount (Rp)"><input className={inputClass} inputMode="numeric" value={amount} placeholder={invoice.balance.toLocaleString("en-GB")} onChange={(e) => setAmount(e.target.value)} /></Field>
            <Field label="Payment date"><input type="date" className={inputClass} max={today} value={paidOn} onChange={(e) => setPaidOn(e.target.value)} /></Field>
            <Field label="Payment method">
              <select className={inputClass} value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
                {PAYMENT_METHODS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
              </select>
            </Field>
            <Field label="Reference"><input className={inputClass} value={reference} onChange={(e) => setReference(e.target.value)} /></Field>
          </div>
          <ActionNote action={action} />
          <PrimaryButton type="submit" disabled={action.busy}>{action.busy ? "Saving…" : "Record payment"}</PrimaryButton>
        </form>
      )}
    </Card>
  );
}

function VoidInvoice({ invoice, reload }: { invoice: InvoiceOverview; reload: () => Promise<void> }) {
  const [why, setWhy] = useState("");
  const action = useAction();
  return (
    <Card className="p-4">
      <p className="mb-2 text-[14px] text-[#4F6B73]">An issued invoice cannot be changed. Cancel it, then issue a new one from the order page. Its number is not used again.</p>
      <div className="space-y-2">
        <Field label="Reason"><input className={inputClass} value={why} onChange={(e) => setWhy(e.target.value)} /></Field>
        <ActionNote action={{ error: action.error, saved: false }} />
        <SecondaryButton disabled={action.busy || !why.trim()} onClick={() => void action.run(async () => { await voidInvoice(invoice.id, why); await reload(); })}>{action.busy ? "Cancelling…" : "Yes, cancel invoice"}</SecondaryButton>
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

  return (
    <ErpPage
      eyebrow="Sales · Invoice"
      title={state.data?.invoice.invoice_no ?? "Invoice"}
      sub={state.data?.invoice.partner_name}
      actions={state.data ? <div className="flex flex-wrap items-center gap-3 print:hidden"><BackToOrder order={state.data.invoice.sales_order_id} /><PrintButton /></div> : undefined}
    >
      <DataState state={state}>
        {({ invoice, lines, payments }) => (
          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px] print:block">
            <div className="min-w-0 space-y-3">
              {!canSell && <div className="print:hidden"><ReadOnlyNote who="Sales staff" /></div>}
              {invoice.status === "batal" && <Note tone="warn">Invoice cancelled: {invoice.void_note}</Note>}
              <Card className="p-5 sm:p-8 print:border-0 print:p-0">
                <PaperHead kind="INVOICE" number={invoice.invoice_no}>
                  Date {formatLongDate(invoice.issued_on)}<br />Due {formatLongDate(invoice.due_on)}
                </PaperHead>
                <div className="grid grid-cols-1 gap-3 py-4 text-[14px] sm:grid-cols-2">
                  <div>
                    <p className="text-[13px] text-[#4F6B73]">To</p>
                    <p className="font-medium text-[#0F2F36]">{invoice.partner_name}</p>
                    {invoice.partner_address && <p className="whitespace-pre-line text-[#36525A]">{invoice.partner_address}</p>}
                    {invoice.partner_tax_id && <p className="text-[#36525A]">Tax ID {invoice.partner_tax_id}</p>}
                  </div>
                  <div className="sm:text-right">
                    <p className="text-[13px] text-[#4F6B73]">Orders</p>
                    <p className="text-[#0F2F36]">{invoice.so_no}</p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[440px] text-left text-[14px]">
                    <thead className="text-[13px] text-[#4F6B73]">
                      <tr className="border-b border-[#DCE7E8]">
                        <th className="pb-2 font-medium">Description</th>
                        <th className="pb-2 pl-3 text-right font-medium">Weight</th>
                        <th className="pb-2 pl-3 text-right font-medium">Price per kg</th>
                        <th className="pb-2 pl-3 text-right font-medium">Quantity</th>
                      </tr>
                    </thead>
                    <tbody className="text-[#0F2F36]">
                      {lines.map((l) => (
                        <tr key={l.id} className="border-b border-[#EDF2F2]">
                          <td className="py-2">{l.description}</td>
                          <td className="py-2 pl-3 text-right tabular-nums">{formatKg(l.qty_kg)}</td>
                          <td className="py-2 pl-3 text-right tabular-nums">{formatRupiah(l.price_per_kg)}</td>
                          <td className="py-2 pl-3 text-right tabular-nums">{formatRupiah(l.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <dl className="ml-auto mt-3 max-w-[300px] space-y-1 text-[14px]">
                  <div className="flex justify-between gap-4"><dt className="text-[#4F6B73]">Subtotal</dt><dd className="tabular-nums text-[#0F2F36]">{formatRupiah(invoice.subtotal)}</dd></div>
                  {invoice.tax_name && <div className="flex justify-between gap-4"><dt className="text-[#4F6B73]">{invoice.tax_name} ({invoice.tax_percent.toLocaleString("en-GB")}%)</dt><dd className="tabular-nums text-[#0F2F36]">{formatRupiah(invoice.tax_amount)}</dd></div>}
                  <div className="flex justify-between gap-4 border-t border-[#DCE7E8] pt-1 font-semibold text-[#0F2F36]"><dt>Total</dt><dd className="tabular-nums">{formatRupiah(invoice.total)}</dd></div>
                </dl>
                {invoice.notes && <p className="mt-4 whitespace-pre-line text-[13.5px] text-[#36525A]">{invoice.notes}</p>}
              </Card>
            </div>
            <div className="min-w-0 space-y-4 print:hidden">
              <PaymentsCard invoice={invoice} payments={payments} canSell={canSell} reload={state.reload} />
              {canSell && invoice.status === "terbit" && <Disclosure title="Cancel invoice"><VoidInvoice invoice={invoice} reload={state.reload} /></Disclosure>}
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

  return (
    <ErpPage
      eyebrow="Sales · Delivery note"
      title={state.data?.delivery.delivery_no ?? "Delivery note"}
      sub={state.data?.order.partner_name}
      actions={state.data ? <div className="flex flex-wrap items-center gap-3 print:hidden"><BackToOrder order={state.data.delivery.sales_order_id} /><PrintButton /></div> : undefined}
    >
      <DataState state={state}>
        {({ delivery, order, lines, allocations, partner }) => (
          <div className="mx-auto max-w-[820px] space-y-3">
            {delivery.cancelled_at && <Note tone="warn">Delivery cancelled: {delivery.cancel_note}</Note>}
            <Card className="p-5 sm:p-8 print:border-0 print:p-0">
              <PaperHead kind="DELIVERY NOTE" number={delivery.delivery_no}>Date {formatLongDate(delivery.delivered_on)}<br />Order {order.so_no}</PaperHead>
              <div className="py-4 text-[14px]">
                <p className="text-[13px] text-[#4F6B73]">To</p>
                <p className="font-medium text-[#0F2F36]">{order.partner_name}</p>
                {partner?.address && <p className="whitespace-pre-line text-[#36525A]">{partner.address}</p>}
                {partner?.phone && <p className="text-[#36525A]">{partner.phone}</p>}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] text-left text-[14px]">
                  <thead className="text-[13px] text-[#4F6B73]">
                    <tr className="border-b border-[#DCE7E8]">
                      <th className="pb-2 font-medium">Item</th>
                      <th className="pb-2 pl-3 font-medium">Harvest lots</th>
                      <th className="pb-2 pl-3 font-medium">Keep until</th>
                      <th className="pb-2 pl-3 text-right font-medium">Weight</th>
                    </tr>
                  </thead>
                  <tbody className="text-[#0F2F36]">
                    {allocations.map((a) => {
                      const line = lines.find((l) => l.id === a.so_line_id);
                      return (
                        <tr key={a.id} className="border-b border-[#EDF2F2]">
                          <td className="py-2">{line ? lineLabel(line) : "-"}</td>
                          <td className="py-2 pl-3">{a.lot_code}</td>
                          <td className="py-2 pl-3">{a.best_before ? formatLongDate(a.best_before) : "-"}</td>
                          <td className="py-2 pl-3 text-right tabular-nums">{formatKg(a.qty_kg)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {delivery.notes && <p className="mt-3 text-[13.5px] text-[#36525A]">{delivery.notes}</p>}
              <div className="mt-10 grid grid-cols-2 gap-8 text-center text-[13px] text-[#36525A]">
                <div><p>Sender</p><div className="mt-16 border-t border-[#9DB2B6]" /></div>
                <div><p>Recipient{delivery.recipient ? `: ${delivery.recipient}` : ""}</p><div className="mt-16 border-t border-[#9DB2B6]" /></div>
              </div>
            </Card>
          </div>
        )}
      </DataState>
    </ErpPage>
  );
}
