import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { jakartaToday } from "../../lib/pf/batch";
import { COST_AREAS, COST_CATEGORIES, addCostEntry, areaBasis, batchCostsCsv, batchTotal, costAreaLabel, costCategoryLabel, costGaps, fetchBatchCosts, fetchBatchCostDetail, fetchCostEntries, fetchCostLots, fetchLaborRates, fetchMonthly, formatHours, formatQty, monthRange, monthlyTable, parseEntryForm, parseRupiah, perKg, setLaborRate, setLotPrice, voidCostEntry, type BatchCost, type CostLot, type DirectLine, type LaborRate } from "../../lib/pf/cost";
import { formatLongDate, formatShortDate } from "../../lib/pf/dashboard";
import { PERSON_TYPES, personTypeLabel } from "../../lib/pf/people";
import { formatRupiah } from "../../lib/pf/sales";
import { ActionNote, DataState, ErpPage, Field, PrimaryButton, ReadOnlyNote, SecondaryButton, inputClass, useAction, useErpAccess, useLoad } from "./page";
import { Card, Disclosure, Kpi, Note, Segmented } from "./ui";
import DataTable, { CellTitle, type Column } from "./DataTable";

// What things cost. Each batch's figure opens into the lines behind it, so it can be
// checked with a calculator. A batch still running is marked as provisional, and a total
// missing a price says so next to the number.

const sectionTitle = "text-[16px] font-medium tracking-[-0.02em] text-[#0F2F36]";
const textLink = "min-h-[44px] text-[14px] font-medium text-[#0B6477] hover:underline sm:min-h-[24px]";
const money = (value: number | null) => (value === null ? "-" : formatRupiah(value));
const STATUS_LABEL: Record<string, string> = { berjalan: "Running, provisional", selesai: "Done", gagal: "Failed" };
const monthLabel = (month: string) => new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}T00:00:00Z`));

/* ---------------------------------------------------------------- per batch */

function downloadCsv(rows: BatchCost[]) {
  // The mark lets a spreadsheet read it as UTF-8.
  const url = URL.createObjectURL(new Blob([`﻿${batchCostsCsv(rows)}`], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `batch-costs-${jakartaToday()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function BatchesTab() {
  const state = useLoad(fetchBatchCosts);
  return (
    <DataState state={state}>
      {(rows) => {
        if (rows.length === 0) return <Card className="px-4 py-8 text-center text-[14px] text-[#4F6B73]">No running batches yet.</Card>;
        const incomplete = rows.filter((b) => costGaps(b).length > 0).length;
        return (
          <div className="space-y-3">
            {incomplete > 0 && <Note tone="warn">{incomplete} batches are incomplete because a lot has no price or work hours have no rate. Fill these in on the Rates and prices tab. The total is currently lower than the real one.</Note>}
            <div className="flex justify-end"><SecondaryButton onClick={() => downloadCsv(rows)}><Download className="h-4 w-4" /> Download CSV</SecondaryButton></div>

            <DataTable
              rows={rows}
              rowKey={(b) => b.id}
              noun="batches"
              rowLink={(b) => `/erp/costs/${b.id}`}
              searchText={(b) => `${b.code} ${b.crop_name}`}
              searchLabel="Search by batch or crop"
              pills={[
                { key: "running", label: "Running", dot: "#14919B", match: (b) => b.status === "berjalan" },
                { key: "done", label: "Completed", dot: "#0E9B7A", match: (b) => b.status === "selesai" },
                { key: "failed", label: "Failed", dot: "#B3362C", match: (b) => b.status === "gagal" },
                { key: "gaps", label: "Missing a price", dot: "#E0A100", match: (b) => costGaps(b).length > 0 },
              ]}
              columns={[
                { key: "code", label: "Batch", track: "minmax(0,1.4fr)", phone: "title", sort: (a, b) => a.code.localeCompare(b.code), cell: (b) => { const gaps = costGaps(b); return <CellTitle title={b.code} sub={gaps.length > 0 ? <span className="font-medium text-[#8A5A07]">{gaps.join(" · ")}</span> : `${b.crop_name} · ${STATUS_LABEL[b.status] ?? b.status}`} />; } },
                { key: "material", label: "Materials", align: "right", phone: "hidden", sort: (a, b) => a.material - b.material, cell: (b) => <span className="tabular-nums">{formatRupiah(b.material)}</span> },
                { key: "labor", label: "Labour", align: "right", phone: "hidden", sort: (a, b) => a.labor - b.labor, cell: (b) => <span className="tabular-nums">{formatRupiah(b.labor)}</span> },
                { key: "direct", label: "Direct", align: "right", phone: "hidden", sort: (a, b) => a.direct - b.direct, cell: (b) => <span className="tabular-nums">{formatRupiah(b.direct)}</span> },
                { key: "shared", label: "Shared", align: "right", phone: "hidden", sort: (a, b) => a.shared - b.shared, cell: (b) => <span className="tabular-nums">{formatRupiah(b.shared)}</span> },
                { key: "total", label: "Total", align: "right", sort: (a, b) => batchTotal(a) - batchTotal(b), cell: (b) => <span className="font-medium tabular-nums text-[#0F2F36]">{formatRupiah(batchTotal(b))}</span> },
                { key: "harvest", label: "Harvest", track: "90px", align: "right", sort: (a, b) => a.harvested_kg - b.harvested_kg, cell: (b) => <span className="tabular-nums">{b.harvested_kg > 0 ? `${formatQty(b.harvested_kg)} kg` : "-"}</span> },
                { key: "kg", label: "Per kg", align: "right", sort: (a, b) => (perKg(batchTotal(a), a.harvested_kg) ?? 0) - (perKg(batchTotal(b), b.harvested_kg) ?? 0), cell: (b) => { const kg = perKg(batchTotal(b), b.harvested_kg); return <span className="font-medium tabular-nums text-[#0F2F36]">{kg === null ? "-" : formatRupiah(kg)}</span>; } },
              ] satisfies Column<BatchCost>[]}
            />
          </div>
        );
      }}
    </DataState>
  );
}

/* ---------------------------------------------------------------- per month */

function MonthsTab() {
  const state = useLoad(() => fetchMonthly(12));
  return (
    <DataState state={state}>
      {(rows) => {
        const table = monthlyTable(rows);
        if (table.length === 0) return <Card className="px-4 py-8 text-center text-[14px] text-[#4F6B73]">No costs or revenue in the last 12 months.</Card>;
        return (
          <div className="space-y-3">
            <DataTable
              rows={table}
              rowKey={(m) => m.month}
              noun="months"
              columns={[
                { key: "month", label: "Month", track: "110px", phone: "title", sort: (a, b) => a.month.localeCompare(b.month), cell: (m) => <span className="whitespace-nowrap font-medium text-[#0F2F36]">{monthLabel(m.month)}</span> },
                { key: "bahan", label: "Materials", align: "right", phone: "hidden", cell: (m) => <span className="tabular-nums">{formatRupiah(m.bahan)}</span> },
                { key: "tenaga", label: "Labour", align: "right", phone: "hidden", cell: (m) => <span className="tabular-nums">{formatRupiah(m.tenaga)}</span> },
                { key: "listrik", label: "Power", align: "right", phone: "hidden", cell: (m) => <span className="tabular-nums">{formatRupiah(m.listrik)}</span> },
                { key: "air", label: "Water", align: "right", phone: "hidden", cell: (m) => <span className="tabular-nums">{formatRupiah(m.air)}</span> },
                { key: "other", label: "Other", align: "right", phone: "hidden", cell: (m) => <span className="tabular-nums">{formatRupiah(m.other)}</span> },
                { key: "cost", label: "Total cost", align: "right", sort: (a, b) => a.cost - b.cost, cell: (m) => <span className="font-medium tabular-nums text-[#0F2F36]">{formatRupiah(m.cost)}</span> },
                { key: "revenue", label: "Revenue", align: "right", sort: (a, b) => a.revenue - b.revenue, cell: (m) => <span className="tabular-nums">{formatRupiah(m.revenue)}</span> },
                { key: "net", label: "Net", align: "right", sort: (a, b) => a.revenue - a.cost - (b.revenue - b.cost), cell: (m) => <span className={`font-medium tabular-nums ${m.revenue - m.cost < 0 ? "text-[#B3362C]" : "text-[#0E7A5C]"}`}>{m.revenue - m.cost < 0 ? `-${formatRupiah(m.cost - m.revenue)}` : formatRupiah(m.revenue - m.cost)}</span> },
              ] satisfies Column<(typeof table)[number]>[]}
            />
            <p className="text-[13px] leading-[1.5] text-[#4F6B73]">Materials count when used, not when bought, and only those with a price. A bill falls in the month its period starts. Revenue is invoices issued, before tax. This is an operational summary, not a financial report.</p>
          </div>
        );
      }}
    </DataState>
  );
}

/* --------------------------------------------------------------------- bills */

function EntryForm({ batches, onSaved, fixedBatch }: { batches: Pick<BatchCost, "id" | "code">[]; onSaved: () => Promise<void>; fixedBatch?: string }) {
  const today = jakartaToday();
  const month = monthRange(today);
  const [category, setCategory] = useState<string>(fixedBatch ? "bahan_lain" : "listrik");
  const [scope, setScope] = useState<"batch" | "ruang">(fixedBatch ? "batch" : "ruang");
  const [batch, setBatch] = useState(fixedBatch ?? "");
  const [area, setArea] = useState<string>("plant_factory");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [start, setStart] = useState(fixedBatch ? today : month.start);
  const [end, setEnd] = useState(month.end);
  const action = useAction();
  const submit = async () => {
    const parsed = parseEntryForm({ amount, scope, batch, area, start, end });
    if (parsed.error !== null) return action.setError(parsed.error);
    const saved = await action.run(async () => {
      await addCostEntry({ category, description, amount: parsed.amount, batch: scope === "batch" ? batch : null, area: scope === "ruang" ? area : null, start, end: parsed.end });
      await onSaved();
    });
    if (saved) {
      setAmount("");
      setDescription("");
    }
  };
  return (
    <Card className="p-4">
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        {!fixedBatch && <Segmented label="Carried" value={scope} options={[{ key: "ruang" as const, label: "One room" }, { key: "batch" as const, label: "One batch" }]} onChange={setScope} />}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type">
            <select className={inputClass} value={category} onChange={(e) => setCategory(e.target.value)}>
              {COST_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </Field>
          <Field label="Amount (Rp)"><input className={inputClass} inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
        </div>
        {scope === "ruang" ? (
          <>
            <Field label="Room" hint={`Shared out to batches by ${areaBasis(area)} in this period.`}>
              <select className={inputClass} value={area} onChange={(e) => setArea(e.target.value)}>
                {COST_AREAS.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Period starts"><input type="date" className={inputClass} value={start} onChange={(e) => setStart(e.target.value)} /></Field>
              <Field label="To"><input type="date" className={inputClass} min={start} value={end} onChange={(e) => setEnd(e.target.value)} /></Field>
            </div>
          </>
        ) : (
          <div className={fixedBatch ? "" : "grid grid-cols-2 gap-3"}>
            {!fixedBatch && (
              <Field label="Batch">
                <select className={inputClass} value={batch} onChange={(e) => setBatch(e.target.value)}>
                  <option value="">Choose</option>
                  {batches.map((b) => <option key={b.id} value={b.id}>{b.code}</option>)}
                </select>
              </Field>
            )}
            <Field label="Date"><input type="date" className={inputClass} value={start} onChange={(e) => setStart(e.target.value)} /></Field>
          </div>
        )}
        <Field label="Description"><input className={inputClass} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
        <ActionNote action={action} />
        <PrimaryButton type="submit" disabled={action.busy}>{action.busy ? "Saving..." : "Record cost"}</PrimaryButton>
      </form>
    </Card>
  );
}

function VoidButton({ entry, onDone }: { entry: string; onDone: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [why, setWhy] = useState("");
  const action = useAction();
  if (!open) return <button type="button" onClick={() => setOpen(true)} className="min-h-[44px] shrink-0 text-[13px] font-medium text-[#4F6B73] hover:text-[#B3362C] sm:min-h-[24px]">Cancel</button>;
  return (
    <form className="mt-2 w-full space-y-2" onSubmit={(e) => { e.preventDefault(); void action.run(async () => { await voidCostEntry(entry, why); await onDone(); }); }}>
      <Field label="Reason for cancelling"><input className={inputClass} value={why} onChange={(e) => setWhy(e.target.value)} autoFocus /></Field>
      <ActionNote action={{ error: action.error, saved: false }} />
      <div className="flex gap-2">
        <SecondaryButton type="submit" disabled={action.busy || !why.trim()}>Yes, cancel</SecondaryButton>
        <SecondaryButton onClick={() => setOpen(false)}>Never mind</SecondaryButton>
      </div>
    </form>
  );
}

function BillsTab({ canWrite }: { canWrite: boolean }) {
  const state = useLoad(async () => {
    const [entries, batches] = await Promise.all([fetchCostEntries(), fetchBatchCosts()]);
    return { entries, batches };
  });
  return (
    <DataState state={state}>
      {({ entries, batches }) => (
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0">
            {!canWrite && <div className="mb-3"><ReadOnlyNote who="Production manager or Admin" /></div>}
            <DataTable
              rows={entries}
              rowKey={(e) => e.id}
              noun="bills"
              searchText={(e) => `${costCategoryLabel(e.category)} ${e.description} ${e.batch_code ?? ""}`}
              searchLabel="Search bills"
              pills={[
                { key: "live", label: "Active", dot: "#0E9B7A", match: (e) => !e.voided_at },
                { key: "void", label: "Cancelled", dot: "#8FA3A8", match: (e) => !!e.voided_at },
              ]}
              filters={[{ label: "Filter by category", all: "All categories", value: (e) => costCategoryLabel(e.category) }]}
              empty="No bills yet. Record power, water or other costs here."
              columns={[
                { key: "what", label: "Bill", track: "minmax(0,1.5fr)", phone: "title", sort: (a, b) => a.category.localeCompare(b.category), cell: (e) => <CellTitle muted={!!e.voided_at} title={<span className={e.voided_at ? "line-through" : ""}>{costCategoryLabel(e.category)}{e.description ? ` · ${e.description}` : ""}</span>} sub={e.voided_at ? `Cancelled: ${e.void_note}` : e.all_days === 0 ? <span className="font-medium text-[#8A5A07]">Not shared out: this room was empty in that period.</span> : undefined} /> },
                { key: "where", label: "Applies to", cell: (e) => <span className="text-[13px]">{e.batch_code ? `${e.batch_code} · ${formatLongDate(e.period_start)}` : `${costAreaLabel(e.area)} · ${formatShortDate(e.period_start)} to ${formatShortDate(e.period_end)}`}</span> },
                { key: "amount", label: "Amount", track: "130px", align: "right", sort: (a, b) => a.amount - b.amount, cell: (e) => <span className={`font-medium tabular-nums ${e.voided_at ? "text-[#4F6B73] line-through" : "text-[#0F2F36]"}`}>{formatRupiah(e.amount)}</span> },
                { key: "void", label: "", track: "90px", align: "right", interactive: true, cell: (e) => canWrite && !e.voided_at ? <VoidButton entry={e.id} onDone={state.reload} /> : null },
              ] satisfies Column<(typeof entries)[number]>[]}
            />
          </div>
          {canWrite && <EntryForm batches={batches} onSaved={state.reload} />}
        </div>
      )}
    </DataState>
  );
}

/* -------------------------------------------------------------- rates, prices */

function RatesCard({ rates, canWrite, reload }: { rates: LaborRate[]; canWrite: boolean; reload: () => Promise<void> }) {
  const today = jakartaToday();
  const [type, setType] = useState<string>("karyawan");
  const [starts, setStarts] = useState(today);
  const [hourly, setHourly] = useState("");
  const action = useAction();
  const current = (key: string) => rates.filter((r) => r.person_type === key && r.valid_from <= today).sort((a, b) => b.valid_from.localeCompare(a.valid_from))[0];
  const submit = async () => {
    const value = parseRupiah(hourly);
    if (value === null) return action.setError("The rate must be a number.");
    if (await action.run(async () => { await setLaborRate(type, starts, value); await reload(); })) setHourly("");
  };
  return (
    <Card>
      <h2 className={`${sectionTitle} px-4 pt-3`}>Labour rate per hour</h2>
      <p className="px-4 pb-2 text-[13px] leading-[1.5] text-[#4F6B73]">Standard rates per type of person, not contract pay, so nobody's pay can be read from a batch's cost. A new rate does not change work hours before its start date.</p>
      <ul>
        {PERSON_TYPES.map((t) => {
          const rate = current(t.key);
          return (
            <li key={t.key} className="flex justify-between gap-3 border-t border-[#EDF2F2] px-4 py-2 text-[14px]">
              <span className="text-[#0F2F36]">{t.label}</span>
              {rate ? <span className="text-right tabular-nums text-[#0F2F36]">{formatRupiah(rate.hourly_idr)}<span className="block text-[12.5px] text-[#4F6B73]">since {formatShortDate(rate.valid_from)}</span></span> : <span className="font-medium text-[#8A5A07]">None yet</span>}
            </li>
          );
        })}
      </ul>
      {canWrite && (
        <form className="space-y-2 border-t border-[#EDF2F2] p-4" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Type"><select className={inputClass} value={type} onChange={(e) => setType(e.target.value)}>{PERSON_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}</select></Field>
            <Field label="Rp per hour"><input className={inputClass} inputMode="numeric" value={hourly} onChange={(e) => setHourly(e.target.value)} /></Field>
          </div>
          <Field label="Applies since"><input type="date" className={inputClass} value={starts} onChange={(e) => setStarts(e.target.value)} /></Field>
          <ActionNote action={action} />
          <SecondaryButton type="submit" disabled={action.busy}>Save rate</SecondaryButton>
        </form>
      )}
    </Card>
  );
}

export function LotPriceForm({ lot, unit, onDone }: { lot: string; unit: string; onDone: () => Promise<void> }) {
  const [price, setPrice] = useState("");
  const action = useAction();
  const submit = async () => {
    const value = parseRupiah(price);
    if (value === null) return action.setError("Price must be a number.");
    await action.run(async () => { await setLotPrice(lot, value); await onDone(); });
  };
  return (
    <form className="flex flex-wrap items-center gap-2" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
      <label className="sr-only" htmlFor={`price-${lot}`}>Price per {unit}</label>
      <input id={`price-${lot}`} className={`${inputClass} max-w-[130px]`} inputMode="numeric" placeholder={`Rp per ${unit}`} value={price} onChange={(e) => setPrice(e.target.value)} />
      <SecondaryButton type="submit" disabled={action.busy || !price.trim()}>Save</SecondaryButton>
      {action.error && <p className="w-full text-[13px] text-[#8A5A07]">{action.error}</p>}
    </form>
  );
}

function LotsCard({ lots, canWrite, reload }: { lots: CostLot[]; canWrite: boolean; reload: () => Promise<void> }) {
  const open = lots.filter((l) => l.unit_cost === null);
  const priced = lots.filter((l) => l.unit_cost !== null);
  const row = (l: CostLot) => (
    <li key={l.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-[#EDF2F2] px-4 py-2 text-[14px]">
      <span className="min-w-0">
        <span className="font-medium text-[#0F2F36]">{l.item_name}</span>
        <span className="block text-[13px] text-[#4F6B73]">Lot {l.lot_no}{l.used_in_batches > 0 ? ` · used ${formatQty(l.used_in_batches)} ${l.unit}` : ""}</span>
      </span>
      {l.unit_cost === null ? (canWrite ? <LotPriceForm lot={l.id} unit={l.unit} onDone={reload} /> : <span className="font-medium text-[#8A5A07]">No price yet</span>) : (
        <span className="text-right tabular-nums text-[#0F2F36]">{formatRupiah(l.unit_cost)}/{l.unit}<span className="block text-[12.5px] text-[#4F6B73]">{l.from_po ? "from purchasing" : "filled in by hand"}</span></span>
      )}
    </li>
  );
  return (
    <div className="space-y-3">
      <Card>
        <h2 className={`${sectionTitle} px-4 pt-3`}>Lots without a price</h2>
        <p className="px-4 pb-2 text-[13px] leading-[1.5] text-[#4F6B73]">Lots from a purchase order use that order's price. Lots received directly, seed included, need a price here.</p>
        {open.length === 0 ? <p className="border-t border-[#EDF2F2] px-4 py-3 text-[14px] text-[#4F6B73]">Every lot has a price.</p> : <ul>{open.map(row)}</ul>}
      </Card>
      {priced.length > 0 && <Disclosure title={`Lots with a price (${priced.length})`}><Card><ul>{priced.map(row)}</ul></Card></Disclosure>}
    </div>
  );
}

function PricesTab({ canWrite }: { canWrite: boolean }) {
  const state = useLoad(async () => {
    const [rates, lots] = await Promise.all([fetchLaborRates(), fetchCostLots()]);
    return { rates, lots };
  });
  return (
    <DataState state={state}>
      {({ rates, lots }) => (
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
          <div className="min-w-0"><RatesCard rates={rates} canWrite={canWrite} reload={state.reload} /></div>
          <div className="min-w-0"><LotsCard lots={lots} canWrite={canWrite} reload={state.reload} /></div>
        </div>
      )}
    </DataState>
  );
}

/* --------------------------------------------------------------------- pages */

type Tab = "batch" | "bulan" | "tagihan" | "tarif";
const TABS: { key: Tab; label: string }[] = [
  { key: "batch", label: "Per batch" },
  { key: "bulan", label: "Per month" },
  { key: "tagihan", label: "Bills" },
  { key: "tarif", label: "Rates and prices" },
];

export function CostPage() {
  const { canReadCost, canManageProduction } = useErpAccess();
  const [tab, setTab] = useState<Tab>("batch");
  return (
    <ErpPage eyebrow="Costs" title="Production costs" sub="Materials, labour, direct bills and the room bills shared out to the batch.">
      {!canReadCost ? <Note>This page is for Production managers, Admins and Leadership.</Note> : (
        <div className="space-y-3">
          <Segmented value={tab} options={TABS} onChange={setTab} />
          {tab === "batch" && <BatchesTab />}
          {tab === "bulan" && <MonthsTab />}
          {tab === "tagihan" && <BillsTab canWrite={canManageProduction} />}
          {tab === "tarif" && <PricesTab canWrite={canManageProduction} />}
        </div>
      )}
    </ErpPage>
  );
}

function PartCard({ title, total, empty, children }: { title: string; total: number; empty: boolean; children: React.ReactNode }) {
  return (
    <Card>
      <div className="flex items-baseline justify-between gap-3 px-4 py-3">
        <h2 className={sectionTitle}>{title}</h2>
        <p className="text-[14px] font-medium tabular-nums text-[#0F2F36]">{formatRupiah(total)}</p>
      </div>
      {empty ? <p className="border-t border-[#EDF2F2] px-4 py-3 text-[14px] text-[#4F6B73]">None yet.</p> : <ul>{children}</ul>}
    </Card>
  );
}

function Line({ title, working, amount, children }: { title: string; working: string; amount: number | null; children?: React.ReactNode }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-[#EDF2F2] px-4 py-2 text-[14px]">
      <span className="min-w-0 flex-1 basis-[200px]">
        <span className="block text-[#0F2F36]">{title}</span>
        <span className="block text-[13px] tabular-nums text-[#4F6B73]">{working}</span>
      </span>
      {amount === null ? (children ?? <span className="font-medium text-[#8A5A07]">No price</span>) : <span className="tabular-nums text-[#0F2F36]">{formatRupiah(amount)}</span>}
    </li>
  );
}

const directTitle = (d: DirectLine) => `${costCategoryLabel(d.category)}${d.description ? ` · ${d.description}` : ""}`;

export function CostDetailPage({ id }: { id: string }) {
  const { canReadCost, canManageProduction } = useErpAccess();
  const state = useLoad(async () => {
    const [rows, detail] = await Promise.all([fetchBatchCosts(), fetchBatchCostDetail(id)]);
    return { batch: rows.find((b) => b.id === id) ?? null, detail };
  }, [id]);
  return (
    <ErpPage
      eyebrow="Costs"
      title={state.data?.batch ? `Cost ${state.data.batch.code}` : "Batch costs"}
      sub={state.data?.batch ? `${state.data.batch.crop_name} ${state.data.batch.crop_variety}`.trim() : undefined}
      actions={<Link to="/erp/costs" className={`inline-flex items-center ${textLink}`}>All costs</Link>}
    >
      {!canReadCost ? <Note>This page is for Production managers, Admins and Leadership.</Note> : (
        <DataState state={state}>
          {({ batch, detail }) => {
            if (!batch) return <Card className="px-4 py-8 text-center text-[14px] text-[#4F6B73]">This batch has not started or was not found.</Card>;
            const total = batchTotal(batch);
            const whole = perKg(total, batch.harvested_kg);
            const sellable = perKg(total, batch.sellable_kg);
            const price = perKg(batch.revenue, batch.sold_kg);
            const gaps = costGaps(batch);
            return (
              <div className="space-y-4">
                {batch.status === "berjalan" && <Note>This batch is still running, so this figure is provisional. New costs may be added, and its share of room bills changes if another batch is in the same period.</Note>}
                {gaps.length > 0 && <Note tone="warn">Incomplete: {gaps.join(", ")}. The total below is lower than the real one.</Note>}
                <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                  <Kpi label="Total cost" value={formatRupiah(total)} sub={batch.minutes ? `${formatHours(batch.minutes)} of work` : "No work hours yet"} />
                  <Kpi label="Per kg harvested" value={money(whole)} sub={batch.harvested_kg > 0 ? `${formatQty(batch.harvested_kg)} kg including rejects` : "Not harvested"} />
                  <Kpi label="Per sellable kg" value={money(sellable)} sub={batch.sellable_kg > 0 ? `${formatQty(batch.sellable_kg)} kg of grade A and B` : "None yet"} />
                  <Kpi label="Selling price per kg" value={money(price)} sub={batch.sold_kg > 0 ? `${formatQty(batch.sold_kg)} kg delivered` : "Not sold yet"} />
                </div>
                <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
                  <div className="min-w-0 space-y-4">
                    <PartCard title="Materials" total={batch.material} empty={detail.materials.length === 0}>
                      {detail.materials.map((m) => (
                        <Line key={m.lot_id} title={`${m.item_name} · lot ${m.lot_no}`} working={m.unit_cost === null ? `${formatQty(m.qty)} ${m.unit}` : `${formatQty(m.qty)} ${m.unit} × ${formatRupiah(m.unit_cost)}`} amount={m.amount}>
                          {canManageProduction && !m.from_po ? <LotPriceForm lot={m.lot_id} unit={m.unit} onDone={state.reload} /> : undefined}
                        </Line>
                      ))}
                    </PartCard>
                    <PartCard title="Labour" total={batch.labor} empty={detail.labor.length === 0}>
                      {detail.labor.map((l) => (
                        <Line key={`${l.person_type}-${l.hourly_idr}`} title={personTypeLabel(l.person_type)} working={l.hourly_idr === null ? formatHours(l.minutes) : `${formatHours(l.minutes)} × ${formatRupiah(l.hourly_idr)}`} amount={l.amount}>
                          <Link to="/erp/costs" className="text-[14px] font-medium text-[#8A5A07] hover:underline">No rate yet</Link>
                        </Line>
                      ))}
                    </PartCard>
                  </div>
                  <div className="min-w-0 space-y-4">
                    <PartCard title="Direct bills" total={batch.direct} empty={detail.direct.length === 0}>
                      {detail.direct.map((d) => <Line key={d.id} title={directTitle(d)} working={formatLongDate(d.spent_on)} amount={d.amount} />)}
                    </PartCard>
                    <PartCard title="Share of room bills" total={batch.shared} empty={detail.shared.length === 0}>
                      {detail.shared.map((s) => (
                        <Line
                          key={s.entry_id}
                          title={`${costCategoryLabel(s.category)} · ${costAreaLabel(s.area)}${s.description ? ` · ${s.description}` : ""}`}
                          working={`${formatRupiah(s.total)} × ${s.batch_days} of ${s.all_days} ${areaBasis(s.area)}, ${formatShortDate(s.period_start)} to ${formatShortDate(s.period_end)}`}
                          amount={s.amount}
                        />
                      ))}
                    </PartCard>
                    {canManageProduction && <Disclosure title="Record a cost for this batch"><EntryForm batches={[]} fixedBatch={batch.id} onSaved={state.reload} /></Disclosure>}
                  </div>
                </div>
              </div>
            );
          }}
        </DataState>
      )}
    </ErpPage>
  );
}
