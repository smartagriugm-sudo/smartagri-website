import { useState } from "react";
import { jakartaToday } from "../../lib/pf/batch";
import { formatLongDate } from "../../lib/pf/dashboard";
import { ITEM_CATEGORIES, applyCount, fetchCounts, fetchStockLots, formatQty, parseCountRows, type StockLotRow } from "../../lib/pf/inventory";
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

  const number = (s: string) => Number(s.trim().replace(",", "."));
  const typed = (l: StockLotRow) => (values[l.id] ?? "").trim() !== "";
  const diff = (l: StockLotRow) => (typed(l) ? number(values[l.id]) - l.qty_on_hand : 0);

  return (
    <ErpPage eyebrow="Inventory" title="Stock count" sub="Count the physical stock, then compare it with the record. A box left empty means that lot was not counted.">
      <DataState state={state}>
        {({ lots, counts }) => {
          const shown = lots.filter((l) => l.qty_on_hand > 0 || typed(l)).sort((a, b) => a.item_name.localeCompare(b.item_name) || a.lot_no.localeCompare(b.lot_no));
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
                {!canManageProduction && <ReadOnlyNote who="Production manager" />}
                <DataTable
                  rows={shown}
                  rowKey={(l) => l.id}
                  noun="lots"
                  searchText={(l) => `${l.item_name} ${l.lot_no} ${l.sku}`}
                  searchLabel="Search by item, SKU or lot"
                  pills={ITEM_CATEGORIES.map((c) => ({ key: c.key, label: c.label, match: (l: StockLotRow) => l.category === c.key }))}
                  empty="No lots with stock left."
                  columns={[
                    { key: "item", label: "Item and lot", phone: "title", sort: (a, b) => a.item_name.localeCompare(b.item_name), cell: (l) => <CellTitle title={l.item_name} sub={`${l.lot_no}${l.expiry_date ? ` · until ${formatLongDate(l.expiry_date)}` : ""}`} /> },
                    { key: "book", label: "On record", track: "130px", align: "right", sort: (a, b) => a.qty_on_hand - b.qty_on_hand, cell: (l) => <span className="whitespace-nowrap tabular-nums">{formatQty(l.qty_on_hand, l.unit)}</span> },
                    { key: "count", label: "Counted", track: "120px", interactive: true, cell: (l) => (
                      <input
                        className={inputClass}
                        inputMode="decimal"
                        disabled={!canManageProduction}
                        aria-label={`Counted ${l.item_name} lot ${l.lot_no} in ${l.unit}`}
                        placeholder="Count"
                        value={values[l.id] ?? ""}
                        onChange={(e) => { setAsking(false); setValues((v) => ({ ...v, [l.id]: e.target.value })); }}
                      />
                    ) },
                    { key: "diff", label: "Difference", track: "110px", align: "right", cell: (l) => {
                      const d = diff(l);
                      return <span className={`text-[13px] tabular-nums ${typed(l) && d !== 0 ? "font-medium text-[#8A5A07]" : "text-[#4F6B73]"}`}>{!typed(l) ? "" : Number.isNaN(d) ? "Not a number" : d === 0 ? "Matches" : `${d > 0 ? "+" : ""}${d.toLocaleString("en-GB", { maximumFractionDigits: 2 })} ${l.unit}`}</span>;
                    } },
                  ] satisfies Column<StockLotRow>[]}
                />
              </div>
              <div className="min-w-0 space-y-4">
                {canManageProduction && (
                  <Card className="space-y-3 p-4">
                    <h2 className="text-[16px] font-medium tracking-[-0.02em] text-[#0F2F36]">Save results</h2>
                    <p className="text-[14px] text-[#4F6B73]">{filled.length} lots counted, {differing.length} differ from the record.</p>
                    <Field label="Count date"><input type="date" className={inputClass} max={today} value={countedOn} onChange={(e) => setCountedOn(e.target.value)} /></Field>
                    <Field label="Notes"><input className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
                    <ActionNote action={action} />
                    {asking ? (
                      <div className="space-y-2 rounded-lg bg-[#FFF6E5] p-2.5">
                        <p className="text-[13.5px] text-[#4F6B73]">Stock {differing.length} lots will change to match the count. The change is recorded and can only be reversed with a new correction.</p>
                        <div className="flex flex-wrap gap-2">
                          <PrimaryButton disabled={action.busy} onClick={() => void apply()}>{action.busy ? "Saving..." : "Yes, save"}</PrimaryButton>
                          <SecondaryButton onClick={() => setAsking(false)}>Cancel</SecondaryButton>
                        </div>
                      </div>
                    ) : (
                      <PrimaryButton disabled={filled.length === 0} onClick={() => setAsking(true)}>Save stock count</PrimaryButton>
                    )}
                  </Card>
                )}
                <Card>
                  <h2 className="px-4 py-3 text-[16px] font-medium tracking-[-0.02em] text-[#0F2F36]">Earlier stock counts</h2>
                  {counts.length === 0 ? (
                    <p className="border-t border-[#EDF2F2] px-4 py-3 text-[14px] text-[#4F6B73]">No stock count yet.</p>
                  ) : (
                    <ul>
                      {counts.map((c) => (
                        <li key={c.id} className="border-t border-[#EDF2F2] px-4 py-2 text-[14px]">
                          <span className="font-medium text-[#0F2F36]">{formatLongDate(c.counted_on)}</span>
                          <span className="block text-[13px] text-[#4F6B73]">{c.lots} lots counted, {c.changed} corrected{c.notes ? ` · ${c.notes}` : ""}</span>
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
