import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Plus } from "lucide-react";
import { jakartaToday } from "../../lib/pf/batch";
import { formatLongDate } from "../../lib/pf/dashboard";
import { PAY_STATE, fetchInvoices, fetchTaxRates, formatRupiah, payState, saveTaxRate } from "../../lib/pf/sales";
import { ActionNote, DataState, ErpPage, Field, PrimaryButton, SecondaryButton, inputClass, useAction, useErpAccess, useLoad } from "./page";
import { Card, Segmented } from "./ui";

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
    if (!name.trim()) return action.setError("Nama tarif wajib diisi.");
    if (percent.trim() === "" || !Number.isFinite(value) || value < 0 || value > 100) return action.setError("Tarif harus antara 0 dan 100 persen.");
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
        <h2 className="text-[16px] font-medium tracking-[-0.02em] text-[#0F2F36]">Tarif pajak</h2>
        {canSell && !adding && <button type="button" onClick={() => setAdding(true)} className="inline-flex min-h-[44px] items-center gap-1 text-[14px] font-medium text-[#0B6477] hover:underline sm:min-h-[24px]"><Plus className="h-4 w-4" /> Tambah</button>}
      </div>
      {adding && (
        <form className="space-y-3 border-t border-[#EDF2F2] p-4" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
          <Field label="Nama"><input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="PPN" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tarif (%)"><input className={inputClass} inputMode="decimal" value={percent} onChange={(e) => setPercent(e.target.value)} /></Field>
            <Field label="Berlaku mulai"><input type="date" className={inputClass} value={startsOn} onChange={(e) => setStartsOn(e.target.value)} /></Field>
          </div>
          <ActionNote action={action} />
          <div className="flex gap-2">
            <PrimaryButton type="submit" disabled={action.busy}>Simpan</PrimaryButton>
            <SecondaryButton onClick={() => setAdding(false)}>Batal</SecondaryButton>
          </div>
        </form>
      )}
      <DataState state={rates}>
        {(list) =>
          list.length === 0 ? (
            <p className="border-t border-[#EDF2F2] px-4 py-3 text-[14px] text-[#4F6B73]">Belum ada tarif. Invoice tetap bisa diterbitkan tanpa pajak.</p>
          ) : (
            <ul>
              {list.map((r) => (
                <li key={r.id} className="flex justify-between gap-3 border-t border-[#EDF2F2] px-4 py-2 text-[14px]">
                  <span className="min-w-0 text-[#0F2F36]">{r.name}<span className="block text-[13px] text-[#4F6B73]">Mulai {formatLongDate(r.valid_from)}</span></span>
                  <span className="font-medium tabular-nums text-[#0F2F36]">{r.percent.toLocaleString("id-ID")}%</span>
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
  const [show, setShow] = useState<Show>("tagihan");
  const today = jakartaToday();

  return (
    <ErpPage eyebrow="Penjualan" title="Invoice" sub="Invoice diterbitkan dari halaman pesanan, setelah barang terkirim.">
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
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Segmented value={show} options={[{ key: "tagihan", label: `Belum lunas (${groups.tagihan.length})` }, { key: "lunas", label: `Lunas (${groups.lunas.length})` }, { key: "batal", label: `Dibatalkan (${groups.batal.length})` }]} onChange={setShow} />
                  <p className="text-[14px] text-[#4F6B73]">Sisa tagihan <span className="font-medium tabular-nums text-[#0F2F36]">{formatRupiah(owed)}</span></p>
                </div>
                <Card>
                  {groups[show].length === 0 ? (
                    <p className="px-4 py-8 text-center text-[14px] text-[#4F6B73]">{show === "tagihan" ? "Tidak ada tagihan terbuka." : show === "lunas" ? "Belum ada invoice lunas." : "Tidak ada invoice dibatalkan."}</p>
                  ) : (
                    <ul>
                      {groups[show].map((i) => {
                        const state = PAY_STATE[payState(i, today)];
                        return (
                          <li key={i.id} className="border-t border-[#EDF2F2] first:border-0">
                            <Link to="/erp/invoice/$id" params={{ id: i.id }} className="grid items-center gap-x-4 gap-y-0.5 rounded-xl px-4 py-3 hover:bg-[#F6F8F8] md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto_16px]">
                              <span className="min-w-0">
                                <span className="block text-[15px] font-medium text-[#0F2F36]">{i.invoice_no}</span>
                                <span className="block truncate text-[13.5px] text-[#36525A]">{i.partner_name}</span>
                              </span>
                              <span className="min-w-0 text-[13px] text-[#4F6B73]">
                                <span className={`inline-block rounded-md px-2 py-0.5 text-[12.5px] font-medium ${state.className}`}>{state.label}</span>
                                <span className="block">Jatuh tempo {formatLongDate(i.due_on)}</span>
                              </span>
                              <span className="text-[13.5px] tabular-nums text-[#0F2F36] md:text-right">
                                {formatRupiah(i.total)}
                                {i.status === "terbit" && i.paid > 0 && i.balance > 0 && <span className="block text-[13px] text-[#4F6B73]">sisa {formatRupiah(i.balance)}</span>}
                              </span>
                              <ArrowRight className="hidden h-4 w-4 text-[#0B6477] md:block" />
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </Card>
              </div>
              <TaxRates canSell={canSell} />
            </div>
          );
        }}
      </DataState>
    </ErpPage>
  );
}
