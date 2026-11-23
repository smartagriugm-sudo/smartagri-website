import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronRight, Search } from "lucide-react";
import { formatLongDate } from "../../lib/pf/dashboard";
import { cropLabel } from "../../lib/pf/foundation";
import { gradeLabel } from "../../lib/pf/batch";
import { formatKg, traceCode, type TraceRow } from "../../lib/pf/sales";
import { DataState, ErpPage, PrimaryButton, inputClass, useLoad } from "./page";
import { Card, Note } from "./ui";
import { useLang, useT } from "../../lib/i18n";

// One question from either end: where did this come from, and where did it go?
// Any order, harvest lot, batch or seed lot number gives every chain touching it,
// so a customer's complaint and a recall of bad seed read the same way.

function Hop({ label, title, detail }: { label: string; title: React.ReactNode; detail?: string }) {
  return (
    <div className="min-w-0 flex-1 basis-[150px] rounded-lg border border-[#E3ECED] px-3 py-2">
      <p className="text-[12.5px] text-[#4F6B73]">{label}</p>
      <p className="text-[14px] font-medium text-[#0F2F36]">{title}</p>
      {detail && <p className="text-[13px] text-[#4F6B73]">{detail}</p>}
    </div>
  );
}

const Arrow = () => <ChevronRight className="hidden h-4 w-4 shrink-0 self-center text-[#9DB2B6] md:block" aria-hidden="true" />;

function Chain({ row }: { row: TraceRow }) {
  const t = useT();
  const lang = useLang();
  return (
    <li className="flex flex-col gap-2 border-t border-[#EDF2F2] px-4 py-3 first:border-0 md:flex-row">
      <Hop
        label={t({ en: "Customer", id: "Pelanggan" })}
        title={row.order_id ? <Link to="/erp/orders/$id" params={{ id: row.order_id }} className="text-[#0B6477] hover:underline">{row.partner_name}</Link> : t({ en: "Not sold yet", id: "Belum terjual" })}
        detail={row.order_id ? `${row.so_no}${row.allocated_kg ? ` · ${formatKg(row.allocated_kg, lang)}` : ""}${row.delivered_on ? t({ en: ` · send ${formatLongDate(row.delivered_on, lang)}`, id: ` · kirim ${formatLongDate(row.delivered_on, lang)}` }) : t({ en: " · not sent yet", id: " · belum dikirim" })}` : undefined}
      />
      <Arrow />
      <Hop label={t({ en: "Harvest lot", id: "Lot panen" })} title={`${row.lot_code}, grade ${gradeLabel(row.grade, lang)}`} detail={`${t({ en: "Harvest", id: "Panen" })} ${formatLongDate(row.harvested_at, lang)} · ${formatKg(row.fresh_kg, lang)}`} />
      <Arrow />
      <Hop
        label="Batch"
        title={<Link to="/erp/batch/$id" params={{ id: row.batch_id }} className="text-[#0B6477] hover:underline">{row.batch_code}</Link>}
        detail={`${cropLabel({ name: row.crop_name, variety: row.crop_variety })} · ${row.recipe_code} v${row.recipe_version}${row.sown_at ? t({ en: ` · sown ${formatLongDate(row.sown_at, lang)}`, id: ` · disemai ${formatLongDate(row.sown_at, lang)}` }) : ""}`}
      />
      <Arrow />
      <Hop label={t({ en: "Seed lot", id: "Lot benih" })} title={row.seed_lot_no} detail={row.seed_supplier || undefined} />
    </li>
  );
}

function Results({ code }: { code: string }) {
  const state = useLoad(() => traceCode(code), [code]);
  const t = useT();
  return (
    <DataState state={state}>
      {(rows) =>
        rows.length === 0 ? (
          <Card className="px-4 py-8 text-center text-[14px] text-[#4F6B73]">{t({ en: `Nothing matches ${code}. Check the number again.`, id: `Tidak ada yang cocok dengan ${code}. Periksa lagi nomornya.` })}</Card>
        ) : (
          <div className="space-y-3">
            <Note>
              {new Set(rows.filter((r) => r.partner_name).map((r) => r.partner_name)).size} {t({ en: "customers", id: "pelanggan" })} · {new Set(rows.map((r) => r.lot_code)).size} {t({ en: "harvest lots", id: "lot panen" })} · {new Set(rows.map((r) => r.batch_code)).size} batch{t({ en: "es", id: "" })} · {new Set(rows.map((r) => r.seed_lot_no)).size} {t({ en: "seed lot", id: "lot benih" })}
            </Note>
            <Card><ul>{rows.map((r, i) => <Chain key={`${r.lot_code}:${r.so_no}:${i}`} row={r} />)}</ul></Card>
          </div>
        )
      }
    </DataState>
  );
}

export default function TracePage({ code }: { code?: string }) {
  const [query, setQuery] = useState(code ?? "");
  const navigate = useNavigate();
  const t = useT();

  useEffect(() => {
    setQuery(code ?? "");
  }, [code]);

  return (
    <ErpPage eyebrow={t({ en: "Sales", id: "Penjualan" })} title={t({ en: "Trace", id: "Telusur" })} sub={t({ en: "Enter an order number, harvest lot, batch or seed lot to see its chain, from customer back to seed.", id: "Masukkan nomor pesanan, lot panen, batch, atau lot benih untuk melihat rantainya, dari pelanggan sampai ke benih." })}>
      <div className="space-y-4">
        <form
          className="flex max-w-[560px] gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (query.trim()) void navigate({ to: "/erp/trace", search: { code: query.trim() } });
          }}
        >
          <input className={inputClass} aria-label={t({ en: "Number traced", id: "Nomor yang ditelusuri" })} value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t({ en: "SO-2026-0001, H-0004, B-012, or PK-2610-A", id: "SO-2026-0001, H-0004, B-012, atau PK-2610-A" })} />
          <PrimaryButton type="submit" disabled={!query.trim()}><Search className="h-4 w-4" /> {t({ en: "Trace", id: "Telusur" })}</PrimaryButton>
        </form>
        {code ? <Results key={code} code={code} /> : <Card className="px-4 py-8 text-center text-[14px] text-[#4F6B73]">{t({ en: "One number is enough. When a seed lot is recalled, its number shows every customer affected.", id: "Satu nomor sudah cukup. Saat lot benih ditarik, nomornya menunjukkan semua pelanggan yang terdampak." })}</Card>}
      </div>
    </ErpPage>
  );
}
