import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronRight, Search } from "lucide-react";
import { formatLongDate } from "../../lib/pf/dashboard";
import { cropLabel } from "../../lib/pf/foundation";
import { formatKg, traceCode, type TraceRow } from "../../lib/pf/sales";
import { DataState, ErpPage, PrimaryButton, inputClass, useLoad } from "./page";
import { Card, Note } from "./ui";

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
  return (
    <li className="flex flex-col gap-2 border-t border-[#EDF2F2] px-4 py-3 first:border-0 md:flex-row">
      <Hop
        label="Customer"
        title={row.order_id ? <Link to="/erp/orders/$id" params={{ id: row.order_id }} className="text-[#0B6477] hover:underline">{row.partner_name}</Link> : "Not sold yet"}
        detail={row.order_id ? `${row.so_no}${row.allocated_kg ? ` · ${formatKg(row.allocated_kg)}` : ""}${row.delivered_on ? ` · send ${formatLongDate(row.delivered_on)}` : " · not sent yet"}` : undefined}
      />
      <Arrow />
      <Hop label="Harvest lot" title={`${row.lot_code}, grade ${row.grade}`} detail={`Harvest ${formatLongDate(row.harvested_at)} · ${formatKg(row.fresh_kg)}`} />
      <Arrow />
      <Hop
        label="Batch"
        title={<Link to="/erp/batch/$id" params={{ id: row.batch_id }} className="text-[#0B6477] hover:underline">{row.batch_code}</Link>}
        detail={`${cropLabel({ name: row.crop_name, variety: row.crop_variety })} · ${row.recipe_code} v${row.recipe_version}${row.sown_at ? ` · sown ${formatLongDate(row.sown_at)}` : ""}`}
      />
      <Arrow />
      <Hop label="Seed lot" title={row.seed_lot_no} detail={row.seed_supplier || undefined} />
    </li>
  );
}

function Results({ code }: { code: string }) {
  const state = useLoad(() => traceCode(code), [code]);
  return (
    <DataState state={state}>
      {(rows) =>
        rows.length === 0 ? (
          <Card className="px-4 py-8 text-center text-[14px] text-[#4F6B73]">Nothing matches {code}. Check the number again.</Card>
        ) : (
          <div className="space-y-3">
            <Note>
              {new Set(rows.filter((r) => r.partner_name).map((r) => r.partner_name)).size} customers · {new Set(rows.map((r) => r.lot_code)).size} harvest lots · {new Set(rows.map((r) => r.batch_code)).size} batches · {new Set(rows.map((r) => r.seed_lot_no)).size} seed lot
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

  useEffect(() => {
    setQuery(code ?? "");
  }, [code]);

  return (
    <ErpPage eyebrow="Sales" title="Trace" sub="Enter an order number, harvest lot, batch or seed lot to see its chain, from customer back to seed.">
      <div className="space-y-4">
        <form
          className="flex max-w-[560px] gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (query.trim()) void navigate({ to: "/erp/trace", search: { code: query.trim() } });
          }}
        >
          <input className={inputClass} aria-label="Number traced" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="SO-2026-0001, H-0004, B-012, or PK-2610-A" />
          <PrimaryButton type="submit" disabled={!query.trim()}><Search className="h-4 w-4" /> Trace</PrimaryButton>
        </form>
        {code ? <Results key={code} code={code} /> : <Card className="px-4 py-8 text-center text-[14px] text-[#4F6B73]">One number is enough. When a seed lot is recalled, its number shows every customer affected.</Card>}
      </div>
    </ErpPage>
  );
}
