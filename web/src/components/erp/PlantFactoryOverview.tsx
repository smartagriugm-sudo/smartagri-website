import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import type { ObjectRecord, Selection, ViewName } from "plant-factory-3d";
import { ArrowRight, CircleAlert, Home, Lightbulb, LightbulbOff, Minus, MoveRight, Plus } from "lucide-react";
import { CHAMBER_CODE } from "../../lib/pf/chamber";
import {
  FACILITY_CODE,
  GROW_ROOM_READINGS,
  HOLES_PER_RACK,
  HOLES_TOTAL,
  HOLE_STATES,
  HOLE_STATE_KEYS,
  RESERVOIR_READINGS,
  countByState,
  isPlanted,
  stateColor,
} from "../../lib/pf/facility";
import { RACK_NUMBERS, TIER_NUMBERS, type PfProvider } from "../../lib/pf/provider";
import type { ErpStore } from "../../lib/pf/store";
import { useErpStore } from "./ErpContext";
import PlantFactoryScene, { type SceneEngine } from "./PlantFactoryScene";
import { formatLongDate } from "../../lib/pf/dashboard";
import { Bar, Card, Kpi, Lifecycle, Note, PanelHeader, Readings, Rows, SceneStatus, Segmented, StateBreakdown, dolly, useEngineActivity, useSceneGate } from "./ui";

// ERP overview: the 3D model of PF01 with floating KPI cards, a detail panel
// that follows whatever is selected in the scene, and a batch lifecycle strip.
//
// The scene mounts only after hydration, so the server sends a plain
// placeholder. Selecting a hole needs one tier filtered, because the rack
// covers and lights sit on top of the holes in the full view.

const VIEWS: { key: ViewName; label: string }[] = [
  { key: "iso", label: "Isometrik" },
  { key: "top", label: "Atas" },
  { key: "grow", label: "Ruang tumbuh" },
  { key: "control", label: "Ruang kontrol" },
];


/* --------------------------------------------------------- detail panels */

function HolePanel({ id, store }: { id: string; store: ErpStore }) {
  const hole = store.pf.getHole(id)!;
  const b = store.batch(hole.batch);
  const germination = b ? store.germinationOf(b.code) : null;
  return (
    <div className="space-y-4">
      <PanelHeader eyebrow="Lubang tanam" title={id} sub={`Rak ${hole.rack} · Tingkat ${hole.tier} · Talang ${hole.gully} · Lubang ${hole.hole}`} />
      {b ? (
        <div className="space-y-2">
          <Rows rows={[["Status", HOLE_STATES[hole.state].label], ["Batch", b.code], ["Tanaman", b.crop], ["Resep", b.recipe], ["Tanggal semai", b.sownAt], ["Umur", `${b.age} dari ${b.cycle} hari`]]} />
          <Bar value={Math.min(b.age, b.cycle)} max={b.cycle || 1} />
          {hole.note && <Note>{hole.note}</Note>}
        </div>
      ) : (
        <Note>{hole.state === "sanitasi" ? "Lubang ini sedang sanitasi." : hole.offline ? "Lubang ini sedang tidak dipakai." : "Tidak ada batch di lubang ini."}</Note>
      )}
      {b && germination && (
        <div className="space-y-2 rounded-lg bg-[#F3F7F7] px-3 py-2.5">
          <p className="text-[13px] font-medium text-[#4F6B73]">Asal persemaian</p>
          <Rows
            rows={[
              ["Pindah tanam", b.transplantedAt ? formatLongDate(b.transplantedAt) : "Belum tercatat"],
              ["Daya kecambah batch", `${Math.round(germination.rate * 100)}%`],
              ...(hole.sourceSlot ? ([["Nampan asal", hole.sourceSlot]] as [string, string][]) : []),
            ]}
          />
          {hole.sourceSlot && (
            <Link to="/erp/persemaian" search={{ slot: hole.sourceSlot }} className="flex items-center gap-1 text-[13px] font-medium text-[#0B6477] hover:underline">
              Buka posisinya di persemaian <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      )}
      {b?.id && (
        <Link to="/erp/batch/$id" params={{ id: b.id }} search={{ hole: id }} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#45DFB1] px-3 py-2 text-[14px] font-medium text-[#0B2A22] hover:bg-[#80ED99]">
          Catat di halaman batch <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

function objectTitle(o: ObjectRecord) {
  switch (o.type) {
    case "lamp": return `Lampu Rak ${o.rack} · Tingkat ${o.tier}`;
    case "pump": return o.rack ? `Pompa Rak ${o.rack}` : "Pompa utama";
    case "sensor_climate": return `Sensor iklim Rak ${o.rack}`;
    case "sensor_nutrient": return "Sensor nutrisi";
    case "tank": return "Tandon nutrisi";
    case "cctv": return o.id === "CCTV-GROW" ? "CCTV ruang tumbuh" : "CCTV ruang kontrol";
    default: return o.id;
  }
}

function ObjectPanel({ object: o, provider }: { object: ObjectRecord; provider: PfProvider }) {
  const lampOn = provider.lamps.get(o.id);
  const pumpOn = provider.pumps.get(o.id);
  return (
    <div className="space-y-4">
      <PanelHeader eyebrow={o.id} title={objectTitle(o)} />
      {o.assumed && (
        <Note tone="warn">
          <CircleAlert className="mr-1 inline h-3.5 w-3.5" />
          Keberadaan dan letaknya masih asumsi, belum dikonfirmasi.
        </Note>
      )}
      {o.type === "lamp" && <Rows rows={[["Status", lampOn ? "Menyala" : "Mati"]]} />}
      {o.type === "pump" && <Rows rows={[["Status", pumpOn ? "Berjalan" : "Berhenti"]]} />}
      {(o.type === "lamp" || o.type === "pump") && (
        <Note>Status contoh. Kendali belum tersedia, karena perintah ke perangkat harus lewat autentikasi, hak akses, dan konfirmasi.</Note>
      )}
      {o.type === "sensor_climate" && <Readings title="Bacaan contoh" items={GROW_ROOM_READINGS} />}
      {o.type === "sensor_nutrient" && <Readings title="Bacaan contoh" items={RESERVOIR_READINGS} />}
      {o.type === "tank" && (
        <>
          <Readings title="Larutan nutrisi (contoh)" items={RESERVOIR_READINGS} />
          <div>
            <div className="mb-1 flex justify-between text-[13px]"><span className="text-[#4F6B73]">Level tandon</span><span className="font-medium">74%</span></div>
            <Bar value={74} max={100} color="#0AD1C8" />
          </div>
        </>
      )}
      {o.type === "cctv" && <Note>Belum ada siaran kamera yang tersambung.</Note>}
    </div>
  );
}

function RackPanel({ rack, store, onTier }: { rack: number; store: ErpStore; onTier: (tier: number) => void }) {
  const holes = store.pf.holesOfRack(rack);
  return (
    <div className="space-y-4">
      <PanelHeader eyebrow={`${FACILITY_CODE} · R${rack}`} title={`Rak ${rack}`} sub="3 tingkat · 4 talang · 20 lubang per talang" />
      <StateBreakdown counts={countByState(holes)} total={holes.length} />
      <div className="space-y-2.5">
        {[...TIER_NUMBERS].reverse().map((t) => {
          const ts = holes.filter((h) => h.tier === t);
          const b = store.batch(ts.find((h) => h.batch)?.batch);
          return (
            <button key={t} type="button" onClick={() => onTier(t)} className="block w-full rounded-lg border border-[#E3ECED] px-3 py-2.5 text-left hover:border-[#14919B]">
              <div className="flex items-center justify-between text-[13px]">
                <span className="font-medium text-[#0F2F36]">Tingkat {t}</span>
                <span className="text-[#4F6B73]">{ts.filter((h) => isPlanted(h.state)).length}/{ts.length} terisi</span>
              </div>
              {b ? (
                <>
                  <p className="mt-0.5 text-[12.5px] text-[#4F6B73]">{b.code} · {b.crop} · hari {b.age}/{b.cycle}</p>
                  <div className="mt-1.5"><Bar value={Math.min(b.age, b.cycle)} max={b.cycle || 1} /></div>
                </>
              ) : (
                <p className="mt-0.5 text-[12.5px] text-[#4F6B73]">Tidak ada batch aktif</p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SeedlingSupply({ store }: { store: ErpStore }) {
  const ready = store.readyToMove();
  const seedlings = ready.reduce((n, r) => n + r.seedlings, 0);
  const germinating = store.batchesInChamber().filter((b) => !ready.some((r) => r.batch.code === b.code));
  return (
    <Link to="/erp/persemaian" className="block rounded-lg border border-[#E3ECED] px-3 py-2.5 hover:border-[#14919B]">
      <span className="flex items-center justify-between text-[13px]">
        <span className="font-medium text-[#0F2F36]">Pasokan dari persemaian · {CHAMBER_CODE}</span>
        <MoveRight className="h-4 w-4 text-[#0B6477]" />
      </span>
      <span className="mt-0.5 block text-[12.5px] text-[#4F6B73]">
        {seedlings} bibit siap pindah · {germinating.length} batch masih germinasi · {store.freeCapacity()} lubang siap terima
      </span>
    </Link>
  );
}

function FacilityPanel({ store, onRack }: { store: ErpStore; onRack: (rack: number) => void }) {
  const provider = store.pf;
  return (
    <div className="space-y-4">
      <PanelHeader eyebrow={`Plant factory · ${FACILITY_CODE}`} title="Smart Agriculture Research Center" sub="Ruang tumbuh (2 rak NFT) dan ruang kontrol" />
      <div className="flex items-center gap-2 text-[12.5px]">
        <span className="text-[#4F6B73]">{store.batchesInFactory().length} batch aktif</span>
      </div>
      <StateBreakdown counts={countByState(provider.holes.values())} total={HOLES_TOTAL} />
      <SeedlingSupply store={store} />
      <Readings title="Ruang tumbuh (contoh)" items={GROW_ROOM_READINGS} />
      <div className="space-y-2">
        {RACK_NUMBERS.map((r) => {
          const n = provider.holesOfRack(r).filter((h) => isPlanted(h.state)).length;
          return (
            <button key={r} type="button" onClick={() => onRack(r)} className="block w-full rounded-lg border border-[#E3ECED] px-3 py-2 text-left hover:border-[#14919B]">
              <div className="mb-1 flex justify-between text-[13px]"><span className="font-medium text-[#0F2F36]">Rak {r}</span><span className="text-[#4F6B73]">{n}/{HOLES_PER_RACK}</span></div>
              <Bar value={n} max={HOLES_PER_RACK} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- page */

type Props = { active: boolean; preload: boolean; onSceneReady: () => void; focusHole?: string };

export default function PlantFactoryOverview({ active, preload, onSceneReady, focusHole }: Props) {
  const store = useErpStore();
  const provider = store.pf;
  const sceneOn = useSceneGate(active || preload);
  const [engine, setEngine] = useState<SceneEngine | null>(null);
  const [failed, setFailed] = useState(false);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [filter, setFilterState] = useState({ rack: 0, tier: 0 });
  const [view, setViewState] = useState<ViewName>("iso");
  const [realLight, setRealLight] = useState(false);
  const [covers, setCovers] = useState(true);

  const onReady = useCallback((e: SceneEngine) => {
    e.on("filter", setFilterState);
    e.on("view", setViewState);
    setEngine(e);
    onSceneReady();
  }, [onSceneReady]);
  const onError = useCallback((e: unknown) => {
    console.error("Model 3D gagal dimuat", e);
    setFailed(true);
  }, []);

  useEngineActivity(engine, active);

  // New records arrive after the model does, and whenever a batch page saves.
  useEffect(() => {
    engine?.refresh();
  }, [engine, store.dataVersion]);

  useEffect(() => {
    if (engine && active && focusHole) engine.focusHole(focusHole);
  }, [engine, active, focusHole]);

  const counts = countByState(provider.holes.values());
  const filled = HOLE_STATE_KEYS.filter(isPlanted).reduce((n, s) => n + counts[s], 0);

  // The lifecycle strip follows the selected hole's batch, else the batch nearest harvest.
  const selectedBatch = selection?.kind === "hole" ? store.batch(provider.getHole(selection.id)?.batch) : undefined;
  const focusBatch = selectedBatch ?? store.batchesInFactory().sort((a, b) => b.age / b.cycle - a.age / a.cycle)[0];

  const selectedObject = selection?.kind === "object" ? engine?.manifest.objects.find((o) => o.id === selection.id) : undefined;

  const tool = "grid h-9 w-9 place-items-center rounded-lg text-[#36525A] hover:bg-[#EEF5F5] hover:text-[#0B6477]";
  const toggle = "flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2 py-1 text-[12.5px] font-medium text-[#36525A] hover:bg-[#EEF5F5]";

  return (
      <main className="relative flex-1 bg-[#E7EAE7] lg:h-screen lg:min-h-[680px]">
        {/* Scene */}
        <div className="relative h-[62vh] min-h-[420px] lg:absolute lg:bottom-[172px] lg:left-0 lg:right-[392px] lg:top-0 lg:h-auto">
          {sceneOn && <PlantFactoryScene provider={provider} onReady={onReady} onSelect={setSelection} onError={onError} />}
          {!engine && <SceneStatus failed={failed} />}

          <Card className="absolute right-3 top-3 flex flex-col p-1 lg:top-4">
            <button type="button" className={tool} onClick={() => engine && dolly(engine, 0.8)} aria-label="Perbesar"><Plus className="h-4 w-4" /></button>
            <button type="button" className={tool} onClick={() => engine && dolly(engine, 1.25)} aria-label="Perkecil"><Minus className="h-4 w-4" /></button>
            <button
              type="button"
              className={tool}
              aria-label="Tampilan awal"
              onClick={() => {
                engine?.setView("iso");
                engine?.setFilter({ rack: 0, tier: 0 });
                engine?.select(null);
              }}
            >
              <Home className="h-4 w-4" />
            </button>
          </Card>
        </div>

        {/* KPI cards */}
        <div className="flex gap-3 overflow-x-auto px-3 py-3 lg:pointer-events-none lg:absolute lg:left-4 lg:right-[404px] lg:top-4 lg:p-0 lg:pb-3">
          <div className="flex gap-3 lg:pointer-events-auto">
            <Kpi label="Lubang terisi" value={`${filled}`} sub={`dari ${HOLES_TOTAL} lubang · ${FACILITY_CODE}`} />
            <Kpi label="Siap panen" value={`${counts.siap_panen}`} sub="tanaman, menurut resep" />
            <Kpi label="Suhu ruang tumbuh" value="22.4 °C" sub="contoh · RH 68% · CO₂ 812 ppm" />
            <Kpi label="Tandon" value="EC 1.62" sub="contoh · pH 6.48" />
          </div>
        </div>

        {/* View, filters, legend */}
        <div className="px-3 pb-3 lg:pointer-events-none lg:absolute lg:bottom-[172px] lg:left-4 lg:right-[404px] lg:p-0">
          <Card className="space-y-2 px-3 py-2.5 lg:pointer-events-auto">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <Segmented label="Tampilan" value={view} options={VIEWS} onChange={(v) => engine?.setView(v)} />
              <Segmented label="Rak" value={filter.rack} options={[{ key: 0, label: "Semua" }, ...RACK_NUMBERS.map((r) => ({ key: r, label: `${r}` }))]} onChange={(rack) => engine?.setFilter({ rack })} />
              <Segmented label="Tingkat" value={filter.tier} options={[{ key: 0, label: "Semua" }, ...TIER_NUMBERS.map((t) => ({ key: t, label: `${t}` }))]} onChange={(tier) => engine?.setFilter({ tier })} />
              <button
                type="button"
                className={toggle}
                aria-pressed={realLight}
                onClick={() => {
                  engine?.setOptions({ realLight: !realLight });
                  setRealLight(!realLight);
                }}
              >
                {realLight ? <Lightbulb className="h-4 w-4 text-[#D63FB8]" /> : <LightbulbOff className="h-4 w-4" />}
                Cahaya grow
              </button>
              <button
                type="button"
                className={toggle}
                aria-pressed={covers}
                onClick={() => {
                  engine?.setOptions({ showCovers: !covers });
                  setCovers(!covers);
                }}
              >
                <span className={`h-3 w-3 rounded-sm border ${covers ? "border-[#14919B] bg-[#14919B]" : "border-[#9AAEB2]"}`} />
                Penutup rak
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {HOLE_STATE_KEYS.map((s) => (
                <span key={s} className="flex items-center gap-1 text-[12px] text-[#4F6B73]">
                  <span className="h-2 w-2 rounded-full" style={{ background: stateColor(s) }} />
                  {HOLE_STATES[s].label}
                </span>
              ))}
              {filter.tier === 0 && <span className="text-[12px] text-[#4F6B73] lg:ml-auto">Pilih satu tingkat untuk mengeklik lubang</span>}
            </div>
          </Card>
        </div>

        {/* Detail panel */}
        <div className="px-3 pb-3 lg:absolute lg:bottom-4 lg:right-4 lg:top-4 lg:w-[360px] lg:p-0">
          <Card className="h-full overflow-y-auto p-4">
            {selection?.kind === "hole" ? (
              <HolePanel id={selection.id} store={store} />
            ) : selectedObject ? (
              <ObjectPanel object={selectedObject} provider={provider} />
            ) : filter.rack ? (
              <RackPanel rack={filter.rack} store={store} onTier={(tier) => engine?.setFilter({ tier })} />
            ) : (
              <FacilityPanel store={store} onRack={(rack) => engine?.setFilter({ rack })} />
            )}
          </Card>
        </div>

        {/* Lifecycle */}
        <div className="px-3 pb-6 lg:absolute lg:bottom-4 lg:left-4 lg:right-[404px] lg:p-0">
          {focusBatch && <Lifecycle batch={focusBatch} phase={store.phaseOf(focusBatch)} />}
        </div>
      </main>
  );
}

