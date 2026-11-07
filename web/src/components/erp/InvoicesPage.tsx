import { useState } from "react";
import { Plus } from "lucide-react";
import { jakartaToday } from "../../lib/pf/batch";
import { formatLongDate } from "../../lib/pf/dashboard";
import { PAY_STATE, fetchInvoices, fetchTaxRates, formatRupiah, payState, saveTaxRate } from "../../lib/pf/sales";
import { ActionNote, DataState, ErpPage, Field, PrimaryButton, SecondaryButton, inputClass, useAction, useErpAccess, useLoad } from "./page";
import { Card } from "./ui";
import DataTable, { CellTitle, Chip, type Column } from "./DataTable";

// Every invoice, what is still owed on it, and the tax rates to choose from. An
// invoice keeps its own copy of the rate, so changing one here touches only new ones.

function TaxRates({ canSell }: { canSell: boolean }) {
  const today = jakartaToday();
  const rates = useLoad(fetchTaxRates);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [percent, setPercent] = useState("");
  const [startsOn, setStartsOn] = useState(today);
  const action = useAction();

  const submit = async () => {
    const value = Number(percent.trim().replace(",", "."));
    if (!name.trim()) return action.setError("A rate name is required.");
    if (percent.trim() === "" || !Number.isFinite(value) || value < 0 || value > 100) return action.setError("The rate must be between 0 and 100 percent.");
    const saved = await action.run(async () => {
      await saveTaxRate(null, name, value, startsOn, true);
      await rates.reload();
    });
    if (saved) {
      setAdding(false);
      setName("");
      setPercent("");
    }
  };

  return (
    <Card>
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <h2 className="text-[16px] font-medium tracking-[-0.02em] text-[#0F2F36]">Tax rate</h2>
        {canSell && !adding && <button type="button" onClick={() => setAdding(true)} className="inline-flex min-h-[44px] items-center gap-1 text-[14px] font-medium text-[#0B6477] hover:underline sm:min-h-[24px]"><Plus className="h-4 w-4" /> Add</button>}
      </div>
      {adding && (
        <form className="space-y-3 border-t border-[#EDF2F2] p-4" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
          <Field label="Name"><input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="VAT" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Rate (%)"><input className={inputClass} inputMode="decimal" value={percent} onChange={(e) => setPercent(e.target.value)} /></Field>
            <Field label="Applies from"><input type="date" className={inputClass} value={startsOn} onChange={(e) => setStartsOn(e.target.value)} /></Field>
          </div>
          <ActionNote action={action} />
          <div className="flex gap-2">
            <PrimaryButton type="submit" disabled={action.busy}>Save</PrimaryButton>
            <SecondaryButton onClick={() => setAdding(false)}>Cancel</SecondaryButton>
          </div>
        </form>
      )}
      <DataState state={rates}>
        {(list) =>
          list.length === 0 ? (
            <p className="border-t border-[#EDF2F2] px-4 py-3 text-[14px] text-[#4F6B73]">No rates yet. Invoices can still be issued without tax.</p>
          ) : (
            <ul>
              {list.map((r) => (
                <li key={r.id} className="flex justify-between gap-3 border-t border-[#EDF2F2] px-4 py-2 text-[14px]">
                  <span className="min-w-0 text-[#0F2F36]">{r.name}<span className="block text-[13px] text-[#4F6B73]">Starts {formatLongDate(r.valid_from)}</span></span>
                  <span className="font-medium tabular-nums text-[#0F2F36]">{r.percent.toLocaleString("en-GB")}%</span>
                </li>
              ))}
            </ul>
          )
        }
      </DataState>
    </Card>
  );
}

type Show = "tagihan" | "lunas" | "batal";

export default function InvoicesPage() {
  const state = useLoad(fetchInvoices);
  const { canSell } = useErpAccess();
  const today = jakartaToday();

  return (
    <ErpPage eyebrow="Sales" title="Invoice" sub="Invoices are issued from the order page, after the goods are delivered.">
      <DataState state={state}>
        {(invoices) => {
          const groups: Record<Show, typeof invoices> = {
            tagihan: invoices.filter((i) => i.status === "terbit" && i.balance > 0).sort((a, b) => a.due_on.localeCompare(b.due_on)),
            lunas: invoices.filter((i) => i.status === "terbit" && i.balance <= 0),
            batal: invoices.filter((i) => i.status === "batal"),
          };
          const owed = groups.tagihan.reduce((n, i) => n + i.balance, 0);
          return (
            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="min-w-0 space-y-3">
                <p className="text-[14px] text-[#4F6B73]">Outstanding <span className="font-medium tabular-nums text-[#0F2F36]">{formatRupiah(owed)}</span></p>
                <DataTable
                  rows={invoices}
                  rowKey={(i) => i.id}
                  noun="invoices"
                  rowLink={(i) => `/erp/invoice/${i.id}`}
                  searchText={(i) => `${i.invoice_no} ${i.partner_name}`}
                  searchLabel="Search by invoice number or customer"
                  initialPill="unpaid"
                  initialSort={{ key: "due", dir: "asc" }}
                  pills={[
                    { key: "unpaid", label: "Unpaid", dot: "#E0A100", match: (i) => i.status === "terbit" && i.balance > 0 },
                    { key: "paid", label: "Paid", dot: "#0E9B7A", match: (i) => i.status === "terbit" && i.balance <= 0 },
                    { key: "cancelled", label: "Cancelled", dot: "#8FA3A8", match: (i) => i.status === "batal" },
                  ]}
                  filters={[{ label: "Filter by customer", all: "All customers", value: (i) => i.partner_name }]}
                  empty="No invoices yet."
                  columns={[
                    { key: "no", label: "Invoice", track: "minmax(0,1.3fr)", phone: "title", sort: (a, b) => a.invoice_no.localeCompare(b.invoice_no), cell: (i) => <CellTitle title={i.invoice_no} sub={i.partner_name} /> },
                    { key: "state", label: "Status", cell: (i) => { const st = PAY_STATE[payState(i, today)]; return <Chip label={st.label} className={st.className} />; } },
                    { key: "due", label: "Due", sort: (a, b) => a.due_on.localeCompare(b.due_on), cell: (i) => <span className="text-[13px]">{formatLongDate(i.due_on)}</span> },
                    { key: "balance", label: "Balance", track: "130px", align: "right", sort: (a, b) => a.balance - b.balance, cell: (i) => <span className="tabular-nums">{i.status === "terbit" && i.balance > 0 ? formatRupiah(i.balance) : "-"}</span> },
                    { key: "total", label: "Total", track: "130px", align: "right", sort: (a, b) => a.total - b.total, cell: (i) => <span className="font-medium tabular-nums text-[#0F2F36]">{formatRupiah(i.total)}</span> },
                  ] satisfies Column<(typeof invoices)[number]>[]}
                />
              </div>
              <TaxRates canSell={canSell} />
            </div>
          );
        }}
      </DataState>
    </ErpPage>
  );
}
