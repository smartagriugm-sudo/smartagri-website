import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { body, display } from "../../lib/fonts";
import { CHAMBER_CODE } from "../../lib/pf/chamber";
import { FACILITY_CODE, HOLES_TOTAL, isPlanted } from "../../lib/pf/facility";
import { useErpStore } from "./ErpContext";

// The frame around both ERP screens: the way back, the switch between the
// plant factory and the growth chamber, and how full each one is.

function useClock() {
  const [now, setNow] = useState<string | null>(null);
  useEffect(() => {
    const fmt = () => new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }).format(new Date());
    setNow(fmt());
    const t = setInterval(() => setNow(fmt()), 30_000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function Occupancy({ code, value }: { code: string; value: string }) {
  return (
    <span className="flex items-center gap-1.5 whitespace-nowrap">
      <span className="rounded bg-[#0B6477] px-1.5 py-0.5 text-[11px] font-semibold text-white">{code}</span>
      <span className="font-medium text-[#0F2F36]">{value}</span>
    </span>
  );
}

export default function ErpShell({ children }: { children: ReactNode }) {
  const store = useErpStore();
  const clock = useClock();
  const filled = [...store.pf.holes.values()].filter((h) => isPlanted(h.state)).length;
  const slots = store.countSlots();
  const trays = store.chamber.slots.size - slots.kosong;
  const ready = store.readyToMove().reduce((n, r) => n + r.seedlings, 0);

  const tab = "flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-[13.5px] font-medium";
  const active = { className: `${tab} bg-white text-[#0F2F36] shadow-sm` };
  const inactive = { className: `${tab} text-[#6B8289] hover:text-[#0F2F36]` };

  return (
    <div className="flex min-h-screen flex-col bg-[#E7EAE7]" style={body}>
      <header className="sticky top-0 z-40 flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-[#DCE7E8] bg-white/95 px-4 py-2 backdrop-blur sm:px-6 lg:h-16 lg:flex-nowrap lg:py-0">
        <Link to="/indoor-farming/dashboard" className="grid h-9 w-9 place-items-center rounded-lg text-[#36525A] hover:bg-[#EEF5F5]" aria-label="Kembali ke dashboard">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <p className="text-[17px] font-semibold tracking-[-0.02em] text-[#0F2F36]" style={display}>
          smartagri <span className="font-medium text-[#14919B]">ERP</span>
        </p>

        <nav className="order-last flex w-full gap-0.5 rounded-lg bg-[#EEF3F4] p-0.5 sm:w-auto lg:order-none lg:ml-4" aria-label="Fasilitas">
          <Link to="/erp/persemaian" activeProps={active} inactiveProps={inactive}>
            Persemaian
            {ready > 0 && <span className="rounded-full bg-[#2F9E57] px-1.5 text-[11.5px] font-semibold text-white">{ready}</span>}
          </Link>
          <Link to="/erp" activeOptions={{ exact: true, includeSearch: false }} activeProps={active} inactiveProps={inactive}>
            Plant factory
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <span className="hidden items-center gap-3 rounded-lg border border-[#DCE7E8] px-3 py-1.5 text-[13px] md:flex">
            <Occupancy code={CHAMBER_CODE} value={`${trays}/${store.chamber.slots.size} nampan`} />
            <Occupancy code={FACILITY_CODE} value={`${Math.round((filled / HOLES_TOTAL) * 100)}% terisi`} />
          </span>
          <span className="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-[#E3F7F0] px-3 py-1.5 text-[13px] font-medium text-[#0E7A5C]">
            <span className="h-2 w-2 rounded-full bg-[#0E9F6E]" />
            Data contoh{clock ? ` · ${clock}` : ""}
          </span>
        </div>
      </header>
      {children}
    </div>
  );
}
