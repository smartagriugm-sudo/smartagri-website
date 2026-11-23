import { useState } from "react";
import { jakartaToday } from "../../lib/pf/batch";
import { formatLongDate } from "../../lib/pf/dashboard";
import { ITEM_CATEGORIES, applyCount, fetchCounts, fetchStockLots, formatQty, parseCountRows, type StockLotRow } from "../../lib/pf/inventory";
import { useLang, useT } from "../../lib/i18n";
import { ActionNote, DataState, ErpPage, Field, PrimaryButton, ReadOnlyNote, SecondaryButton, inputClass, useAction, useErpAccess, useLoad } from "./page";
import { Card } from "./ui";
import DataTable, { CellTitle, type Column } from "./DataTable";

// Counting the shelf. Type what is really there; what differs becomes a stock move
// with the date on it. A box left empty means that lot was not counted, so a count
// can be done one shelf at a time.

export default function StockCountPage() {
  const state = useLoad(async () => {
    const [lots, counts] = await Promise.all([fetchStockLots(), fetchCounts()]);
    return { lots, counts };
  });
  const { canManageProduction } = useErpAccess();
  const today = jakartaToday();
  const [values, setValues] = useState<Record<string, string>>({});
  const [countedOn, setCountedOn] = useState(today);
  const [notes, setNotes] = useState("");
  const [asking, setAsking] = useState(false);
  const action = useAction();
  const t = useT();
  const lang = useLang();

  const number = (s: string) => Number(s.trim().replace(",", "."));
  const typed = (l: StockLotRow) => (values[l.id] ?? "").trim() !== "";
  const diff = (l: StockLotRow) => (typed(l) ? number(values[l.id]) - l.qty_on_hand : 0);

  return (
    <ErpPage eyebrow={t({ en: "Inventory", id: "Inventaris" })} title={t({ en: "Stock count", id: "Stok opname" })} sub={t({ en: "Count the physical stock, then compare it with the record. A box left empty means that lot was not counted.", id: "Hitung stok fisik, lalu bandingkan dengan catatan. Kotak yang dibiarkan kosong berarti lot itu tidak dihitung." })}>
      <DataState state={state}>
        {({ lots, counts }) => {
          const shown = lots.filter((l) => l.qty_on_hand > 0 || typed(l)).sort((a, b) => a.item_name.localeCompare(b.item_name) || a.lot_no.localeCompare(b.lot_no));
          const filled = lots.filter(typed);
          const differing = filled.filter((l) => Math.abs(diff(l)) > 0);

          const apply = async () => {
            const parsed = parseCountRows(filled.map((l) => ({ lotId: l.id, counted: values[l.id] })), lang);
            if (parsed.error !== null) return action.setError(parsed.error);
            const saved = await action.run(async () => {
              await applyCount(countedOn, notes, parsed.rows);
              await state.reload();
            });
            if (saved) {
              setValues({});
              setNotes("");
              setAsking(false);
            }
          };

          return (
            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="min-w-0 space-y-3">
                {!canManageProduction && <ReadOnlyNote who={t({ en: "Production manager", id: "Manajer produksi" })} />}
                <DataTable
                  rows={shown}
                  rowKey={(l) => l.id}
                  noun={t({ en: "lots", id: "lot" })}
                  searchText={(l) => `${l.item_name} ${l.lot_no} ${l.sku}`}
                  searchLabel={t({ en: "Search by item, SKU or lot", id: "Cari barang, SKU, atau lot" })}
                  pills={ITEM_CATEGORIES.map((c) => ({ key: c.key, label: lang === "id" ? c.labelId : c.label, match: (l: StockLotRow) => l.category === c.key }))}
                  empty={t({ en: "No lots with stock left.", id: "Tidak ada lot yang masih berstok." })}
                  columns={[
                    { key: "item", label: t({ en: "Item and lot", id: "Barang dan lot" }), phone: "title", sort: (a, b) => a.item_name.localeCompare(b.item_name), cell: (l) => <CellTitle title={l.item_name} sub={`${l.lot_no}${l.expiry_date ? ` · ${t({ en: "until", id: "sampai" })} ${formatLongDate(l.expiry_date, lang)}` : ""}`} /> },
                    { key: "book", label: t({ en: "On record", id: "Tercatat" }), track: "130px", align: "right", sort: (a, b) => a.qty_on_hand - b.qty_on_hand, cell: (l) => <span className="whitespace-nowrap tabular-nums">{formatQty(l.qty_on_hand, l.unit, lang)}</span> },
                    { key: "count", label: t({ en: "Counted", id: "Dihitung" }), track: "120px", interactive: true, cell: (l) => (
                      <input
                        className={inputClass}
                        inputMode="decimal"
                        disabled={!canManageProduction}
                        aria-label={t({ en: `Counted ${l.item_name} lot ${l.lot_no} in ${l.unit}`, id: `Hasil hitung ${l.item_name} lot ${l.lot_no} dalam ${l.unit}` })}
                        placeholder={t({ en: "Count", id: "Hitung" })}
                        value={values[l.id] ?? ""}
                        onChange={(e) => { setAsking(false); setValues((v) => ({ ...v, [l.id]: e.target.value })); }}
                      />
                    ) },
                    { key: "diff", label: t({ en: "Difference", id: "Selisih" }), track: "110px", align: "right", cell: (l) => {
                      const d = diff(l);
                      return <span className={`text-[13px] tabular-nums ${typed(l) && d !== 0 ? "font-medium text-[#8A5A07]" : "text-[#4F6B73]"}`}>{!typed(l) ? "" : Number.isNaN(d) ? t({ en: "Not a number", id: "Bukan angka" }) : d === 0 ? t({ en: "Matches", id: "Sesuai" }) : `${d > 0 ? "+" : ""}${d.toLocaleString(lang === "id" ? "id-ID" : "en-GB", { maximumFractionDigits: 2 })} ${l.unit}`}</span>;
                    } },
                  ] satisfies Column<StockLotRow>[]}
                />
              </div>
              <div className="min-w-0 space-y-4">
                {canManageProduction && (
                  <Card className="space-y-3 p-4">
                    <h2 className="text-[16px] font-medium tracking-[-0.02em] text-[#0F2F36]">{t({ en: "Save results", id: "Simpan hasil" })}</h2>
                    <p className="text-[14px] text-[#4F6B73]">{t({ en: `${filled.length} lots counted, ${differing.length} differ from the record.`, id: `${filled.length} lot dihitung, ${differing.length} berbeda dari catatan.` })}</p>
                    <Field label={t({ en: "Count date", id: "Tanggal hitung" })}><input type="date" className={inputClass} max={today} value={countedOn} onChange={(e) => setCountedOn(e.target.value)} /></Field>
                    <Field label={t({ en: "Notes", id: "Catatan" })}><input className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
                    <ActionNote action={action} />
                    {asking ? (
                      <div className="space-y-2 rounded-lg bg-[#FFF6E5] p-2.5">
                        <p className="text-[13.5px] text-[#4F6B73]">{t({ en: `Stock ${differing.length} lots will change to match the count. The change is recorded and can only be reversed with a new correction.`, id: `Stok ${differing.length} lot akan diubah sesuai hasil hitung. Perubahan dicatat dan hanya bisa dibalik dengan koreksi baru.` })}</p>
                        <div className="flex flex-wrap gap-2">
                          <PrimaryButton disabled={action.busy} onClick={() => void apply()}>{action.busy ? t({ en: "Saving…", id: "Menyimpan…" }) : t({ en: "Yes, save", id: "Ya, simpan" })}</PrimaryButton>
                          <SecondaryButton onClick={() => setAsking(false)}>{t({ en: "Cancel", id: "Batal" })}</SecondaryButton>
                        </div>
                      </div>
                    ) : (
                      <PrimaryButton disabled={filled.length === 0} onClick={() => setAsking(true)}>{t({ en: "Save stock count", id: "Simpan stok opname" })}</PrimaryButton>
                    )}
                  </Card>
                )}
                <Card>
                  <h2 className="px-4 py-3 text-[16px] font-medium tracking-[-0.02em] text-[#0F2F36]">{t({ en: "Earlier stock counts", id: "Stok opname sebelumnya" })}</h2>
                  {counts.length === 0 ? (
                    <p className="border-t border-[#EDF2F2] px-4 py-3 text-[14px] text-[#4F6B73]">{t({ en: "No stock count yet.", id: "Belum ada stok opname." })}</p>
                  ) : (
                    <ul>
                      {counts.map((c) => (
                        <li key={c.id} className="border-t border-[#EDF2F2] px-4 py-2 text-[14px]">
                          <span className="font-medium text-[#0F2F36]">{formatLongDate(c.counted_on, lang)}</span>
                          <span className="block text-[13px] text-[#4F6B73]">{t({ en: `${c.lots} lots counted, ${c.changed} corrected`, id: `${c.lots} lot dihitung, ${c.changed} dikoreksi` })}{c.notes ? ` · ${c.notes}` : ""}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              </div>
            </div>
          );
        }}
      </DataState>
    </ErpPage>
  );
}
