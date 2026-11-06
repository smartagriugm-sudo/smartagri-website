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

// What things cost. Each batch's figure opens into the lines behind it, so it can be
// checked with a calculator. A batch still running is marked as provisional, and a total
// missing a price says so next to the number.

const sectionTitle = "text-[16px] font-medium tracking-[-0.02em] text-[#0F2F36]";
const textLink = "min-h-[44px] text-[14px] font-medium text-[#0B6477] hover:underline sm:min-h-[24px]";
const money = (value: number | null) => (value === null ? "-" : formatRupiah(value));
const STATUS_LABEL: Record<string, string> = { berjalan: "Berjalan, sementara", selesai: "Selesai", gagal: "Gagal" };
const monthLabel = (month: string) => new Intl.DateTimeFormat("id-ID", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}T00:00:00Z`));

/* ---------------------------------------------------------------- per batch */

function downloadCsv(rows: BatchCost[]) {
  // The mark lets a spreadsheet read it as UTF-8.
  const url = URL.createObjectURL(new Blob([`﻿${batchCostsCsv(rows)}`], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `biaya-batch-${jakartaToday()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function BatchesTab() {
  const state = useLoad(fetchBatchCosts);
  return (
    <DataState state={state}>
      {(rows) => {
        if (rows.length === 0) return <Card className="px-4 py-8 text-center text-[14px] text-[#4F6B73]">Belum ada batch yang berjalan.</Card>;
        const incomplete = rows.filter((b) => costGaps(b).length > 0).length;
        return (
          <div className="space-y-3">
            {incomplete > 0 && <Note tone="warn">{incomplete} batch belum lengkap karena ada lot tanpa harga atau jam kerja tanpa tarif. Isi di tab Tarif dan harga. Totalnya saat ini lebih rendah dari sebenarnya.</Note>}
            <div className="flex justify-end"><SecondaryButton onClick={() => downloadCsv(rows)}><Download className="h-4 w-4" /> Unduh CSV</SecondaryButton></div>

            <ul className="space-y-2 md:hidden">
              {rows.map((b) => {
                const total = batchTotal(b);
                const kg = perKg(total, b.harvested_kg);
                const gaps = costGaps(b);
                return (
                  <li key={b.id}>
                    <Link to="/erp/biaya/$id" params={{ id: b.id }} className="block rounded-xl border border-[#DCE7E8] bg-white p-3.5">
                      <span className="flex items-baseline justify-between gap-3">
                        <span className="text-[14px] font-medium text-[#0B6477]">{b.code}</span>
                        <span className="text-[15px] font-medium tabular-nums text-[#0F2F36]">{formatRupiah(total)}</span>
                      </span>
                      <span className="mt-0.5 flex items-baseline justify-between gap-3 text-[13px] text-[#4F6B73]">
                        <span className="min-w-0 truncate">{b.crop_name} · {STATUS_LABEL[b.status] ?? b.status}</span>
                        <span className="shrink-0 tabular-nums">{kg === null ? "Belum panen" : `${formatRupiah(kg)}/kg`}</span>
                      </span>
                      {gaps.length > 0 && <span className="mt-1 block text-[13px] font-medium text-[#8A5A07]">{gaps.join(" · ")}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>

            <Card className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[820px] text-left text-[14px]">
                <thead>
                  <tr className="text-[13px] text-[#4F6B73]">
                    <th className="px-4 py-2.5 font-medium">Batch</th>
                    <th className="px-2 py-2.5 text-right font-medium">Bahan</th>
                    <th className="px-2 py-2.5 text-right font-medium">Tenaga</th>
                    <th className="px-2 py-2.5 text-right font-medium">Langsung</th>
                    <th className="px-2 py-2.5 text-right font-medium">Bersama</th>
                    <th className="px-2 py-2.5 text-right font-medium">Total</th>
                    <th className="px-2 py-2.5 text-right font-medium">Panen</th>
                    <th className="px-4 py-2.5 text-right font-medium">Per kg</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((b) => {
                    const total = batchTotal(b);
                    const gaps = costGaps(b);
                    return (
                      <tr key={b.id} className="border-t border-[#EDF2F2] align-top">
                        <td className="px-4 py-2.5">
                          <Link to="/erp/biaya/$id" params={{ id: b.id }} className="font-medium text-[#0B6477] hover:underline">{b.code}</Link>
                          <span className="block text-[13px] text-[#4F6B73]">{b.crop_name} · {STATUS_LABEL[b.status] ?? b.status}</span>
                          {gaps.length > 0 && <span className="block text-[13px] font-medium text-[#8A5A07]">{gaps.join(" · ")}</span>}
                        </td>
                        <td className="px-2 py-2.5 text-right tabular-nums">{formatRupiah(b.material)}</td>
                        <td className="px-2 py-2.5 text-right tabular-nums">{formatRupiah(b.labor)}</td>
                        <td className="px-2 py-2.5 text-right tabular-nums">{formatRupiah(b.direct)}</td>
                        <td className="px-2 py-2.5 text-right tabular-nums">{formatRupiah(b.shared)}</td>
                        <td className="px-2 py-2.5 text-right font-medium tabular-nums text-[#0F2F36]">{formatRupiah(total)}</td>
                        <td className="px-2 py-2.5 text-right tabular-nums">{b.harvested_kg > 0 ? `${formatQty(b.harvested_kg)} kg` : "-"}</td>
                        <td className="px-4 py-2.5 text-right font-medium tabular-nums text-[#0F2F36]">{money(perKg(total, b.harvested_kg))}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
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
        if (table.length === 0) return <Card className="px-4 py-8 text-center text-[14px] text-[#4F6B73]">Belum ada biaya atau pendapatan dalam 12 bulan terakhir.</Card>;
        return (
          <div className="space-y-3">
            <Card className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-[14px]">
                <thead>
                  <tr className="text-[13px] text-[#4F6B73]">
                    <th className="px-4 py-2.5 font-medium">Bulan</th>
                    {["Bahan", "Tenaga", "Listrik", "Air", "Lainnya", "Total biaya", "Pendapatan", "Selisih"].map((h) => <th key={h} className="px-2 py-2.5 text-right font-medium last:pr-4">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {table.map((m) => (
                    <tr key={m.month} className="border-t border-[#EDF2F2]">
                      <td className="whitespace-nowrap px-4 py-2.5 font-medium text-[#0F2F36]">{monthLabel(m.month)}</td>
                      {[m.bahan, m.tenaga, m.listrik, m.air, m.other].map((v, i) => <td key={i} className="px-2 py-2.5 text-right tabular-nums">{formatRupiah(v)}</td>)}
                      <td className="px-2 py-2.5 text-right font-medium tabular-nums text-[#0F2F36]">{formatRupiah(m.cost)}</td>
                      <td className="px-2 py-2.5 text-right tabular-nums">{formatRupiah(m.revenue)}</td>
                      <td className={`px-2 py-2.5 pr-4 text-right font-medium tabular-nums ${m.revenue - m.cost < 0 ? "text-[#B3362C]" : "text-[#0E7A5C]"}`}>{m.revenue - m.cost < 0 ? `-${formatRupiah(m.cost - m.revenue)}` : formatRupiah(m.revenue - m.cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
            <p className="text-[13px] leading-[1.5] text-[#4F6B73]">Bahan dihitung saat dipakai, bukan saat dibeli, dan hanya yang punya harga. Tagihan masuk bulan awal periodenya. Pendapatan adalah invoice terbit sebelum pajak. Ini ringkasan operasional, bukan laporan keuangan.</p>
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
        {!fixedBatch && <Segmented label="Ditanggung" value={scope} options={[{ key: "ruang" as const, label: "Satu ruang" }, { key: "batch" as const, label: "Satu batch" }]} onChange={setScope} />}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Jenis">
            <select className={inputClass} value={category} onChange={(e) => setCategory(e.target.value)}>
              {COST_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </Field>
          <Field label="Jumlah (Rp)"><input className={inputClass} inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
        </div>
        {scope === "ruang" ? (
          <>
            <Field label="Ruang" hint={`Dibagi ke batch menurut ${areaBasis(area)} dalam periode ini.`}>
              <select className={inputClass} value={area} onChange={(e) => setArea(e.target.value)}>
                {COST_AREAS.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Periode mulai"><input type="date" className={inputClass} value={start} onChange={(e) => setStart(e.target.value)} /></Field>
              <Field label="Sampai"><input type="date" className={inputClass} min={start} value={end} onChange={(e) => setEnd(e.target.value)} /></Field>
            </div>
          </>
        ) : (
          <div className={fixedBatch ? "" : "grid grid-cols-2 gap-3"}>
            {!fixedBatch && (
              <Field label="Batch">
                <select className={inputClass} value={batch} onChange={(e) => setBatch(e.target.value)}>
                  <option value="">Pilih</option>
                  {batches.map((b) => <option key={b.id} value={b.id}>{b.code}</option>)}
                </select>
              </Field>
            )}
            <Field label="Tanggal"><input type="date" className={inputClass} value={start} onChange={(e) => setStart(e.target.value)} /></Field>
          </div>
        )}
        <Field label="Keterangan"><input className={inputClass} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
        <ActionNote action={action} />
        <PrimaryButton type="submit" disabled={action.busy}>{action.busy ? "Menyimpan..." : "Catat biaya"}</PrimaryButton>
      </form>
    </Card>
  );
}

function VoidButton({ entry, onDone }: { entry: string; onDone: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [why, setWhy] = useState("");
  const action = useAction();
  if (!open) return <button type="button" onClick={() => setOpen(true)} className="min-h-[44px] shrink-0 text-[13px] font-medium text-[#4F6B73] hover:text-[#B3362C] sm:min-h-[24px]">Batalkan</button>;
  return (
    <form className="mt-2 w-full space-y-2" onSubmit={(e) => { e.preventDefault(); void action.run(async () => { await voidCostEntry(entry, why); await onDone(); }); }}>
      <Field label="Alasan pembatalan"><input className={inputClass} value={why} onChange={(e) => setWhy(e.target.value)} autoFocus /></Field>
      <ActionNote action={{ error: action.error, saved: false }} />
      <div className="flex gap-2">
        <SecondaryButton type="submit" disabled={action.busy || !why.trim()}>Ya, batalkan</SecondaryButton>
        <SecondaryButton onClick={() => setOpen(false)}>Tidak jadi</SecondaryButton>
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
            {!canWrite && <div className="mb-3"><ReadOnlyNote who="Manajer produksi atau Admin" /></div>}
            <Card>
              {entries.length === 0 ? <p className="px-4 py-8 text-center text-[14px] text-[#4F6B73]">Belum ada tagihan. Catat listrik, air, atau biaya lain di sini.</p> : (
                <ul>
                  {entries.map((e) => (
                    <li key={e.id} className="flex flex-wrap items-start justify-between gap-x-3 border-t border-[#EDF2F2] px-4 py-2.5 first:border-0">
                      <span className="min-w-0 flex-1 basis-[200px]">
                        <span className={`block text-[14px] font-medium ${e.voided_at ? "text-[#4F6B73] line-through" : "text-[#0F2F36]"}`}>{costCategoryLabel(e.category)}{e.description ? ` · ${e.description}` : ""}</span>
                        <span className="block text-[13px] text-[#4F6B73]">
                          {e.batch_code ? `${e.batch_code} · ${formatLongDate(e.period_start)}` : `${costAreaLabel(e.area)} · ${formatShortDate(e.period_start)} sampai ${formatShortDate(e.period_end)}`}
                        </span>
                        {e.voided_at && <span className="block text-[13px] text-[#4F6B73]">Dibatalkan: {e.void_note}</span>}
                        {!e.voided_at && e.all_days === 0 && <span className="block text-[13px] font-medium text-[#8A5A07]">Belum terbagi: ruang ini kosong pada periode tersebut.</span>}
                      </span>
                      <span className="flex items-center gap-3">
                        <span className={`text-[14px] font-medium tabular-nums ${e.voided_at ? "text-[#4F6B73] line-through" : "text-[#0F2F36]"}`}>{formatRupiah(e.amount)}</span>
                        {canWrite && !e.voided_at && <VoidButton entry={e.id} onDone={state.reload} />}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
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
    if (value === null) return action.setError("Tarif harus berupa angka.");
    if (await action.run(async () => { await setLaborRate(type, starts, value); await reload(); })) setHourly("");
  };
  return (
    <Card>
      <h2 className={`${sectionTitle} px-4 pt-3`}>Tarif tenaga per jam</h2>
      <p className="px-4 pb-2 text-[13px] leading-[1.5] text-[#4F6B73]">Tarif standar per jenis orang, bukan upah di kontrak, supaya upah seseorang tidak terbaca dari biaya batch. Tarif baru tidak mengubah jam kerja sebelum tanggal berlakunya.</p>
      <ul>
        {PERSON_TYPES.map((t) => {
          const rate = current(t.key);
          return (
            <li key={t.key} className="flex justify-between gap-3 border-t border-[#EDF2F2] px-4 py-2 text-[14px]">
              <span className="text-[#0F2F36]">{t.label}</span>
              {rate ? <span className="text-right tabular-nums text-[#0F2F36]">{formatRupiah(rate.hourly_idr)}<span className="block text-[12.5px] text-[#4F6B73]">sejak {formatShortDate(rate.valid_from)}</span></span> : <span className="font-medium text-[#8A5A07]">Belum ada</span>}
            </li>
          );
        })}
      </ul>
      {canWrite && (
        <form className="space-y-2 border-t border-[#EDF2F2] p-4" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Jenis"><select className={inputClass} value={type} onChange={(e) => setType(e.target.value)}>{PERSON_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}</select></Field>
            <Field label="Rp per jam"><input className={inputClass} inputMode="numeric" value={hourly} onChange={(e) => setHourly(e.target.value)} /></Field>
          </div>
          <Field label="Berlaku sejak"><input type="date" className={inputClass} value={starts} onChange={(e) => setStarts(e.target.value)} /></Field>
          <ActionNote action={action} />
          <SecondaryButton type="submit" disabled={action.busy}>Simpan tarif</SecondaryButton>
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
    if (value === null) return action.setError("Harga harus berupa angka.");
    await action.run(async () => { await setLotPrice(lot, value); await onDone(); });
  };
  return (
    <form className="flex flex-wrap items-center gap-2" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
      <label className="sr-only" htmlFor={`price-${lot}`}>Harga per {unit}</label>
      <input id={`price-${lot}`} className={`${inputClass} max-w-[130px]`} inputMode="numeric" placeholder={`Rp per ${unit}`} value={price} onChange={(e) => setPrice(e.target.value)} />
      <SecondaryButton type="submit" disabled={action.busy || !price.trim()}>Simpan</SecondaryButton>
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
        <span className="block text-[13px] text-[#4F6B73]">Lot {l.lot_no}{l.used_in_batches > 0 ? ` · terpakai ${formatQty(l.used_in_batches)} ${l.unit}` : ""}</span>
      </span>
      {l.unit_cost === null ? (canWrite ? <LotPriceForm lot={l.id} unit={l.unit} onDone={reload} /> : <span className="font-medium text-[#8A5A07]">Belum ada harga</span>) : (
        <span className="text-right tabular-nums text-[#0F2F36]">{formatRupiah(l.unit_cost)}/{l.unit}<span className="block text-[12.5px] text-[#4F6B73]">{l.from_po ? "dari pembelian" : "diisi manual"}</span></span>
      )}
    </li>
  );
  return (
    <div className="space-y-3">
      <Card>
        <h2 className={`${sectionTitle} px-4 pt-3`}>Lot tanpa harga</h2>
        <p className="px-4 pb-2 text-[13px] leading-[1.5] text-[#4F6B73]">Lot dari pesanan pembelian memakai harga pesanannya. Lot yang diterima langsung, termasuk benih, perlu diisi di sini.</p>
        {open.length === 0 ? <p className="border-t border-[#EDF2F2] px-4 py-3 text-[14px] text-[#4F6B73]">Semua lot sudah punya harga.</p> : <ul>{open.map(row)}</ul>}
      </Card>
      {priced.length > 0 && <Disclosure title={`Lot yang sudah punya harga (${priced.length})`}><Card><ul>{priced.map(row)}</ul></Card></Disclosure>}
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
  { key: "bulan", label: "Per bulan" },
  { key: "tagihan", label: "Tagihan" },
  { key: "tarif", label: "Tarif dan harga" },
];

export function CostPage() {
  const { canReadCost, canManageProduction } = useErpAccess();
  const [tab, setTab] = useState<Tab>("batch");
  return (
    <ErpPage eyebrow="Biaya" title="Biaya produksi" sub="Bahan, tenaga, tagihan langsung, dan tagihan ruang yang dibagi ke batch.">
      {!canReadCost ? <Note>Halaman ini untuk Manajer produksi, Admin, dan Pimpinan.</Note> : (
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
      {empty ? <p className="border-t border-[#EDF2F2] px-4 py-3 text-[14px] text-[#4F6B73]">Belum ada.</p> : <ul>{children}</ul>}
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
      {amount === null ? (children ?? <span className="font-medium text-[#8A5A07]">Tanpa harga</span>) : <span className="tabular-nums text-[#0F2F36]">{formatRupiah(amount)}</span>}
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
      eyebrow="Biaya"
      title={state.data?.batch ? `Biaya ${state.data.batch.code}` : "Biaya batch"}
      sub={state.data?.batch ? `${state.data.batch.crop_name} ${state.data.batch.crop_variety}`.trim() : undefined}
      actions={<Link to="/erp/biaya" className={`inline-flex items-center ${textLink}`}>Semua biaya</Link>}
    >
      {!canReadCost ? <Note>Halaman ini untuk Manajer produksi, Admin, dan Pimpinan.</Note> : (
        <DataState state={state}>
          {({ batch, detail }) => {
            if (!batch) return <Card className="px-4 py-8 text-center text-[14px] text-[#4F6B73]">Batch ini belum berjalan atau tidak ditemukan.</Card>;
            const total = batchTotal(batch);
            const whole = perKg(total, batch.harvested_kg);
            const sellable = perKg(total, batch.sellable_kg);
            const price = perKg(batch.revenue, batch.sold_kg);
            const gaps = costGaps(batch);
            return (
              <div className="space-y-4">
                {batch.status === "berjalan" && <Note>Batch masih berjalan, jadi angka ini sementara. Biaya baru bisa bertambah, dan bagian tagihan ruang berubah kalau ada batch lain di periode yang sama.</Note>}
                {gaps.length > 0 && <Note tone="warn">Belum lengkap: {gaps.join(", ")}. Total di bawah lebih rendah dari sebenarnya.</Note>}
                <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                  <Kpi label="Total biaya" value={formatRupiah(total)} sub={batch.minutes ? `${formatHours(batch.minutes)} kerja` : "Belum ada jam kerja"} />
                  <Kpi label="Per kg panen" value={money(whole)} sub={batch.harvested_kg > 0 ? `${formatQty(batch.harvested_kg)} kg termasuk afkir` : "Belum panen"} />
                  <Kpi label="Per kg layak jual" value={money(sellable)} sub={batch.sellable_kg > 0 ? `${formatQty(batch.sellable_kg)} kg grade A dan B` : "Belum ada"} />
                  <Kpi label="Harga jual per kg" value={money(price)} sub={batch.sold_kg > 0 ? `${formatQty(batch.sold_kg)} kg terkirim` : "Belum terjual"} />
                </div>
                <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
                  <div className="min-w-0 space-y-4">
                    <PartCard title="Bahan" total={batch.material} empty={detail.materials.length === 0}>
                      {detail.materials.map((m) => (
                        <Line key={m.lot_id} title={`${m.item_name} · lot ${m.lot_no}`} working={m.unit_cost === null ? `${formatQty(m.qty)} ${m.unit}` : `${formatQty(m.qty)} ${m.unit} × ${formatRupiah(m.unit_cost)}`} amount={m.amount}>
                          {canManageProduction && !m.from_po ? <LotPriceForm lot={m.lot_id} unit={m.unit} onDone={state.reload} /> : undefined}
                        </Line>
                      ))}
                    </PartCard>
                    <PartCard title="Tenaga" total={batch.labor} empty={detail.labor.length === 0}>
                      {detail.labor.map((l) => (
                        <Line key={`${l.person_type}-${l.hourly_idr}`} title={personTypeLabel(l.person_type)} working={l.hourly_idr === null ? formatHours(l.minutes) : `${formatHours(l.minutes)} × ${formatRupiah(l.hourly_idr)}`} amount={l.amount}>
                          <Link to="/erp/biaya" className="text-[14px] font-medium text-[#8A5A07] hover:underline">Belum ada tarif</Link>
                        </Line>
                      ))}
                    </PartCard>
                  </div>
                  <div className="min-w-0 space-y-4">
                    <PartCard title="Tagihan langsung" total={batch.direct} empty={detail.direct.length === 0}>
                      {detail.direct.map((d) => <Line key={d.id} title={directTitle(d)} working={formatLongDate(d.spent_on)} amount={d.amount} />)}
                    </PartCard>
                    <PartCard title="Bagian tagihan ruang" total={batch.shared} empty={detail.shared.length === 0}>
                      {detail.shared.map((s) => (
                        <Line
                          key={s.entry_id}
                          title={`${costCategoryLabel(s.category)} · ${costAreaLabel(s.area)}${s.description ? ` · ${s.description}` : ""}`}
                          working={`${formatRupiah(s.total)} × ${s.batch_days} dari ${s.all_days} ${areaBasis(s.area)}, ${formatShortDate(s.period_start)} sampai ${formatShortDate(s.period_end)}`}
                          amount={s.amount}
                        />
                      ))}
                    </PartCard>
                    {canManageProduction && <Disclosure title="Catat biaya untuk batch ini"><EntryForm batches={[]} fixedBatch={batch.id} onSaved={state.reload} /></Disclosure>}
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
