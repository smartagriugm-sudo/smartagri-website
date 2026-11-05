import { useEffect, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { body, display } from "../../lib/fonts";
import { CHAMBER_CODE } from "../../lib/pf/chamber";
import { FACILITY_CODE, HOLES_TOTAL, isPlanted } from "../../lib/pf/facility";
import { useErpStore } from "./ErpContext";

// The frame around every ERP page: the way back, the module menu, the pages of
// the current module, and on the 3D screens how full each facility is. A module
// that is not built yet shows in the menu, disabled, with the stage it arrives in.

const LATER = [
  { label: "Monitoring", stage: 2 },
  { label: "Penjualan", stage: 3 },
  { label: "Inventory", stage: 4 },
  { label: "SDM", stage: 5 },
  { label: "Biaya", stage: 6 },
];

const moduleClass = "whitespace-nowrap rounded-md px-3 py-1.5 text-[14px] font-medium";
const subClass = "flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1 text-[13.5px] font-medium";

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
  const pathname = useRouterState({ select: (s) => s.location.pathname }).replace(/\/$/, "");
  const on3d = pathname.endsWith("/persemaian") || pathname.endsWith("/plant-factory");
  const inGrowing = on3d || pathname.endsWith("/tanaman") || pathname.endsWith("/resep");
  const inSettings = pathname.includes("/erp/pengaturan");

  const filled = [...store.pf.holes.values()].filter((h) => isPlanted(h.state)).length;
  const slots = store.countSlots();
  const trays = store.chamber.slots.size - slots.kosong;
  const ready = store.readyToMove().reduce((n, r) => n + r.seedlings, 0);

  const on = "bg-[#EEF3F4] text-[#0F2F36]";
  const off = "text-[#4F6B73] hover:text-[#0F2F36]";
  const subActive = { className: `${subClass} bg-white text-[#0F2F36] shadow-sm` };
  const subInactive = { className: `${subClass} text-[#4F6B73] hover:text-[#0F2F36]` };

  return (
    <div className="flex min-h-screen flex-col bg-[#E7EAE7]" style={body}>
      <header className="z-40 border-b border-[#DCE7E8] bg-white/95 backdrop-blur lg:sticky lg:top-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2 sm:px-6 lg:h-16 lg:flex-nowrap lg:py-0">
          <Link to="/indoor-farming/dashboard" className="grid h-9 w-9 place-items-center rounded-lg text-[#36525A] hover:bg-[#EEF5F5]" aria-label="Kembali ke dashboard">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <p className="whitespace-nowrap text-[17px] font-semibold tracking-[-0.02em] text-[#0F2F36]" style={display}>
            smartagri <span className="font-medium text-[#14919B]">ERP</span>
          </p>

          <nav className="order-last -mx-1 flex w-full min-w-0 gap-0.5 overflow-x-auto px-1 lg:order-none lg:ml-4 lg:w-auto" aria-label="Modul ERP">
            <Link to="/erp" activeOptions={{ exact: true, includeSearch: false }} activeProps={{ className: `${moduleClass} ${on}` }} inactiveProps={{ className: `${moduleClass} ${off}` }}>Dashboard</Link>
            <Link to="/erp/persemaian" className={`${moduleClass} ${inGrowing ? on : off}`}>Budidaya</Link>
            {LATER.map((m) => (
              <span key={m.label} title={`Mulai Tahap ${m.stage}`} aria-disabled="true" className={`${moduleClass} cursor-default text-[#6B8289]`}>{m.label}</span>
            ))}
            <Link to="/erp/pengaturan/lokasi" className={`${moduleClass} ${inSettings ? on : off}`}>Pengaturan</Link>
          </nav>
        </div>

        {(inGrowing || inSettings) && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-[#EEF3F4] bg-[#F6F8F8] px-4 py-1.5 sm:px-6 lg:h-11 lg:flex-nowrap lg:py-0">
          <nav className="flex min-w-0 items-center gap-0.5 overflow-x-auto" aria-label={inGrowing ? "Halaman budidaya" : "Halaman pengaturan"}>
            {inGrowing ? (
              <>
                <Link to="/erp/persemaian" activeProps={subActive} inactiveProps={subInactive}>
                  Persemaian
                  {ready > 0 && <span className="rounded-full bg-[#2F9E57] px-1.5 text-[11.5px] font-semibold text-white">{ready}</span>}
                </Link>
                <Link to="/erp/plant-factory" activeProps={subActive} inactiveProps={subInactive}>Plant factory</Link>
                <Link to="/erp/tanaman" activeProps={subActive} inactiveProps={subInactive}>Tanaman</Link>
                <Link to="/erp/resep" activeProps={subActive} inactiveProps={subInactive}>Resep</Link>
              </>
            ) : (
              <>
                <Link to="/erp/pengaturan/lokasi" activeProps={subActive} inactiveProps={subInactive}>Lokasi</Link>
                <Link to="/erp/pengaturan/peran" activeProps={subActive} inactiveProps={subInactive}>Peran</Link>
                <Link to="/erp/pengaturan/audit" activeProps={subActive} inactiveProps={subInactive}>Audit log</Link>
              </>
            )}
          </nav>
          {on3d && (
            <div className="flex items-center gap-2 lg:ml-auto">
              <span className="hidden items-center gap-3 text-[13px] xl:flex">
                <Occupancy code={CHAMBER_CODE} value={`${trays}/${store.chamber.slots.size} nampan`} />
                <Occupancy code={FACILITY_CODE} value={`${Math.round((filled / HOLES_TOTAL) * 100)}% terisi`} />
              </span>
              <span className="flex items-center gap-1.5 whitespace-nowrap rounded-md bg-[#E3F7F0] px-2.5 py-1 text-[13px] font-medium text-[#0E7A5C]">
                <span className="h-2 w-2 rounded-full bg-[#0E9F6E]" />
                Data contoh{clock ? ` · ${clock}` : ""}
              </span>
            </div>
          )}
          </div>
        )}
      </header>
      {children}
    </div>
  );
}
