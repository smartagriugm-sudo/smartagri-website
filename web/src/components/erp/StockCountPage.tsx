import { useState } from "react";
import { jakartaToday } from "../../lib/pf/batch";
import { formatLongDate } from "../../lib/pf/dashboard";
import { ITEM_CATEGORIES, applyCount, fetchCounts, fetchStockLots, formatQty, parseCountRows, type ItemCategory, type StockLotRow } from "../../lib/pf/inventory";
import { ActionNote, DataState, ErpPage, Field, PrimaryButton, ReadOnlyNote, SecondaryButton, inputClass, useAction, useErpAccess, useLoad } from "./page";
import { Card, Segmented } from "./ui";

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
  const [category, setCategory] = useState<ItemCategory | "semua">("semua");
  const [values, setValues] = useState<Record<string, string>>({});
  const [countedOn, setCountedOn] = useState(today);
  const [notes, setNotes] = useState("");
  const [asking, setAsking] = useState(false);
  const action = useAction();

  const number = (s: string) => Number(s.trim().replace(",", "."));
  const typed = (l: StockLotRow) => (values[l.id] ?? "").trim() !== "";
  const diff = (l: StockLotRow) => (typed(l) ? number(values[l.id]) - l.qty_on_hand : 0);

  return (
    <ErpPage eyebrow="Inventory" title="Opname" sub="Hitung stok fisik lalu bandingkan dengan catatan. Kolom yang dikosongkan berarti lot itu tidak ikut dihitung.">
      <DataState state={state}>
        {({ lots, counts }) => {
          const shown = lots.filter((l) => (l.qty_on_hand > 0 || typed(l)) && (category === "semua" || l.category === category)).sort((a, b) => a.item_name.localeCompare(b.item_name) || a.lot_no.localeCompare(b.lot_no));
          const filled = lots.filter(typed);
          const differing = filled.filter((l) => Math.abs(diff(l)) > 0);

          const apply = async () => {
            const parsed = parseCountRows(filled.map((l) => ({ lotId: l.id, counted: values[l.id] })));
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
                {!canManageProduction && <ReadOnlyNote who="Manajer produksi" />}
                <Segmented value={category} options={[{ key: "semua" as const, label: "Semua" }, ...ITEM_CATEGORIES.map((c) => ({ key: c.key, label: c.label }))]} onChange={setCategory} />
                <Card>
                  {shown.length === 0 ? (
                    <p className="px-4 py-8 text-center text-[14px] text-[#4F6B73]">Tidak ada lot bersisa di sini.</p>
                  ) : (
                    <ul>
                      {shown.map((l) => {
                        const d = diff(l);
                        return (
                          <li key={l.id} className="grid grid-cols-[minmax(0,1fr)_100px] items-center gap-x-3 gap-y-1 border-t border-[#EDF2F2] px-4 py-2.5 first:border-0 sm:grid-cols-[minmax(0,1fr)_150px_100px_90px]">
                            <span className="col-span-2 min-w-0 sm:col-span-1">
                              <span className="block truncate text-[14px] font-medium text-[#0F2F36]">{l.item_name}</span>
                              <span className="block truncate text-[13px] text-[#4F6B73]">{l.lot_no}{l.expiry_date ? ` · sampai ${formatLongDate(l.expiry_date)}` : ""}</span>
                            </span>
                            <span className="whitespace-nowrap text-[13.5px] tabular-nums text-[#4F6B73] sm:text-right">Catatan {formatQty(l.qty_on_hand, l.unit)}</span>
                            <input
                              className={inputClass}
                              inputMode="decimal"
                              disabled={!canManageProduction}
                              aria-label={`Hasil hitung ${l.item_name} lot ${l.lot_no} dalam ${l.unit}`}
                              placeholder="Hitung"
                              value={values[l.id] ?? ""}
                              onChange={(e) => { setAsking(false); setValues((v) => ({ ...v, [l.id]: e.target.value })); }}
                            />
                            <span className={`col-span-2 text-[13px] tabular-nums sm:col-span-1 sm:text-right ${typed(l) && d !== 0 ? "font-medium text-[#8A5A07]" : "text-[#4F6B73]"}`}>
                              {!typed(l) ? "" : Number.isNaN(d) ? "Bukan angka" : d === 0 ? "Cocok" : `${d > 0 ? "+" : ""}${d.toLocaleString("id-ID", { maximumFractionDigits: 2 })} ${l.unit}`}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </Card>
              </div>
              <div className="min-w-0 space-y-4">
                {canManageProduction && (
                  <Card className="space-y-3 p-4">
                    <h2 className="text-[16px] font-medium tracking-[-0.02em] text-[#0F2F36]">Simpan hasil</h2>
                    <p className="text-[14px] text-[#4F6B73]">{filled.length} lot dihitung, {differing.length} berbeda dari catatan.</p>
                    <Field label="Tanggal opname"><input type="date" className={inputClass} max={today} value={countedOn} onChange={(e) => setCountedOn(e.target.value)} /></Field>
                    <Field label="Catatan"><input className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
                    <ActionNote action={action} />
                    {asking ? (
                      <div className="space-y-2 rounded-lg bg-[#FFF6E5] p-2.5">
                        <p className="text-[13.5px] text-[#4F6B73]">Stok {differing.length} lot akan diubah mengikuti hasil hitung. Perubahan tercatat, dan hanya bisa dibalik dengan koreksi baru.</p>
                        <div className="flex flex-wrap gap-2">
                          <PrimaryButton disabled={action.busy} onClick={() => void apply()}>{action.busy ? "Menyimpan..." : "Ya, simpan"}</PrimaryButton>
                          <SecondaryButton onClick={() => setAsking(false)}>Batal</SecondaryButton>
                        </div>
                      </div>
                    ) : (
                      <PrimaryButton disabled={filled.length === 0} onClick={() => setAsking(true)}>Simpan hasil opname</PrimaryButton>
                    )}
                  </Card>
                )}
                <Card>
                  <h2 className="px-4 py-3 text-[16px] font-medium tracking-[-0.02em] text-[#0F2F36]">Opname sebelumnya</h2>
                  {counts.length === 0 ? (
                    <p className="border-t border-[#EDF2F2] px-4 py-3 text-[14px] text-[#4F6B73]">Belum pernah opname.</p>
                  ) : (
                    <ul>
                      {counts.map((c) => (
                        <li key={c.id} className="border-t border-[#EDF2F2] px-4 py-2 text-[14px]">
                          <span className="font-medium text-[#0F2F36]">{formatLongDate(c.counted_on)}</span>
                          <span className="block text-[13px] text-[#4F6B73]">{c.lots} lot dihitung, {c.changed} dikoreksi{c.notes ? ` · ${c.notes}` : ""}</span>
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
