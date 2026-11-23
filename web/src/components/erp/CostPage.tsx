import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { jakartaToday } from "../../lib/pf/batch";
import { COST_AREAS, COST_CATEGORIES, addCostEntry, areaBasis, batchCostsCsv, batchTotal, costAreaLabel, costCategoryLabel, costGaps, fetchBatchCosts, fetchBatchCostDetail, fetchCostEntries, fetchCostLots, fetchLaborRates, fetchMonthly, formatHours, formatQty, monthRange, monthlyTable, parseEntryForm, parseRupiah, perKg, setLaborRate, setLotPrice, voidCostEntry, type BatchCost, type CostLot, type DirectLine, type LaborRate } from "../../lib/pf/cost";
import { formatLongDate, formatShortDate } from "../../lib/pf/dashboard";
import { PERSON_TYPES, personTypeLabel } from "../../lib/pf/people";
import { formatRupiah } from "../../lib/pf/sales";
import { useLang, useT, type Lang } from "../../lib/i18n";
import { ActionNote, DataState, ErpPage, Field, PrimaryButton, ReadOnlyNote, SecondaryButton, inputClass, useAction, useErpAccess, useLoad } from "./page";
import { Card, Disclosure, Kpi, Note, Segmented } from "./ui";
import DataTable, { CellTitle, type Column } from "./DataTable";

// What things cost. Each batch's figure opens into the lines behind it, so it can be
// checked with a calculator. A batch still running is marked as provisional, and a total
// missing a price says so next to the number.

const sectionTitle = "text-[16px] font-medium tracking-[-0.02em] text-[#0F2F36]";
const textLink = "min-h-[44px] text-[14px] font-medium text-[#0B6477] hover:underline sm:min-h-[24px]";
const money = (value: number | null, lang: Lang = "en") => (value === null ? "-" : formatRupiah(value, lang));
const STATUS_LABEL: Record<string, string> = { berjalan: "Running, provisional", selesai: "Done", gagal: "Failed" };
const STATUS_LABEL_ID: Record<string, string> = { berjalan: "Berjalan, sementara", selesai: "Selesai", gagal: "Gagal" };
const monthLabel = (month: string, lang: Lang = "en") => new Intl.DateTimeFormat(lang === "id" ? "id-ID" : "en-GB", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}T00:00:00Z`));

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
  const t = useT();
  const lang = useLang();
  return (
    <DataState state={state}>
      {(rows) => {
        if (rows.length === 0) return <Card className="px-4 py-8 text-center text-[14px] text-[#4F6B73]">{t({ en: "No running batches yet.", id: "Belum ada batch berjalan." })}</Card>;
        const incomplete = rows.filter((b) => costGaps(b).length > 0).length;
        return (
          <div className="space-y-3">
            {incomplete > 0 && <Note tone="warn">{t({ en: `${incomplete} batches are incomplete because a lot has no price or work hours have no rate. Fill these in on the Rates and prices tab. The total is currently lower than the real one.`, id: `${incomplete} batch belum lengkap karena ada lot tanpa harga atau jam kerja tanpa tarif. Lengkapi di tab Tarif dan harga. Totalnya saat ini lebih rendah dari yang sebenarnya.` })}</Note>}
            <div className="flex justify-end"><SecondaryButton onClick={() => downloadCsv(rows)}><Download className="h-4 w-4" /> {t({ en: "Download CSV", id: "Unduh CSV" })}</SecondaryButton></div>

            <DataTable
              rows={rows}
              rowKey={(b) => b.id}
              noun={t({ en: "batches", id: "batch" })}
              rowLink={(b) => `/erp/costs/${b.id}`}
              searchText={(b) => `${b.code} ${b.crop_name}`}
              searchLabel={t({ en: "Search by batch or crop", id: "Cari batch atau tanaman" })}
              pills={[
                { key: "running", label: t({ en: "Running", id: "Berjalan" }), dot: "#14919B", match: (b) => b.status === "berjalan" },
                { key: "done", label: t({ en: "Completed", id: "Selesai" }), dot: "#0E9B7A", match: (b) => b.status === "selesai" },
                { key: "failed", label: t({ en: "Failed", id: "Gagal" }), dot: "#B3362C", match: (b) => b.status === "gagal" },
                { key: "gaps", label: t({ en: "Missing a price", id: "Belum ada harga" }), dot: "#E0A100", match: (b) => costGaps(b).length > 0 },
              ]}
              columns={[
                { key: "code", label: "Batch", track: "minmax(0,1.4fr)", phone: "title", sort: (a, b) => a.code.localeCompare(b.code), cell: (b) => { const gaps = costGaps(b, lang); return <CellTitle title={b.code} sub={gaps.length > 0 ? <span className="font-medium text-[#8A5A07]">{gaps.join(" · ")}</span> : `${b.crop_name} · ${(lang === "id" ? STATUS_LABEL_ID : STATUS_LABEL)[b.status] ?? b.status}`} />; } },
                { key: "material", label: t({ en: "Materials", id: "Bahan" }), align: "right", phone: "hidden", sort: (a, b) => a.material - b.material, cell: (b) => <span className="tabular-nums">{formatRupiah(b.material, lang)}</span> },
                { key: "labor", label: t({ en: "Labour", id: "Tenaga" }), align: "right", phone: "hidden", sort: (a, b) => a.labor - b.labor, cell: (b) => <span className="tabular-nums">{formatRupiah(b.labor, lang)}</span> },
                { key: "direct", label: t({ en: "Direct", id: "Langsung" }), align: "right", phone: "hidden", sort: (a, b) => a.direct - b.direct, cell: (b) => <span className="tabular-nums">{formatRupiah(b.direct, lang)}</span> },
                { key: "shared", label: t({ en: "Shared", id: "Bersama" }), align: "right", phone: "hidden", sort: (a, b) => a.shared - b.shared, cell: (b) => <span className="tabular-nums">{formatRupiah(b.shared, lang)}</span> },
                { key: "total", label: "Total", align: "right", sort: (a, b) => batchTotal(a) - batchTotal(b), cell: (b) => <span className="font-medium tabular-nums text-[#0F2F36]">{formatRupiah(batchTotal(b), lang)}</span> },
                { key: "harvest", label: t({ en: "Harvest", id: "Panen" }), track: "90px", align: "right", sort: (a, b) => a.harvested_kg - b.harvested_kg, cell: (b) => <span className="tabular-nums">{b.harvested_kg > 0 ? `${formatQty(b.harvested_kg, lang)} kg` : "-"}</span> },
                { key: "kg", label: t({ en: "Per kg", id: "Per kg" }), align: "right", sort: (a, b) => (perKg(batchTotal(a), a.harvested_kg) ?? 0) - (perKg(batchTotal(b), b.harvested_kg) ?? 0), cell: (b) => { const kg = perKg(batchTotal(b), b.harvested_kg); return <span className="font-medium tabular-nums text-[#0F2F36]">{kg === null ? "-" : formatRupiah(kg, lang)}</span>; } },
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
  const t = useT();
  const lang = useLang();
  return (
    <DataState state={state}>
      {(rows) => {
        const table = monthlyTable(rows);
        if (table.length === 0) return <Card className="px-4 py-8 text-center text-[14px] text-[#4F6B73]">{t({ en: "No costs or revenue in the last 12 months.", id: "Tidak ada biaya atau pendapatan dalam 12 bulan terakhir." })}</Card>;
        return (
          <div className="space-y-3">
            <DataTable
              rows={table}
              rowKey={(m) => m.month}
              noun={t({ en: "months", id: "bulan" })}
              columns={[
                { key: "month", label: t({ en: "Month", id: "Bulan" }), track: "110px", phone: "title", sort: (a, b) => a.month.localeCompare(b.month), cell: (m) => <span className="whitespace-nowrap font-medium text-[#0F2F36]">{monthLabel(m.month, lang)}</span> },
                { key: "bahan", label: t({ en: "Materials", id: "Bahan" }), align: "right", phone: "hidden", cell: (m) => <span className="tabular-nums">{formatRupiah(m.bahan, lang)}</span> },
                { key: "tenaga", label: t({ en: "Labour", id: "Tenaga" }), align: "right", phone: "hidden", cell: (m) => <span className="tabular-nums">{formatRupiah(m.tenaga, lang)}</span> },
                { key: "listrik", label: t({ en: "Power", id: "Listrik" }), align: "right", phone: "hidden", cell: (m) => <span className="tabular-nums">{formatRupiah(m.listrik, lang)}</span> },
                { key: "air", label: t({ en: "Water", id: "Air" }), align: "right", phone: "hidden", cell: (m) => <span className="tabular-nums">{formatRupiah(m.air, lang)}</span> },
                { key: "other", label: t({ en: "Other", id: "Lainnya" }), align: "right", phone: "hidden", cell: (m) => <span className="tabular-nums">{formatRupiah(m.other, lang)}</span> },
                { key: "cost", label: t({ en: "Total cost", id: "Total biaya" }), align: "right", sort: (a, b) => a.cost - b.cost, cell: (m) => <span className="font-medium tabular-nums text-[#0F2F36]">{formatRupiah(m.cost, lang)}</span> },
                { key: "revenue", label: t({ en: "Revenue", id: "Pendapatan" }), align: "right", sort: (a, b) => a.revenue - b.revenue, cell: (m) => <span className="tabular-nums">{formatRupiah(m.revenue, lang)}</span> },
                { key: "net", label: t({ en: "Net", id: "Bersih" }), align: "right", sort: (a, b) => a.revenue - a.cost - (b.revenue - b.cost), cell: (m) => <span className={`font-medium tabular-nums ${m.revenue - m.cost < 0 ? "text-[#B3362C]" : "text-[#0E7A5C]"}`}>{m.revenue - m.cost < 0 ? `-${formatRupiah(m.cost - m.revenue, lang)}` : formatRupiah(m.revenue - m.cost, lang)}</span> },
              ] satisfies Column<(typeof table)[number]>[]}
            />
            <p className="text-[13px] leading-[1.5] text-[#4F6B73]">{t({ en: "Materials count when used, not when bought, and only those with a price. A bill falls in the month its period starts. Revenue is invoices issued, before tax. This is an operational summary, not a financial report.", id: "Bahan dihitung saat dipakai, bukan saat dibeli, dan hanya yang sudah berharga. Tagihan masuk ke bulan awal periodenya. Pendapatan adalah invoice yang diterbitkan, sebelum pajak. Ini ringkasan operasional, bukan laporan keuangan." })}</p>
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
  const t = useT();
  const lang = useLang();
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
    const parsed = parseEntryForm({ amount, scope, batch, area, start, end }, lang);
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
        {!fixedBatch && <Segmented label={t({ en: "Carried", id: "Ditanggung" })} value={scope} options={[{ key: "ruang" as const, label: t({ en: "One room", id: "Satu ruang" }) }, { key: "batch" as const, label: t({ en: "One batch", id: "Satu batch" }) }]} onChange={setScope} />}
        <div className="grid grid-cols-2 gap-3">
          <Field label={t({ en: "Type", id: "Jenis" })}>
            <select className={inputClass} value={category} onChange={(e) => setCategory(e.target.value)}>
              {COST_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{costCategoryLabel(c.key, lang)}</option>)}
            </select>
          </Field>
          <Field label={t({ en: "Amount (Rp)", id: "Jumlah (Rp)" })}><input className={inputClass} inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
        </div>
        {scope === "ruang" ? (
          <>
            <Field label={t({ en: "Room", id: "Ruang" })} hint={t({ en: `Shared out to batches by ${areaBasis(area)} in this period.`, id: `Dibagi ke batch menurut ${areaBasis(area)} dalam periode ini.` })}>
              <select className={inputClass} value={area} onChange={(e) => setArea(e.target.value)}>
                {COST_AREAS.map((a) => <option key={a.key} value={a.key}>{costAreaLabel(a.key, lang)}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t({ en: "Period starts", id: "Periode mulai" })}><input type="date" className={inputClass} value={start} onChange={(e) => setStart(e.target.value)} /></Field>
              <Field label={t({ en: "To", id: "Sampai" })}><input type="date" className={inputClass} min={start} value={end} onChange={(e) => setEnd(e.target.value)} /></Field>
            </div>
          </>
        ) : (
          <div className={fixedBatch ? "" : "grid grid-cols-2 gap-3"}>
            {!fixedBatch && (
              <Field label="Batch">
                <select className={inputClass} value={batch} onChange={(e) => setBatch(e.target.value)}>
                  <option value="">{t({ en: "Choose", id: "Pilih" })}</option>
                  {batches.map((b) => <option key={b.id} value={b.id}>{b.code}</option>)}
                </select>
              </Field>
            )}
            <Field label={t({ en: "Date", id: "Tanggal" })}><input type="date" className={inputClass} value={start} onChange={(e) => setStart(e.target.value)} /></Field>
          </div>
        )}
        <Field label={t({ en: "Description", id: "Keterangan" })}><input className={inputClass} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
        <ActionNote action={action} />
        <PrimaryButton type="submit" disabled={action.busy}>{action.busy ? t({ en: "Saving…", id: "Menyimpan…" }) : t({ en: "Record cost", id: "Catat biaya" })}</PrimaryButton>
      </form>
    </Card>
  );
}

function VoidButton({ entry, onDone }: { entry: string; onDone: () => Promise<void> }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [why, setWhy] = useState("");
  const action = useAction();
  if (!open) return <button type="button" onClick={() => setOpen(true)} className="min-h-[44px] shrink-0 text-[13px] font-medium text-[#4F6B73] hover:text-[#B3362C] sm:min-h-[24px]">{t({ en: "Cancel", id: "Batalkan" })}</button>;
  return (
    <form className="mt-2 w-full space-y-2" onSubmit={(e) => { e.preventDefault(); void action.run(async () => { await voidCostEntry(entry, why); await onDone(); }); }}>
      <Field label={t({ en: "Reason for cancelling", id: "Alasan pembatalan" })}><input className={inputClass} value={why} onChange={(e) => setWhy(e.target.value)} autoFocus /></Field>
      <ActionNote action={{ error: action.error, saved: false }} />
      <div className="flex gap-2">
        <SecondaryButton type="submit" disabled={action.busy || !why.trim()}>{t({ en: "Yes, cancel", id: "Ya, batalkan" })}</SecondaryButton>
        <SecondaryButton onClick={() => setOpen(false)}>{t({ en: "Never mind", id: "Tidak jadi" })}</SecondaryButton>
      </div>
    </form>
  );
}

function BillsTab({ canWrite }: { canWrite: boolean }) {
  const state = useLoad(async () => {
    const [entries, batches] = await Promise.all([fetchCostEntries(), fetchBatchCosts()]);
    return { entries, batches };
  });
  const t = useT();
  const lang = useLang();
  return (
    <DataState state={state}>
      {({ entries, batches }) => (
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0">
            {!canWrite && <div className="mb-3"><ReadOnlyNote who={t({ en: "Production manager or Admin", id: "Manajer produksi atau Admin" })} /></div>}
            <DataTable
              rows={entries}
              rowKey={(e) => e.id}
              noun={t({ en: "bills", id: "tagihan" })}
              searchText={(e) => `${costCategoryLabel(e.category, lang)} ${e.description} ${e.batch_code ?? ""}`}
              searchLabel={t({ en: "Search bills", id: "Cari tagihan" })}
              pills={[
                { key: "live", label: t({ en: "Active", id: "Aktif" }), dot: "#0E9B7A", match: (e) => !e.voided_at },
                { key: "void", label: t({ en: "Cancelled", id: "Dibatalkan" }), dot: "#8FA3A8", match: (e) => !!e.voided_at },
              ]}
              filters={[{ label: t({ en: "Filter by category", id: "Filter kategori" }), all: t({ en: "All categories", id: "Semua kategori" }), value: (e) => costCategoryLabel(e.category, lang) }]}
              empty={t({ en: "No bills yet. Record power, water or other costs here.", id: "Belum ada tagihan. Catat listrik, air, atau biaya lain di sini." })}
              columns={[
                { key: "what", label: t({ en: "Bill", id: "Tagihan" }), track: "minmax(0,1.5fr)", phone: "title", sort: (a, b) => a.category.localeCompare(b.category), cell: (e) => <CellTitle muted={!!e.voided_at} title={<span className={e.voided_at ? "line-through" : ""}>{costCategoryLabel(e.category, lang)}{e.description ? ` · ${e.description}` : ""}</span>} sub={e.voided_at ? `${t({ en: "Cancelled", id: "Dibatalkan" })}: ${e.void_note}` : e.all_days === 0 ? <span className="font-medium text-[#8A5A07]">{t({ en: "Not shared out: this room was empty in that period.", id: "Tidak dibagi: ruang ini kosong pada periode itu." })}</span> : undefined} /> },
                { key: "where", label: t({ en: "Applies to", id: "Berlaku untuk" }), cell: (e) => <span className="text-[13px]">{e.batch_code ? `${e.batch_code} · ${formatLongDate(e.period_start, lang)}` : `${costAreaLabel(e.area, lang)} · ${formatShortDate(e.period_start, lang)} ${t({ en: "to", id: "s.d." })} ${formatShortDate(e.period_end, lang)}`}</span> },
                { key: "amount", label: t({ en: "Amount", id: "Jumlah" }), track: "130px", align: "right", sort: (a, b) => a.amount - b.amount, cell: (e) => <span className={`font-medium tabular-nums ${e.voided_at ? "text-[#4F6B73] line-through" : "text-[#0F2F36]"}`}>{formatRupiah(e.amount, lang)}</span> },
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
  const t = useT();
  const lang = useLang();
  const today = jakartaToday();
  const [type, setType] = useState<string>("karyawan");
  const [starts, setStarts] = useState(today);
  const [hourly, setHourly] = useState("");
  const action = useAction();
  const current = (key: string) => rates.filter((r) => r.person_type === key && r.valid_from <= today).sort((a, b) => b.valid_from.localeCompare(a.valid_from))[0];
  const submit = async () => {
    const value = parseRupiah(hourly);
    if (value === null) return action.setError(t({ en: "The rate must be a number.", id: "Tarif harus berupa angka." }));
    if (await action.run(async () => { await setLaborRate(type, starts, value); await reload(); })) setHourly("");
  };
  return (
    <Card>
      <h2 className={`${sectionTitle} px-4 pt-3`}>{t({ en: "Labour rate per hour", id: "Tarif tenaga kerja per jam" })}</h2>
      <p className="px-4 pb-2 text-[13px] leading-[1.5] text-[#4F6B73]">{t({ en: "Standard rates per type of person, not contract pay, so nobody's pay can be read from a batch's cost. A new rate does not change work hours before its start date.", id: "Tarif standar per jenis personel, bukan gaji kontrak, sehingga gaji siapa pun tidak terbaca dari biaya batch. Tarif baru tidak mengubah jam kerja sebelum tanggal mulainya." })}</p>
      <ul>
        {PERSON_TYPES.map((p) => {
          const rate = current(p.key);
          return (
            <li key={p.key} className="flex justify-between gap-3 border-t border-[#EDF2F2] px-4 py-2 text-[14px]">
              <span className="text-[#0F2F36]">{personTypeLabel(p.key, lang)}</span>
              {rate ? <span className="text-right tabular-nums text-[#0F2F36]">{formatRupiah(rate.hourly_idr, lang)}<span className="block text-[12.5px] text-[#4F6B73]">{t({ en: "since", id: "sejak" })} {formatShortDate(rate.valid_from, lang)}</span></span> : <span className="font-medium text-[#8A5A07]">{t({ en: "None yet", id: "Belum ada" })}</span>}
            </li>
          );
        })}
      </ul>
      {canWrite && (
        <form className="space-y-2 border-t border-[#EDF2F2] p-4" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
          <div className="grid grid-cols-2 gap-2">
            <Field label={t({ en: "Type", id: "Jenis" })}><select className={inputClass} value={type} onChange={(e) => setType(e.target.value)}>{PERSON_TYPES.map((p) => <option key={p.key} value={p.key}>{personTypeLabel(p.key, lang)}</option>)}</select></Field>
            <Field label={t({ en: "Rp per hour", id: "Rp per jam" })}><input className={inputClass} inputMode="numeric" value={hourly} onChange={(e) => setHourly(e.target.value)} /></Field>
          </div>
          <Field label={t({ en: "Applies since", id: "Berlaku sejak" })}><input type="date" className={inputClass} value={starts} onChange={(e) => setStarts(e.target.value)} /></Field>
          <ActionNote action={action} />
          <SecondaryButton type="submit" disabled={action.busy}>{t({ en: "Save rate", id: "Simpan tarif" })}</SecondaryButton>
        </form>
      )}
    </Card>
  );
}

export function LotPriceForm({ lot, unit, onDone }: { lot: string; unit: string; onDone: () => Promise<void> }) {
  const t = useT();
  const [price, setPrice] = useState("");
  const action = useAction();
  const submit = async () => {
    const value = parseRupiah(price);
    if (value === null) return action.setError(t({ en: "Price must be a number.", id: "Harga harus berupa angka." }));
    await action.run(async () => { await setLotPrice(lot, value); await onDone(); });
  };
  return (
    <form className="flex flex-wrap items-center gap-2" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
      <label className="sr-only" htmlFor={`price-${lot}`}>{t({ en: "Price per", id: "Harga per" })} {unit}</label>
      <input id={`price-${lot}`} className={`${inputClass} max-w-[130px]`} inputMode="numeric" placeholder={`Rp per ${unit}`} value={price} onChange={(e) => setPrice(e.target.value)} />
      <SecondaryButton type="submit" disabled={action.busy || !price.trim()}>{t({ en: "Save", id: "Simpan" })}</SecondaryButton>
      {action.error && <p className="w-full text-[13px] text-[#8A5A07]">{action.error}</p>}
    </form>
  );
}

function LotsCard({ lots, canWrite, reload }: { lots: CostLot[]; canWrite: boolean; reload: () => Promise<void> }) {
  const t = useT();
  const lang = useLang();
  const open = lots.filter((l) => l.unit_cost === null);
  const priced = lots.filter((l) => l.unit_cost !== null);
  const row = (l: CostLot) => (
    <li key={l.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-[#EDF2F2] px-4 py-2 text-[14px]">
      <span className="min-w-0">
        <span className="font-medium text-[#0F2F36]">{l.item_name}</span>
        <span className="block text-[13px] text-[#4F6B73]">Lot {l.lot_no}{l.used_in_batches > 0 ? ` · ${t({ en: "used", id: "terpakai" })} ${formatQty(l.used_in_batches, lang)} ${l.unit}` : ""}</span>
      </span>
      {l.unit_cost === null ? (canWrite ? <LotPriceForm lot={l.id} unit={l.unit} onDone={reload} /> : <span className="font-medium text-[#8A5A07]">{t({ en: "No price yet", id: "Belum ada harga" })}</span>) : (
        <span className="text-right tabular-nums text-[#0F2F36]">{formatRupiah(l.unit_cost, lang)}/{l.unit}<span className="block text-[12.5px] text-[#4F6B73]">{l.from_po ? t({ en: "from purchasing", id: "dari pembelian" }) : t({ en: "filled in by hand", id: "diisi manual" })}</span></span>
      )}
    </li>
  );
  return (
    <div className="space-y-3">
      <Card>
        <h2 className={`${sectionTitle} px-4 pt-3`}>{t({ en: "Lots without a price", id: "Lot tanpa harga" })}</h2>
        <p className="px-4 pb-2 text-[13px] leading-[1.5] text-[#4F6B73]">{t({ en: "Lots from a purchase order use that order's price. Lots received directly, seed included, need a price here.", id: "Lot dari pesanan pembelian memakai harga pesanan itu. Lot yang diterima langsung, termasuk benih, perlu diberi harga di sini." })}</p>
        {open.length === 0 ? <p className="border-t border-[#EDF2F2] px-4 py-3 text-[14px] text-[#4F6B73]">{t({ en: "Every lot has a price.", id: "Semua lot sudah berharga." })}</p> : <ul>{open.map(row)}</ul>}
      </Card>
      {priced.length > 0 && <Disclosure title={t({ en: `Lots with a price (${priced.length})`, id: `Lot dengan harga (${priced.length})` })}><Card><ul>{priced.map(row)}</ul></Card></Disclosure>}
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
const TABS: { key: Tab; label: string; labelId: string }[] = [
  { key: "batch", label: "Per batch", labelId: "Per batch" },
  { key: "bulan", label: "Per month", labelId: "Per bulan" },
  { key: "tagihan", label: "Bills", labelId: "Tagihan" },
  { key: "tarif", label: "Rates and prices", labelId: "Tarif dan harga" },
];

export function CostPage() {
  const { canReadCost, canManageProduction } = useErpAccess();
  const [tab, setTab] = useState<Tab>("batch");
  const t = useT();
  const lang = useLang();
  return (
    <ErpPage eyebrow={t({ en: "Costs", id: "Biaya" })} title={t({ en: "Production costs", id: "Biaya produksi" })} sub={t({ en: "Materials, labour, direct bills and the room bills shared out to the batch.", id: "Bahan, tenaga kerja, tagihan langsung, dan tagihan ruang yang dibagi ke batch." })}>
      {!canReadCost ? <Note>{t({ en: "This page is for Production managers, Admins and Leadership.", id: "Halaman ini untuk Manajer produksi, Admin, dan Pimpinan." })}</Note> : (
        <div className="space-y-3">
          <Segmented value={tab} options={TABS.map((x) => ({ key: x.key, label: lang === "id" ? x.labelId : x.label }))} onChange={setTab} />
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
  const t = useT();
  const lang = useLang();
  return (
    <Card>
      <div className="flex items-baseline justify-between gap-3 px-4 py-3">
        <h2 className={sectionTitle}>{title}</h2>
        <p className="text-[14px] font-medium tabular-nums text-[#0F2F36]">{formatRupiah(total, lang)}</p>
      </div>
      {empty ? <p className="border-t border-[#EDF2F2] px-4 py-3 text-[14px] text-[#4F6B73]">{t({ en: "None yet.", id: "Belum ada." })}</p> : <ul>{children}</ul>}
    </Card>
  );
}

function Line({ title, working, amount, children }: { title: string; working: string; amount: number | null; children?: React.ReactNode }) {
  const t = useT();
  const lang = useLang();
  return (
    <li className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-[#EDF2F2] px-4 py-2 text-[14px]">
      <span className="min-w-0 flex-1 basis-[200px]">
        <span className="block text-[#0F2F36]">{title}</span>
        <span className="block text-[13px] tabular-nums text-[#4F6B73]">{working}</span>
      </span>
      {amount === null ? (children ?? <span className="font-medium text-[#8A5A07]">{t({ en: "No price", id: "Tanpa harga" })}</span>) : <span className="tabular-nums text-[#0F2F36]">{formatRupiah(amount, lang)}</span>}
    </li>
  );
}

const directTitle = (d: DirectLine, lang: Lang) => `${costCategoryLabel(d.category, lang)}${d.description ? ` · ${d.description}` : ""}`;

export function CostDetailPage({ id }: { id: string }) {
  const { canReadCost, canManageProduction } = useErpAccess();
  const state = useLoad(async () => {
    const [rows, detail] = await Promise.all([fetchBatchCosts(), fetchBatchCostDetail(id)]);
    return { batch: rows.find((b) => b.id === id) ?? null, detail };
  }, [id]);
  const t = useT();
  const lang = useLang();
  return (
    <ErpPage
      eyebrow={t({ en: "Costs", id: "Biaya" })}
      title={state.data?.batch ? t({ en: `Cost ${state.data.batch.code}`, id: `Biaya ${state.data.batch.code}` }) : t({ en: "Batch costs", id: "Biaya batch" })}
      sub={state.data?.batch ? `${state.data.batch.crop_name} ${state.data.batch.crop_variety}`.trim() : undefined}
      actions={<Link to="/erp/costs" className={`inline-flex items-center ${textLink}`}>{t({ en: "All costs", id: "Semua biaya" })}</Link>}
    >
      {!canReadCost ? <Note>{t({ en: "This page is for Production managers, Admins and Leadership.", id: "Halaman ini untuk Manajer produksi, Admin, dan Pimpinan." })}</Note> : (
        <DataState state={state}>
          {({ batch, detail }) => {
            if (!batch) return <Card className="px-4 py-8 text-center text-[14px] text-[#4F6B73]">{t({ en: "This batch has not started or was not found.", id: "Batch ini belum dimulai atau tidak ditemukan." })}</Card>;
            const total = batchTotal(batch);
            const whole = perKg(total, batch.harvested_kg);
            const sellable = perKg(total, batch.sellable_kg);
            const price = perKg(batch.revenue, batch.sold_kg);
            const gaps = costGaps(batch, lang);
            return (
              <div className="space-y-4">
                {batch.status === "berjalan" && <Note>{t({ en: "This batch is still running, so this figure is provisional. New costs may be added, and its share of room bills changes if another batch is in the same period.", id: "Batch ini masih berjalan, jadi angka ini sementara. Biaya baru bisa bertambah, dan bagian tagihan ruangnya berubah jika ada batch lain di periode yang sama." })}</Note>}
                {gaps.length > 0 && <Note tone="warn">{t({ en: `Incomplete: ${gaps.join(", ")}. The total below is lower than the real one.`, id: `Belum lengkap: ${gaps.join(", ")}. Total di bawah lebih rendah dari yang sebenarnya.` })}</Note>}
                <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                  <Kpi label={t({ en: "Total cost", id: "Total biaya" })} value={formatRupiah(total, lang)} sub={batch.minutes ? t({ en: `${formatHours(batch.minutes)} of work`, id: `${formatHours(batch.minutes, lang)} kerja` }) : t({ en: "No work hours yet", id: "Belum ada jam kerja" })} />
                  <Kpi label={t({ en: "Per kg harvested", id: "Per kg panen" })} value={money(whole, lang)} sub={batch.harvested_kg > 0 ? t({ en: `${formatQty(batch.harvested_kg)} kg including rejects`, id: `${formatQty(batch.harvested_kg, lang)} kg termasuk afkir` }) : t({ en: "Not harvested", id: "Belum panen" })} />
                  <Kpi label={t({ en: "Per sellable kg", id: "Per kg layak jual" })} value={money(sellable, lang)} sub={batch.sellable_kg > 0 ? t({ en: `${formatQty(batch.sellable_kg)} kg of grade A and B`, id: `${formatQty(batch.sellable_kg, lang)} kg grade A dan B` }) : t({ en: "None yet", id: "Belum ada" })} />
                  <Kpi label={t({ en: "Selling price per kg", id: "Harga jual per kg" })} value={money(price, lang)} sub={batch.sold_kg > 0 ? t({ en: `${formatQty(batch.sold_kg)} kg delivered`, id: `${formatQty(batch.sold_kg, lang)} kg dikirim` }) : t({ en: "Not sold yet", id: "Belum terjual" })} />
                </div>
                <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
                  <div className="min-w-0 space-y-4">
                    <PartCard title={t({ en: "Materials", id: "Bahan" })} total={batch.material} empty={detail.materials.length === 0}>
                      {detail.materials.map((m) => (
                        <Line key={m.lot_id} title={`${m.item_name} · lot ${m.lot_no}`} working={m.unit_cost === null ? `${formatQty(m.qty, lang)} ${m.unit}` : `${formatQty(m.qty, lang)} ${m.unit} × ${formatRupiah(m.unit_cost, lang)}`} amount={m.amount}>
                          {canManageProduction && !m.from_po ? <LotPriceForm lot={m.lot_id} unit={m.unit} onDone={state.reload} /> : undefined}
                        </Line>
                      ))}
                    </PartCard>
                    <PartCard title={t({ en: "Labour", id: "Tenaga kerja" })} total={batch.labor} empty={detail.labor.length === 0}>
                      {detail.labor.map((l) => (
                        <Line key={`${l.person_type}-${l.hourly_idr}`} title={personTypeLabel(l.person_type, lang)} working={l.hourly_idr === null ? formatHours(l.minutes, lang) : `${formatHours(l.minutes, lang)} × ${formatRupiah(l.hourly_idr, lang)}`} amount={l.amount}>
                          <Link to="/erp/costs" className="text-[14px] font-medium text-[#8A5A07] hover:underline">{t({ en: "No rate yet", id: "Belum ada tarif" })}</Link>
                        </Line>
                      ))}
                    </PartCard>
                  </div>
                  <div className="min-w-0 space-y-4">
                    <PartCard title={t({ en: "Direct bills", id: "Tagihan langsung" })} total={batch.direct} empty={detail.direct.length === 0}>
                      {detail.direct.map((d) => <Line key={d.id} title={directTitle(d, lang)} working={formatLongDate(d.spent_on, lang)} amount={d.amount} />)}
                    </PartCard>
                    <PartCard title={t({ en: "Share of room bills", id: "Bagian tagihan ruang" })} total={batch.shared} empty={detail.shared.length === 0}>
                      {detail.shared.map((s) => (
                        <Line
                          key={s.entry_id}
                          title={`${costCategoryLabel(s.category, lang)} · ${costAreaLabel(s.area, lang)}${s.description ? ` · ${s.description}` : ""}`}
                          working={t({ en: `${formatRupiah(s.total)} × ${s.batch_days} of ${s.all_days} ${areaBasis(s.area)}, ${formatShortDate(s.period_start)} to ${formatShortDate(s.period_end)}`, id: `${formatRupiah(s.total, lang)} × ${s.batch_days} dari ${s.all_days} ${areaBasis(s.area)}, ${formatShortDate(s.period_start, lang)} s.d. ${formatShortDate(s.period_end, lang)}` })}
                          amount={s.amount}
                        />
                      ))}
                    </PartCard>
                    {canManageProduction && <Disclosure title={t({ en: "Record a cost for this batch", id: "Catat biaya untuk batch ini" })}><EntryForm batches={[]} fixedBatch={batch.id} onSaved={state.reload} /></Disclosure>}
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
