import { Link } from "@tanstack/react-router";
import { ArrowRight, Box, CheckCircle2, CircleDashed, Sprout, Thermometer } from "lucide-react";
import { DAYS_TO_TRANSPLANT } from "../../lib/pf/chamber";
import { HOLES_TOTAL, addDays, isPlanted } from "../../lib/pf/facility";
import { fetchFoundationSummary } from "../../lib/pf/foundation";
import { LIFECYCLE_PHASES } from "../../lib/pf/store";
import { useErpStore } from "./ErpContext";
import { DataState, ErpPage, useLoad } from "./page";
import { Card, Kpi } from "./ui";

// First version of the ERP's front page. What comes from real tables is apart
// from what is still sample data, and says so. Cards are added module by module.

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));
}

function Check({ done, label, detail, to }: { done: boolean; label: string; detail: string; to: "/erp/pengaturan/lokasi" | "/erp/tanaman" | "/erp/resep" }) {
  const Icon = done ? CheckCircle2 : CircleDashed;
  return (
    <Link to={to} className="flex items-center gap-3 rounded-lg border border-[#E3ECED] px-3 py-2.5 hover:border-[#14919B]">
      <Icon className={`h-5 w-5 shrink-0 ${done ? "text-[#0E9F6E]" : "text-[#8D9398]"}`} />
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-medium text-[#0F2F36]">{label}</span>
        <span className="block text-[13px] text-[#6B8289]">{detail}</span>
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-[#14919B]" />
    </Link>
  );
}

function FoundationCard() {
  const summary = useLoad(fetchFoundationSummary);
  return (
    <Card className="p-4">
      <h2 className="text-[16px] font-medium tracking-[-0.02em] text-[#0F2F36]">Data dasar</h2>
      <p className="mb-3 text-[13px] text-[#6B8289]">Dari database, bukan data contoh.</p>
      <DataState state={summary}>
        {({ slots, crops, activeRecipes }) => (
          <div className="space-y-2">
            <Check
              done={slots.missing.length === 0}
              label="Kode lokasi"
              detail={`${slots.present} dari ${slots.expected} lubang dan posisi nampan`}
              to="/erp/pengaturan/lokasi"
            />
            <Check done={crops > 0} label="Tanaman" detail={crops > 0 ? `${crops} tanaman aktif` : "Belum ada tanaman"} to="/erp/tanaman" />
            <Check done={activeRecipes > 0} label="Resep" detail={activeRecipes > 0 ? `${activeRecipes} resep aktif` : "Belum ada resep aktif"} to="/erp/resep" />
          </div>
        )}
      </DataState>
    </Card>
  );
}

export default function ErpDashboard() {
  const store = useErpStore();
  const filled = [...store.pf.holes.values()].filter((h) => isPlanted(h.state)).length;
  const slots = store.countSlots();
  const trays = store.chamber.slots.size - slots.kosong;
  const ready = store.readyToMove().reduce((n, r) => n + r.seedlings, 0);
  const batches = [...store.batches.values()].sort((a, b) => a.sownAt.localeCompare(b.sownAt));
  const climate = store.chamber.climate;

  return (
    <ErpPage eyebrow="Dashboard" title="Ringkasan ERP" sub="Kondisi plant factory dan persemaian. Kartu bertambah setiap modul selesai.">
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-4">
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-[13px] font-medium text-[#8A5A07]">
              <span className="h-2 w-2 rounded-full bg-[#E0A526]" />
              Data contoh, belum dari sensor dan catatan operator
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Kpi icon={Box} label="Lubang terisi" value={`${filled}`} sub={`dari ${HOLES_TOTAL} lubang`} />
              <Kpi icon={Box} label="Nampan terisi" value={`${trays}`} sub={`dari ${store.chamber.slots.size} posisi`} />
              <Kpi icon={Sprout} label="Siap pindah tanam" value={`${ready}`} sub="bibit" tone="#2F9E57" />
              <Kpi icon={Thermometer} label="Suhu chamber" value={`${climate.temp.toFixed(1)} °C`} sub={`RH ${Math.round(climate.rh)}%`} />
            </div>
          </div>

          <Card className="p-4">
            <h2 className="mb-3 text-[16px] font-medium tracking-[-0.02em] text-[#0F2F36]">Batch dan jadwal</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-[14px]">
                <thead className="text-[13px] text-[#6B8289]">
                  <tr>
                    <th className="pb-2 font-medium">Batch</th>
                    <th className="pb-2 font-medium">Tanaman</th>
                    <th className="pb-2 font-medium">Fase</th>
                    <th className="pb-2 font-medium">Pindah tanam</th>
                    <th className="pb-2 font-medium">Panen</th>
                  </tr>
                </thead>
                <tbody className="text-[#0F2F36]">
                  {batches.map((b) => (
                    <tr key={b.code} className="border-t border-[#E3ECED]">
                      <td className="py-2 font-medium">{b.code}</td>
                      <td className="py-2">{b.crop}</td>
                      <td className="py-2">{LIFECYCLE_PHASES[store.phaseOf(b)].label} · hari {b.age}</td>
                      <td className="py-2">{formatDate(b.transplantedAt ?? addDays(b.sownAt, DAYS_TO_TRANSPLANT))}</td>
                      <td className="py-2">{formatDate(addDays(b.sownAt, b.cycle))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <FoundationCard />
          <Card className="p-4">
            <h2 className="mb-3 text-[16px] font-medium tracking-[-0.02em] text-[#0F2F36]">Tampilan 3D</h2>
            <div className="space-y-2">
              <Link to="/erp/persemaian" className="flex items-center justify-between rounded-lg border border-[#E3ECED] px-3 py-2.5 text-[14px] font-medium text-[#0F2F36] hover:border-[#14919B]">
                Persemaian <ArrowRight className="h-4 w-4 text-[#14919B]" />
              </Link>
              <Link to="/erp/plant-factory" className="flex items-center justify-between rounded-lg border border-[#E3ECED] px-3 py-2.5 text-[14px] font-medium text-[#0F2F36] hover:border-[#14919B]">
                Plant factory <ArrowRight className="h-4 w-4 text-[#14919B]" />
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </ErpPage>
  );
}
